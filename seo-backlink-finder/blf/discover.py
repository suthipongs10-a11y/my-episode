"""Turn footprint queries into a deduplicated list of prospect URLs.

Decoupled from storage: it takes a set of URLs already known and returns new
Prospect objects, so the CLI decides when to persist. URLs are normalised
(scheme, tracking params, fragments) and obvious non-targets are filtered out.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Callable, Iterable, Optional
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

from . import footprints
from .analyze import registrable_domain
from .footprints import CATEGORIES
from .models import Prospect, OpportunityType
from .search_providers import SearchProvider

# Domains that are never a usable backlink target (search engines, caches,
# platforms whose links we can't place, or that are their own separate flow).
_BLOCKLIST = {
    "google.com", "google.co.th", "bing.com", "duckduckgo.com", "yahoo.com",
    "webcache.googleusercontent.com", "translate.google.com", "youtube.com",
    "facebook.com", "instagram.com", "x.com", "twitter.com", "t.co",
    "pinterest.com", "linkedin.com", "amazon.com", "wikipedia.org",
}

_TRACKING_PREFIXES = ("utm_", "fbclid", "gclid", "mc_", "ref", "ref_", "source")


def normalise_url(url: str) -> Optional[str]:
    """Lowercase host, drop fragments and tracking params, strip trailing slash.
    Returns None for non-http(s) URLs."""
    try:
        p = urlparse(url.strip())
    except Exception:
        return None
    if p.scheme not in ("http", "https"):
        return None
    if not p.netloc:
        return None
    # Rebuild the host:port from parsed parts so we only drop the *default*
    # port for the scheme — a naive replace(":80") would corrupt ":8099".
    host = (p.hostname or p.netloc).lower()
    port = p.port
    if port is not None and not (
        (p.scheme == "http" and port == 80) or (p.scheme == "https" and port == 443)
    ):
        netloc = f"{host}:{port}"
    else:
        netloc = host
    query_pairs = [(k, v) for k, v in parse_qsl(p.query)
                   if not any(k.lower().startswith(t) for t in _TRACKING_PREFIXES)]
    query = urlencode(query_pairs)
    path = p.path.rstrip("/") or "/"
    return urlunparse((p.scheme, netloc, path, "", query, ""))


def _is_blocked(domain: str, own_domain: Optional[str]) -> bool:
    if own_domain and domain == own_domain:
        return True
    return domain in _BLOCKLIST


def discover(
    provider: SearchProvider,
    keyword: str,
    categories: list[str],
    langs: list[str],
    results_per_query: int = 20,
    known_urls: Optional[Iterable[str]] = None,
    own_domain: Optional[str] = None,
    on_query: Optional[Callable[[str, str, int], None]] = None,
) -> list[Prospect]:
    """Run each rendered footprint through the provider and build Prospects.

    `on_query(category, query, found)` is an optional progress callback.
    """
    known = set(known_urls or [])
    seen: set[str] = set(known)
    prospects: list[Prospect] = []
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    pairs = footprints.render_queries(keyword, categories, langs)
    for cat_key, query in pairs:
        try:
            raw_urls = provider.search(query, results_per_query)
        except Exception:
            raw_urls = []
        added = 0
        cat = CATEGORIES.get(cat_key)
        otype = cat.opportunity_type if cat else OpportunityType.UNKNOWN
        for raw in raw_urls:
            url = normalise_url(raw)
            if not url or url in seen:
                continue
            dom = registrable_domain(url)
            if _is_blocked(dom, own_domain):
                continue
            seen.add(url)
            prospects.append(Prospect(
                url=url, domain=dom, opportunity_type=otype,
                category=cat_key, source_query=query, discovered_at=now,
            ))
            added += 1
        if on_query:
            on_query(cat_key, query, added)
    return prospects


def prospects_from_urls(
    urls: Iterable[str],
    category: Optional[str] = None,
    known_urls: Optional[Iterable[str]] = None,
    own_domain: Optional[str] = None,
) -> list[Prospect]:
    """Build Prospects from a plain list of URLs (manual add / import)."""
    known = set(known_urls or [])
    seen = set(known)
    out: list[Prospect] = []
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    cat = CATEGORIES.get(category) if category else None
    otype = cat.opportunity_type if cat else OpportunityType.UNKNOWN
    for raw in urls:
        url = normalise_url(raw)
        if not url or url in seen:
            continue
        dom = registrable_domain(url)
        if _is_blocked(dom, own_domain):
            continue
        seen.add(url)
        out.append(Prospect(url=url, domain=dom, opportunity_type=otype,
                            category=category, discovered_at=now))
    return out
