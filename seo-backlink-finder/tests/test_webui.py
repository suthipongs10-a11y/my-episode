"""Web UI tests: start a real server on an ephemeral port and talk to it."""
import copy
import json
import socket
import threading
import urllib.request
from http.server import ThreadingHTTPServer

import pytest

from blf.config import Config, DEFAULTS
from blf.models import (Analysis, LinkAttribute, OpportunityType, Prospect,
                        Scores, Status)
from blf.store import Store
from blf.webui import PAGE, _State, _handler_factory


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture()
def server(tmp_path):
    db = str(tmp_path / "t.db")
    store = Store(db)
    p = Prospect(url="https://target.test/post", domain="target.test",
                 opportunity_type=OpportunityType.BLOG_COMMENT)
    p.analysis = Analysis(fetched=True, https=True, content_lang="th",
                          title="ปลดหนี้บัตรเครดิต",
                          link_attribute=LinkAttribute.NOFOLLOW,
                          comment_system="native", has_comment_form=True)
    p.scores = Scores(quality=60, ease=75, priority=63, match=71, tier="B")
    p.status = Status.QUALIFIED
    store.upsert(p)
    store.close()

    data = copy.deepcopy(DEFAULTS)
    data["storage"]["db_path"] = db
    data["site"].update({"url": "https://mysite.test", "name": "MySite",
                         "topics": ["ปลดหนี้"], "languages": ["th", "en"]})
    cfg = Config(data)

    port = _free_port()
    httpd = ThreadingHTTPServer(("127.0.0.1", port), _handler_factory(_State(cfg)))
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{port}"
    httpd.shutdown()
    httpd.server_close()


def _get(base, path):
    with urllib.request.urlopen(base + path, timeout=10) as r:
        return r.status, r.read().decode("utf-8")


def _post(base, path, payload):
    req = urllib.request.Request(
        base + path, data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))


def test_page_served(server):
    status, body = _get(server, "/")
    assert status == 200
    assert "Backlink Finder" in body


def test_page_is_self_contained():
    """No external requests: the UI has to work offline and behind a proxy."""
    for needle in ("<script src=", "<link rel=\"stylesheet\" href=", "cdn."):
        assert needle not in PAGE


def test_status_idle(server):
    status, body = _get(server, "/api/status")
    assert status == 200
    d = json.loads(body)
    assert d["phase"] == "idle"
    assert d["running"] is False


def test_results_returns_rows(server):
    status, body = _get(server, "/api/results")
    d = json.loads(body)
    assert status == 200
    assert d["stats"]["total"] == 1
    row = d["rows"][0]
    assert row["domain"] == "target.test"
    assert row["match"] == 71
    assert row["tier"] == "B"


def test_results_min_match_filter(server):
    _, body = _get(server, "/api/results?min_match=90")
    assert json.loads(body)["rows"] == []
    _, body = _get(server, "/api/results?min_match=50")
    assert len(json.loads(body)["rows"]) == 1


def test_draft_endpoint_uses_site_language(server):
    _, body = _get(server, "/api/draft?url=https://target.test/post&kind=comment")
    d = json.loads(body)
    assert d["language"] == "th"
    assert d["body"]
    assert d["checklist"]
    # nofollow comment section must warn
    assert any("nofollow" in w.lower() for w in d["warnings"])


def test_draft_unknown_url(server):
    _, body = _get(server, "/api/draft?url=https://nope.test/x")
    assert "error" in json.loads(body)


def test_status_set_moves_pipeline(server):
    code, d = _post(server, "/api/status-set",
                    {"url": "https://target.test/post", "state": "contacted"})
    assert code == 200 and d["ok"] is True
    _, body = _get(server, "/api/results")
    assert json.loads(body)["rows"][0]["status"] == "contacted"


def test_status_set_rejects_bad_state(server):
    _, d = _post(server, "/api/status-set",
                 {"url": "https://target.test/post", "state": "banana"})
    assert "error" in d


def test_start_requires_url(server):
    code, d = _post(server, "/api/start", {})
    assert code == 400
    assert "error" in d


def test_unknown_route_404(server):
    code, d = _post(server, "/api/nope", {})
    assert code == 404
