"""Can Google see a link on this page at all?

A backlink works by being crawled and counted. On a page Google will not index,
it is worth **nothing** — not less, nothing — no matter how strong the domain,
how relevant the topic, or how followed the link.

Nothing in this tool checked for that. A `noindex` forum, a directory that
canonicalises every listing to its category page, a profile behind
`Disallow:` — all of them could score in the eighties and be recommended as a
priority target. That is the most expensive kind of wrong an SEO tool can be,
because the operator spends an afternoon earning a link that cannot work and
gets no feedback telling them so.

Four ways a page keeps itself out of the index, in the order they bite:

1. `<meta name="robots" content="noindex">` — the common one.
2. `X-Robots-Tag: noindex` in the response headers — invisible in the HTML, so
   a tool that only reads markup misses it entirely.
3. A canonical pointing at a *different* URL — the page is telling Google "count
   the other one instead", and links here are consolidated away from you.
4. robots.txt disallowing the path — Google will not fetch it, so it never sees
   the link.

Pure functions of what we already fetched. No network here.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Mapping, Optional
from urllib.parse import urljoin, urlsplit

# Directives that keep a page out of the index, and the one that kills links.
_NOINDEX = re.compile(r"\bnoindex\b", re.I)
_NOFOLLOW_ALL = re.compile(r"\bnofollow\b", re.I)
_NONE = re.compile(r"\bnone\b", re.I)   # "none" == noindex, nofollow

# Bots whose rules apply to us. A page may noindex a niche crawler and welcome
# Google; only Google's opinion decides whether the link counts.
_OUR_AGENTS = {"robots", "googlebot"}


@dataclass
class Indexability:
    """Whether a link placed on this page can be seen and counted."""

    indexable: Optional[bool] = None      # None = we could not tell
    followable: Optional[bool] = None
    reasons: list[str] = field(default_factory=list)
    canonical: Optional[str] = None
    canonical_elsewhere: bool = False

    @property
    def worthless(self) -> bool:
        """True only when we positively established the link cannot count."""
        return self.indexable is False or self.canonical_elsewhere

    def to_dict(self) -> dict:
        return {
            "indexable": self.indexable,
            "followable": self.followable,
            "reasons": list(self.reasons),
            "canonical": self.canonical,
            "canonical_elsewhere": self.canonical_elsewhere,
        }

    @classmethod
    def from_dict(cls, d: Optional[dict]) -> "Indexability":
        d = dict(d or {})
        known = {f for f in cls.__dataclass_fields__}
        return cls(**{k: v for k, v in d.items() if k in known})


def _meta_robots(html: str, soup=None) -> list[str]:
    """Every robots directive in the markup, for us or for everyone."""
    out: list[str] = []
    if soup is not None:
        for tag in soup.find_all("meta"):
            name = (tag.get("name") or tag.get("NAME") or "").strip().lower()
            if name in _OUR_AGENTS:
                out.append((tag.get("content") or "").strip())
        return [c for c in out if c]

    # Regex fallback, so a missing BeautifulSoup does not silently disable the
    # single most important check in this module.
    for m in re.finditer(r"<meta\b[^>]*>", html or "", re.I):
        tag = m.group(0)
        name = re.search(r'name\s*=\s*["\']?([\w-]+)', tag, re.I)
        if not name or name.group(1).lower() not in _OUR_AGENTS:
            continue
        content = re.search(r'content\s*=\s*["\']([^"\']*)["\']', tag, re.I)
        if content:
            out.append(content.group(1).strip())
    return out


def _canonical(html: str, soup=None) -> Optional[str]:
    if soup is not None:
        tag = soup.find("link", attrs={"rel": re.compile(r"^canonical$", re.I)})
        if tag and tag.get("href"):
            return str(tag.get("href")).strip()
        return None
    m = re.search(
        r'<link\b[^>]*rel\s*=\s*["\']?canonical["\']?[^>]*>', html or "", re.I)
    if not m:
        return None
    href = re.search(r'href\s*=\s*["\']([^"\']+)["\']', m.group(0), re.I)
    return href.group(1).strip() if href else None


def _same_page(a: str, b: str) -> bool:
    """Compare two URLs the way a canonical tag means them.

    Scheme, `www.`, a trailing slash and the fragment are all noise here — a
    page canonicalising to its own https/non-www form is not pointing away.
    """
    def key(u: str) -> tuple[str, str, str]:
        p = urlsplit(u)
        host = p.netloc.lower().removeprefix("www.")
        path = p.path.rstrip("/") or "/"
        return (host, path, p.query)
    try:
        return key(a) == key(b)
    except Exception:
        return a == b


def assess(
    url: str,
    html: str,
    headers: Optional[Mapping[str, str]] = None,
    soup=None,
    robots_allows: Optional[bool] = None,
) -> Indexability:
    """Decide whether a link on `url` can be indexed and followed.

    `robots_allows` is the caller's robots.txt verdict for this path; None when
    it was not checked. Unknown stays unknown — a page we could not judge must
    not be scored as if it failed, the same rule the rest of this codebase
    follows for missing signals.
    """
    out = Indexability()
    directives: list[str] = []

    # -- X-Robots-Tag: header-only, so markup-only tools never see it --------
    for name, value in (headers or {}).items():
        if name.lower() == "x-robots-tag" and value:
            directives.append(str(value))
            if _NOINDEX.search(value) or _NONE.search(value):
                out.reasons.append("ส่ง X-Robots-Tag: noindex มาใน header")

    meta = _meta_robots(html, soup)
    directives.extend(meta)
    if any(_NOINDEX.search(c) or _NONE.search(c) for c in meta):
        out.reasons.append("หน้านี้ใส่ meta robots noindex")

    blob = " ".join(directives)
    noindexed = bool(_NOINDEX.search(blob) or _NONE.search(blob))
    out.indexable = (not noindexed) if (directives or robots_allows is not None) else None
    out.followable = not bool(_NOFOLLOW_ALL.search(blob) or _NONE.search(blob)) \
        if directives else None

    # -- canonical pointing away ---------------------------------------------
    canonical = _canonical(html, soup)
    if canonical:
        absolute = urljoin(url, canonical)
        out.canonical = absolute
        if not _same_page(absolute, url):
            out.canonical_elsewhere = True
            out.reasons.append(f"canonical ชี้ไปหน้าอื่น ({absolute})")

    # -- robots.txt -----------------------------------------------------------
    if robots_allows is False:
        out.indexable = False
        out.reasons.append("robots.txt ปิดไม่ให้ Google เข้าหน้านี้")

    return out
