/**
 * Every query the pipeline needs, in one place.
 *
 * Hand-written SQL rather than an ORM: schema.sql stays the single description
 * of the data, and the SQL that runs is the SQL you read.
 */
import { json, type Db } from "./client.ts";
import { CURRENT_SCORING_VERSION } from "../scoring/index.ts";
import type {
  AreaScope, AuditRun, Client, Finding, JobStatus, RunStatus, Stage,
} from "../types/index.ts";

// ---------------------------------------------------------------------------
// clients
// ---------------------------------------------------------------------------
export interface NewClient {
  domain: string;
  areaScope: AreaScope;
  areas?: string[];
  name?: string;
  businessType?: string;
  contactPhone?: string;
  contactLine?: string;
  contactEmail?: string;
  leadSource?: string;
}

export async function createClient(db: Db, input: NewClient): Promise<Client> {
  const row = await db.one<Client>(
    `insert into clients
       (name, domain, business_type, area_scope, areas,
        contact_phone, contact_line, contact_email, lead_source)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     returning *`,
    [
      input.name ?? null,
      input.domain,
      input.businessType ?? null,
      input.areaScope,
      input.areas ?? [],
      input.contactPhone ?? null,
      input.contactLine ?? null,
      input.contactEmail ?? null,
      input.leadSource ?? null,
    ],
  );
  if (!row) throw new Error("createClient: insert returned no row");
  return row;
}

export async function findClientByDomain(db: Db, domain: string): Promise<Client | null> {
  return db.one<Client>(
    `select * from clients where domain = $1 order by created_at desc limit 1`,
    [domain],
  );
}

/** Reuse a client for a domain if one exists, so repeat audits share history. */
export async function upsertClient(db: Db, input: NewClient): Promise<Client> {
  const existing = await findClientByDomain(db, input.domain);
  if (!existing) return createClient(db, input);

  const row = await db.one<Client>(
    `update clients
        set area_scope = $2,
            areas      = $3,
            name          = coalesce($4, name),
            business_type = coalesce($5, business_type),
            contact_phone = coalesce($6, contact_phone),
            contact_line  = coalesce($7, contact_line),
            contact_email = coalesce($8, contact_email)
      where id = $1
      returning *`,
    [
      existing.id,
      input.areaScope,
      input.areas ?? existing.areas,
      input.name ?? null,
      input.businessType ?? null,
      input.contactPhone ?? null,
      input.contactLine ?? null,
      input.contactEmail ?? null,
    ],
  );
  if (!row) throw new Error("upsertClient: update returned no row");
  return row;
}

// ---------------------------------------------------------------------------
// audit runs
// ---------------------------------------------------------------------------
/**
 * New runs get the current formula version, recorded on the row. Stage 12 reads
 * it back rather than using the newest, so a run resumed after a version bump
 * still scores under the formula it started with.
 */
export async function createAuditRun(
  db: Db, clientId: string, scoringVersion: number = CURRENT_SCORING_VERSION,
): Promise<AuditRun> {
  const row = await db.one<AuditRun>(
    `insert into audit_runs (client_id, scoring_version) values ($1,$2) returning *`,
    [clientId, scoringVersion],
  );
  if (!row) throw new Error("createAuditRun: insert returned no row");
  return row;
}

export async function getAuditRun(db: Db, id: string): Promise<AuditRun | null> {
  return db.one<AuditRun>(`select * from audit_runs where id = $1`, [id]);
}

export async function markRunStarted(db: Db, id: string): Promise<void> {
  await db.query(
    `update audit_runs set status = 'running', started_at = now() where id = $1`, [id],
  );
}

/** Record the stage that just completed — this is what makes a run resumable. */
export async function setRunStage(db: Db, id: string, stage: Stage): Promise<void> {
  await db.query(`update audit_runs set stage = $2 where id = $1`, [id, stage]);
}

export async function finishRun(
  db: Db, id: string, status: Extract<RunStatus, "done" | "failed">, error?: string,
): Promise<void> {
  await db.query(
    `update audit_runs
        set status = $2, error = $3, finished_at = now()
      where id = $1`,
    [id, status, error ?? null],
  );
}

// ---------------------------------------------------------------------------
// jobs
// ---------------------------------------------------------------------------
export interface JobRow {
  id: string | number;
  audit_run_id: string;
  status: JobStatus;
  attempts: number;
  locked_at: string | null;
}

export async function enqueueJob(db: Db, auditRunId: string): Promise<JobRow> {
  const row = await db.one<JobRow>(
    `insert into jobs (audit_run_id) values ($1) returning *`, [auditRunId],
  );
  if (!row) throw new Error("enqueueJob: insert returned no row");
  return row;
}

/**
 * Claim one pending job.
 *
 * The UPDATE ... WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED) shape means two
 * workers can poll the same table without handing the same job to both.
 */
export async function claimJob(db: Db): Promise<JobRow | null> {
  return db.one<JobRow>(
    `update jobs
        set status = 'running', attempts = attempts + 1, locked_at = now()
      where id = (
        select id from jobs
         where status = 'pending'
         order by created_at
         for update skip locked
         limit 1
      )
      returning *`,
  );
}

export async function completeJob(
  db: Db, id: string | number, status: Extract<JobStatus, "done" | "failed">,
): Promise<void> {
  await db.query(`update jobs set status = $2 where id = $1`, [id, status]);
}

// ---------------------------------------------------------------------------
// snapshots — raw data, written once per stage
// ---------------------------------------------------------------------------
export async function saveSnapshot(
  db: Db, auditRunId: string, kind: string, target: string, data: unknown,
): Promise<void> {
  // `json(...)` rather than JSON.stringify: see the note on JsonParam. Getting
  // this wrong stores a jsonb *string*, which reads back fine in JavaScript and
  // is invisible to every SQL query that looks inside it.
  await db.query(
    `insert into snapshots (audit_run_id, kind, target, data) values ($1,$2,$3,$4::jsonb)`,
    [auditRunId, kind, target, json(data)],
  );
}

export async function getSnapshots<T = unknown>(
  db: Db, auditRunId: string, kind: string,
): Promise<{ target: string; data: T }[]> {
  const rows = await db.query<{ target: string; data: T }>(
    `select target, data from snapshots
      where audit_run_id = $1 and kind = $2
      order by collected_at`,
    [auditRunId, kind],
  );
  // postgres.js returns jsonb already parsed; PGlite does too. Guard anyway,
  // because a text column would arrive as a string and fail far from here.
  return rows.map((r) => ({
    target: r.target,
    data: (typeof r.data === "string" ? JSON.parse(r.data) : r.data) as T,
  }));
}

// ---------------------------------------------------------------------------
// findings
// ---------------------------------------------------------------------------
export async function saveFindings(
  db: Db, auditRunId: string, findings: Finding[],
): Promise<void> {
  for (const [i, f] of findings.entries()) {
    await db.query(
      `insert into findings
         (audit_run_id, code, category, severity, evidence,
          affected_urls, effort_hours, impact_score, priority_rank)
       values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9)`,
      [
        auditRunId, f.code, f.category, f.severity, json(f.evidence),
        f.affectedUrls ?? [], f.effortHours ?? null, f.impactScore ?? null, i + 1,
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// keywords, rankings, competitors — M3
// ---------------------------------------------------------------------------
export interface KeywordInput {
  term: string;
  area?: string | null;
  intent?: string | null;
  source?: "generated" | "manual";
  volume?: number | null;
  volumeSource?: string | null;
}

export interface KeywordRow {
  id: string;
  term: string;
  area: string | null;
  intent: string | null;
  source: string | null;
  volume: number | null;
}

/**
 * Replace the generated keyword list for a client, returning the stored rows.
 *
 * Generated keywords are derived from the site and should track it, so a second
 * audit replaces them. Anything a human added by hand (`source = 'manual'`)
 * survives — losing an operator's own edits to an automated re-run is the kind
 * of thing that gets a tool switched off.
 */
export async function replaceGeneratedKeywords(
  db: Db, clientId: string, keywords: KeywordInput[],
): Promise<KeywordRow[]> {
  await db.query(`delete from keywords where client_id = $1 and source = 'generated'`, [
    clientId,
  ]);

  const out: KeywordRow[] = [];
  for (const k of keywords) {
    const row = await db.one<KeywordRow>(
      `insert into keywords (client_id, term, area, intent, source, volume, volume_source)
       values ($1,$2,$3,$4,$5,$6,$7)
       returning id, term, area, intent, source, volume`,
      [
        clientId, k.term, k.area ?? null, k.intent ?? null,
        k.source ?? "generated", k.volume ?? null, k.volumeSource ?? null,
      ],
    );
    if (row) out.push(row);
  }
  return out;
}

export async function getKeywords(db: Db, clientId: string): Promise<KeywordRow[]> {
  return db.query<KeywordRow>(
    `select id, term, area, intent, source, volume from keywords
      where client_id = $1 order by volume desc nulls last, term`,
    [clientId],
  );
}

export interface RankingInput {
  keywordId: string;
  engine: "google_web" | "google_maps";
  domain: string;
  /** Null means "not found in what we looked at", not "position zero". */
  position: number | null;
  urlFound?: string | null;
}

export async function saveRankings(
  db: Db, auditRunId: string, rows: RankingInput[],
): Promise<void> {
  for (const r of rows) {
    await db.query(
      `insert into rankings (audit_run_id, keyword_id, engine, domain, position, url_found)
       values ($1,$2,$3,$4,$5,$6)`,
      [auditRunId, r.keywordId, r.engine, r.domain, r.position, r.urlFound ?? null],
    );
  }
}

export interface CompetitorRow {
  id: string;
  domain: string;
  name: string | null;
  source: string;
  is_primary: boolean;
}

/** Add a competitor if this client does not already have that domain. */
export async function upsertCompetitor(
  db: Db,
  clientId: string,
  input: { domain: string; name?: string | null; source: string; isPrimary?: boolean },
): Promise<CompetitorRow | null> {
  const existing = await db.one<CompetitorRow>(
    `select id, domain, name, source, is_primary from competitors
      where client_id = $1 and domain = $2`,
    [clientId, input.domain],
  );
  if (existing) return existing;

  return db.one<CompetitorRow>(
    `insert into competitors (client_id, domain, name, source, is_primary)
     values ($1,$2,$3,$4,$5)
     returning id, domain, name, source, is_primary`,
    [clientId, input.domain, input.name ?? null, input.source, input.isPrimary ?? false],
  );
}

export async function getCompetitors(db: Db, clientId: string): Promise<CompetitorRow[]> {
  return db.query<CompetitorRow>(
    `select id, domain, name, source, is_primary from competitors
      where client_id = $1 order by is_primary desc, domain`,
    [clientId],
  );
}

export async function getFindings(db: Db, auditRunId: string): Promise<Finding[]> {
  const rows = await db.query<{
    code: string; category: string; severity: string;
    evidence: unknown; affected_urls: string[] | null;
    effort_hours: string | number | null; impact_score: number | null;
  }>(
    `select code, category, severity, evidence, affected_urls, effort_hours, impact_score
       from findings where audit_run_id = $1 order by priority_rank`,
    [auditRunId],
  );
  return rows.map((r) => ({
    code: r.code,
    category: r.category as Finding["category"],
    severity: r.severity as Finding["severity"],
    evidence: (typeof r.evidence === "string"
      ? JSON.parse(r.evidence)
      : r.evidence) as Record<string, unknown>,
    affectedUrls: r.affected_urls ?? [],
    ...(r.effort_hours === null ? {} : { effortHours: Number(r.effort_hours) }),
    ...(r.impact_score === null ? {} : { impactScore: r.impact_score }),
  }));
}
