"""Pluggable search backends for turning footprint queries into candidate URLs.

Providers:
  serpapi     - real Google results via serpapi.com   (SERPAPI_KEY)
  google_cse  - Google Custom Search JSON API          (GOOGLE_CSE_KEY + _CX)
  manual      - URLs you paste into a file after running footprints by hand
  none        - disabled; add prospects one by one with `blf add`

We deliberately do NOT scrape Google/Bing HTML directly: it violates their
terms, breaks constantly, and gets you blocked. Use an API, or the manual path.
"""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from typing import Optional

try:
    import requests  # type: ignore
except Exception:  # pragma: no cover
    requests = None


class SearchProvider:
    name = "base"

    def search(self, query: str, num: int = 20) -> list[str]:
        raise NotImplementedError

    def available(self) -> bool:
        return True

    # shared JSON GET
    def _get_json(self, url: str, timeout: int = 20):
        if requests is not None:
            r = requests.get(url, timeout=timeout)
            r.raise_for_status()
            return r.json()
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8", errors="replace"))


class NullProvider(SearchProvider):
    name = "none"

    def search(self, query: str, num: int = 20) -> list[str]:
        return []


class SerpApiProvider(SearchProvider):
    name = "serpapi"

    def __init__(self, api_key: str):
        self.api_key = api_key

    def available(self) -> bool:
        return bool(self.api_key)

    def search(self, query: str, num: int = 20) -> list[str]:
        params = urllib.parse.urlencode({
            "engine": "google", "q": query, "num": min(num, 100),
            "api_key": self.api_key,
        })
        try:
            data = self._get_json(f"https://serpapi.com/search.json?{params}")
        except Exception:
            return []
        return [r["link"] for r in data.get("organic_results", []) if r.get("link")]


class GoogleCseProvider(SearchProvider):
    name = "google_cse"

    def __init__(self, key: str, cx: str):
        self.key = key
        self.cx = cx

    def available(self) -> bool:
        return bool(self.key and self.cx)

    def search(self, query: str, num: int = 20) -> list[str]:
        urls: list[str] = []
        # CSE returns 10 per page; paginate with `start`.
        start = 1
        while len(urls) < num and start <= 91:
            params = urllib.parse.urlencode({
                "key": self.key, "cx": self.cx, "q": query,
                "num": min(10, num - len(urls)), "start": start,
            })
            try:
                data = self._get_json(
                    f"https://www.googleapis.com/customsearch/v1?{params}")
            except Exception:
                break
            items = data.get("items", []) or []
            if not items:
                break
            urls.extend(i["link"] for i in items if i.get("link"))
            start += 10
        return urls


class ManualProvider(SearchProvider):
    """Returns a fixed pool of URLs (from a pasted file), ignoring the query.

    Workflow: run `blf footprints --keyword X` to get the queries, run them in
    your browser, paste the result URLs into a file, then
    `blf discover --provider manual --input results.txt`.
    """
    name = "manual"

    def __init__(self, urls: list[str]):
        self._urls = urls
        self._served = False

    def search(self, query: str, num: int = 20) -> list[str]:
        # Serve the whole pool once; discover() dedups across queries anyway.
        if self._served:
            return []
        self._served = True
        return list(self._urls)


def load_urls_from_file(path: str) -> list[str]:
    urls = []
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line and line.lower().startswith(("http://", "https://")):
                urls.append(line)
    return urls


def get_provider(name: str, cfg, input_file: Optional[str] = None) -> SearchProvider:
    name = (name or "none").lower()
    if name == "serpapi":
        return SerpApiProvider(cfg.secret("serpapi") or "")
    if name == "google_cse":
        return GoogleCseProvider(cfg.secret("google_cse_key") or "",
                                 cfg.secret("google_cse_cx") or "")
    if name == "manual":
        urls = load_urls_from_file(input_file) if input_file else []
        return ManualProvider(urls)
    return NullProvider()
