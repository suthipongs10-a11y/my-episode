"""The Start button: URL in, ranked backlink targets out.

One function, `run_campaign`, does the whole thing:

    profile your site -> derive keywords -> discover targets -> analyze each
    -> score against your profile -> save -> report

It reports progress through a callback so the CLI can print it and the web UI
can stream it, and it is interruptible: a `should_stop` callable is checked
between every unit of work, and everything analysed so far is already in the
database, so stopping loses nothing.
"""
from __future__ import annotations

import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Optional

from . import pipeline, profile as profile_mod, seeds as seeds_mod
from .analyze import registrable_domain
from .discover import discover, prospects_from_urls
from .fetcher import Fetcher
from .metrics import MetricsProvider
from .models import Prospect, Status
from .profile import SiteProfile
from .search_providers import get_provider
from .store import Store


@dataclass
class Progress:
    """A snapshot of a running campaign, safe to serialise to JSON."""

    phase: str = "idle"          # profiling | discovering | analyzing | done | error
    message: str = ""
    done: int = 0
    total: int = 0
    found: int = 0
    analyzed: int = 0
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    error: Optional[str] = None
    profile: Optional[dict] = None
    log: list = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "phase": self.phase, "message": self.message,
            "done": self.done, "total": self.total,
            "found": self.found, "analyzed": self.analyzed,
            "started_at": self.started_at, "finished_at": self.finished_at,
            "error": self.error, "profile": self.profile,
            "log": self.log[-60:],
        }


class Campaign:
    """Owns one run. Thread-safe enough for the web UI: the worker thread
    writes, the HTTP thread reads a snapshot under a lock."""

    def __init__(self):
        self.progress = Progress()
        self._lock = threading.Lock()
        self._stop = threading.Event()

    def snapshot(self) -> dict:
        with self._lock:
            return self.progress.to_dict()

    def stop(self) -> None:
        self._stop.set()

    def should_stop(self) -> bool:
        return self._stop.is_set()

    def emit(self, message: str = "", **fields) -> None:
        with self._lock:
            p = self.progress
            for k, v in fields.items():
                setattr(p, k, v)
            if message:
                p.message = message
                stamp = datetime.now(timezone.utc).strftime("%H:%M:%S")
                p.log.append(f"[{stamp}] {message}")


def _fetcher_from_cfg(cfg) -> Fetcher:
    return Fetcher(
        user_agent=cfg.get("fetch.user_agent", "seo-backlink-finder/0.1"),
        timeout=cfg.get("fetch.timeout_seconds", 15),
        respect_robots=cfg.get("fetch.respect_robots_txt", True),
        delay=cfg.get("fetch.delay_seconds", 1.0),
        max_bytes=cfg.get("fetch.max_bytes", 3_000_000),
    )


def run_campaign(
    site_url: str,
    cfg,
    campaign: Optional[Campaign] = None,
    max_targets: int = 60,
    categories: Optional[list[str]] = None,
    use_seeds: bool = True,
    profile_pages: int = 6,
    on_event: Optional[Callable[[str], None]] = None,
) -> dict:
    """Profile a site, find backlink targets for it, score them, and store them.

    Returns a summary dict. Everything it learns is persisted as it goes, so an
    interrupted run leaves usable results behind.
    """
    campaign = campaign or Campaign()

    def emit(msg: str, **fields):
        campaign.emit(msg, **fields)
        if on_event:
            on_event(msg)

    campaign.emit(phase="profiling",
                  started_at=datetime.now(timezone.utc).isoformat(timespec="seconds"))
    fetcher = _fetcher_from_cfg(cfg)
    store = Store(cfg.get("storage.db_path", "backlinks.db"))

    try:
        # ---------------------------------------------------------------
        # 1. Understand the site we are building links for.
        # ---------------------------------------------------------------
        emit(f"Profiling {site_url}…")
        prof = profile_mod.build_profile(
            site_url, fetcher, max_pages=profile_pages,
            on_progress=lambda m: emit(f"  {m}"),
        )
        campaign.emit(profile=prof.to_dict())
        if prof.topics:
            emit(f"Topics detected: {', '.join(prof.topics[:6])}")
        else:
            emit("No topics could be extracted — falling back to the domain name.")
        emit(f"Language: {prof.language}"
             + (f" · Country: {prof.country}" if prof.country else "")
             + (" · looks like a local business" if prof.is_local_business else ""))
        if prof.seed_keywords:
            emit(f"Search keywords: {', '.join(prof.seed_keywords)}")

        cats = categories or prof.categories
        own_domain = prof.domain

        if campaign.should_stop():
            return _finish(campaign, store, prof, emit, stopped=True)

        # ---------------------------------------------------------------
        # 2. Find candidate pages.
        # ---------------------------------------------------------------
        campaign.emit(phase="discovering")
        known = store.known_urls()
        found: list[Prospect] = []

        # 2a. Search discovery, when a provider is configured.
        provider_name = cfg.get("discovery.provider", "manual")
        provider = get_provider(provider_name, cfg, None)
        if provider_name not in ("manual", "none") and provider.available():
            emit(f"Searching with {provider_name}…")
            per_query = cfg.get("discovery.results_per_query", 20)
            for kw in prof.seed_keywords[:4]:
                if campaign.should_stop():
                    break
                got = discover(
                    provider, kw, cats, prof.languages,
                    results_per_query=per_query,
                    known_urls=known | {p.url for p in found},
                    own_domain=own_domain,
                    on_query=lambda c, q, n: (
                        emit(f"  +{n} from {c}: {q}") if n else None),
                )
                found.extend(got)
                emit(f"  '{kw}' → {len(got)} new targets", found=len(found))
        else:
            emit(f"No search provider configured ({provider_name}) — "
                 "using the built-in platform catalog only. "
                 "Add SERPAPI_KEY or GOOGLE_CSE_KEY to find niche targets.")

        # 2b. The always-available catalog.
        if use_seeds and not campaign.should_stop():
            picked = seeds_mod.for_profile(
                categories=cats, langs=prof.languages, country=prof.country)
            emit(f"Adding {len(picked)} platforms from the catalog…")
            for s in picked:
                built = prospects_from_urls(
                    [s.url], category=s.category,
                    known_urls=known | {p.url for p in found},
                    own_domain=own_domain,
                )
                for p in built:
                    p.notes = s.note
                    p.source_query = "catalog"
                found.extend(built)

        for p in found:
            store.upsert(p)
        campaign.emit(found=len(found))
        emit(f"Found {len(found)} new targets.")

        if campaign.should_stop():
            return _finish(campaign, store, prof, emit, stopped=True)

        # ---------------------------------------------------------------
        # 3. Analyze and score each target against the profile.
        # ---------------------------------------------------------------
        campaign.emit(phase="analyzing")
        targets = store.all(only_unanalyzed=True, limit=max_targets)
        campaign.emit(total=len(targets), done=0)

        mp = None
        authority_cache: dict = {}
        if cfg.get("metrics.open_pagerank", True) or cfg.get("metrics.rdap_domain_age", True):
            mp = MetricsProvider(
                openpagerank_key=(cfg.secret("openpagerank")
                                  if cfg.get("metrics.open_pagerank", True) else None),
                use_rdap=cfg.get("metrics.rdap_domain_age", True),
                timeout=cfg.get("fetch.timeout_seconds", 15),
            )
            if cfg.secret("openpagerank") and targets:
                doms = sorted({p.domain for p in targets})
                emit(f"Looking up domain authority for {len(doms)} domains…")
                authority_cache = mp.authority_batch(doms)

        emit(f"Analyzing {len(targets)} targets…")
        analyzed = 0
        for i, p in enumerate(targets, 1):
            if campaign.should_stop():
                emit("Stopped by request.")
                break
            pipeline.analyze_prospect(p, fetcher, mp, cfg, authority_cache,
                                      profile=prof)
            store.upsert(p)
            analyzed += 1
            campaign.emit(done=i, analyzed=analyzed)
            if p.analysis.error:
                emit(f"  [{i}/{len(targets)}] {p.domain} — {p.analysis.error}")
            else:
                emit(f"  [{i}/{len(targets)}] {p.scores.tier} {p.domain} — "
                     f"quality {p.scores.quality}, match {p.scores.match}")

        return _finish(campaign, store, prof, emit,
                       stopped=campaign.should_stop())

    except Exception as exc:  # keep the UI honest instead of hanging
        campaign.emit(f"Error: {exc}", phase="error", error=str(exc),
                      finished_at=datetime.now(timezone.utc).isoformat(timespec="seconds"))
        if on_event:
            on_event(f"Error: {exc}")
        return {"error": str(exc)}
    finally:
        store.close()


def _finish(campaign: Campaign, store: Store, prof: SiteProfile, emit, stopped=False):
    stats = store.stats()
    top = store.all(order_by="priority", limit=10)
    campaign.emit(
        "Stopped." if stopped else "Done.",
        phase="done",
        finished_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
    )
    return {
        "profile": prof.to_dict(),
        "stats": stats,
        "top": [p.to_dict() for p in top],
        "stopped": stopped,
    }
