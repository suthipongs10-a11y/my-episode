"""Provider auto-selection.

The trap this prevents: a user adds GOOGLE_CSE_KEY to their environment, runs
Start, and silently gets no search results because config.yaml still says
"manual". Adding a key must be enough on its own.
"""
import copy

import pytest

from blf.config import Config, DEFAULTS
from blf.search_providers import get_provider, resolve_provider_name


def _cfg():
    return Config(copy.deepcopy(DEFAULTS))


@pytest.fixture(autouse=True)
def _clear_keys(monkeypatch):
    for var in ("SERPAPI_KEY", "GOOGLE_CSE_KEY", "GOOGLE_CSE_CX"):
        monkeypatch.delenv(var, raising=False)


def test_default_is_auto():
    assert DEFAULTS["discovery"]["provider"] == "auto"


def test_auto_without_keys_falls_back_to_manual():
    assert resolve_provider_name("auto", _cfg()) == "manual"


def test_auto_picks_cse_when_only_cse_is_set(monkeypatch):
    monkeypatch.setenv("GOOGLE_CSE_KEY", "k")
    monkeypatch.setenv("GOOGLE_CSE_CX", "c")
    assert resolve_provider_name("auto", _cfg()) == "google_cse"


def test_auto_prefers_serpapi_when_both_are_set(monkeypatch):
    monkeypatch.setenv("SERPAPI_KEY", "s")
    monkeypatch.setenv("GOOGLE_CSE_KEY", "k")
    monkeypatch.setenv("GOOGLE_CSE_CX", "c")
    assert resolve_provider_name("auto", _cfg()) == "serpapi"


def test_stale_manual_config_is_upgraded_when_a_key_exists(monkeypatch):
    """The actual trap: config says manual, environment has a key."""
    monkeypatch.setenv("SERPAPI_KEY", "s")
    assert resolve_provider_name("manual", _cfg()) == "serpapi"


def test_incomplete_cse_credentials_do_not_activate_it(monkeypatch):
    monkeypatch.setenv("GOOGLE_CSE_KEY", "k")     # no CX
    assert resolve_provider_name("auto", _cfg()) == "manual"


def test_explicit_provider_is_respected(monkeypatch):
    monkeypatch.setenv("SERPAPI_KEY", "s")
    assert resolve_provider_name("google_cse", _cfg()) == "google_cse"


def test_none_stays_off_without_keys():
    assert resolve_provider_name("none", _cfg()) == "none"


def test_resolved_provider_is_actually_available(monkeypatch):
    monkeypatch.setenv("GOOGLE_CSE_KEY", "k")
    monkeypatch.setenv("GOOGLE_CSE_CX", "c")
    cfg = _cfg()
    name = resolve_provider_name("auto", cfg)
    assert get_provider(name, cfg).available() is True
