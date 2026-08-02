"""Glue: take a discovered prospect and fully enrich it.

fetch -> analyze -> metrics -> classify -> score. Kept separate from the CLI so
it can be driven from a script or a test with a fake fetcher/metrics provider.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from . import classify, score
from .analyze import analyze_html
from .fetcher import Fetcher
from .metrics import MetricsProvider
from .models import Analysis, Prospect, Status


def analyze_prospect(
    prospect: Prospect,
    fetcher: Fetcher,
    metrics_provider: Optional[MetricsProvider],
    cfg,
    authority_cache: Optional[dict] = None,
) -> Prospect:
    """Fully enrich one prospect in place and return it."""
    res = fetcher.get(prospect.url)
    if not res.ok:
        prospect.analysis = Analysis(fetched=False, http_status=res.status,
                                     error=res.error or "fetch failed")
        prospect.status = Status.REJECTED if res.error and "robots" in res.error \
            else prospect.status
        prospect.analyzed_at = _now()
        # Still score what we have (placement/ease from type) so it's rankable.
        prospect.scores = score.compute(prospect, cfg)
        return prospect

    prospect.analysis = analyze_html(
        prospect.url, res.text, type_hint=prospect.opportunity_type,
        status=res.status, final_url=res.final_url,
    )
    # metrics
    if metrics_provider is not None:
        prospect.metrics = metrics_provider.enrich(prospect.domain, authority_cache)
    # refine type from evidence, then score
    classify.apply(prospect)
    prospect.scores = score.compute(prospect, cfg)
    if prospect.status == Status.NEW:
        prospect.status = Status.QUALIFIED
    prospect.analyzed_at = _now()
    return prospect


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")
