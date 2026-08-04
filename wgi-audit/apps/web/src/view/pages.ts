/**
 * The three views.
 *
 *   1. **Dashboard** — every audit run, newest first. The operator's pipeline.
 *   2. **Run** — one audit, in full: progress while it works, then everything
 *      it found including the evidence and what it cost.
 *   3. **Report** — the same run, rewritten for the person who owns the site.
 *
 * Two and three are deliberately different documents rather than one page with
 * a toggle. The operator needs cost, stage names, rule codes and raw evidence;
 * the owner needs to know what is wrong and what to do, and every rule code on
 * the page is a small invitation to stop reading.
 */
import { th } from "@core/i18n/th.ts";
import type { FindingCode } from "@core/i18n/th.ts";
import { STAGES } from "@core/types/index.ts";
import type { Finding } from "@core/types/index.ts";
import type { AuditDetail, AuditSummary } from "../queries.ts";
import { thWeb } from "./text.ts";
import {
  card, counts, empty, esc, header, hero, meters, page, scoreTone,
  severityBadge, table, type MeterRow,
} from "./components.ts";

// ---------------------------------------------------------------------------
// 1. dashboard
// ---------------------------------------------------------------------------
export function dashboardPage(audits: AuditSummary[], error?: string): string {
  const rows = audits.map((a) => [
    `<a class="row-link" href="/audits/${esc(a.id)}">${esc(a.domain)}</a>`,
    esc(a.areas.join(", ") || "—"),
    esc(when(a.createdAt ?? a.startedAt)),
    a.overall === null
      ? '<span style="color:var(--muted)">—</span>'
      : `<strong style="color:${scoreTone(a.overall)}">${a.overall}</strong>`,
    a.findingsTotal ? String(a.findingsTotal) : "—",
    a.criticalTotal
      ? `<strong style="color:var(--critical)">${a.criticalTotal}</strong>`
      : "—",
    a.costThb > 0 ? a.costThb.toFixed(2) : "0",
    statusPill(a),
  ]);

  const body = [
    header(thWeb.app, thWeb.tagline),
    error ? `<div class="banner bad" style="margin-bottom:16px">${esc(error)}</div>` : "",
    card("", newAuditForm()),
    card(
      thWeb.list.title,
      audits.length === 0
        ? empty(thWeb.list.empty)
        : table(
            [
              { label: thWeb.list.colDomain },
              { label: thWeb.list.colArea },
              { label: thWeb.list.colWhen },
              { label: thWeb.list.colScore, num: true },
              { label: thWeb.list.colFindings, num: true },
              { label: thWeb.list.colCritical, num: true },
              { label: thWeb.list.colCost, num: true },
              { label: thWeb.list.colStatus },
            ],
            rows,
          ),
    ),
  ].join("\n");

  // Poll only while something is actually moving.
  const busy = audits.some((a) => a.status === "queued" || a.status === "running");
  return page({ title: thWeb.app, ...(busy ? { pollUrl: "/api/audits" } : {}) }, body);
}

function newAuditForm(): string {
  return `<form class="form" method="post" action="/audits">
  <div class="field">
    <label for="domain">${esc(thWeb.form.domain)}</label>
    <input type="text" id="domain" name="domain" placeholder="${esc(thWeb.form.domainHint)}"
           autocomplete="off" autofocus required>
  </div>
  <div class="field">
    <label for="area">${esc(thWeb.form.area)}</label>
    <input type="text" id="area" name="area" placeholder="${esc(thWeb.form.areaHint)}"
           autocomplete="off">
  </div>
  <div class="field">
    <label for="scope">${esc(thWeb.form.scope)}</label>
    <select id="scope" name="scope">
      <option value="province">${esc(thWeb.form.scopeProvince)}</option>
      <option value="district">${esc(thWeb.form.scopeDistrict)}</option>
      <option value="nationwide">${esc(thWeb.form.scopeNationwide)}</option>
    </select>
  </div>
  <button type="submit">${esc(thWeb.form.submit)}</button>
</form>`;
}

function statusPill(a: AuditSummary): string {
  const cls = a.status === "running" || a.status === "queued"
    ? "running"
    : a.status === "failed" ? "failed" : "";
  return `<span class="pill ${cls}">${esc(thWeb.status[a.status])}</span>`;
}

// ---------------------------------------------------------------------------
// 2. run
// ---------------------------------------------------------------------------
export function runPage(a: AuditDetail): string {
  const finished = a.status === "done" || a.status === "failed";
  const right = finished && a.status === "done"
    ? `<a href="/audits/${esc(a.id)}/report">${esc(thWeb.nav.openReport)}</a>`
    : "";

  const blocks: string[] = [
    header(a.domain, a.areas.join(", ") || thWeb.form.scopeNationwide, right),
    `<p style="margin:-12px 0 20px"><a href="/">${esc(thWeb.nav.back)}</a></p>`,
  ];

  if (a.status === "failed") {
    blocks.push(`<div class="banner bad">${esc(thWeb.run.failed)}${
      a.error ? ` — ${esc(a.error)}` : ""}</div>`);
  }

  if (!finished) blocks.push(card(thWeb.run.progress, progress(a)));

  if (a.snapshot) {
    blocks.push(card(thWeb.run.scoreTitle, scoreBlock(a)));
  }

  if (a.findings.length > 0) {
    blocks.push(card(
      thWeb.run.findingsTitle,
      `<p class="note" style="margin:-8px 0 14px">${esc(thWeb.run.findingsNote)}</p>`
      + a.findings.map((f, i) => findingRow(f, i + 1, true)).join(""),
    ));
  } else if (finished) {
    blocks.push(card(thWeb.run.findingsTitle, empty(thWeb.run.noFindings)));
  }

  blocks.push(`<div class="grid-2">
${card(thWeb.run.pagesTitle, pagesBlock(a))}
${card(thWeb.run.competitorsTitle, competitorsBlock(a))}
</div>`);

  blocks.push(card(thWeb.run.keywordsTitle, keywordsBlock(a)));
  blocks.push(card(thWeb.run.spendTitle, spendBlock(a)));

  return page(
    { title: `${a.domain} — ${thWeb.app}`,
      ...(finished ? {} : { pollUrl: `/api/audits/${a.id}` }) },
    blocks.join("\n"),
  );
}

function progress(a: AuditDetail): string {
  // `stage` records the last stage that *completed*, which is what makes a run
  // resumable — so everything up to and including it is done.
  const doneThrough = a.stage ? STAGES.indexOf(a.stage) : -1;
  const rows = STAGES.map((s, i) => {
    const done = i <= doneThrough;
    return `<div class="stage-row ${done ? "done" : "pending"}">
  <span class="stage-dot"></span>
  <span class="stage-name">${esc(s)}</span>
</div>`;
  }).join("");

  const hint = a.status === "queued"
    ? `<p class="note">${esc(thWeb.run.waiting)} ${esc(thWeb.run.workerHint)}</p>`
    : "";
  return `<div class="stages">${rows}</div>${hint}`;
}

/** Categories whose score is a placeholder until a vendor is connected. */
function unmeasuredCategories(inputs: Record<string, unknown>): Set<string> {
  const out = new Set<string>();
  if (!inputs.has_gbp_data) out.add("local");
  if (!inputs.has_visibility_data) out.add("visibility");
  if (!inputs.has_competitor_data) out.add("content");
  return out;
}

function scoreBlock(a: AuditDetail): string {
  const snap = a.snapshot!;
  const inputs = snap.inputs ?? {};
  const unmeasured = unmeasuredCategories(inputs);
  const overall = snap.scores.overall ?? 0;

  const rows: MeterRow[] = ["conversion", "local", "content", "visibility", "onpage", "technical"]
    .filter((k) => k in snap.scores)
    .map((k) => ({
      name: thWeb.categories[k] ?? k,
      value: snap.scores[k] ?? 0,
      ...(unmeasured.has(k) ? { unmeasured: true } : {}),
    }));

  const bySeverity = tally(a.findings.map((f) => f.severity));

  return [
    hero(overall, verdictFor(overall), thWeb.verdictNote(a.criticalTotal, a.findingsTotal)),
    `<div style="height:22px"></div>`,
    meters(rows),
    `<div style="height:22px"></div>`,
    counts([
      { n: bySeverity.critical ?? 0, label: thWeb.severity.critical, tone: "var(--critical)" },
      { n: bySeverity.high ?? 0, label: thWeb.severity.high },
      { n: bySeverity.medium ?? 0, label: thWeb.severity.medium },
      { n: bySeverity.low ?? 0, label: thWeb.severity.low },
    ]),
    unmeasured.size > 0
      ? `<ul class="why">${[...unmeasured].map((k) =>
          `<li>${esc(thWeb.categories[k] ?? k)} — ${
            esc(thWeb.notMeasuredWhy[k] ?? thWeb.notMeasured)}</li>`).join("")}</ul>`
      : "",
  ].join("\n");
}

function findingRow(f: Finding, rank: number, withEvidence: boolean): string {
  const copy = th.findings[f.code as FindingCode];
  if (!copy) return "";
  const hours = f.effortHours;
  return `<div class="finding">
  <div class="finding-head">
    <span class="finding-rank">${rank}</span>
    <span class="finding-title">${esc(copy.title)}</span>
    ${severityBadge(f.severity)}
  </div>
  <div class="finding-fix">${esc(copy.fix)}</div>
  ${withEvidence ? `<div class="finding-meta"><code>${esc(f.code)}</code>${
    hours === undefined ? "" : ` · ${esc(thWeb.run.effort)} ~${hours} ${esc(thWeb.run.hours)}`
  }${
    f.affectedUrls?.length ? ` · ${f.affectedUrls.length} URL` : ""
  }</div>
  <details class="ev"><summary>${esc(thWeb.run.evidence)}</summary><pre>${
    esc(JSON.stringify(f.evidence, null, 2))
  }</pre></details>` : ""}
</div>`;
}

function pagesBlock(a: AuditDetail): string {
  if (a.pages.length === 0) return empty("—");
  return table(
    [{ label: "" }, { label: "", num: true }],
    a.pages.map((p) => [
      esc(thWeb.run.pageTypes[p.pageType] ?? p.pageType),
      String(p.count),
    ]),
  );
}

function competitorsBlock(a: AuditDetail): string {
  if (a.competitors.length === 0) return empty(thWeb.run.noCompetitors);
  return table(
    [{ label: "" }, { label: "" }],
    a.competitors.map((c) => [esc(c.domain), `<span class="pill">${esc(c.source)}</span>`]),
  );
}

function keywordsBlock(a: AuditDetail): string {
  if (a.keywords.length === 0) return empty(thWeb.run.noKeywords);
  return table(
    [
      { label: thWeb.run.colTerm },
      { label: thWeb.run.colIntent },
      { label: thWeb.run.colVolume, num: true },
      { label: thWeb.run.colPosition, num: true },
    ],
    a.keywords.map((k) => [
      esc(k.term),
      esc(k.intent ?? "—"),
      k.volume === null ? '<span style="color:var(--muted)">—</span>' : String(k.volume),
      k.position === null
        ? `<span style="color:var(--muted)">${esc(thWeb.run.notChecked)}</span>`
        : String(k.position),
    ]),
  );
}

function spendBlock(a: AuditDetail): string {
  if (a.spend.length === 0 || a.costThb === 0) {
    return `<p class="note" style="margin:0">${esc(thWeb.run.freeRun)}</p>`;
  }
  return table(
    [
      { label: thWeb.run.colProvider },
      { label: thWeb.run.colCalls, num: true },
      { label: thWeb.run.colCached, num: true },
      { label: thWeb.run.colCost, num: true },
    ],
    a.spend.map((s) => [
      esc(s.provider), String(s.calls), String(s.cacheHits), s.costThb.toFixed(4),
    ]),
  );
}

// ---------------------------------------------------------------------------
// 3. report — what the site's owner reads
// ---------------------------------------------------------------------------
const REPORT_FINDINGS = 8;

export function reportPage(a: AuditDetail): string {
  const snap = a.snapshot;
  const overall = snap?.scores.overall ?? 0;
  const shown = a.findings.slice(0, REPORT_FINDINGS);
  const rest = a.findings.length - shown.length;

  const unmeasured = snap ? unmeasuredCategories(snap.inputs ?? {}) : new Set<string>();
  const rows: MeterRow[] = snap
    ? ["conversion", "local", "content", "visibility", "onpage", "technical"]
        .filter((k) => k in snap.scores && !unmeasured.has(k))
        .map((k) => ({ name: thWeb.categories[k] ?? k, value: snap.scores[k] ?? 0 }))
    : [];

  const body = [
    `<div class="top">
  <h1>${esc(thWeb.report.title(a.domain))}</h1>
  <span class="spacer"></span>
  <span class="no-print"><a href="/audits/${esc(a.id)}">${esc(thWeb.nav.operatorView)}</a></span>
</div>`,
    `<p class="no-print" style="margin:-12px 0 20px">
  <button onclick="window.print()">${esc(thWeb.nav.print)}</button>
</p>`,
    card(
      thWeb.report.summary,
      hero(overall, verdictFor(overall), thWeb.verdictNote(a.criticalTotal, a.findingsTotal))
      + (rows.length ? `<div style="height:22px"></div>` + meters(rows) : ""),
    ),
    card(
      thWeb.report.whatToFix,
      shown.map((f, i) => findingRow(f, i + 1, false)).join("")
      + (rest > 0 ? `<p class="note">${esc(thWeb.report.andMore(rest))}</p>` : ""),
    ),
    `<p class="note" style="margin-top:24px">${esc(thWeb.report.preparedOn)}: ${
      esc(when(a.finishedAt ?? a.startedAt ?? a.createdAt))
    }</p>`,
    `<p class="note">${esc(thWeb.report.disclaimer)}</p>`,
  ].join("\n");

  return page({ title: thWeb.report.title(a.domain), narrow: true }, body);
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
export function verdictFor(score: number): string {
  if (score >= 70) return thWeb.verdict.good;
  if (score >= 55) return thWeb.verdict.ok;
  if (score >= 35) return thWeb.verdict.weak;
  return thWeb.verdict.bad;
}

function tally(values: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}

/** Local time, minute precision. A date nobody can read is not a date. */
function when(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
