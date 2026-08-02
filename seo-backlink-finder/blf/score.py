"""Quality-first scoring.

Two numbers per prospect:

* quality (0..100) - what you rank by. A weighted blend of domain authority,
  topical relevance, the link attribute, the placement ceiling, and trust. Any
  component we cannot compute (e.g. authority with no API key) is dropped and
  the remaining weights are renormalised, so a missing signal never silently
  drags a score toward zero.
* ease (0..100) - how easy the link is to obtain. Secondary by design.

priority = quality * quality_pref + ease * (1 - quality_pref), so raising
quality_pref (default 0.8) makes the ranking care about quality first and use
ease only to break near-ties.
"""
from __future__ import annotations

import re
from typing import Optional

from .models import LinkAttribute, OpportunityType, Prospect, Scores

# Placement ceiling (0..100) by opportunity type. Editorial in-content links
# can reach the top; a forum signature or blog comment cannot, regardless of
# how strong the domain is.
PLACEMENT_RANK = {
    OpportunityType.EDITORIAL_MENTION: 100,
    OpportunityType.GUEST_POST: 90,
    OpportunityType.RESOURCE_PAGE: 75,
    OpportunityType.WIKI: 70,
    OpportunityType.QA: 55,
    OpportunityType.DIRECTORY: 45,
    OpportunityType.BUSINESS_LISTING: 45,
    OpportunityType.WEB2: 45,
    OpportunityType.FORUM: 40,
    OpportunityType.PROFILE: 30,
    OpportunityType.BLOG_COMMENT: 30,
    OpportunityType.BOOKMARK: 25,
    OpportunityType.SOCIAL: 25,
    OpportunityType.UNKNOWN: 35,
}

# Base ease (0..100, higher = easier) by opportunity type.
BASE_EASE = {
    OpportunityType.PROFILE: 90,
    OpportunityType.WEB2: 85,
    OpportunityType.BOOKMARK: 85,
    OpportunityType.BLOG_COMMENT: 75,
    OpportunityType.DIRECTORY: 70,
    OpportunityType.BUSINESS_LISTING: 65,
    OpportunityType.SOCIAL: 60,
    OpportunityType.FORUM: 55,
    OpportunityType.QA: 45,
    OpportunityType.RESOURCE_PAGE: 35,
    OpportunityType.WIKI: 25,
    OpportunityType.GUEST_POST: 20,
    OpportunityType.EDITORIAL_MENTION: 10,
    OpportunityType.UNKNOWN: 40,
}

LINK_ATTR_VALUE = {
    LinkAttribute.DOFOLLOW: 1.0,
    LinkAttribute.UGC: 0.5,
    LinkAttribute.NOFOLLOW: 0.35,
    LinkAttribute.SPONSORED: 0.15,
    LinkAttribute.UNKNOWN: 0.5,   # neutral prior
}

_WORD_RE = re.compile(r"[^\W\d_]{3,}", re.UNICODE)


def relevance_score(prospect: Prospect, topics: list[str]) -> Optional[float]:
    """0..1 topical match between the page and your niche, or None if you have
    not configured any topics (so relevance is simply unknown)."""
    topics = [t for t in (topics or []) if t.strip()]
    if not topics:
        return None
    a = prospect.analysis
    haystack = " ".join(filter(None, [
        a.title, a.meta_description, prospect.url, prospect.domain,
    ])).lower()
    if not haystack.strip():
        return 0.0
    matched = 0.0
    for topic in topics:
        t = topic.lower().strip()
        if t and t in haystack:
            matched += 1.0            # full phrase present
            continue
        words = _WORD_RE.findall(t)
        if not words:
            continue
        hits = sum(1 for w in words if w in haystack)
        if hits:
            matched += hits / len(words) * 0.8   # partial credit
    return min(1.0, matched / len(topics))


def trust_score(prospect: Prospect) -> float:
    """0..1 from HTTPS, domain age, and outbound-link sanity."""
    a = prospect.analysis
    m = prospect.metrics
    parts = []
    parts.append(1.0 if a.https else 0.0)
    # Domain age: newborn domains are risky; ~3y+ is fully trusted.
    if m.domain_age_days is not None:
        parts.append(min(1.0, m.domain_age_days / 1095.0))
    # Outbound-link sanity: a page dumping hundreds of external links looks like
    # a link farm. Sweet spot is a modest number.
    if a.external_links:
        if a.external_links <= 50:
            parts.append(1.0)
        elif a.external_links <= 150:
            parts.append(0.6)
        else:
            parts.append(0.2)
    return sum(parts) / len(parts) if parts else 0.5


def compute(prospect: Prospect, cfg) -> Scores:
    weights = dict(cfg.get("scoring.quality_weights", {}))
    topics = cfg.get("site.topics", []) or []

    a = prospect.analysis
    otype = prospect.opportunity_type

    # Component values in 0..1, or None if not computable.
    comps: dict[str, Optional[float]] = {
        "authority": (prospect.metrics.authority / 100.0
                      if prospect.metrics.authority is not None else None),
        "relevance": relevance_score(prospect, topics),
        "link_attribute": LINK_ATTR_VALUE.get(a.link_attribute, 0.5),
        "placement": PLACEMENT_RANK.get(otype, 35) / 100.0,
        "trust": trust_score(prospect),
    }

    # Renormalise weights over the components we actually have.
    usable = {k: v for k, v in comps.items() if v is not None and weights.get(k)}
    total_w = sum(weights[k] for k in usable) or 1.0
    quality = sum(comps[k] * (weights[k] / total_w) for k in usable) * 100.0

    # Ease.
    ease = float(BASE_EASE.get(otype, 40))
    if a.has_comment_form and otype == OpportunityType.BLOG_COMMENT:
        ease = min(100.0, ease + 5)
    if a.has_submit_form:
        ease = min(100.0, ease + 8)
    if otype in (OpportunityType.GUEST_POST, OpportunityType.RESOURCE_PAGE,
                 OpportunityType.EDITORIAL_MENTION) and a.contact_email:
        ease = min(100.0, ease + 10)   # we have a way to reach them

    quality = round(max(0.0, min(100.0, quality)), 1)
    ease = round(max(0.0, min(100.0, ease)), 1)

    pref = float(cfg.get("scoring.quality_pref", 0.7))
    priority = round(quality * pref + ease * (1 - pref), 1)

    breakdown = {k: round((comps[k] or 0.0) * 100, 1) for k in comps}
    breakdown["_weights_used"] = {k: round(weights[k] / total_w, 3) for k in usable}

    return Scores(quality=quality, ease=ease, priority=priority,
                  tier=tier_for(quality, cfg), breakdown=breakdown)


def tier_for(quality: float, cfg) -> str:
    cuts = cfg.get("scoring.tiers", {"A": 75, "B": 55, "C": 35})
    if quality >= cuts.get("A", 75):
        return "A"
    if quality >= cuts.get("B", 55):
        return "B"
    if quality >= cuts.get("C", 35):
        return "C"
    return "D"
