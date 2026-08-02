import copy

from blf.config import Config, DEFAULTS
from blf.models import (Analysis, LinkAttribute, Metrics, OpportunityType,
                        Prospect)
from blf import score


def _cfg(topics=None):
    data = copy.deepcopy(DEFAULTS)
    data["site"]["topics"] = topics if topics is not None else ["tomato gardening"]
    return Config(data)


def _prospect(**kw):
    p = Prospect(url="https://gardenblog.com/tomatoes", domain="gardenblog.com")
    p.opportunity_type = kw.get("otype", OpportunityType.GUEST_POST)
    p.analysis = Analysis(
        fetched=True, https=kw.get("https", True),
        title=kw.get("title", "How to grow tomatoes"),
        meta_description=kw.get("desc", "A guide to tomato gardening"),
        link_attribute=kw.get("attr", LinkAttribute.DOFOLLOW),
        external_links=kw.get("ext", 10),
        content_lang="en",
    )
    p.metrics = Metrics(authority=kw.get("authority", None))
    return p


def test_high_quality_when_strong():
    cfg = _cfg()
    p = _prospect(authority=85, attr=LinkAttribute.DOFOLLOW,
                  otype=OpportunityType.GUEST_POST)
    s = score.compute(p, cfg)
    assert s.quality >= 75
    assert s.tier == "A"


def test_nofollow_comment_scores_lower_than_dofollow_guest():
    cfg = _cfg()
    good = score.compute(_prospect(authority=70, attr=LinkAttribute.DOFOLLOW,
                                   otype=OpportunityType.GUEST_POST), cfg)
    weak = score.compute(_prospect(authority=70, attr=LinkAttribute.NOFOLLOW,
                                   otype=OpportunityType.BLOG_COMMENT), cfg)
    assert good.quality > weak.quality


def test_missing_authority_renormalises():
    cfg = _cfg()
    p = _prospect(authority=None, attr=LinkAttribute.DOFOLLOW)
    s = score.compute(p, cfg)
    # authority dropped; weights of the other four should sum to 1.0
    used = s.breakdown["_weights_used"]
    assert "authority" not in used
    # stored weights are rounded to 3dp for display; the real normalisation is
    # exact, so allow a rounding tolerance here.
    assert abs(sum(used.values()) - 1.0) < 1e-2
    assert s.quality > 0


def test_relevance_none_when_no_topics():
    cfg = _cfg(topics=[])
    assert score.relevance_score(_prospect(), []) is None


def test_relevance_matches_topic():
    p = _prospect(title="Best tomato gardening tips", desc="grow tomato at home")
    r = score.relevance_score(p, ["tomato gardening"])
    assert r == 1.0


def test_ease_reflects_type():
    cfg = _cfg()
    easy = score.compute(_prospect(otype=OpportunityType.PROFILE), cfg)
    hard = score.compute(_prospect(otype=OpportunityType.GUEST_POST), cfg)
    assert easy.ease > hard.ease


def test_priority_is_quality_first():
    cfg = _cfg()
    # A low-quality but very easy prospect must not outrank a high-quality one.
    p_hi = _prospect(authority=90, otype=OpportunityType.GUEST_POST)
    p_lo = _prospect(authority=10, otype=OpportunityType.PROFILE,
                     attr=LinkAttribute.NOFOLLOW)
    s_hi = score.compute(p_hi, cfg)
    s_lo = score.compute(p_lo, cfg)
    assert s_hi.priority > s_lo.priority


def test_tier_boundaries():
    cfg = _cfg()
    assert score.tier_for(80, cfg) == "A"
    assert score.tier_for(60, cfg) == "B"
    assert score.tier_for(40, cfg) == "C"
    assert score.tier_for(10, cfg) == "D"
