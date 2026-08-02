"""Third-party quality signals for a domain.

- Authority via Open PageRank (free API key, 0..100 after scaling).
- Registration age via RDAP (no key; JSON over HTTPS, works for most gTLDs).

Both are optional. Missing keys or network errors leave the field as None and
the scorer simply weights what it has.
"""
from __future__ import annotations

import json
import urllib.request
from datetime import datetime, timezone
from typing import Iterable, Optional

from .models import Metrics

try:
    import requests  # type: ignore
except Exception:  # pragma: no cover
    requests = None


class MetricsProvider:
    def __init__(self, openpagerank_key: Optional[str] = None,
                 use_rdap: bool = True, timeout: int = 15):
        self.opr_key = openpagerank_key
        self.use_rdap = use_rdap
        self.timeout = timeout

    # -- Open PageRank ------------------------------------------------------
    def authority_batch(self, domains: Iterable[str]) -> dict[str, float]:
        """Map domain -> authority 0..100. Empty dict if no key/unavailable."""
        domains = [d for d in dict.fromkeys(domains) if d]
        if not self.opr_key or not domains:
            return {}
        out: dict[str, float] = {}
        # Open PageRank accepts up to 100 domains per call.
        for i in range(0, len(domains), 100):
            chunk = domains[i:i + 100]
            params = "&".join(f"domains[]={d}" for d in chunk)
            url = f"https://openpagerank.com/api/v1.0/getPageRank?{params}"
            try:
                data = self._get_json(url, headers={"API-OPR": self.opr_key})
            except Exception:
                continue
            for row in (data or {}).get("response", []) or []:
                dom = row.get("domain")
                pr = row.get("page_rank_decimal")
                if dom is None or pr in (None, ""):
                    continue
                try:
                    out[dom] = round(float(pr) * 10.0, 1)  # 0..10 -> 0..100
                except (TypeError, ValueError):
                    continue
        return out

    # -- RDAP domain age ----------------------------------------------------
    def domain_age_days(self, domain: str) -> tuple[Optional[int], Optional[str]]:
        if not self.use_rdap or not domain:
            return (None, None)
        try:
            data = self._get_json(f"https://rdap.org/domain/{domain}")
        except Exception:
            return (None, None)
        created = None
        for ev in (data or {}).get("events", []) or []:
            if ev.get("eventAction") == "registration":
                created = ev.get("eventDate")
                break
        if not created:
            return (None, None)
        dt = _parse_iso(created)
        if dt is None:
            return (None, created)
        age = (datetime.now(timezone.utc) - dt).days
        return (max(age, 0), created)

    # -- combined -----------------------------------------------------------
    def enrich(self, domain: str, authority_cache: Optional[dict] = None) -> Metrics:
        m = Metrics()
        if authority_cache and domain in authority_cache:
            m.authority = authority_cache[domain]
            m.authority_source = "open_pagerank"
        age, created = self.domain_age_days(domain)
        m.domain_age_days = age
        m.domain_created = created
        return m

    # -- http helper --------------------------------------------------------
    def _get_json(self, url: str, headers: Optional[dict] = None):
        headers = headers or {}
        if requests is not None:
            resp = requests.get(url, headers=headers, timeout=self.timeout)
            resp.raise_for_status()
            return resp.json()
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            return json.loads(resp.read().decode("utf-8", errors="replace"))


def _parse_iso(s: str) -> Optional[datetime]:
    s = s.strip().replace("Z", "+00:00")
    for fmt in (None,):  # try fromisoformat first
        try:
            dt = datetime.fromisoformat(s)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            break
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d", "%Y-%m-%dT%H:%M:%S"):
        try:
            dt = datetime.strptime(s, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None
