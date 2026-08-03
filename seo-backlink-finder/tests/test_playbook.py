"""The how-to guides.

The point of this feature is that someone who has never built a link can open
a prospect and know what to do. So the tests check coverage (no type is left
without a playbook), consistency (the guide never mixes languages), and that
the page facts reflect what was actually detected.
"""
import copy

import pytest

from blf.config import Config, DEFAULTS
from blf.models import (Analysis, Approval, LinkAttribute, OpportunityType,
                        Prospect, Scores)
from blf.playbook import (DOMAIN_GUIDES, EN, TH, TYPE_GUIDES, approval_for,
                          guide_for)
from blf.profile import SiteProfile


def _cfg(guide_language=""):
    data = copy.deepcopy(DEFAULTS)
    data["assist"]["guide_language"] = guide_language
    return Config(data)


def _prospect(otype=OpportunityType.BLOG_COMMENT, domain="target.test", **kw):
    p = Prospect(url=f"https://{domain}/page", domain=domain,
                 opportunity_type=otype)
    p.analysis = Analysis(fetched=True, https=True, **kw)
    p.scores = Scores(quality=50, ease=50, priority=50, match=50, tier="C")
    return p


# --- coverage --------------------------------------------------------------
def test_every_opportunity_type_has_a_playbook():
    missing = [t.value for t in OpportunityType if t not in TYPE_GUIDES]
    assert not missing, f"no playbook for: {missing}"


def test_every_playbook_has_steps_in_both_languages():
    for otype, langs in TYPE_GUIDES.items():
        for lang in (TH, EN):
            if lang not in langs:
                continue
            data = langs[lang]
            assert data.get("steps"), f"{otype.value}/{lang} has no steps"
            assert isinstance(data.get("approval"), Approval), \
                f"{otype.value}/{lang} has no approval type"


def test_thai_exists_for_every_type():
    """The operator here reads Thai; an English-only playbook is a hole."""
    missing = [t.value for t, langs in TYPE_GUIDES.items() if TH not in langs]
    assert not missing, f"no Thai playbook for: {missing}"


def test_domain_overrides_are_well_formed():
    for domain, langs in DOMAIN_GUIDES.items():
        assert langs, f"{domain} has no guide"
        for lang, data in langs.items():
            assert data.get("steps"), f"{domain}/{lang} has no steps"
            assert isinstance(data.get("approval"), Approval)


# --- resolution ------------------------------------------------------------
def test_domain_override_beats_type_guide():
    p = _prospect(OpportunityType.WEB2, domain="medium.com")
    g = guide_for(p, _cfg("th"))
    assert g.source == "domain"
    assert "Medium" in g.summary


def test_type_guide_used_when_no_override():
    p = _prospect(OpportunityType.GUEST_POST, domain="some-blog.test")
    g = guide_for(p, _cfg("th"))
    assert g.source == "type"
    assert g.approval == Approval.EDITORIAL
    assert g.steps


def test_unknown_type_still_returns_actionable_steps():
    p = _prospect(OpportunityType.UNKNOWN, domain="mystery.test")
    g = guide_for(p, _cfg("th"))
    assert g.steps, "an unknown type must still tell you what to look for"


# --- language consistency --------------------------------------------------
def test_guide_language_is_reported_and_consistent():
    """Body and page facts must be in the same language — a Thai body with
    English facts reads as two documents stapled together."""
    p = _prospect(OpportunityType.GUEST_POST, contact_email="e@x.test")
    g = guide_for(p, _cfg("th"))
    assert g.language == TH
    assert any("อีเมล" in f for f in g.facts)


def test_english_guide_when_configured():
    p = _prospect(OpportunityType.GUEST_POST, contact_email="e@x.test")
    g = guide_for(p, _cfg("en"))
    assert g.language == EN
    assert any("Contact email" in f for f in g.facts)


def test_domain_override_with_only_thai_reports_thai():
    """google.com only has a Thai override; asking for English must not return
    a Thai body labelled 'en'."""
    p = _prospect(OpportunityType.LOCAL_CITATION, domain="google.com")
    g = guide_for(p, _cfg("en"))
    assert g.language == TH
    assert g.source == "domain"


def test_profile_language_drives_guide_when_unset():
    p = _prospect(OpportunityType.GUEST_POST)
    prof = SiteProfile(url="https://mine.test", domain="mine.test", language="th")
    g = guide_for(p, _cfg(""), profile=prof)
    assert g.language == TH


# --- page facts ------------------------------------------------------------
def test_disqus_is_called_out():
    p = _prospect(comment_system="disqus", has_comment_form=True)
    g = guide_for(p, _cfg("th"))
    assert any("Disqus" in f for f in g.facts)


def test_facebook_comments_are_called_out():
    p = _prospect(comment_system="facebook", has_comment_form=True)
    g = guide_for(p, _cfg("th"))
    assert any("Facebook" in f for f in g.facts)


def test_nofollow_is_warned_about():
    p = _prospect(link_attribute=LinkAttribute.NOFOLLOW)
    g = guide_for(p, _cfg("th"))
    assert any("nofollow" in f for f in g.facts)


def test_dofollow_is_reported_positively():
    p = _prospect(link_attribute=LinkAttribute.DOFOLLOW)
    g = guide_for(p, _cfg("en"))
    assert any("dofollow" in f for f in g.facts)


def test_low_match_advises_skipping():
    p = _prospect()
    p.scores.match = 8.0
    g = guide_for(p, _cfg("th"))
    assert any("Match" in f for f in g.facts)


def test_unfetched_page_says_so_instead_of_guessing():
    p = Prospect(url="https://dead.test/x", domain="dead.test",
                 opportunity_type=OpportunityType.DIRECTORY)
    p.analysis = Analysis(fetched=False, error="timeout")
    g = guide_for(p, _cfg("th"))
    assert len(g.facts) == 1
    assert "เปิดหน้านี้ไม่ได้" in g.facts[0]


# --- approval --------------------------------------------------------------
@pytest.mark.parametrize("otype,expected", [
    (OpportunityType.PROFILE, Approval.INSTANT),
    (OpportunityType.WEB2, Approval.INSTANT),
    (OpportunityType.BLOG_COMMENT, Approval.MODERATED),
    (OpportunityType.DIRECTORY, Approval.MODERATED),
    (OpportunityType.GUEST_POST, Approval.EDITORIAL),
    (OpportunityType.NEWS, Approval.EDITORIAL),
    (OpportunityType.LOCAL_CITATION, Approval.VERIFICATION),
])
def test_approval_expectations(otype, expected):
    assert approval_for(_prospect(otype, domain="x.test")) == expected


def test_approval_uses_domain_override():
    # Medium is a WEB2 site, and WEB2 is instant anyway — check a case where
    # the override actually differs from the type default.
    p = _prospect(OpportunityType.PROFILE, domain="trustpilot.com")
    assert approval_for(p) == Approval.VERIFICATION


def test_guide_serialises_for_the_web_ui():
    g = guide_for(_prospect(), _cfg("th"))
    d = g.to_dict()
    for key in ("approval", "steps", "facts", "language", "summary"):
        assert key in d
    assert isinstance(d["approval"], str)
