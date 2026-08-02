"""Read YOUR site and work out what to search for.

This is the "press Start" step. Given nothing but a URL, it crawls a handful
of the site's own pages, and answers:

* What is this site about?      -> topics + keyphrases, ranked
* What language does it speak?  -> drives the search footprints and the drafts
* Where does it operate?        -> country/city, so local citations are useful
* What is it called?            -> brand name, for citations and outreach
* Which backlink types fit it?  -> a local shop wants citations; a SaaS blog
                                   wants guest posts and communities

The output is a SiteProfile, which the scorer then uses to answer the question
"how well does this prospect match MY site" for every target we find.
"""
from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

from . import language, textrank
from .analyze import registrable_domain
from .fetcher import Fetcher

try:
    from bs4 import BeautifulSoup  # type: ignore
except Exception:  # pragma: no cover
    BeautifulSoup = None

_TAG_RE = re.compile(r"<[^>]+>")
_SCRIPT_STYLE_RE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.S | re.I)

# ccTLD -> country code, for the obvious cases. A .th domain is a Thai business.
_CCTLD_COUNTRY = {
    "th": "TH", "sg": "SG", "my": "MY", "vn": "VN", "id": "ID", "ph": "PH",
    "jp": "JP", "kr": "KR", "cn": "CN", "in": "IN", "au": "AU", "nz": "NZ",
    "uk": "GB", "de": "DE", "fr": "FR", "es": "ES", "it": "IT", "nl": "NL",
    "br": "BR", "mx": "MX", "ca": "CA", "ru": "RU",
}

# Address/contact markers that suggest a physical, local business.
_LOCAL_MARKERS = [
    "address", "opening hours", "visit us", "our store", "directions",
    "ที่อยู่", "เวลาทำการ", "แผนที่", "สาขา", "โทร",
]

_PHONE_RE = re.compile(r"(?:\+\d{1,3}[\s\-]?)?(?:\(?\d{2,4}\)?[\s\-]?){2,4}\d{2,4}")
_CURRENCY_HINTS = {"฿": "TH", "บาท": "TH", "€": "EU", "£": "GB", "¥": "JP",
                   "₫": "VN", "RM": "MY", "S$": "SG", "₹": "IN"}

# Which opportunity categories make sense for which kind of site.
_ALWAYS = ["guest_post", "resource_page", "blog", "directory", "web2",
           "profile", "community", "qa", "forum", "blog_comment"]
_LOCAL_EXTRA = ["local_citation", "business_listing"]
_NEWSWORTHY_EXTRA = ["news"]


@dataclass
class SiteProfile:
    url: str
    domain: str = ""
    brand: str = ""
    title: str = ""
    description: str = ""
    language: str = "en"
    languages: list[str] = field(default_factory=list)
    country: Optional[str] = None
    is_local_business: bool = False
    topics: list[str] = field(default_factory=list)          # top keyphrases
    keyphrases: list[tuple] = field(default_factory=list)    # (phrase, score)
    seed_keywords: list[str] = field(default_factory=list)   # what to search
    categories: list[str] = field(default_factory=list)      # which types fit
    terms: dict = field(default_factory=dict)                # term vector
    pages_read: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["keyphrases"] = [list(k) for k in self.keyphrases]
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "SiteProfile":
        d = dict(d or {})
        known = {f for f in cls.__dataclass_fields__}
        d = {k: v for k, v in d.items() if k in known}
        if "keyphrases" in d:
            d["keyphrases"] = [tuple(k) for k in d["keyphrases"]]
        return cls(**d)

    def save(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(self.to_dict(), fh, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, path: str) -> "SiteProfile":
        with open(path, "r", encoding="utf-8") as fh:
            return cls.from_dict(json.load(fh))


def _text_of(html: str, soup) -> str:
    if soup is not None:
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        return soup.get_text(" ", strip=True)
    return _TAG_RE.sub(" ", _SCRIPT_STYLE_RE.sub(" ", html))


def _soup(html: str):
    if BeautifulSoup is None:
        return None
    try:
        return BeautifulSoup(html, "lxml")
    except Exception:
        try:
            return BeautifulSoup(html, "html.parser")
        except Exception:
            return None


def _internal_links(soup, html: str, base_url: str, domain: str) -> list[str]:
    """Same-domain links, most-informative pages first."""
    hrefs: list[str] = []
    if soup is not None:
        hrefs = [a.get("href") for a in soup.find_all("a", href=True)]
    else:
        hrefs = re.findall(r'href\s*=\s*["\']([^"\']+)["\']', html, re.I)
    out, seen = [], set()
    for href in hrefs:
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        full = urljoin(base_url, href)
        if registrable_domain(full) != domain:
            continue
        full = full.split("#")[0]
        if full in seen:
            continue
        seen.add(full)
        out.append(full)
    # Prefer pages that describe the business over legal/boilerplate ones.
    def rank(u: str) -> int:
        low = u.lower()
        if re.search(r"/(about|services?|products?|solutions?|เกี่ยวกับ|บริการ)", low):
            return 0
        if re.search(r"/(blog|articles?|news|resources?)", low):
            return 1
        if re.search(r"/(privacy|terms|cookie|login|signin|cart|checkout)", low):
            return 9
        return 4
    out.sort(key=rank)
    return out


def _sitemap_urls(fetcher: Fetcher, base: str, limit: int = 20) -> list[str]:
    """A few URLs from sitemap.xml, if there is one."""
    res = fetcher.get(urljoin(base, "/sitemap.xml"))
    if not res.ok or not res.text:
        return []
    locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", res.text, re.I)
    # A sitemap index points at more sitemaps; follow only the first.
    if locs and locs[0].lower().endswith(".xml"):
        res2 = fetcher.get(locs[0])
        if res2.ok:
            locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", res2.text, re.I)
    return locs[:limit]


def build_profile(
    url: str,
    fetcher: Fetcher,
    max_pages: int = 6,
    on_progress=None,
) -> SiteProfile:
    """Crawl a few pages of `url` and describe the site."""
    if not url.lower().startswith(("http://", "https://")):
        url = "https://" + url
    domain = registrable_domain(url)
    prof = SiteProfile(url=url, domain=domain)

    def progress(msg: str) -> None:
        if on_progress:
            on_progress(msg)

    progress(f"reading {domain}")
    home = fetcher.get(url)
    if not home.ok:
        prof.notes.append(f"could not read the homepage: {home.error}")
        # Still return something usable: guess from the domain name itself.
        prof.brand = domain.split(".")[0].replace("-", " ").title()
        prof.topics = [prof.brand.lower()]
        prof.seed_keywords = [prof.brand.lower()]
        prof.categories = list(_ALWAYS)
        return prof

    base_url = home.final_url or url
    pages: list[tuple[str, str]] = [(base_url, home.text)]
    prof.pages_read.append(base_url)

    # Pick a few more pages: internal nav first, sitemap as a backup.
    soup_home = _soup(home.text)
    candidates = _internal_links(soup_home, home.text, base_url, domain)
    if len(candidates) < 3:
        candidates += _sitemap_urls(fetcher, base_url)
    for link in candidates:
        if len(pages) >= max_pages:
            break
        if link in prof.pages_read:
            continue
        progress(f"reading {urlparse(link).path or '/'}")
        res = fetcher.get(link)
        if res.ok and res.text:
            pages.append((res.final_url or link, res.text))
            prof.pages_read.append(res.final_url or link)

    # --- pull structured bits out of every page ---------------------------
    titles, descs, headings, anchors, bodies = [], [], [], [], []
    declared_langs: list[str] = []
    for page_url, html in pages:
        soup = _soup(html)
        if soup is not None:
            if soup.title and soup.title.string:
                titles.append(soup.title.string.strip())
            md = soup.find("meta", attrs={"name": "description"})
            if md and md.get("content"):
                descs.append(md["content"].strip())
            og = soup.find("meta", attrs={"property": "og:site_name"})
            if og and og.get("content") and not prof.brand:
                prof.brand = og["content"].strip()
            kw = soup.find("meta", attrs={"name": "keywords"})
            if kw and kw.get("content"):
                descs.append(kw["content"].strip())
            html_tag = soup.find("html")
            if html_tag and html_tag.get("lang"):
                declared_langs.append(html_tag["lang"])
            for level in ("h1", "h2", "h3"):
                headings.extend(h.get_text(" ", strip=True)
                                for h in soup.find_all(level))
            anchors.extend(a.get_text(" ", strip=True)
                           for a in soup.find_all("a")[:120])
        else:
            tm = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
            if tm:
                titles.append(_TAG_RE.sub("", tm.group(1)).strip())
        bodies.append(_text_of(html, soup))

    all_text = " ".join(bodies)
    prof.title = titles[0] if titles else ""
    prof.description = descs[0] if descs else ""

    # --- language ---------------------------------------------------------
    declared = declared_langs[0] if declared_langs else None
    lang, conf = language.detect(all_text[:20000], declared)
    prof.language = lang
    prof.languages = [lang] if lang == "en" else [lang, "en"]
    if conf < 0.4:
        prof.notes.append(
            f"language detection was uncertain ({conf}); assuming {lang}")

    # --- brand ------------------------------------------------------------
    if not prof.brand:
        prof.brand = _guess_brand(prof.title, domain)

    # --- keyphrases -> topics --------------------------------------------
    # Weighting reflects where a site states its own subject most reliably.
    # The homepage title outranks sub-page titles ("About — Brand" describes the
    # page, not the business), and navigation anchors repeat on every page, so
    # they are deduplicated and weighted low or they drown out the real topic.
    uniq_anchors = list(dict.fromkeys(a for a in anchors if a))
    sources = (
        [(titles[0], 8.0)] if titles else []
    ) + (
        [(t, 2.5) for t in titles[1:]]
        + [(d, 5.0) for d in descs]
        + [(h, 3.0) for h in headings[:60]]
        + [(a, 0.3) for a in uniq_anchors[:80]]
        + [(all_text[:12000], 1.0)]
    )
    phrases = textrank.keyphrases(sources, lang=lang, limit=18)
    # Drop the brand itself: it describes who, not what.
    brand_low = prof.brand.lower()
    phrases = [(p, s) for p, s in phrases
               if p != brand_low and p not in domain and len(p) > 2]
    prof.keyphrases = phrases
    prof.topics = [p for p, _ in phrases[:8]]
    prof.terms = dict(textrank.terms(
        " ".join(titles + descs + headings[:60]) + " " + all_text[:20000],
        lang=lang).most_common(400))

    # --- geography --------------------------------------------------------
    prof.country = _guess_country(domain, all_text, lang)
    prof.is_local_business = _looks_local(all_text)

    # --- which categories are worth searching -----------------------------
    cats = list(_ALWAYS)
    if prof.is_local_business:
        cats = _LOCAL_EXTRA + cats
        prof.notes.append("looks like a local business — local citations "
                          "and business listings were prioritised")
    else:
        cats = cats + _LOCAL_EXTRA
    cats += _NEWSWORTHY_EXTRA
    prof.categories = cats

    # --- what to actually type into a search box --------------------------
    prof.seed_keywords = _seed_keywords(prof)

    progress(f"profiled {domain}: {len(prof.topics)} topics, lang={lang}")
    return prof


def _guess_brand(title: str, domain: str) -> str:
    """Brand name from the title's trailing segment, else the domain."""
    if title:
        # "Article name — Brand" / "Brand | tagline"
        parts = re.split(r"\s[|\-–—·]\s", title)
        if len(parts) > 1:
            tail = parts[-1].strip()
            head = parts[0].strip()
            pick = tail if len(tail) <= len(head) else head
            if 2 <= len(pick) <= 40:
                return pick
        if len(title) <= 40:
            return title.strip()
    return domain.split(".")[0].replace("-", " ").title()


def _guess_country(domain: str, text: str, lang: str) -> Optional[str]:
    tld = domain.rsplit(".", 1)[-1].lower()
    if tld in _CCTLD_COUNTRY:
        return _CCTLD_COUNTRY[tld]
    # co.th, com.au etc.
    parts = domain.split(".")
    if len(parts) >= 3 and parts[-1] in _CCTLD_COUNTRY:
        return _CCTLD_COUNTRY[parts[-1]]
    sample = text[:8000]
    for token, country in _CURRENCY_HINTS.items():
        if token in sample:
            return country
    if lang == "th":
        return "TH"
    return None


def _looks_local(text: str) -> bool:
    """Does this site serve customers at a physical place?"""
    sample = text[:12000].lower()
    hits = sum(1 for m in _LOCAL_MARKERS if m in sample)
    has_phone = bool(_PHONE_RE.search(sample))
    return hits >= 2 or (hits >= 1 and has_phone)


def _seed_keywords(prof: SiteProfile, limit: int = 6) -> list[str]:
    """The search terms to expand footprints with.

    Short, generic-enough-to-have-competitors phrases work best: "coffee
    brewing" finds sites that accept guest posts about coffee brewing;
    "the ultimate coffee brewing guide for 2026" finds nothing.
    """
    # Thai/CJK phrases have no spaces, so cap them by characters instead of
    # words — 26 chars is roughly a three-word Thai noun phrase.
    ngram_lang = textrank.needs_ngrams(prof.language)
    out: list[str] = []
    for phrase, _score in prof.keyphrases:
        if ngram_lang:
            if not (4 <= len(phrase) <= 26):
                continue
        else:
            if len(phrase.split()) > 3 or not (3 <= len(phrase) <= 35):
                continue
        if phrase in out:
            continue
        # Skip a phrase already covered by one we kept — searching both
        # "debt payoff" and "debt payoff plan" mostly returns the same pages.
        if any(phrase in kept or kept in phrase for kept in out):
            continue
        out.append(phrase)
        if len(out) >= limit:
            break
    if not out and prof.title:
        out = [prof.title.split()[0].lower()]
    return out
