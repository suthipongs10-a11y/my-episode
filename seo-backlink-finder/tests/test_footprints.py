from blf import footprints
from blf.models import OpportunityType


def test_all_keys_nonempty():
    keys = footprints.all_keys()
    assert "guest_post" in keys
    assert "blog_comment" in keys
    assert len(keys) >= 8


def test_render_substitutes_keyword():
    pairs = footprints.render_queries("coffee", ["guest_post"], ["en"])
    assert pairs
    assert all("coffee" in q or "coffee" in cat for cat, q in pairs)
    joined = " ".join(q for _, q in pairs)
    assert "write for us" in joined


def test_thai_templates_present():
    pairs = footprints.render_queries("กาแฟ", ["guest_post"], ["th"])
    joined = " ".join(q for _, q in pairs)
    assert "เขียนบทความให้เรา" in joined


def test_category_metadata():
    c = footprints.category("guest_post")
    assert c.opportunity_type == OpportunityType.GUEST_POST
    assert 0 <= c.base_ease <= 100
    assert 0 <= c.placement_rank <= 100


def test_unknown_category_skipped():
    pairs = footprints.render_queries("x", ["does_not_exist", "forum"], ["en"])
    assert all(cat == "forum" for cat, _ in pairs)
