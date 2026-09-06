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
  card, counts, coverageBar, empty, esc, header, hero, meters, page, scoreTone,
  severityBadge, stackedBars, table, type MeterRow, type StackRow,
} from "./components.ts";

// ---------------------------------------------------------------------------
// 0. login
// ---------------------------------------------------------------------------
export function loginPage(error?: string): string {
  return page(
    { title: `${thWeb.login.title} — ${thWeb.app}`, narrow: true },
    `<div style="max-width:340px;margin:14vh auto 0">
  ${header(thWeb.app, "")}
  ${card("", `<form class="form" method="post" action="/login" style="flex-direction:column;align-items:stretch">
    <div class="field">
      <label for="password">${esc(thWeb.login.password)}</label>
      <input type="password" id="password" name="password" autofocus required
             autocomplete="current-password">
    </div>
    <button type="submit" style="margin-top:4px">${esc(thWeb.login.submit)}</button>
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
    `<a class="row-link" href="/audits/${esc(a.id)}">${esc(a.domain)}</a>`,
    esc(a.areas.join(", ") || "—"),
    esc(when(a.createdAt ?? a.startedAt)),
    a.overall === null
      ? '<span style="color:var(--muted)">—</span>'
      : `<strong style="color:${scoreTone(a.overall)}">${a.overall}</strong>`,
    a.opportunity === null
      ? '<span style="color:var(--muted)">—</span>'
      : `<strong style="color:${opportunityTone(a.opportunity)}" title="${esc(
          thWeb.opportunity.pitch[a.pitch ?? ""] ?? "")}">${a.opportunity}</strong>`,
    a.findingsTotal ? String(a.findingsTotal) : "—",
    a.criticalTotal
      ? `<strong style="color:var(--critical)">${a.criticalTotal}</strong>`
      : "—",
    a.costThb > 0 ? a.costThb.toFixed(2) : "0",
    statusPill(a),
  ]);

  const body = [
    header(
      thWeb.app, thWeb.tagline,
      showLogout
        ? `<form method="post" action="/logout" style="margin:0">
  <button type="submit" class="ghost">${esc(thWeb.login.logout)}</button></form>`
        : "",
    ),
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
              { label: thWeb.list.colOpportunity, num: true },
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

  if (a.opportunityDetail) {
    blocks.push(card(thWeb.opportunity.title, opportunityBlock(a)));
  }

  const chart = findingsByCategory(a);
  if (chart.any) {
    blocks.push(card(
      thWeb.run.byCategoryTitle,
      `<p class="note" style="margin:-8px 0 16px">${esc(thWeb.run.byCategoryNote)}</p>`
      + stackedBars(chart.rows, [
        { key: "critical", label: thWeb.severity.critical, tone: "var(--critical)" },
        { key: "high", label: thWeb.severity.high, tone: "var(--serious)" },
        { key: "medium", label: thWeb.severity.medium, tone: "var(--warning)" },
        { key: "low", label: thWeb.severity.low, tone: "var(--axis)" },
      ]),
    ));
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

  const bySeverity = tally(a.findings.map((f) => f.severity));
  const cover = coverageOf(inputs, snap.scores);

  return [
    hero(overall, verdictFor(overall), thWeb.verdictNote(a.criticalTotal, a.findingsTotal)),
    // Immediately under the headline number, because it is the caveat on it:
    // v3 averages measured categories only, so 82 across 40% of the weight and
    // 82 across all of it are different claims and must not look alike.
    coverageBar(cover, thWeb.coverageNote(Math.round(cover * 100))),
    `<div style="height:22px"></div>`,
    meters(rows),
    `<div style="height:22px"></div>`,
    counts([
      { n: bySeverity.critical ?? 0, label: thWeb.severity.critical, tone: "var(--critical)" },
      { n: bySeverity.high ?? 0, label: thWeb.severity.high },
      { n: bySeverity.medium ?? 0, label: thWeb.severity.medium },
      { n: bySeverity.low ?? 0, label: thWeb.severity.low },
      { n: effortHours(a), label: thWeb.run.totalEffort },
      { n: pagesCrawled(a), label: thWeb.run.pagesCrawled },
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
// opportunity — the seller's view, never on the client report
// ---------------------------------------------------------------------------
export function opportunityTone(score: number): string {
  // Inverted from the site score: here, high is *good for us*.
  if (score >= 70) return "var(--good)";
  if (score >= 45) return "var(--warning)";
  return "var(--muted)";
}

function opportunityBlock(a: AuditDetail): string {
  const o = a.opportunityDetail!;
  const p = a.presence;
  const t = thWeb.opportunity;

  const rows: MeterRow[] = (["pain", "budget", "alive", "reach"] as const).map((k) => {
    const c = o.components[k];
    return {
      name: t.components[k] ?? k,
      value: c.max > 0 ? (c.value / c.max) * 100 : 0,
      label: `${Math.round(c.value)}/${c.max}`,
    };
  });

  const evidence = (["pain", "budget", "alive", "reach"] as const)
    .flatMap((k) => o.components[k].evidence)
    .map((e) => `<li>${esc(e)}</li>`).join("");

  const ads = p
    ? p.ads.verdict === "yes" ? t.adsYes : p.ads.verdict === "maybe" ? t.adsMaybe : t.adsNo
    : t.adsNo;
  const adsTone = p?.ads.verdict === "yes" ? "var(--good)" : p?.ads.verdict === "maybe" ? "var(--warning)" : "var(--muted)";
  const adsEvidence = p ? [...p.ads.evidence, ...(p.ads.googleSerp ? [`Google Ads: ${p.ads.googleSerpTerms.join(", ")}`] : [])] : [];

  const socials = p ? Object.entries(p.social) : [];
  const flags: string[] = [];
  if (p?.activity.parked) flags.push(t.activity.parked);
  if (p?.activity.copyrightYear) flags.push(t.activity.stale(p.activity.copyrightYear));

  const wins = o.quickWins.map((w, i) => {
    const copy = th.findings[w.code as FindingCode];
    return [
      String(i + 1),
      copy ? esc(copy.title) : esc(w.code),
      `~${w.effortHours} ${esc(thWeb.run.hours)}`,
      String(w.leverage),
    ];
  });

  return [
    `<p class="note" style="margin:-8px 0 14px">${esc(t.note)}</p>`,
    `<div class="hero" style="margin-bottom:18px">
  <div class="count-item"><div class="n" style="font-size:44px;color:${opportunityTone(o.score)}">${o.score}</div>
    <div class="l">/ 100</div></div>
  <div class="hero-side">
    <div class="hero-verdict">${esc(t.pitch[o.pitch] ?? o.pitch)}</div>
    <div class="hero-note">${esc(t.pitchLabel)}</div>
  </div>
</div>`,
    o.vetoes.length
      ? `<div class="banner bad" style="margin-bottom:14px">${o.vetoes.map(esc).join("<br>")}</div>`
      : "",
    meters(rows),
    `<ul class="why">${evidence}</ul>`,
    `<div style="height:18px"></div>`,
    `<div class="counts">
  <div class="count-item"><div class="n" style="font-size:16px;color:${adsTone}">${esc(ads)}</div>
    <div class="l">${adsEvidence.map(esc).join(" · ") || "—"}</div></div>
  ${socials.length ? `<div class="count-item"><div class="n" style="font-size:16px">${esc(t.socialTitle)}</div>
    <div class="l">${socials.map(([k, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(k)}</a>`).join(" · ")}</div></div>` : ""}
  ${flags.length ? `<div class="count-item"><div class="n" style="font-size:16px;color:var(--warning)">${esc(flags[0]!)}</div>
    <div class="l">${flags.slice(1).map(esc).join(" · ")}</div></div>` : ""}
</div>`,
    `<div style="height:22px"></div>`,
    `<h2 style="margin-bottom:6px">${esc(t.quickWins)}</h2>
<p class="note" style="margin:0 0 12px">${esc(t.quickWinsNote)}</p>`,
    wins.length
      ? table([{ label: "" }, { label: "" }, { label: thWeb.run.effort }, { label: t.leverage, num: true }], wins)
      : `<p class="note">${esc(t.noQuickWins)}</p>`,
  ].join("\n");
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
