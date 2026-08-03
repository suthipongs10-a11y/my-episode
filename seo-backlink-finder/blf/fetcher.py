"""Polite HTTP fetching.

Uses `requests` when available, falls back to urllib. Honours robots.txt by
default and rate-limits itself. A fetch never raises: failures come back as a
FetchResult with `ok=False` and an `error`, so batch runs don't abort midway.
"""
from __future__ import annotations

import re
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

# <meta charset=...> or <meta http-equiv="Content-Type" content="...charset=...">
_META_CHARSET_RE = re.compile(
    rb"""<meta[^>]+charset\s*=\s*["']?\s*([a-zA-Z0-9_\-]+)""", re.I)


def _sniff_charset(raw: bytes) -> Optional[str]:
    """Best-effort charset from a BOM or an HTML <meta charset> tag.

    Needed because when a server sends `text/html` with no charset, HTTP says
    to assume ISO-8859-1, which mangles the UTF-8 that most non-English pages
    actually use (a Thai page then looks like Vietnamese, etc.)."""
    if raw.startswith(b"\xef\xbb\xbf"):
        return "utf-8"
    if raw.startswith((b"\xff\xfe", b"\xfe\xff")):
        return "utf-16"
    m = _META_CHARSET_RE.search(raw[:4096])
    if m:
        try:
            return m.group(1).decode("ascii").lower()
        except Exception:
            return None
    return None


def _header_charset(content_type: Optional[str]) -> Optional[str]:
    """Charset from a Content-Type header, only if explicitly declared."""
    if content_type and "charset=" in content_type.lower():
        val = content_type.lower().split("charset=", 1)[1].split(";")[0]
        return val.strip().strip('"\'') or None
    return None


def _decode(raw: bytes, header_charset: Optional[str]) -> str:
    """Decode HTML bytes: explicit header charset first, then a sniffed one,
    then UTF-8 (the modern default), always tolerant of stray bytes."""
    for enc in (header_charset, _sniff_charset(raw), "utf-8"):
        if enc:
            try:
                return raw.decode(enc, errors="replace")
            except (LookupError, TypeError):
                continue
    return raw.decode("utf-8", errors="replace")

try:
    import requests  # type: ignore
except Exception:  # pragma: no cover
    requests = None


@dataclass
class FetchResult:
    url: str
    ok: bool = False
    status: Optional[int] = None
    final_url: Optional[str] = None
    text: str = ""
    content_type: Optional[str] = None
    elapsed: float = 0.0
    error: Optional[str] = None


class Fetcher:
    def __init__(
        self,
        user_agent: str = "seo-backlink-finder/0.1",
        timeout: int = 15,
        respect_robots: bool = True,
        delay: float = 1.0,
        max_bytes: int = 3_000_000,
    ):
        self.user_agent = user_agent
        self.timeout = timeout
        self.respect_robots = respect_robots
        self.delay = delay
        self.max_bytes = max_bytes
        self._robots_cache: dict[str, Optional[RobotFileParser]] = {}
        self._last_request_at = 0.0
        self._session = requests.Session() if requests else None
        if self._session:
            self._session.headers.update({"User-Agent": user_agent})

    # -- robots.txt ---------------------------------------------------------
    def _load_robots(self, base: str) -> Optional[RobotFileParser]:
        """Fetch and parse robots.txt using OUR user agent.

        `RobotFileParser.read()` fetches with urllib's default agent, which
        Cloudflare and most WAFs answer with 403 — and the parser treats 403 as
        "disallow everything". A site perfectly happy to be read then looks
        entirely off limits. Fetching it ourselves, with the same agent we use
        for pages, asks the question the site actually intends to answer.
        """
        rp = RobotFileParser()
        rp.set_url(base + "/robots.txt")
        req = urllib.request.Request(
            base + "/robots.txt", headers={"User-Agent": self.user_agent})
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                raw = resp.read(512_000)
            rp.parse(_decode(raw, resp.headers.get_content_charset()).splitlines())
            return rp
        except urllib.error.HTTPError as exc:
            if exc.code in (401, 403):
                # Even with a real agent we are refused. Treat as disallowed —
                # the page fetch would almost certainly fail the same way.
                rp.disallow_all = True
                return rp
            return None          # 404 and friends: no robots.txt, crawl freely
        except Exception:
            return None          # unreachable: do not let it block the run

    def allowed(self, url: str) -> bool:
        if not self.respect_robots:
            return True
        parsed = urlparse(url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        if base not in self._robots_cache:
            self._robots_cache[base] = self._load_robots(base)
        rp = self._robots_cache[base]
        if rp is None:
            return True
        try:
            return rp.can_fetch(self.user_agent, url)
        except Exception:
            return True

    # -- politeness ---------------------------------------------------------
    def _throttle(self) -> None:
        if self.delay <= 0:
            return
        wait = self._last_request_at + self.delay - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        self._last_request_at = time.monotonic()

    # -- fetch --------------------------------------------------------------
    def get(self, url: str, ignore_robots: bool = False) -> FetchResult:
        """Fetch a page. `ignore_robots` is for YOUR OWN site.

        robots.txt is a request from a site owner to visiting crawlers. When
        the site is yours and you explicitly asked this tool to read it, there
        is no third party to be polite to — and refusing would break the one
        step every run depends on. Third-party targets are never fetched this
        way."""
        if not url.lower().startswith(("http://", "https://")):
            url = "https://" + url
        if not ignore_robots and not self.allowed(url):
            return FetchResult(url=url, ok=False, error="blocked by robots.txt")
        self._throttle()
        start = time.monotonic()
        try:
            if self._session is not None:
                return self._get_requests(url, start)
            return self._get_urllib(url, start)
        except Exception as exc:  # last-resort guard
            return FetchResult(url=url, ok=False, error=str(exc),
                               elapsed=time.monotonic() - start)

    def _get_requests(self, url: str, start: float) -> FetchResult:
        try:
            resp = self._session.get(  # type: ignore[union-attr]
                url, timeout=self.timeout, stream=True, allow_redirects=True
            )
            ctype = resp.headers.get("Content-Type", "")
            if "html" not in ctype and "xml" not in ctype and ctype:
                resp.close()
                return FetchResult(url=url, ok=False, status=resp.status_code,
                                   final_url=str(resp.url), content_type=ctype,
                                   error=f"non-html content-type: {ctype}",
                                   elapsed=time.monotonic() - start)
            chunks, total = [], 0
            for chunk in resp.iter_content(8192, decode_unicode=False):
                if not chunk:
                    continue
                total += len(chunk)
                chunks.append(chunk)
                if total >= self.max_bytes:
                    break
            resp.close()
            raw = b"".join(chunks)
            text = _decode(raw, _header_charset(ctype))
            return FetchResult(
                url=url, ok=resp.ok, status=resp.status_code,
                final_url=str(resp.url), text=text, content_type=ctype,
                elapsed=time.monotonic() - start,
            )
        except requests.exceptions.RequestException as exc:  # type: ignore
            return FetchResult(url=url, ok=False, error=str(exc),
                               elapsed=time.monotonic() - start)

    def _get_urllib(self, url: str, start: float) -> FetchResult:
        req = urllib.request.Request(url, headers={"User-Agent": self.user_agent})
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                ctype = resp.headers.get("Content-Type", "")
                raw = resp.read(self.max_bytes)
                text = _decode(raw, resp.headers.get_content_charset())
                return FetchResult(
                    url=url, ok=True, status=resp.status,
                    final_url=resp.geturl(), text=text, content_type=ctype,
                    elapsed=time.monotonic() - start,
                )
        except urllib.error.HTTPError as exc:
            return FetchResult(url=url, ok=False, status=exc.code, error=str(exc),
                               elapsed=time.monotonic() - start)
        except Exception as exc:
            return FetchResult(url=url, ok=False, error=str(exc),
                               elapsed=time.monotonic() - start)
