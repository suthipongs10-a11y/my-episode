"""SQLite persistence and the outreach pipeline.

The full Prospect is stored as JSON for fidelity; the columns that you sort and
filter by are also denormalised so `rank`/`list` are fast and don't parse JSON.
Upsert is keyed by URL, so re-running discovery or analysis is idempotent.
"""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from typing import Iterable, Optional

from .models import Prospect, Status

_SCHEMA = """
CREATE TABLE IF NOT EXISTS prospects (
    url             TEXT PRIMARY KEY,
    domain          TEXT,
    opportunity_type TEXT,
    category        TEXT,
    status          TEXT,
    quality         REAL,
    ease            REAL,
    priority        REAL,
    match           REAL,
    tier            TEXT,
    authority       REAL,
    link_attribute  TEXT,
    content_lang    TEXT,
    has_comment_form INTEGER,
    contact_email   TEXT,
    notes           TEXT,
    discovered_at   TEXT,
    analyzed_at     TEXT,
    data            TEXT
);
CREATE INDEX IF NOT EXISTS idx_priority ON prospects(priority DESC);
CREATE INDEX IF NOT EXISTS idx_domain   ON prospects(domain);
CREATE INDEX IF NOT EXISTS idx_status   ON prospects(status);

-- Small key/value side table. Holds the site profile so that scoring, guides
-- and drafts stay consistent between runs instead of being recomputed (or
-- silently lost) every time the process restarts.
CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
);
"""


class Store:
    def __init__(self, path: str = "backlinks.db"):
        self.path = path
        self.conn = sqlite3.connect(path)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(_SCHEMA)
        self.conn.commit()

    def close(self) -> None:
        self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()

    # -- writes -------------------------------------------------------------
    def upsert(self, p: Prospect) -> None:
        a, m, s = p.analysis, p.metrics, p.scores
        self.conn.execute(
            """
            INSERT INTO prospects (url, domain, opportunity_type, category,
                status, quality, ease, priority, match, tier, authority,
                link_attribute, content_lang, has_comment_form, contact_email,
                notes, discovered_at, analyzed_at, data)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(url) DO UPDATE SET
                domain=excluded.domain,
                opportunity_type=excluded.opportunity_type,
                category=excluded.category,
                status=excluded.status,
                quality=excluded.quality, ease=excluded.ease,
                priority=excluded.priority, match=excluded.match,
                tier=excluded.tier,
                authority=excluded.authority,
                link_attribute=excluded.link_attribute,
                content_lang=excluded.content_lang,
                has_comment_form=excluded.has_comment_form,
                contact_email=excluded.contact_email,
                notes=excluded.notes,
                analyzed_at=excluded.analyzed_at,
                data=excluded.data
            """,
            (
                p.url, p.domain, p.opportunity_type.value, p.category,
                p.status.value, s.quality, s.ease, s.priority, s.match, s.tier,
                m.authority, a.link_attribute.value, a.content_lang,
                1 if a.has_comment_form else 0, a.contact_email, p.notes,
                p.discovered_at, p.analyzed_at, p.to_json(),
            ),
        )
        self.conn.commit()

    def upsert_many(self, prospects: Iterable[Prospect]) -> int:
        n = 0
        for p in prospects:
            self.upsert(p)
            n += 1
        return n

    def set_status(self, url: str, status: Status, note: Optional[str] = None) -> bool:
        row = self.get(url)
        if not row:
            return False
        row.status = status
        if note:
            row.notes = (row.notes + "\n" if row.notes else "") + note
        self.upsert(row)
        return True

    # -- key/value meta -----------------------------------------------------
    def set_meta(self, key: str, value) -> None:
        """Store a JSON-serialisable value under `key`."""
        self.conn.execute(
            "INSERT INTO meta (key, value) VALUES (?,?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, json.dumps(value, ensure_ascii=False)),
        )
        self.conn.commit()

    def get_meta(self, key: str, default=None):
        cur = self.conn.execute("SELECT value FROM meta WHERE key=?", (key,))
        row = cur.fetchone()
        if not row:
            return default
        try:
            return json.loads(row["value"])
        except (ValueError, TypeError):
            return default

    def set_analyzed_now(self, p: Prospect) -> None:
        p.analyzed_at = datetime.now(timezone.utc).isoformat(timespec="seconds")

    # -- reads --------------------------------------------------------------
    def get(self, url: str) -> Optional[Prospect]:
        cur = self.conn.execute("SELECT data FROM prospects WHERE url=?", (url,))
        row = cur.fetchone()
        return Prospect.from_dict(json.loads(row["data"])) if row else None

    def get_by_id(self, rowid: int) -> Optional[Prospect]:
        cur = self.conn.execute(
            "SELECT data FROM prospects WHERE rowid=?", (rowid,))
        row = cur.fetchone()
        return Prospect.from_dict(json.loads(row["data"])) if row else None

    def known_urls(self) -> set[str]:
        cur = self.conn.execute("SELECT url FROM prospects")
        return {r["url"] for r in cur.fetchall()}

    def all(
        self,
        status: Optional[str] = None,
        min_tier: Optional[str] = None,
        opportunity_type: Optional[str] = None,
        order_by: str = "priority",
        limit: Optional[int] = None,
        only_unanalyzed: bool = False,
        min_match: Optional[float] = None,
    ) -> list[Prospect]:
        clauses, params = [], []
        if status:
            clauses.append("status=?")
            params.append(status)
        if opportunity_type:
            clauses.append("opportunity_type=?")
            params.append(opportunity_type)
        if only_unanalyzed:
            clauses.append("analyzed_at IS NULL")
        if min_match is not None:
            clauses.append("match >= ?")
            params.append(min_match)
        if min_tier:
            allowed = _tiers_at_least(min_tier)
            clauses.append("tier IN (%s)" % ",".join("?" * len(allowed)))
            params.extend(allowed)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        order_col = {
            "priority": "priority", "quality": "quality", "ease": "ease",
            "match": "match", "authority": "authority", "domain": "domain",
        }.get(order_by, "priority")
        sql = f"SELECT data FROM prospects {where} ORDER BY {order_col} DESC"
        if limit:
            sql += " LIMIT ?"
            params.append(limit)
        cur = self.conn.execute(sql, params)
        return [Prospect.from_dict(json.loads(r["data"])) for r in cur.fetchall()]

    def rowid_of(self, url: str) -> Optional[int]:
        cur = self.conn.execute("SELECT rowid FROM prospects WHERE url=?", (url,))
        row = cur.fetchone()
        return row["rowid"] if row else None

    def stats(self) -> dict:
        out = {"total": 0, "by_tier": {}, "by_status": {}, "by_type": {}}
        cur = self.conn.execute("SELECT COUNT(*) c FROM prospects")
        out["total"] = cur.fetchone()["c"]
        for col, key in (("tier", "by_tier"), ("status", "by_status"),
                         ("opportunity_type", "by_type")):
            cur = self.conn.execute(
                f"SELECT {col} k, COUNT(*) c FROM prospects GROUP BY {col}")
            out[key] = {r["k"]: r["c"] for r in cur.fetchall()}
        return out


def _tiers_at_least(tier: str) -> list[str]:
    order = ["A", "B", "C", "D"]
    tier = tier.upper()
    if tier not in order:
        return order
    return order[: order.index(tier) + 1]
