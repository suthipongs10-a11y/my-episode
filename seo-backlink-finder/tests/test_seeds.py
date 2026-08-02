from blf import seeds
from blf.footprints import CATEGORIES


def test_every_seed_uses_a_real_category():
    for s in seeds.SEEDS:
        assert s.category in CATEGORIES, f"{s.url} -> unknown {s.category}"


def test_all_seed_urls_are_https():
    for s in seeds.SEEDS:
        assert s.url.startswith("https://"), s.url


def test_geo_seed_needs_matching_country():
    th = seeds.for_profile(categories=["local_citation"], langs=["th"], country="TH")
    assert any("yellowpages.co.th" in s.url for s in th)
    us = seeds.for_profile(categories=["local_citation"], langs=["en"], country="US")
    assert not any("yellowpages.co.th" in s.url for s in us)


def test_unknown_country_drops_geo_specific_seeds():
    got = seeds.for_profile(categories=["local_citation"], langs=["en"], country=None)
    assert all(s.geo is None for s in got)


def test_language_filter():
    th = seeds.for_profile(categories=["community"], langs=["th"], country="TH")
    urls = {s.url for s in th}
    assert any("pantip" in u for u in urls)
    # an English-only seed should not surface for a Thai-only site
    only_th = seeds.for_profile(categories=["community"], langs=["th"], country="TH")
    assert not any("news.ycombinator.com" in s.url for s in only_th)


def test_category_filter_and_grouping():
    picked = seeds.for_profile(categories=["web2"], langs=["en"])
    assert picked
    assert all(s.category == "web2" for s in picked)
    grouped = seeds.urls_by_category(picked)
    assert set(grouped) == {"web2"}


def test_covers_the_requested_types():
    """The user asked for these ten categories explicitly."""
    wanted = {"directory", "business_listing", "forum", "guest_post",
              "local_citation", "web2", "community", "profile", "blog", "news"}
    assert wanted <= set(CATEGORIES), wanted - set(CATEGORIES)
