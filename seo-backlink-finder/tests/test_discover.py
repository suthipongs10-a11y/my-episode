from blf.discover import normalise_url, prospects_from_urls, discover
from blf.search_providers import ManualProvider


def test_normalise_strips_tracking_and_fragment():
    u = normalise_url("HTTPS://Www.Example.com/Path/?utm_source=x&id=5#frag")
    assert u == "https://www.example.com/Path?id=5"


def test_normalise_rejects_non_http():
    assert normalise_url("ftp://example.com") is None
    assert normalise_url("mailto:x@y.com") is None


def test_normalise_drops_only_default_ports():
    # default ports are dropped
    assert normalise_url("http://example.com:80/a") == "http://example.com/a"
    assert normalise_url("https://example.com:443/a") == "https://example.com/a"
    # non-default ports are preserved (regression: ':8099' was corrupted to '99')
    assert normalise_url("http://127.0.0.1:8099/coffee/") == "http://127.0.0.1:8099/coffee"
    assert normalise_url("https://example.com:8443/x") == "https://example.com:8443/x"


def test_prospects_dedup_and_own_domain():
    urls = [
        "https://good.com/a",
        "https://good.com/a",              # dup
        "https://mysite.com/self",         # own domain, skip
        "https://google.com/search?q=x",   # blocklisted
    ]
    out = prospects_from_urls(urls, own_domain="mysite.com")
    assert [p.url for p in out] == ["https://good.com/a"]


def test_prospects_respects_known():
    out = prospects_from_urls(["https://good.com/a"],
                              known_urls={"https://good.com/a"})
    assert out == []


def test_discover_with_manual_provider():
    provider = ManualProvider([
        "https://targeta.com/write-for-us",
        "https://targetb.com/resources",
    ])
    got = discover(provider, "coffee", ["guest_post"], ["en"],
                   results_per_query=10)
    urls = {p.url for p in got}
    assert "https://targeta.com/write-for-us" in urls
    assert "https://targetb.com/resources" in urls
    # category/type propagated from the footprint that ran
    assert all(p.category == "guest_post" for p in got)
