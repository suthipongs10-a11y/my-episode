"""The match score: does a prospect actually fit MY site?

This is the question the user asked the tool to answer, so it gets its own
test file. The important property is ordering — a same-topic page must always
outrank an off-topic one, in Thai as well as English.
"""
import copy

from blf import score, textrank
from blf.config import Config, DEFAULTS
from blf.models import (Analysis, LinkAttribute, Metrics, OpportunityType,
                        Prospect)
from blf.profile import SiteProfile


def _cfg(topics):
    data = copy.deepcopy(DEFAULTS)
    data["site"]["topics"] = topics
    return Config(data)


def _profile(text, lang="en", topics=None, country=None):
    return SiteProfile(
        url="https://mysite.test", domain="mysite.test", language=lang,
        topics=topics or [], country=country,
        terms=dict(textrank.terms(text, lang).most_common(400)),
    )


def _prospect(title, body, lang="en", otype=OpportunityType.BLOG_COMMENT,
              authority=50.0):
    p = Prospect(url="https://target.test/post", domain="target.test",
                 opportunity_type=otype)
    p.analysis = Analysis(
        fetched=True, https=True, title=title, meta_description=title,
        content_lang=lang, link_attribute=LinkAttribute.DOFOLLOW,
        external_links=10,
        terms=dict(textrank.terms(f"{title} {title} {body}", lang).most_common(120)),
    )
    p.metrics = Metrics(authority=authority)
    return p


# --- English ---------------------------------------------------------------
def test_on_topic_beats_off_topic_english():
    prof = _profile("coffee brewing espresso pour over grind size beans",
                    "en", ["coffee brewing", "espresso"])
    cfg = _cfg(["coffee brewing", "espresso"])
    on = score.compute(_prospect("Pour over coffee brewing guide",
                                 "espresso grind size beans water"), cfg, prof)
    off = score.compute(_prospect("Mortgage refinance rates 2026",
                                  "loan interest debt payoff"), cfg, prof)
    assert on.match > off.match
    assert on.match > 50, on.match


# --- Thai ------------------------------------------------------------------
def test_on_topic_beats_off_topic_thai():
    prof = _profile("วางแผนชำระหนี้ คำนวณดอกเบี้ย รีไฟแนนซ์สินเชื่อ ปลดหนี้บัตรเครดิต",
                    "th", ["วางแผนชำระหนี้", "คำนวณดอกเบี้ย"], country="TH")
    cfg = _cfg(["วางแผนชำระหนี้", "คำนวณดอกเบี้ย"])
    on = score.compute(_prospect("ปลดหนี้บัตรเครดิตและวางแผนชำระหนี้",
                                 "คำนวณดอกเบี้ย รีไฟแนนซ์สินเชื่อบ้าน", "th"), cfg, prof)
    off = score.compute(_prospect("วิธีชงกาแฟดริปให้อร่อย",
                                  "เลือกเมล็ดกาแฟ อุณหภูมิน้ำ", "th"), cfg, prof)
    assert on.match > off.match
    assert on.match > 50, on.match


def test_same_language_scores_above_other_language():
    """Same topic, different language: still relevant, but less so."""
    prof = _profile("วางแผนชำระหนี้ คำนวณดอกเบี้ย สินเชื่อ", "th",
                    ["วางแผนชำระหนี้"], country="TH")
    cfg = _cfg(["วางแผนชำระหนี้"])
    th = score.compute(_prospect("วางแผนชำระหนี้", "คำนวณดอกเบี้ย", "th"), cfg, prof)
    en = score.compute(_prospect("Debt payoff planning", "interest calculator", "en"), cfg, prof)
    assert th.match > en.match


# --- behaviour of the component itself ------------------------------------
def test_match_is_zero_to_hundred():
    prof = _profile("anything at all", "en", ["anything"])
    cfg = _cfg(["anything"])
    s = score.compute(_prospect("something", "else"), cfg, prof)
    assert 0.0 <= s.match <= 100.0


def test_relevance_none_without_anything_to_compare():
    cfg = _cfg([])
    p = _prospect("x", "y")
    p.analysis.terms = {}
    assert score.relevance_score(p, [], None) is None


def test_profile_topics_are_used_even_if_config_empty():
    """A fresh `blf start` has no topics in config — the crawled profile must
    still drive relevance, or every prospect would score the same."""
    prof = _profile("coffee brewing espresso", "en", ["coffee brewing"])
    cfg = _cfg([])            # deliberately empty
    on = score.compute(_prospect("Coffee brewing guide", "espresso"), cfg, prof)
    off = score.compute(_prospect("Tax law updates", "audit filing"), cfg, prof)
    assert on.match > off.match


def test_high_authority_off_topic_does_not_beat_on_topic_on_match():
    prof = _profile("coffee brewing espresso", "en", ["coffee brewing"])
    cfg = _cfg(["coffee brewing"])
    strong_off = score.compute(
        _prospect("Global news today", "politics economy", authority=95.0), cfg, prof)
    weak_on = score.compute(
        _prospect("Coffee brewing at home", "espresso grind", authority=20.0), cfg, prof)
    assert weak_on.match > strong_off.match
