import os
import tempfile

from blf.models import Analysis, LinkAttribute, Metrics, OpportunityType, Prospect, Scores, Status
from blf.store import Store, _tiers_at_least


def _prospect(url="https://a.com/x"):
    p = Prospect(url=url, domain="a.com", opportunity_type=OpportunityType.GUEST_POST,
                 category="guest_post")
    p.analysis = Analysis(fetched=True, content_lang="en",
                          link_attribute=LinkAttribute.DOFOLLOW,
                          contact_email="e@a.com", has_comment_form=False)
    p.metrics = Metrics(authority=72.0)
    p.scores = Scores(quality=80, ease=20, priority=62, tier="A")
    return p


def test_roundtrip_and_status():
    with tempfile.TemporaryDirectory() as d:
        db = os.path.join(d, "t.db")
        store = Store(db)
        store.upsert(_prospect())
        got = store.get("https://a.com/x")
        assert got is not None
        assert got.domain == "a.com"
        assert got.metrics.authority == 72.0
        assert got.opportunity_type == OpportunityType.GUEST_POST

        assert store.known_urls() == {"https://a.com/x"}

        store.set_status("https://a.com/x", Status.CONTACTED, note="sent email")
        again = store.get("https://a.com/x")
        assert again.status == Status.CONTACTED
        assert "sent email" in again.notes
        store.close()


def test_upsert_is_idempotent():
    with tempfile.TemporaryDirectory() as d:
        store = Store(os.path.join(d, "t.db"))
        store.upsert(_prospect())
        store.upsert(_prospect())  # same URL again
        assert store.stats()["total"] == 1
        store.close()


def test_filters_and_stats():
    with tempfile.TemporaryDirectory() as d:
        store = Store(os.path.join(d, "t.db"))
        a = _prospect("https://a.com/x")
        b = _prospect("https://b.com/y")
        b.domain = "b.com"
        b.scores = Scores(quality=40, ease=70, priority=49, tier="C")
        b.opportunity_type = OpportunityType.DIRECTORY
        store.upsert(a)
        store.upsert(b)

        top = store.all(min_tier="B")
        assert [p.url for p in top] == ["https://a.com/x"]

        directories = store.all(opportunity_type="directory")
        assert [p.url for p in directories] == ["https://b.com/y"]

        st = store.stats()
        assert st["total"] == 2
        assert st["by_tier"].get("A") == 1
        store.close()


def test_get_by_id():
    with tempfile.TemporaryDirectory() as d:
        store = Store(os.path.join(d, "t.db"))
        store.upsert(_prospect())
        rid = store.rowid_of("https://a.com/x")
        assert rid is not None
        assert store.get_by_id(rid).url == "https://a.com/x"
        store.close()


def test_tiers_at_least():
    assert _tiers_at_least("B") == ["A", "B"]
    assert _tiers_at_least("A") == ["A"]
