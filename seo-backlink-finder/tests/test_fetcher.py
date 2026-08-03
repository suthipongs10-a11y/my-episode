import urllib.error

import pytest

from blf.fetcher import Fetcher, _decode, _header_charset, _sniff_charset

THAI = "วิธีชงกาแฟดริปให้อร่อย"


def test_header_charset_parsing():
    assert _header_charset("text/html; charset=UTF-8") == "utf-8"
    assert _header_charset("text/html") is None
    assert _header_charset(None) is None


def test_sniff_meta_charset():
    raw = b'<html><head><meta charset="tis-620"></head>'
    assert _sniff_charset(raw) == "tis-620"


def test_sniff_bom():
    assert _sniff_charset(b"\xef\xbb\xbfhello") == "utf-8"


def test_decode_utf8_without_header_charset():
    # A server that sends text/html with NO charset must still decode UTF-8,
    # not mangle it as ISO-8859-1 (the bug that made Thai look like Vietnamese).
    raw = THAI.encode("utf-8")
    assert _decode(raw, None) == THAI


def test_decode_respects_meta_when_no_header():
    raw = ('<meta charset="utf-8">' + THAI).encode("utf-8")
    assert THAI in _decode(raw, None)


def test_decode_header_charset_wins():
    raw = THAI.encode("utf-8")
    assert _decode(raw, "utf-8") == THAI


# --- robots.txt handling ---------------------------------------------------
class _FakeHeaders:
    """Just enough of email.message.Message for the fetcher's two lookups."""

    def get(self, name, default=None):
        return "text/html; charset=utf-8" if name == "Content-Type" else default

    def get_content_charset(self):
        return "utf-8"


class _FakeResponse:
    def __init__(self, body: bytes, url: str = "https://mine.test/"):
        self._body = body
        self.headers = _FakeHeaders()
        self.status = 200
        self._url = url

    def read(self, n=None):
        return self._body

    def geturl(self):
        return self._url

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def test_robots_is_fetched_with_our_user_agent(monkeypatch):
    """urllib's default agent gets 403'd by WAFs, and RobotFileParser reads a
    403 as 'disallow everything' — so the agent we send decides the answer."""
    seen = {}

    def fake_urlopen(req, timeout=None):
        seen["ua"] = req.get_header("User-agent")
        return _FakeResponse(b"User-agent: *\nDisallow: /private\n")

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    f = Fetcher(user_agent="my-tool/1.0", respect_robots=True, delay=0)
    assert f.allowed("https://example.test/public") is True
    assert f.allowed("https://example.test/private") is False
    assert seen["ua"] == "my-tool/1.0"


def test_robots_403_disallows(monkeypatch):
    def fake_urlopen(req, timeout=None):
        raise urllib.error.HTTPError(req.full_url, 403, "Forbidden", {}, None)

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    f = Fetcher(respect_robots=True, delay=0)
    assert f.allowed("https://walled.test/page") is False


def test_robots_404_allows(monkeypatch):
    def fake_urlopen(req, timeout=None):
        raise urllib.error.HTTPError(req.full_url, 404, "Not Found", {}, None)

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    f = Fetcher(respect_robots=True, delay=0)
    assert f.allowed("https://norobots.test/page") is True


def test_robots_unreachable_allows(monkeypatch):
    def fake_urlopen(req, timeout=None):
        raise OSError("connection reset")

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    f = Fetcher(respect_robots=True, delay=0)
    assert f.allowed("https://flaky.test/page") is True


def test_robots_is_cached_per_host(monkeypatch):
    calls = []

    def fake_urlopen(req, timeout=None):
        calls.append(req.full_url)
        return _FakeResponse(b"User-agent: *\nDisallow:\n")

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    f = Fetcher(respect_robots=True, delay=0)
    f.allowed("https://example.test/a")
    f.allowed("https://example.test/b")
    assert len(calls) == 1


def test_ignore_robots_bypasses_a_full_disallow(monkeypatch):
    """Your own site is not a third party: `blf profile yoursite.com` must work
    even when that site's robots.txt tells crawlers to stay out."""
    def fake_urlopen(req, timeout=None):
        if req.full_url.endswith("/robots.txt"):
            return _FakeResponse(b"User-agent: *\nDisallow: /\n")
        return _FakeResponse(b"<html lang='en'><title>Mine</title></html>")

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    f = Fetcher(respect_robots=True, delay=0)
    f._session = None                       # force the urllib path

    blocked = f.get("https://mine.test/")
    assert blocked.ok is False
    assert "robots" in (blocked.error or "")

    allowed = f.get("https://mine.test/", ignore_robots=True)
    assert allowed.ok is True
    assert "Mine" in allowed.text
