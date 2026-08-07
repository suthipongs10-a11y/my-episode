"""Whether a link on this page is worth anything, and whether it would hurt.

Two defects these cover, both of which the tool shipped with:

* A page Google will not index could score in the eighties. The operator
  spends an afternoon earning a link that cannot count, and nothing tells them.
* A link farm with decent authority and the right keywords also scored well.
  That link is not neutral — Google's link-scheme guidance treats it as a
  reason to discount a site — so the tool could recommend something worse than
  doing nothing.

Both are now ceilings rather than weighted components, and these tests exist to
keep them that way: a weighted penalty lets a strong authority score outvote
the veto, which is the exact failure being prevented.
"""
from __future__ import annotations

from blf import indexability, toxicity
from blf.analyze import analyze_html
from blf.models import LinkAttribute, OpportunityType, Prospect
from blf import score as score_mod


class Cfg(dict):
    """Minimal stand-in for the real config object."""

    def get(self, key, default=None):          # type: ignore[override]
        return {
            "scoring.quality_weights": {
                "authority": 0.3, "relevance": 0.3, "link_attribute": 0.15,
                "placement": 0.15, "trust": 0.1,
            },
            "scoring.quality_pref": 0.8,
            "scoring.tiers": {"A": 75, "B": 55, "C": 35},
            "site.topics": ["ทำความสะอาด"],
        }.get(key, default)


# ---------------------------------------------------------------------------
# indexability
# ---------------------------------------------------------------------------
class TestIndexability:
    def test_plain_page_is_indexable(self):
        r = indexability.assess("https://a.test/p", "<html><body>hi</body></html>",
                                robots_allows=True)
        assert r.indexable is not False
        assert not r.worthless

    def test_meta_noindex_is_caught(self):
        html = '<html><head><meta name="robots" content="noindex, follow"></head></html>'
        r = indexability.assess("https://a.test/p", html)
        assert r.indexable is False
        assert r.worthless
        assert any("noindex" in x for x in r.reasons)

    def test_content_none_means_noindex(self):
        html = '<html><head><meta name="robots" content="none"></head></html>'
        assert indexability.assess("https://a.test/p", html).indexable is False

    def test_googlebot_specific_directive_counts(self):
        html = '<html><head><meta name="googlebot" content="noindex"></head></html>'
        assert indexability.assess("https://a.test/p", html).indexable is False

    def test_x_robots_tag_header_is_caught(self):
        """The one a markup-only reader can never see."""
        r = indexability.assess("https://a.test/p", "<html></html>",
                                headers={"X-Robots-Tag": "noindex"})
        assert r.indexable is False

    def test_header_name_is_matched_case_insensitively(self):
        r = indexability.assess("https://a.test/p", "<html></html>",
                                headers={"x-robots-tag": "NOINDEX"})
        assert r.indexable is False

    def test_canonical_to_self_is_fine(self):
        for canonical in ("https://a.test/p", "http://www.a.test/p/", "/p"):
            html = f'<html><head><link rel="canonical" href="{canonical}"></head></html>'
            r = indexability.assess("https://a.test/p", html)
            assert not r.canonical_elsewhere, canonical

    def test_canonical_elsewhere_is_flagged(self):
        html = '<html><head><link rel="canonical" href="https://a.test/other"></head></html>'
        r = indexability.assess("https://a.test/p", html)
        assert r.canonical_elsewhere
        assert r.worthless

    def test_robots_txt_disallow_wins(self):
        r = indexability.assess("https://a.test/p", "<html></html>", robots_allows=False)
        assert r.indexable is False

    def test_unknown_stays_unknown(self):
        """No directives and no robots verdict: we did not measure this."""
        r = indexability.assess("https://a.test/p", "<html><body>x</body></html>")
        assert r.indexable is None
        assert not r.worthless

    def test_nofollow_all_is_separate_from_noindex(self):
        html = '<html><head><meta name="robots" content="index, nofollow"></head></html>'
        r = indexability.assess("https://a.test/p", html)
        assert r.indexable is True
        assert r.followable is False


# ---------------------------------------------------------------------------
# toxicity
# ---------------------------------------------------------------------------
class TestToxicity:
    def test_ordinary_article_is_clean(self):
        t = toxicity.assess(
            ["wikipedia.org", "bbc.co.uk"],
            "บทความเรื่องการทำความสะอาดบ้าน " * 40,
        )
        assert t.risk == 0.0
        assert not t.avoid

    def test_links_to_gambling_are_flagged(self):
        domains = ["casino-online.com", "slot888.net", "betting-pro.com", "news.test"]
        t = toxicity.assess(domains, "short text " * 30)
        assert t.avoid
        assert "casino" in t.verticals

    def test_thai_gambling_domains_are_caught(self):
        t = toxicity.assess(["บาคาร่า.com", "สล็อตออนไลน์.net"], "x " * 100)
        assert t.risk > 0

    def test_page_selling_links_is_flagged(self):
        t = toxicity.assess(["a.test"], "เรารับทำ seo และรับวางลิงก์ ราคาถูก " * 10)
        assert t.risk >= 0.3
        assert any("ขายลิงก์" in r for r in t.reasons)

    def test_link_dump_is_flagged(self):
        t = toxicity.assess([f"site{i}.test" for i in range(60)],
                            "a few words only", external_links=300)
        assert t.risk > 0
        assert any("ลิงก์ออกเยอะ" in r for r in t.reasons)

    def test_a_directory_is_allowed_to_be_link_dense(self):
        """Density is read against the type — a directory is a list by design."""
        many = [f"site{i}.test" for i in range(60)]
        article = toxicity.assess(many, "few words", external_links=300)
        directory = toxicity.assess(many, "few words", external_links=300,
                                    opportunity_type="directory")
        assert directory.risk < article.risk

    def test_thai_text_is_not_mistaken_for_a_link_dump(self):
        """Thai has no spaces; splitting on them would report ~1 word and make
        every Thai page look like a link farm."""
        thai = "บริการทำความสะอาดบ้านและคอนโดครบวงจรทีมงานมืออาชีพผ่านการอบรม" * 12
        t = toxicity.assess([f"s{i}.test" for i in range(8)], thai, external_links=8)
        assert t.risk == 0.0

    def test_reasons_always_accompany_a_risk(self):
        t = toxicity.assess(["casino-x.com", "casino-y.com"], "x " * 100)
        assert t.risk > 0 and t.reasons


# ---------------------------------------------------------------------------
# the effect on the ranking, which is the point
# ---------------------------------------------------------------------------
def _prospect(html: str, headers=None, authority=80.0) -> Prospect:
    p = Prospect(url="https://strong.test/page", domain="strong.test",
                 opportunity_type=OpportunityType.GUEST_POST)
    p.analysis = analyze_html(
        "https://strong.test/page", html,
        type_hint=OpportunityType.GUEST_POST, status=200,
        final_url="https://strong.test/page", headers=headers, robots_allows=True,
    )
    p.analysis.link_attribute = LinkAttribute.DOFOLLOW
    p.metrics.authority = authority
    p.metrics.domain_age_days = 4000
    return p


GOOD_PAGE = """<html><head><title>รับเขียนบทความ ทำความสะอาด</title>
<meta name="description" content="บทความเรื่องทำความสะอาดบ้าน"></head>
<body><p>{}</p><a href="https://wikipedia.org/x">ref</a></body></html>""".format(
    "เนื้อหาเรื่องการทำความสะอาดบ้านอย่างละเอียด " * 30)


class TestScoringVeto:
    def test_a_strong_page_scores_well(self):
        s = score_mod.compute(_prospect(GOOD_PAGE), Cfg())
        assert s.quality > 50, s.quality

    def test_the_same_page_with_noindex_collapses(self):
        noindex = GOOD_PAGE.replace("<head>", '<head><meta name="robots" content="noindex">')
        good = score_mod.compute(_prospect(GOOD_PAGE), Cfg())
        bad = score_mod.compute(_prospect(noindex), Cfg())
        assert bad.quality <= score_mod.NOINDEX_CEILING
        assert bad.quality < good.quality
        assert bad.tier == "D"

    def test_high_authority_cannot_outvote_the_veto(self):
        """The reason this is a ceiling and not a weighted penalty."""
        noindex = GOOD_PAGE.replace("<head>", '<head><meta name="robots" content="noindex">')
        s = score_mod.compute(_prospect(noindex, authority=100.0), Cfg())
        assert s.quality <= score_mod.NOINDEX_CEILING

    def test_x_robots_header_alone_is_enough(self):
        s = score_mod.compute(
            _prospect(GOOD_PAGE, headers={"x-robots-tag": "noindex"}), Cfg())
        assert s.quality <= score_mod.NOINDEX_CEILING

    def test_a_link_farm_is_capped(self):
        links = "".join(
            f'<a href="https://casino{i}.com/x">play</a>' for i in range(40))
        farm = f"<html><head><title>ทำความสะอาด</title></head><body>{links}</body></html>"
        s = score_mod.compute(_prospect(farm), Cfg())
        assert s.quality <= score_mod.TOXIC_CEILING

    def test_a_capped_prospect_always_explains_itself(self):
        """A drop from 84 to 5 with no reason reads as a broken tool."""
        noindex = GOOD_PAGE.replace("<head>", '<head><meta name="robots" content="noindex">')
        s = score_mod.compute(_prospect(noindex), Cfg())
        assert s.breakdown.get("_vetoes")
        assert any("ไม่ถูกนับ" in v for v in s.breakdown["_vetoes"])

    def test_an_unmeasured_page_is_not_penalised(self):
        """Same rule as everywhere else here: unknown is not failure."""
        bare = "<html><body>" + "ทำความสะอาดบ้าน " * 40 + "</body></html>"
        p = Prospect(url="https://x.test/p", domain="x.test",
                     opportunity_type=OpportunityType.GUEST_POST)
        p.analysis = analyze_html("https://x.test/p", bare, status=200)
        p.metrics.authority = 70.0
        s = score_mod.compute(p, Cfg())
        assert not s.breakdown.get("_vetoes")
