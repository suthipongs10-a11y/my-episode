"""Core data types shared across the tool.

Kept dependency-free (stdlib only) so every other module can import it and so
the tests never need the network.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any, Optional


class OpportunityType(str, Enum):
    """How a backlink can be obtained from a page.

    Ordered loosely from most to least valuable *ceiling*. This ordering feeds
    the "placement" component of the quality score: an editorial guest post can
    reach a higher quality than a forum signature no matter the domain.
    """

    GUEST_POST = "guest_post"          # editorial in-content link, you author the piece
    EDITORIAL_MENTION = "editorial"    # someone links you in their own content (PR/HARO)
    NEWS = "news"                      # news site / press release / journalist request
    RESOURCE_PAGE = "resource_page"    # curated "useful links" list
    BLOG = "blog"                      # a blog that takes contributions or link inserts
    WIKI = "wiki"                      # wiki external-links section
    QA = "qa"                          # question-and-answer site answer
    COMMUNITY = "community"            # community platform (reddit-style, groups, slack)
    DIRECTORY = "directory"            # niche/business directory listing
    BUSINESS_LISTING = "business_listing"  # business listing with a website field
    LOCAL_CITATION = "local_citation"  # NAP citation on a local/geo directory
    WEB2 = "web2"                      # free hosted blog (medium/wordpress.com/...)
    FORUM = "forum"                    # forum post / signature
    BLOG_COMMENT = "blog_comment"      # comment under an article
    PROFILE = "profile"                # profile page with a website field
    SOCIAL = "social"                  # social platform bio
    BOOKMARK = "bookmark"              # social bookmarking site
    UNKNOWN = "unknown"

    @property
    def label(self) -> str:
        return _TYPE_LABELS.get(self, self.value)


_TYPE_LABELS = {
    OpportunityType.GUEST_POST: "Guest post",
    OpportunityType.EDITORIAL_MENTION: "Editorial mention",
    OpportunityType.NEWS: "News / PR",
    OpportunityType.RESOURCE_PAGE: "Resource page",
    OpportunityType.BLOG: "Blog",
    OpportunityType.WIKI: "Wiki",
    OpportunityType.QA: "Q&A answer",
    OpportunityType.COMMUNITY: "Community",
    OpportunityType.DIRECTORY: "Directory",
    OpportunityType.BUSINESS_LISTING: "Business listing",
    OpportunityType.LOCAL_CITATION: "Local citation",
    OpportunityType.WEB2: "Web 2.0 blog",
    OpportunityType.FORUM: "Forum",
    OpportunityType.BLOG_COMMENT: "Blog comment",
    OpportunityType.PROFILE: "Profile",
    OpportunityType.SOCIAL: "Social bio",
    OpportunityType.BOOKMARK: "Bookmark",
    OpportunityType.UNKNOWN: "Unknown",
}


class LinkAttribute(str, Enum):
    """The rel attribute a link from this page would most likely carry."""

    DOFOLLOW = "dofollow"
    UGC = "ugc"
    NOFOLLOW = "nofollow"
    SPONSORED = "sponsored"
    UNKNOWN = "unknown"


class Approval(str, Enum):
    """How a link gets accepted at a target — the thing you want to know before
    spending an hour on it.

    Ordered from least to most effort. This is a *typical* expectation, not a
    promise: any site can change its moderation policy without telling anyone.
    """

    INSTANT = "instant"            # posts immediately, no review
    MODERATED = "moderated"        # a human or filter reviews it first
    EDITORIAL = "editorial"        # a person decides whether to publish you
    VERIFICATION = "verification"  # you must prove you own the business
    PAID = "paid"                  # money is required
    UNKNOWN = "unknown"

    @property
    def label(self) -> str:
        return _APPROVAL_LABELS.get(self, self.value)


_APPROVAL_LABELS = {
    Approval.INSTANT: "Instant",
    Approval.MODERATED: "Moderated",
    Approval.EDITORIAL: "Editorial",
    Approval.VERIFICATION: "Verification",
    Approval.PAID: "Paid",
    Approval.UNKNOWN: "Unknown",
}

APPROVAL_LABELS_TH = {
    Approval.INSTANT: "ขึ้นทันที",
    Approval.MODERATED: "รออนุมัติ",
    Approval.EDITORIAL: "ต้องให้คนตัดสิน",
    Approval.VERIFICATION: "ต้องยืนยันตัวตน",
    Approval.PAID: "ต้องจ่ายเงิน",
    Approval.UNKNOWN: "ไม่ทราบ",
}


class Status(str, Enum):
    """Where a prospect sits in your outreach pipeline."""

    NEW = "new"                # discovered, not analysed
    QUALIFIED = "qualified"    # analysed and worth pursuing
    DRAFTED = "drafted"        # a comment/pitch has been drafted
    CONTACTED = "contacted"    # outreach sent / comment submitted
    LIVE = "live"              # link is live on the page
    REJECTED = "rejected"      # not worth it / declined / spam risk
    DISCARDED = "discarded"    # low quality, dropped


# Tier is a plain string ("A".."D"); helpers live in score.py.


@dataclass
class Analysis:
    """Everything we learn by fetching and reading a page. All optional so a
    partially-analysed prospect is still valid."""

    fetched: bool = False
    http_status: Optional[int] = None
    final_url: Optional[str] = None
    https: bool = False
    title: Optional[str] = None
    meta_description: Optional[str] = None
    declared_lang: Optional[str] = None       # from <html lang> / meta
    content_lang: Optional[str] = None        # what we detected from text
    lang_confidence: float = 0.0
    platform: Optional[str] = None            # WordPress, Discourse, ...
    comment_system: Optional[str] = None      # native, disqus, facebook, none
    has_comment_form: bool = False
    has_submit_form: bool = False             # "submit your site / write for us"
    link_attribute: LinkAttribute = LinkAttribute.UNKNOWN
    external_links: int = 0
    external_dofollow: int = 0
    contact_email: Optional[str] = None
    contact_url: Optional[str] = None
    terms: dict = field(default_factory=dict)          # term vector for matching
    signals: list[str] = field(default_factory=list)   # human-readable evidence
    error: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["link_attribute"] = self.link_attribute.value
        return d

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Analysis":
        d = dict(d or {})
        if "link_attribute" in d and d["link_attribute"] is not None:
            d["link_attribute"] = LinkAttribute(d["link_attribute"])
        # tolerate unknown keys from older schema versions
        known = {f for f in cls.__dataclass_fields__}
        return cls(**{k: v for k, v in d.items() if k in known})


@dataclass
class Metrics:
    """Third-party quality signals for the registrable domain."""

    authority: Optional[float] = None        # 0-100 (Open PageRank / DA)
    authority_source: Optional[str] = None
    domain_age_days: Optional[int] = None
    domain_created: Optional[str] = None      # ISO date string

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Metrics":
        known = {f for f in cls.__dataclass_fields__}
        return cls(**{k: v for k, v in (d or {}).items() if k in known})


@dataclass
class Scores:
    quality: float = 0.0        # 0-100, the number you rank by
    ease: float = 0.0           # 0-100, higher = easier to obtain
    priority: float = 0.0       # blend, quality-first
    match: float = 0.0          # 0-100, how well this site fits YOUR site
    tier: str = "D"             # A/B/C/D
    breakdown: dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Scores":
        known = {f for f in cls.__dataclass_fields__}
        return cls(**{k: v for k, v in (d or {}).items() if k in known})


@dataclass
class Prospect:
    """One backlink opportunity: a URL plus everything we know about it."""

    url: str
    domain: str = ""                       # registrable domain, e.g. example.com
    opportunity_type: OpportunityType = OpportunityType.UNKNOWN
    category: Optional[str] = None         # footprint category that found it
    source_query: Optional[str] = None     # the footprint/query used
    status: Status = Status.NEW
    analysis: Analysis = field(default_factory=Analysis)
    metrics: Metrics = field(default_factory=Metrics)
    scores: Scores = field(default_factory=Scores)
    notes: str = ""
    discovered_at: Optional[str] = None
    analyzed_at: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "url": self.url,
            "domain": self.domain,
            "opportunity_type": self.opportunity_type.value,
            "category": self.category,
            "source_query": self.source_query,
            "status": self.status.value,
            "analysis": self.analysis.to_dict(),
            "metrics": self.metrics.to_dict(),
            "scores": self.scores.to_dict(),
            "notes": self.notes,
            "discovered_at": self.discovered_at,
            "analyzed_at": self.analyzed_at,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Prospect":
        return cls(
            url=d["url"],
            domain=d.get("domain", ""),
            opportunity_type=OpportunityType(d.get("opportunity_type", "unknown")),
            category=d.get("category"),
            source_query=d.get("source_query"),
            status=Status(d.get("status", "new")),
            analysis=Analysis.from_dict(d.get("analysis", {})),
            metrics=Metrics.from_dict(d.get("metrics", {})),
            scores=Scores.from_dict(d.get("scores", {})),
            notes=d.get("notes", ""),
            discovered_at=d.get("discovered_at"),
            analyzed_at=d.get("analyzed_at"),
        )
