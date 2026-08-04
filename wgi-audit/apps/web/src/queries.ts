/**
 * Everything the dashboard reads.
 *
 * Read-only by design: the dashboard shows what a run produced and never edits
 * it. Starting a run goes through the same `jobs` table the CLI uses, so there
 * is exactly one way an audit begins no matter who asked for it.
 *
 * Scores are computed here from the stored snapshot's version, never re-derived
 * under today's formula — project rule #2. A report shown to a customer in
 * March has to still say in June what it said in March.
 */
import type { Db } from "@core/db/client.ts";
import { getFindings } from "@core/db/queries.ts";
import type { AreaScope, Finding, RunStatus, Stage } from "@core/types/index.ts";

export interface ScoreSnapshot {
  scoring_version: number;
  scores: Record<string, number>;
  inputs: Record<string, unknown>;
}

export interface AuditSummary {
  id: string;
  domain: string;
  areas: string[];
  areaScope: AreaScope;
  status: RunStatus;
  stage: Stage | null;
  error: string | null;
  createdAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  costThb: number;
  scoringVersion: number;
  /** Null while the run has not reached 12-scoring yet. */
  overall: number | null;
  findingsTotal: number;
  criticalTotal: number;
}

interface SummaryRow {
  id: string; domain: string; areas: string[] | null; area_scope: AreaScope;
  status: RunStatus; stage: Stage | null; error: string | null;
  created_at: string | null; started_at: string | null; finished_at: string | null;
  cost_thb: string | number | null; scoring_version: number;
  scores: unknown; findings_total: string | number; critical_total: string | number;
}

const SUMMARY_SELECT = `
  select r.id, r.status, r.stage, r.error, r.created_at, r.started_at, r.finished_at,
         r.cost_thb, r.scoring_version,
         c.domain, c.areas, c.area_scope,
         (select s.data from snapshots s
           where s.audit_run_id = r.id and s.kind = 'site' and s.target = 'scores'
           order by s.collected_at desc limit 1)                       as scores,
         (select count(*) from findings f where f.audit_run_id = r.id) as findings_total,
         (select count(*) from findings f
           where f.audit_run_id = r.id and f.severity = 'critical')    as critical_total
    from audit_runs r
    join clients c on c.id = r.client_id`;

function toSummary(r: SummaryRow): AuditSummary {
  const snap = parseJson<ScoreSnapshot>(r.scores);
  return {
    id: r.id,
    domain: r.domain,
    areas: r.areas ?? [],
    areaScope: r.area_scope,
    status: r.status,
    stage: r.stage,
    error: r.error,
    createdAt: r.created_at,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    costThb: Number(r.cost_thb ?? 0),
    scoringVersion: r.scoring_version,
    overall: snap?.scores.overall ?? null,
    findingsTotal: Number(r.findings_total),
    criticalTotal: Number(r.critical_total),
  };
}

export async function listAudits(db: Db, limit = 50): Promise<AuditSummary[]> {
  const rows = await db.query<SummaryRow>(
    `${SUMMARY_SELECT} order by r.created_at desc nulls last, r.id desc limit $1`,
    [limit],
  );
  return rows.map(toSummary);
}

export async function getAuditSummary(db: Db, id: string): Promise<AuditSummary | null> {
  const row = await db.one<SummaryRow>(`${SUMMARY_SELECT} where r.id = $1`, [id]);
  return row ? toSummary(row) : null;
}

// ---------------------------------------------------------------------------
export interface AuditDetail extends AuditSummary {
  snapshot: ScoreSnapshot | null;
  findings: Finding[];
  pages: { pageType: string; count: number }[];
  keywords: { term: string; intent: string | null; volume: number | null; position: number | null }[];
  competitors: { domain: string; source: string }[];
  spend: { provider: string; calls: number; cacheHits: number; costThb: number }[];
}

export async function getAuditDetail(db: Db, id: string): Promise<AuditDetail | null> {
  const summary = await getAuditSummary(db, id);
  if (!summary) return null;

  const snapshotRow = await db.one<{ data: unknown }>(
    `select data from snapshots
      where audit_run_id = $1 and kind = 'site' and target = 'scores'
      order by collected_at desc limit 1`,
    [id],
  );

  const pages = await db.query<{ page_type: string; n: string | number }>(
    `select page_type, count(*) as n from pages
      where audit_run_id = $1 and is_competitor = false
      group by page_type order by 2 desc`,
    [id],
  );

  // Rankings belong to the run; keywords belong to the client, so a keyword
  // added since this run has no ranking row and shows a blank position rather
  // than being dropped or shown as "not ranking".
  const keywords = await db.query<{
    term: string; intent: string | null; volume: number | null; position: number | null;
  }>(
    `select k.term, k.intent, k.volume, rk.position
       from keywords k
       join audit_runs r on r.id = $1
       left join rankings rk on rk.keyword_id = k.id and rk.audit_run_id = r.id
      where k.client_id = r.client_id
      order by rk.position asc nulls last, k.volume desc nulls last, k.term
      limit 30`,
    [id],
  );

  const competitors = await db.query<{ domain: string; source: string }>(
    `select co.domain, co.source from competitors co
       join audit_runs r on r.id = $1
      where co.client_id = r.client_id
      order by co.is_primary desc, co.domain`,
    [id],
  );

  const spend = await db.query<{
    provider: string; calls: string | number; cached: string | number; cost: string | number | null;
  }>(
    `select provider, count(*) as calls,
            count(*) filter (where cache_hit) as cached,
            coalesce(sum(cost_thb), 0) as cost
       from api_calls where audit_run_id = $1
      group by provider order by 4 desc, 1`,
    [id],
  );

  return {
    ...summary,
    snapshot: parseJson<ScoreSnapshot>(snapshotRow?.data),
    findings: await getFindings(db, id),
    pages: pages.map((p) => ({ pageType: p.page_type, count: Number(p.n) })),
    keywords,
    competitors,
    spend: spend.map((s) => ({
      provider: s.provider,
      calls: Number(s.calls),
      cacheHits: Number(s.cached),
      costThb: Number(s.cost ?? 0),
    })),
  };
}

/**
 * jsonb arrives parsed from both drivers, but a text column would arrive as a
 * string and fail a long way from here. Guarding costs nothing.
 */
function parseJson<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}
