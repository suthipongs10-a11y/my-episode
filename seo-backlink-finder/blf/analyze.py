"""Read an HTML page and extract everything relevant to a backlink decision.

Pure function of (url, html): no network, so it is fully unit-testable. The
fetcher fetches; this module interprets. Uses BeautifulSoup when present and
falls back to regex parsing so it never hard-fails on a missing dependency.
"""
from __future__ import annotations

import re
from typing import Optional

from . import indexability, language, textrank, toxicity
from .models import Analysis, LinkAttribute, OpportunityType

try:
    from bs4 import BeautifulSoup  # type: ignore
except Exception:  # pragma: no cover
    BeautifulSoup = None

try:
    import tldextract  # type: ignore
    _EXTRACT = tldextract.TLDExtract(suffix_list_urls=())  # offline, cached
except Exception:  # pragma: no cover
    tldextract = None
    _EXTRACT = None


# --- platform / CMS signatures: (needle, platform) --------------------------
_PLATFORM_SIGNS = [
    ("wp-content", "WordPress"),
    ("wp-includes", "WordPress"),
    ("/wp-json/", "WordPress"),
    ("Drupal.settings", "Drupal"),
    ("sites/default/files", "Drupal"),
    ("/media/jui/", "Joomla"),
    ("com_content", "Joomla"),
    ("cdn.shopify.com", "Shopify"),
    ("static.squarespace", "Squarespace"),
    ("squarespace.com", "Squarespace"),
    ("wix.com", "Wix"),
    ("_wixCssStates", "Wix"),
    ("blogspot.", "Blogger"),
    ("blogger.com", "Blogger"),
    ("medium.com", "Medium"),
    ("ghost.io", "Ghost"),
    ("discourse", "Discourse"),
    ("phpbb", "phpBB"),
    ("vbulletin", "vBulletin"),
    ("xenforo", "XenForo"),
    ("xf-", "XenForo"),
    ("mybb", "MyBB"),
    ("simplemachines", "SMF"),
    ("mediawiki", "MediaWiki"),
    ("stackexchange", "StackExchange"),
    ("question2answer", "Question2Answer"),
]

# Forum/board platforms -> their user links are effectively nofollow.
_FORUM_PLATFORMS = {"phpBB", "vBulletin", "XenForo", "MyBB", "SMF", "Discourse"}

# Text footprints for "you can submit / contribute here" pages (EN + TH + more).
_SUBMIT_FOOTPRINTS = [
    "write for us", "guest post", "become a contributor", "submit a guest",
    "contribute to", "submit your site", "add your business", "add listing",
    "submit your story", "submit article", "suggest a resource",
    "เขียนบทความให้เรา", "รับเขียนบทความ", "ส่งบทความ", "ลงประกาศ", "เพิ่มธุรกิจ",
    "escribe para nosotros", "écrire pour nous", "schreib für uns",
]

_COMMENT_FOOTPRINTS = [
    "leave a comment", "leave a reply", "post a comment", "your comment",
    "add a comment", "แสดงความคิดเห็น", "ความคิดเห็น", "deja un comentario",
    "laisser un commentaire",
]

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_IPV4_RE = re.compile(r"^\d{1,3}(?:\.\d{1,3}){3}$")
_TAG_RE = re.compile(r"<[^>]+>")
_SCRIPT_STYLE_RE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.S | re.I)


def registrable_domain(url: str) -> str:
    """example.com from https://www.example.com/path.

    Uses the public suffix list so multi-part suffixes resolve correctly
    (example.co.uk, example.co.th). When the TLD is not on that list — a new
    gTLD the bundled snapshot predates, or a reserved name — tldextract reports
    no suffix at all, and taking its `domain` alone would yield "test" for
    "nothing.test". In that case fall back to the last two labels of the host,
    which is the right answer for any ordinary domain.
    """
    if _EXTRACT is not None:
        ext = _EXTRACT(url)
        if ext.domain and ext.suffix:
            return f"{ext.domain}.{ext.suffix}".lower()
    # No recognised suffix (or no tldextract): work from the host itself.
    host = re.sub(r"^https?://", "", url).split("/")[0].split("@")[-1]
    host = host.split(":")[0].lower().strip(".")
    # An IP address has no registrable part — the whole address IS the host.
    # Taking the last two labels would turn 127.0.0.1 into "0.1".
    if _IPV4_RE.match(host) or ":" in host:
        return host
    parts = [p for p in host.split(".") if p]
    return ".".join(parts[-2:]) if len(parts) >= 2 else host


def _visible_text(html: str, soup) -> str:
    if soup is not None:
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        return soup.get_text(" ", strip=True)
    stripped = _SCRIPT_STYLE_RE.sub(" ", html)
    return _TAG_RE.sub(" ", stripped)


def _detect_platform(html_lower: str) -> Optional[str]:
    for needle, platform in _PLATFORM_SIGNS:
        if needle.lower() in html_lower:
            return platform
    return None


def _detect_comment_system(html_lower: str, platform: Optional[str]) -> tuple[Optional[str], bool]:
    """Return (comment_system, has_comment_form)."""
    if "disqus" in html_lower and ("disqus_thread" in html_lower or "disqus.com/embed" in html_lower):
        return "disqus", True
    if "fb-comments" in html_lower or "connect.facebook.net" in html_lower and "comments" in html_lower:
        return "facebook", True
    native_markers = ["commentform", "id=\"respond\"", "id='respond'",
                      "leave a reply", "leave a comment", "แสดงความคิดเห็น",
                      "wp-comments-post.php", "comment-form"]
    if any(m in html_lower for m in native_markers):
        return "native", True
    return (None, False)


def _sample_links(soup, html: str, self_domain: str):
    """Yield (href, rel_list) for anchor tags. rel_list is lowercased tokens."""
    if soup is not None:
        for a in soup.find_all("a", href=True):
            rel = a.get("rel") or []
            if isinstance(rel, str):
                rel = rel.split()
            yield a["href"], [r.lower() for r in rel]
    else:
        for m in re.finditer(r"<a\b([^>]*)>", html, re.I):
            attrs = m.group(1)
            href_m = re.search(r'href\s*=\s*["\']([^"\']+)["\']', attrs, re.I)
            if not href_m:
                continue
            rel_m = re.search(r'rel\s*=\s*["\']([^"\']+)["\']', attrs, re.I)
            rel = rel_m.group(1).lower().split() if rel_m else []
            yield href_m.group(1), rel


def _infer_link_attribute(
    external_total: int,
    external_nofollow: int,
    external_ugc: int,
    comment_system: Optional[str],
    platform: Optional[str],
    type_hint: Optional[OpportunityType],
) -> LinkAttribute:
    # Structural priors first: user-generated areas are near-universally nofollow.
    if comment_system in ("disqus", "facebook"):
        return LinkAttribute.NOFOLLOW
    if type_hint in (OpportunityType.BLOG_COMMENT,):
        # Modern WordPress marks comment-author links rel="nofollow ugc".
        return LinkAttribute.UGC if external_ugc else LinkAttribute.NOFOLLOW
    if type_hint in (OpportunityType.FORUM, OpportunityType.PROFILE) or platform in _FORUM_PLATFORMS:
        return LinkAttribute.NOFOLLOW
    # Otherwise infer from the sampled external links.
    if external_total == 0:
        return LinkAttribute.UNKNOWN
    nofollow_ratio = external_nofollow / external_total
    if external_ugc and external_ugc >= external_nofollow:
        return LinkAttribute.UGC
    if nofollow_ratio >= 0.7:
        return LinkAttribute.NOFOLLOW
    if nofollow_ratio <= 0.3:
        return LinkAttribute.DOFOLLOW
    return LinkAttribute.UNKNOWN


def analyze_html(
    url: str,
    html: str,
    type_hint: Optional[OpportunityType] = None,
    status: Optional[int] = None,
    final_url: Optional[str] = None,
    headers: Optional[dict] = None,
    robots_allows: Optional[bool] = None,
) -> Analysis:
    """Interpret a page. `type_hint` is the opportunity type the footprint that
    found this URL suggested; it sharpens ambiguous link-attribute calls."""
    a = Analysis(fetched=True, http_status=status, final_url=final_url or url)
    a.https = (final_url or url).lower().startswith("https://")
    self_domain = registrable_domain(final_url or url)
    html = html or ""
    html_lower = html.lower()

    soup = None
    if BeautifulSoup is not None:
        try:
            soup = BeautifulSoup(html, "lxml")
        except Exception:
            try:
                soup = BeautifulSoup(html, "html.parser")
            except Exception:
                soup = None

    # Title + meta
    if soup is not None:
        if soup.title and soup.title.string:
            a.title = soup.title.string.strip()
        md = soup.find("meta", attrs={"name": "description"})
        if md and md.get("content"):
            a.meta_description = md["content"].strip()
        html_tag = soup.find("html")
        if html_tag and html_tag.get("lang"):
            a.declared_lang = html_tag["lang"].strip()
        if not a.declared_lang:
            cl = soup.find("meta", attrs={"http-equiv": re.compile("content-language", re.I)})
            if cl and cl.get("content"):
                a.declared_lang = cl["content"].strip()
    else:
        tm = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
        if tm:
            a.title = _TAG_RE.sub("", tm.group(1)).strip()
        lm = re.search(r'<html[^>]*\blang\s*=\s*["\']([^"\']+)["\']', html, re.I)
        if lm:
            a.declared_lang = lm.group(1).strip()

    # Language of the actual content
    text = _visible_text(html, soup)
    a.content_lang, a.lang_confidence = language.detect(text[:20000], a.declared_lang)

    # Term vector for topical matching. Title and description carry the page's
    # subject far more reliably than body text, so they are repeated to weight
    # them up before counting.
    weighted = " ".join(filter(None, [
        (a.title or "") * 3, (a.meta_description or "") * 2, text[:15000],
    ]))
    a.terms = dict(textrank.terms(weighted, a.content_lang).most_common(120))

    # Platform + comments
    a.platform = _detect_platform(html_lower)
    a.comment_system, a.has_comment_form = _detect_comment_system(html_lower, a.platform)

    # Submit / contribute affordances
    if any(fp in html_lower for fp in _SUBMIT_FOOTPRINTS):
        a.has_submit_form = True
        a.signals.append("submit/contribute footprint in page text")
    if a.has_comment_form:
        a.signals.append(f"comment system: {a.comment_system}")

    # Link analysis
    ext_total = ext_nofollow = ext_ugc = ext_dofollow = 0
    ext_domains: list[str] = []
    for href, rel in _sample_links(soup, html, self_domain):
        if href.startswith(("#", "mailto:", "javascript:", "tel:")):
            if href.startswith("mailto:") and not a.contact_email:
                a.contact_email = href[7:].split("?")[0].strip() or None
            continue
        if href.startswith(("http://", "https://")):
            dom = registrable_domain(href)
            if dom and dom != self_domain:
                ext_total += 1
                ext_domains.append(dom)
                if "sponsored" in rel:
                    pass  # sponsored links don't pass value; ignore for dofollow
                elif "nofollow" in rel:
                    ext_nofollow += 1
                    if "ugc" in rel:
                        ext_ugc += 1
                elif "ugc" in rel:
                    ext_ugc += 1
                else:
                    ext_dofollow += 1
        # contact page
        if a.contact_url is None and re.search(r"contact|ติดต่อ|contacto", href, re.I):
            a.contact_url = href

    a.external_links = ext_total
    a.external_dofollow = ext_dofollow
    a.external_domains = list(dict.fromkeys(ext_domains))[:200]
    a.link_attribute = _infer_link_attribute(
        ext_total, ext_nofollow, ext_ugc, a.comment_system, a.platform, type_hint
    )

    # Contact email from body text as a fallback (mailto preferred above)
    if not a.contact_email:
        m = _EMAIL_RE.search(text)
        if m:
            a.contact_email = m.group(0)

    if a.platform:
        a.signals.append(f"platform: {a.platform}")
    a.signals.append(f"external links: {ext_total} ({ext_dofollow} dofollow)")

    # -- can the link be seen, and is being here a liability? ----------------
    # Both run last, on everything gathered above. Either can veto a prospect
    # the rest of this function was happy with, which is the point of them.
    index = indexability.assess(
        final_url or url, html, headers=headers, soup=soup,
        robots_allows=robots_allows,
    )
    a.indexability = index.to_dict()
    for reason in index.reasons:
        a.signals.append(reason)

    tox = toxicity.assess(
        a.external_domains, text,
        opportunity_type=(type_hint.value if type_hint else None),
        external_links=ext_total,
    )
    a.toxicity = tox.to_dict()
    for reason in tox.reasons:
        a.signals.append(reason)

    return a
