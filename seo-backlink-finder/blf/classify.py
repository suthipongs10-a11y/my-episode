"""Refine a prospect's opportunity type using what the page actually shows.

The footprint category is a strong hint, but a manual import has none and a
page sometimes contradicts its category (a "resources" URL that turns out to be
a forum). This reconciles the two, preferring hard on-page evidence.
"""
from __future__ import annotations

from .models import Analysis, OpportunityType, Prospect

_WEB2_PLATFORMS = {"Medium", "Blogger", "WordPress.com", "Tumblr", "Substack"}
_FORUM_PLATFORMS = {"phpBB", "vBulletin", "XenForo", "MyBB", "SMF", "Discourse"}


def classify(prospect: Prospect) -> OpportunityType:
    a: Analysis = prospect.analysis
    current = prospect.opportunity_type

    # Hard evidence from the page overrides a weak/unknown category guess.
    if a.platform == "MediaWiki":
        return OpportunityType.WIKI
    if a.platform in _FORUM_PLATFORMS:
        return OpportunityType.FORUM
    if a.platform in _WEB2_PLATFORMS and current in (
        OpportunityType.UNKNOWN, OpportunityType.BLOG_COMMENT):
        return OpportunityType.WEB2

    # A live comment system with no stronger signal -> comment opportunity.
    if a.has_comment_form and current in (OpportunityType.UNKNOWN,):
        return OpportunityType.BLOG_COMMENT

    # A submit/contribute affordance with no category -> likely guest post.
    if a.has_submit_form and current in (OpportunityType.UNKNOWN,):
        return OpportunityType.GUEST_POST

    # Otherwise keep the category-derived type (may still be UNKNOWN).
    return current


def apply(prospect: Prospect) -> Prospect:
    prospect.opportunity_type = classify(prospect)
    return prospect
