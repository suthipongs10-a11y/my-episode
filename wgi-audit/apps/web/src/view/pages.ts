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
 *
 * The run page leads with the seller's number and the report leads with the
 * client's, and neither page shows the other's: the opportunity score and the
 * outreach brief exist only here, never on anything a customer receives.
 */
import { th } from "@core/i18n/th.ts";
import type { FindingCode } from "@core/i18n/th.ts";
import { STAGES } from "@core/types/index.ts";
import type { Finding } from "@core/types/index.ts";
import { SIGNAL_ORDER, type Opportunity, type Signal } from "@core/scoring/opportunity.ts";
import type { AuditDetail, AuditSummary } from "../queries.ts";
import { thWeb } from "./text.ts";
import {
  card, chip, copyBlock, coverageBar, dot, empty, esc, figure, header, hero, meters,
  page, pageHeader, pill, scoreTone, severityBadge, signalTable, stackedBars, statTiles,
  table, tableControls, type MeterRow, type SignalRow, type StackRow,
} from "./components.ts";

// ---------------------------------------------------------------------------
// 0. login
// ---------------------------------------------------------------------------
export function loginPage(error?: string): string {
  return page(
    { title: `${thWeb.login.title} — ${thWeb.app}`, narrow: true },
    `<div style="max-width:360px;margin:14vh auto 0">
  ${header(thWeb.app, thWeb.tagline)}
  ${card(thWeb.login.title, `<form class="form" method="post" action="/login" style="flex-direction:column;align-items:stretch">
    <div class="field">
      <label for="password">${esc(thWeb.login.password)}</label>
      <input type="password" id="password" name="password" autofocus required
             autocomplete="current-password">
    </div>
    <button type="submit" style="margin-top:4px;justify-content:center">${esc(thWeb.login.submit)}</button>
  </form>`)}
  ${error ? `<p class="note" style="color:var(--critical);margin-top:12px">${esc(error)}</p>` : ""}
</div>`,
  );
}

// ---------------------------------------------------------------------------
// 1. dashboard
// ---------------------------------------------------------------------------
export function dashboardPage(
  audits: AuditSummary[], error?: string, showLogout = false,
): string {
  const rows = audits.map((a) => [
    `<a class="row-link" href="/audits/${esc(a.id)}">${esc(a.domain)}</a>`
      + `<span class="cell-sub">${esc(a.areas.join(", ") || thWeb.form.scopeNationwide)}</span>`,
    `<span class="tnum">${esc(when(a.createdAt ?? a.startedAt))}</span>`,
    scoreCell(a.overall, scoreTone),
    a.opportunity === null
      ? '<span class="muted">—</span>'
      : `<span class="score-cell" title="${esc(thWeb.opportunity.pitch[a.pitch ?? ""] ?? "")}">${
          dot(opportunityTone(a.opportunity))}${a.opportunity}</span>`
        + `<span class="cell-sub">${esc(thWeb.opportunity.pitch[a.pitch ?? ""] ?? "")}</span>`,
    a.findingsTotal ? String(a.findingsTotal) : "—",
    a.criticalTotal ? `<span class="score-cell">${dot("var(--critical)")}${a.criticalTotal}</span>` : "—",
    a.costThb > 0 ? a.costThb.toFixed(2) : "0",
    statusPill(a),
  ]);
  const rowAttrs = audits.map((a) =>
    `data-q="${esc(`${a.domain} ${a.areas.join(" ")}`.toLowerCase())}"`);

  const running = audits.filter((a) => a.status === "queued" || a.status === "running").length;
  const hot = audits.filter((a) => (a.opportunity ?? 0) >= 70).length;
  const spend = audits.reduce((sum, a) => sum + a.costThb, 0);

  const body = [
    pageHeader({ title: thWeb.list.title, sub: thWeb.tagline }),
    error ? `<div class="banner bad" style="margin-bottom:16px">${esc(error)}</div>` : "",
    statTiles([
      { label: thWeb.kpi.total, value: audits.length },
      { label: thWeb.kpi.running, value: running, tone: running ? "var(--blue)" : undefined },
      { label: thWeb.kpi.hot, value: hot, sub: thWeb.kpi.hotSub, tone: hot ? "var(--good)" : undefined },
      { label: thWeb.kpi.spend, value: spend.toFixed(2), unit: thWeb.kpi.baht },
    ]),
    `<div id="new"></div>` + card(thWeb.form.title, newAuditForm()),
    card(
      thWeb.list.title,
      audits.length === 0
        ? empty(thWeb.list.empty)
        : `<div class="toolbar">
  <input class="search" id="q" type="search" placeholder="${esc(thWeb.list.search)}" autocomplete="off">
  <span class="hint">${esc(thWeb.list.sortHint)}</span>
</div>` + table(
            [
              { label: thWeb.list.colDomain, sort: "text" },
              { label: thWeb.list.colWhen, sort: "text" },
              { label: thWeb.list.colScore, num: true, sort: "num" },
              { label: thWeb.list.colOpportunity, num: true, sort: "num" },
              { label: thWeb.list.colFindings, num: true, sort: "num" },
              { label: thWeb.list.colCritical, num: true, sort: "num" },
              { label: thWeb.list.colCost, num: true, sort: "num" },
              { label: thWeb.list.colStatus, sort: "text" },
            ],
            rows,
            { id: "audits", rowAttrs },
          ) + tableControls("audits", "q"),
      thWeb.list.count(audits.length),
    ),
  ].join("\n");

  // Poll only while something is actually moving.
  const busy = running > 0;
  return page(
    { title: thWeb.app, shell: { active: "home", logout: showLogout },
      ...(busy ? { pollUrl: "/api/audits" } : {}) },
    body,
  );
}

function scoreCell(score: number | null, tone: (n: number) => string): string {
  if (score === null) return '<span class="muted">—</span>';
  return `<span class="score-cell">${dot(tone(score))}${score}</span>`;
}

function newAuditForm(): string {
  return `<form class="form" method="post" action="/audits">
  <div class="field">
    <label for="domain">${esc(thWeb.form.domain)}</label>
    <input type="text" id="domain" name="domain" placeholder="${esc(thWeb.form.domainHint)}"
           autocomplete="off" required>
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
  return pill(thWeb.status[a.status], cls ? { cls } : {});
}

// ---------------------------------------------------------------------------
// 2. run
// ---------------------------------------------------------------------------
export function runPage(a: AuditDetail): string {
  const finished = a.status === "done" || a.status === "failed";
  const o = currentOpportunity(a);

  const actions = [
    `<a class="btn ghost" href="/">${esc(thWeb.nav.back)}</a>`,
    a.status === "done"
      ? `<a class="btn" href="/audits/${esc(a.id)}/report">${esc(thWeb.nav.openReport)} →</a>`
      : "",
  ].join("");

  const chips = [
    ...a.areas.map(chip),
    a.areas.length === 0 ? chip(thWeb.form.scopeNationwide) : "",
    statusPill(a),
  ].filter(Boolean);

  const blocks: string[] = [
    pageHeader({
      title: a.domain,
      sub: `${thWeb.run.checkedOn} ${when(a.finishedAt ?? a.startedAt ?? a.createdAt)}`,
      chips, actions,
    }),
  ];

  if (a.status === "failed") {
    blocks.push(`<div class="banner bad" style="margin-bottom:16px">${esc(thWeb.run.failed)}${
      a.error ? ` — ${esc(a.error)}` : ""}</div>`);
  }

  if (!finished) blocks.push(card(thWeb.run.progress, progress(a)));

  if (a.snapshot) {
    const bySeverity = tally(a.findings.map((f) => f.severity));
    blocks.push(statTiles([
      { label: thWeb.kpi.findings, value: a.findingsTotal },
      { label: thWeb.kpi.critical, value: bySeverity.critical ?? 0,
        tone: bySeverity.critical ? "var(--critical)" : undefined },
      { label: thWeb.kpi.quickWins, value: o?.quickWins.length ?? 0 },
      { label: thWeb.run.totalEffort, value: effortHours(a), unit: thWeb.run.hours },
      { label: thWeb.run.pagesCrawled, value: pagesCrawled(a) },
      { label: thWeb.kpi.cost, value: a.costThb.toFixed(2), unit: thWeb.kpi.baht },
    ]));

    // The seller's number leads; the client's number sits beside it, smaller.
    // One hero per view, and on this page the hero is ours.
    blocks.push(`<div class="grid-2">
${o ? card(thWeb.opportunity.title, opportunityBlock(o), thWeb.opportunity.note)
    : a.opportunityDetail ? card(thWeb.opportunity.title, `<p class="note" style="margin:0">${esc(thWeb.opportunity.oldSnapshot)}</p>`) : ""}
${card(thWeb.run.scoreTitle, scoreBlock(a), thWeb.run.scoreNote)}
</div>`);
  }

  if (o) {
    blocks.push(`<div class="grid-2">
${card(thWeb.opportunity.quickWins, quickWinsBlock(o), thWeb.opportunity.quickWinsNote)}
${card(thWeb.brief.title, copyBlock("brief", briefText(a, o), thWeb.brief.copy, thWeb.brief.copied), thWeb.brief.note)}
</div>`);
  }

  const chart = findingsByCategory(a);
  if (chart.any) {
    blocks.push(card(
      thWeb.run.byCategoryTitle,
      stackedBars(chart.rows, [
        { key: "critical", label: thWeb.severity.critical, tone: "var(--critical)" },
        { key: "high", label: thWeb.severity.high, tone: "var(--serious)" },
        { key: "medium", label: thWeb.severity.medium, tone: "var(--warning)" },
        { key: "low", label: thWeb.severity.low, tone: "var(--axis)" },
      ]),
      thWeb.run.byCategoryNote,
    ));
  }

  if (a.findings.length > 0) {
    blocks.push(card(
      thWeb.run.findingsTitle,
      a.findings.map((f, i) => findingRow(f, i + 1, true)).join(""),
      thWeb.run.findingsNote,
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
    { title: `${a.domain} — ${thWeb.app}`, shell: { active: "run" },
      ...(finished ? {} : { pollUrl: `/api/audits/${a.id}` }) },
    `<div class="stack-v">${blocks.join("\n")}</div>`,
  );
}

/**
 * Only a version-2 snapshot has the signal table. A run scored under the
 * first formula keeps its stored number on the list and says so here rather
 * than being re-scored — the same rule the site score lives by.
 */
function currentOpportunity(a: AuditDetail): Opportunity | null {
  const o = a.opportunityDetail;
  return o && o.version === 2 && Array.isArray(o.signals) ? o : null;
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

/** Category weights, mirroring scoring/v1's WEIGHTS. */
const WEIGHT: Record<string, number> = {
  conversion: 0.25, local: 0.25, content: 0.20,
  visibility: 0.15, onpage: 0.10, technical: 0.05,
};

/**
 * How much of the scoring weight this run actually measured.
 *
 * Read from the snapshot when v3 recorded it, and derived from the same
 * `has_*` flags otherwise — so a run scored under v1 or v2 still shows an
 * honest coverage bar instead of an empty one.
 */
function coverageOf(inputs: Record<string, unknown>, scores: Record<string, number>): number {
  const stored = inputs.coverage;
  if (typeof stored === "number") return stored;

  const unmeasured = unmeasuredCategories(inputs);
  let sum = 0;
  for (const key of Object.keys(scores)) {
    if (key === "overall" || unmeasured.has(key)) continue;
    sum += WEIGHT[key] ?? 0;
  }
  return sum;
}

/** Total hours the whole list would take, so the operator can quote a job. */
function effortHours(a: AuditDetail): string {
  const total = a.findings.reduce((sum, f) => sum + (f.effortHours ?? 0), 0);
  return total > 0 ? `${Math.round(total)}` : "—";
}

function pagesCrawled(a: AuditDetail): string {
  const n = a.pages.reduce((sum, p) => sum + p.count, 0);
  return n > 0 ? String(n) : "—";
}

/** Findings per category, split by severity. The "where are the problems" view. */
export function findingsByCategory(a: AuditDetail): { rows: StackRow[]; any: boolean } {
  const order = ["conversion", "onpage", "technical", "content", "competitor", "local"];
  const severities = [
    { key: "critical", tone: "var(--critical)" },
    { key: "high", tone: "var(--serious)" },
    { key: "medium", tone: "var(--warning)" },
    { key: "low", tone: "var(--axis)" },
  ];

  const rows: StackRow[] = [];
  for (const category of order) {
    const inCategory = a.findings.filter((f) => f.category === category);
    if (inCategory.length === 0) continue;
    rows.push({
      label: thWeb.categories[category] ?? category,
      segments: severities.map((s) => ({
        key: s.key,
        value: inCategory.filter((f) => f.severity === s.key).length,
        tone: s.tone,
      })),
    });
  }
  // Most problems first: the chart's job is to point at where to look.
  rows.sort((x, y) => sum(y.segments) - sum(x.segments));
  return { rows, any: rows.length > 0 };
}

function sum(segments: { value: number }[]): number {
  return segments.reduce((a, s) => a + s.value, 0);
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

  const cover = coverageOf(inputs, snap.scores);

  return [
    `<div class="hero" style="gap:18px">
  ${figure(overall)}
  <div class="hero-side">
    <div class="hero-verdict" style="font-size:15px">${dot(scoreTone(overall))}${esc(verdictFor(overall))}</div>
    <div class="hero-note">${esc(thWeb.verdictNote(a.criticalTotal, a.findingsTotal))}</div>
  </div>
</div>`,
    // Immediately under the headline number, because it is the caveat on it:
    // v3 averages measured categories only, so 82 across 40% of the weight and
    // 82 across all of it are different claims and must not look alike.
    coverageBar(cover, thWeb.coverageNote(Math.round(cover * 100))),
    `<div class="sp-22"></div>`,
    meters(rows),
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
    a.competitors.map((c) => [esc(c.domain), pill(c.source)]),
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
      k.volume === null ? '<span class="muted">—</span>' : String(k.volume),
      k.position === null
        ? `<span class="muted">${esc(thWeb.run.notChecked)}</span>`
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
      hero(overall, verdictFor(overall), thWeb.verdictNote(a.criticalTotal, a.findingsTotal), scoreTone(overall))
      + (rows.length ? `<div class="sp-22"></div>` + meters(rows) : ""),
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
// opportunity — the seller's view, never on the client report
// ---------------------------------------------------------------------------
export function opportunityTone(score: number): string {
  // Inverted from the site score: here, high is *good for us*.
  if (score >= 70) return "var(--good)";
  if (score >= 45) return "var(--warning)";
  return "var(--axis)";
}

function opportunityBand(score: number): string {
  const b = thWeb.opportunity.band;
  return score >= 70 ? b.hot : score >= 45 ? b.warm : b.cold;
}

function opportunityBlock(o: Opportunity): string {
  const t = thWeb.opportunity;
  const byKey = new Map(o.signals.map((s) => [s.key, s]));
  const rows: SignalRow[] = SIGNAL_ORDER
    .map((k) => byKey.get(k))
    .filter((s): s is Signal => Boolean(s))
    .map((s) => ({
      name: t.signals[s.key] ?? s.key,
      points: s.points,
      max: s.max,
      status: s.status,
      why: signalWhy(s),
    }));

  return [
    hero(o.score, `${t.pitch[o.pitch] ?? o.pitch}`, `${t.pitchLabel} · ${opportunityBand(o.score)}`, opportunityTone(o.score)),
    o.vetoes.length
      ? `<div class="banner bad" style="margin-top:14px">${o.vetoes.map(esc).join("<br>")}</div>`
      : "",
    `<div class="sp-18"></div>`,
    signalTable(rows, { points: o.points, max: o.measuredMax, note: t.coverageNote(o.measuredMax) }),
  ].join("\n");
}

/** Evidence under a signal: its sentences, then the findings behind it by name. */
function signalWhy(s: Signal): string {
  const parts = s.evidence.map(esc);
  const titles = (s.codes ?? [])
    .flatMap((code) => {
      const title = th.findings[code as FindingCode]?.title;
      return title ? [String(title)] : [];
    })
    .slice(0, 2);
  if (titles.length) parts.push(titles.map(esc).join(" · "));
  if (s.link) parts.push(`<a href="${esc(s.link)}" target="_blank" rel="noopener">${esc(thWeb.opportunity.open)} ↗</a>`);
  return parts.join("<br>");
}

function quickWinsBlock(o: Opportunity): string {
  if (o.quickWins.length === 0) return `<p class="note" style="margin:0">${esc(thWeb.opportunity.noQuickWins)}</p>`;
  const wins = o.quickWins.map((w, i) => {
    const copy = th.findings[w.code as FindingCode];
    return [
      String(i + 1),
      copy ? esc(copy.title) : esc(w.code),
      `~${w.effortHours} ${esc(thWeb.run.hours)}`,
      String(w.leverage),
    ];
  });
  return table(
    [{ label: "" }, { label: "" }, { label: thWeb.run.effort }, { label: thWeb.opportunity.leverage, num: true }],
    wins,
  );
}

/**
 * The outreach brief: everything the operator needs to write to this business,
 * as plain text they copy out. Deterministic, from the same facts as the
 * score. Nothing here sends anything — that is the whole point of it.
 */
export function briefText(a: AuditDetail, o: Opportunity): string {
  const t = thWeb.brief;
  const hits = o.signals.filter((s) => s.status === "hit" || s.status === "partial");
  const tel = a.presence ? contactFlags(a).tel : false;
  const line = a.presence ? contactFlags(a).line : false;
  const fb = a.presence?.social.facebook;

  const lines: string[] = [
    t.heading(a.domain, when(a.finishedAt ?? a.startedAt ?? a.createdAt)),
    "",
    `${t.pitchLine}: ${thWeb.opportunity.pitch[o.pitch] ?? o.pitch}`,
    t.scoreLine(o.score, a.snapshot?.scores.overall ?? null, a.findingsTotal, a.criticalTotal),
    "",
    `${t.signalsFound}:`,
    ...(hits.length
      ? hits.map((s) => `- ${thWeb.opportunity.signals[s.key] ?? s.key} (+${s.points}) — ${s.evidence.join("; ")}`)
      : [`- ${t.signalsNone}`]),
    "",
    `${t.quickWinsTitle}:`,
    ...(o.quickWins.length
      ? o.quickWins.flatMap((w, i) => {
          const copy = th.findings[w.code as FindingCode];
          return [
            `${i + 1}. ${copy?.title ?? w.code} — ~${w.effortHours} ${thWeb.run.hours}`,
            ...(copy ? [`   → ${copy.fix}`] : []),
          ];
        })
      : [`- ${t.quickWinsNone}`]),
    "",
    `${t.contactFound}: ${t.tel} ${tel ? t.yes : t.no} · ${t.line} ${line ? t.yes : t.no}${fb ? ` · ${t.facebook}: ${fb}` : ""}`,
    "",
    t.attach,
  ];
  return lines.join("\n");
}

/**
 * The crawl's contact flags are not stored on the run; the opportunity's own
 * pitch already folded them in, so read them back off the findings: CVR-001
 * fires when no page has a tel: link and CVR-002 when none has LINE.
 */
function contactFlags(a: AuditDetail): { tel: boolean; line: boolean } {
  return {
    tel: !a.findings.some((f) => f.code === "CVR-001"),
    line: !a.findings.some((f) => f.code === "CVR-002"),
  };
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
