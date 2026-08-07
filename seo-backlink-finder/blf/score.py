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
    OpportunityType.NEWS: 95,
    OpportunityType.GUEST_POST: 90,
    OpportunityType.RESOURCE_PAGE: 75,
    OpportunityType.BLOG: 70,
    OpportunityType.WIKI: 70,
    OpportunityType.QA: 55,
    OpportunityType.COMMUNITY: 50,
    OpportunityType.LOCAL_CITATION: 50,
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
    OpportunityType.LOCAL_CITATION: 60,
    OpportunityType.SOCIAL: 60,
    OpportunityType.FORUM: 55,
    OpportunityType.COMMUNITY: 50,
    OpportunityType.QA: 45,
    OpportunityType.RESOURCE_PAGE: 35,
    OpportunityType.BLOG: 35,
    OpportunityType.WIKI: 25,
    OpportunityType.GUEST_POST: 20,
    OpportunityType.NEWS: 15,
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


def relevance_score(
    prospect: Prospect,
    topics: list[str],
    profile=None,
) -> Optional[float]:
    """0..1 — how well this prospect's page fits YOUR site.

    Three independent signals, combined so that any one of them can carry a
    genuine match:

    * **phrase hits** — your topics appearing in the page's title, description,
      URL or domain. Precise, but brittle: a relevant page may use synonyms.
    * **vector similarity** — cosine between the page's terms and your site's
      whole term profile. Catches the synonym case, and works for Thai and CJK
      via character n-grams (see textrank).
    * **language agreement** — a Thai site is a poor placement for a Thai
      business's backlink only if the page is in another language; matching
      language is a real relevance signal, not a cosmetic one.

    Returns None when we have nothing to compare against, so the caller drops
    the component and renormalises instead of scoring the prospect a zero.
    """
    topics = [t for t in (topics or []) if t and t.strip()]
    a = prospect.analysis

    haystack = " ".join(filter(None, [
        a.title, a.meta_description, prospect.url, prospect.domain,
    ])).lower()

    phrase = None
    if topics and haystack.strip():
        matched = 0.0
        for topic in topics:
            t = topic.lower().strip()
            if t and t in haystack:
                matched += 1.0                     # full phrase present
                continue
            words = _WORD_RE.findall(t)
            if not words:
                continue
            hits = sum(1 for w in words if w in haystack)
            if hits:
                matched += hits / len(words) * 0.8  # partial credit
        phrase = min(1.0, matched / len(topics))

    vector = None
    if profile is not None and getattr(profile, "terms", None) and a.terms:
        from collections import Counter
        from . import textrank
        sim = textrank.cosine(Counter(profile.terms), Counter(a.terms))
        # Cosine over real web pages rarely exceeds ~0.5 even for a strong
        # topical match, so rescale into a usable 0..1 range rather than
        # reporting every good match as "0.3".
        vector = min(1.0, sim / 0.45)

    lang_bonus = None
    if profile is not None and getattr(profile, "language", None) and a.content_lang:
        lang_bonus = 1.0 if a.content_lang == profile.language else 0.35

    parts = [(p, w) for p, w in (
        (phrase, 0.45), (vector, 0.40), (lang_bonus, 0.15)
    ) if p is not None]
    if not parts:
        return None
    total_w = sum(w for _, w in parts)
    return round(sum(p * w for p, w in parts) / total_w, 4)


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


def compute(prospect: Prospect, cfg, profile=None) -> Scores:
    """Score one prospect. `profile` is your SiteProfile, when you have one —
    without it, relevance falls back to configured topics alone."""
    weights = dict(cfg.get("scoring.quality_weights", {}))
    topics = list(cfg.get("site.topics", []) or [])
    if profile is not None and getattr(profile, "topics", None):
        # The crawled profile is more current than whatever is in the config.
        topics = list(dict.fromkeys(list(profile.topics) + topics))

    a = prospect.analysis
    otype = prospect.opportunity_type

    relevance = relevance_score(prospect, topics, profile)

    # Component values in 0..1, or None if not computable.
    comps: dict[str, Optional[float]] = {
        "authority": (prospect.metrics.authority / 100.0
                      if prospect.metrics.authority is not None else None),
        "relevance": relevance,
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

    # -- two vetoes, applied after the blend ---------------------------------
    # These are not weighted components: they are not "a bit less good", they
    # are reasons the link cannot work or should not be wanted. A weighted
    # component would let a strong authority score outvote them, which is
    # exactly the failure they exist to prevent.
    quality, veto_notes = _apply_vetoes(a, quality)

    quality = round(max(0.0, min(100.0, quality)), 1)
    ease = round(max(0.0, min(100.0, ease)), 1)

    pref = float(cfg.get("scoring.quality_pref", 0.8))
    priority = round(quality * pref + ease * (1 - pref), 1)

    # "How well does this fit MY site" as its own headline number, separate
    # from quality — a high-authority page in the wrong niche is a bad link.
    match = round((relevance if relevance is not None else 0.0) * 100, 1)
    if otype == OpportunityType.LOCAL_CITATION and profile is not None:
        match = round(min(100.0, match * (1.15 if profile.country else 1.0)), 1)

    breakdown = {k: round((comps[k] or 0.0) * 100, 1) for k in comps}
    breakdown["_weights_used"] = {k: round(weights[k] / total_w, 3) for k in usable}
    if veto_notes:
        breakdown["_vetoes"] = veto_notes

    return Scores(quality=quality, ease=ease, priority=priority, match=match,
                  tier=tier_for(quality, cfg), breakdown=breakdown)


# Quality ceilings, not subtractions. A page Google will not index is worth
# nothing regardless of how good everything else about it is.
NOINDEX_CEILING = 5.0
CANONICAL_CEILING = 20.0
TOXIC_CEILING = 15.0


def _apply_vetoes(analysis, quality: float) -> tuple[float, list[str]]:
    """Cap quality for links that cannot count, or that would cost you.

    Returns the capped score and the human-readable reasons, which the report
    shows — a prospect that dropped from 84 to 5 must say why, or the operator
    will assume the tool is broken and stop trusting the ranking.
    """
    from .indexability import Indexability
    from .toxicity import Toxicity

    notes: list[str] = []
    index = Indexability.from_dict(analysis.indexability)
    tox = Toxicity.from_dict(analysis.toxicity)

    if index.indexable is False:
        quality = min(quality, NOINDEX_CEILING)
        notes.append("Google เข้าไม่ถึงหน้านี้ — ลิงก์ที่วางจะไม่ถูกนับเลย")
    elif index.canonical_elsewhere:
        # Not zero: the canonical may be ignored, and the page can still send
        # human traffic. But the link value is being consolidated elsewhere.
        quality = min(quality, CANONICAL_CEILING)
        notes.append("canonical ชี้ไปหน้าอื่น — ค่าของลิงก์จะถูกโอนไปหน้านั้น")

    if tox.avoid:
        quality = min(quality, TOXIC_CEILING)
        notes.append("หน้านี้มีสัญญาณเว็บขายลิงก์/สแปม — ได้ลิงก์มาอาจเสียมากกว่าได้")
    elif tox.risk >= 0.3:
        quality *= 0.75
        notes.append("มีสัญญาณเสี่ยงบางอย่าง ตรวจด้วยตาก่อนวางลิงก์")

    return quality, notes


def tier_for(quality: float, cfg) -> str:
    cuts = cfg.get("scoring.tiers", {"A": 75, "B": 55, "C": 35})
    if quality >= cuts.get("A", 75):
        return "A"
    if quality >= cuts.get("B", 55):
        return "B"
    if quality >= cuts.get("C", 35):
        return "C"
    return "D"
