"""Configuration loading: YAML file for settings, environment for secrets.

Secrets are read only from the environment, never the YAML, so config.yaml is
safe to commit. Sensible defaults mean the tool runs even with no config file.
"""
from __future__ import annotations

import copy
import os
from typing import Any, Optional

try:
    import yaml  # type: ignore
except Exception:  # pragma: no cover - yaml is a listed dep but degrade anyway
    yaml = None


DEFAULTS: dict[str, Any] = {
    "site": {
        "url": "https://example.com",
        "name": "Example",
        "topics": [],
        "languages": ["en"],
    },
    "discovery": {
        "provider": "auto",
        "results_per_query": 20,
        "categories": [
            "guest_post",
            "resource_page",
            "directory",
            "blog_comment",
            "forum",
            "qa",
            "profile",
        ],
    },
    "fetch": {
        "user_agent": "seo-backlink-finder/0.1 (+https://example.com/bot)",
        "timeout_seconds": 15,
        "respect_robots_txt": True,
        "delay_seconds": 1.0,
        "max_bytes": 3_000_000,
    },
    "scoring": {
        "quality_weights": {
            "authority": 0.35,
            "relevance": 0.30,
            "link_attribute": 0.15,
            "placement": 0.12,
            "trust": 0.08,
        },
        "quality_pref": 0.80,
        "tiers": {"A": 75, "B": 55, "C": 35},
    },
    "metrics": {
        "open_pagerank": True,
        "rdap_domain_age": True,
    },
    "assist": {
        "llm": False,
        "llm_model": "claude-fable-5",
        "guide_language": "",
        "human_review_required": True,
    },
    "storage": {
        "db_path": "backlinks.db",
    },
}


# Environment variables that hold secrets. Keyed by a short logical name.
SECRET_ENV = {
    "serpapi": "SERPAPI_KEY",
    "google_cse_key": "GOOGLE_CSE_KEY",
    "google_cse_cx": "GOOGLE_CSE_CX",
    "openpagerank": "OPENPAGERANK_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
}


def _deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge override into a copy of base."""
    out = copy.deepcopy(base)
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = copy.deepcopy(v)
    return out


class Config:
    """Merged view over defaults + YAML file + environment secrets."""

    def __init__(self, data: dict[str, Any]):
        self.data = data

    # -- dotted-path access, e.g. cfg.get("scoring.quality_pref") ------------
    def get(self, path: str, default: Any = None) -> Any:
        node: Any = self.data
        for part in path.split("."):
            if isinstance(node, dict) and part in node:
                node = node[part]
            else:
                return default
        return node

    def secret(self, name: str) -> Optional[str]:
        """Look up a secret by logical name (see SECRET_ENV) from the env."""
        env = SECRET_ENV.get(name, name)
        val = os.environ.get(env)
        return val or None

    @classmethod
    def load(cls, path: Optional[str] = None) -> "Config":
        data = copy.deepcopy(DEFAULTS)
        # Search order: explicit path, ./config.yaml, ./config.example.yaml
        candidates = [path] if path else []
        candidates += ["config.yaml", "config.example.yaml"]
        for cand in candidates:
            if cand and os.path.isfile(cand) and yaml is not None:
                with open(cand, "r", encoding="utf-8") as fh:
                    loaded = yaml.safe_load(fh) or {}
                data = _deep_merge(data, loaded)
                break
        return cls(data)
