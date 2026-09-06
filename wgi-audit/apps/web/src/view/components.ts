/**
 * The pieces every page is built from.
 *
 * Plain functions returning HTML strings. Everything user-supplied goes through
 * `esc` — a domain arrives from a form field and ends up in the page, so this
 * is the injection boundary and there is exactly one of it.
 */
import { CSS, FONT_HREF } from "./theme.ts";
import { thWeb } from "./text.ts";

// ---------------------------------------------------------------------------
// escaping
// ---------------------------------------------------------------------------
const ENTITIES: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
};

/** HTML-escape. Everything that came from outside this file passes through. */
export function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

/** Marks a string as already-safe HTML, so `esc` is not applied twice. */
export function raw(html: string): { __html: string } {
  return { __html: html };
}

// ---------------------------------------------------------------------------
// layout
// ---------------------------------------------------------------------------
export interface ShellOptions {
  /** Which sidebar entry is lit. */
  active: "home" | "run";
  /** Show the logout control — only when a password is actually set. */
  logout?: boolean;
}

export interface PageOptions {
  title: string;
  /** Poll this URL and reload when it reports the run has moved on. */
  pollUrl?: string;
  narrow?: boolean;
  bodyClass?: string;
  /** Wrap the body in the sidebar shell. Absent on the report and login pages. */
  shell?: ShellOptions;
}

export function page(opts: PageOptions, body: string): string {
  const content = opts.shell
    ? `<div class="app">${sidebar(opts.shell)}<main class="main">${body}</main></div>`
    : `<div class="wrap${opts.narrow ? " narrow" : ""}">${body}</div>`;
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(opts.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT_HREF}">
<style>${CSS}</style>
</head>
<body${opts.bodyClass ? ` class="${esc(opts.bodyClass)}"` : ""}>
${content}
${opts.pollUrl ? poller(opts.pollUrl) : ""}
</body>
</html>`;
}

const ICON = {
  list: `<svg class="ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 5h12M4 10h12M4 15h8"/></svg>`,
  plus: `<svg class="ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 4v12M4 10h12"/></svg>`,
};

function sidebar(s: ShellOptions): string {
  return `<aside class="side">
  <a class="brand" href="/" style="color:inherit;text-decoration:none">
    <span class="brand-mark" aria-hidden="true">W</span>
    <span><span class="brand-name">${esc(thWeb.app)}</span><br><span class="brand-sub">${esc(thWeb.nav.brandSub)}</span></span>
  </a>
  <nav class="nav">
    <a href="/"${s.active === "home" ? ' class="active"' : ""}>${ICON.list}${esc(thWeb.nav.home)}</a>
    <a href="/#new">${ICON.plus}${esc(thWeb.nav.newAudit)}</a>
  </nav>
  ${s.logout ? `<div class="side-foot">
    <span class="who">${esc(thWeb.nav.signedIn)}</span>
    <form method="post" action="/logout" style="margin:0">
      <button type="submit">${esc(thWeb.login.logout)}</button></form>
  </div>` : ""}
</aside>`;
}

/**
 * Reload when the run changes stage or finishes.
 *
 * Polling rather than a websocket: a run takes minutes, the page is one
 * operator's tab, and a socket would add a dependency and a reconnection path
 * to save four requests a minute.
 */
function poller(url: string): string {
  return `<script>
(function () {
  var last = null;
  setInterval(function () {
    fetch(${JSON.stringify(url)}, { headers: { accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        var key = d.status + "|" + (d.stage || "");
        if (last !== null && key !== last) { location.reload(); return; }
        last = key;
        if (d.status === "done" || d.status === "failed") location.reload();
      })
      .catch(function () {});
  }, 3000);
})();
</script>`;
}

/** The report's and login page's simple header. */
export function header(title: string, sub: string, right = ""): string {
  return `<div class="top">
  <h1>${esc(title)}</h1>
  <span class="sub">${esc(sub)}</span>
  <span class="spacer"></span>
  ${right}
</div>`;
}

/** The workspace page header: title, subtitle, chips under it, actions right. */
export function pageHeader(x: {
  title: string; sub?: string; chips?: string[]; actions?: string; crumb?: string;
}): string {
  return `${x.crumb ? `<div class="crumb">${x.crumb}</div>` : ""}<div class="ph">
  <div class="ph-text">
    <h1>${esc(x.title)}</h1>
    ${x.sub ? `<div class="sub">${esc(x.sub)}</div>` : ""}
    ${x.chips?.length ? `<div class="ph-chips">${x.chips.join("")}</div>` : ""}
  </div>
  ${x.actions ? `<div class="ph-actions">${x.actions}</div>` : ""}
</div>`;
}

// ---------------------------------------------------------------------------
// severity
// ---------------------------------------------------------------------------
export type Severity = "critical" | "high" | "medium" | "low";

/**
 * Severity carries three channels, and hue is the least reliable of them.
 *
 * The reference palette's own validation puts warning ↔ serious at ΔE 13.6 on
 * the light surface — below the floor where full-colour vision can separate a
 * pair. So the word comes first, the glyph second, the colour third. Nobody
 * ever has to tell yellow from orange to read this report.
 */
const SEVERITY: Record<Severity, { tone: string; glyph: string; rank: number }> = {
  critical: { tone: "var(--critical)", glyph: "!", rank: 0 },
  high:     { tone: "var(--serious)",  glyph: "▲", rank: 1 },
  medium:   { tone: "var(--warning)",  glyph: "●", rank: 2 },
  low:      { tone: "var(--muted)",    glyph: "·", rank: 3 },
};

export function severityBadge(severity: string): string {
  const key = (severity in SEVERITY ? severity : "low") as Severity;
  const s = SEVERITY[key];
  return `<span class="sev ${key}" style="--tone:${s.tone}">`
    + `<span class="glyph" aria-hidden="true">${s.glyph}</span>`
    + `${esc(thWeb.severity[key])}</span>`;
}

export function severityRank(severity: string): number {
  return SEVERITY[(severity in SEVERITY ? severity : "low") as Severity].rank;
}

// ---------------------------------------------------------------------------
// figures
// ---------------------------------------------------------------------------
/**
 * The hero figure. Exactly one per view — see the mark specs.
 *
 * The number stays in ink; the verdict beside it carries the status as a dot
 * plus words, so nothing depends on reading a colour off a numeral.
 */
export function hero(score: number, verdict: string, note: string, tone?: string): string {
  return `<div class="hero">
  <div class="hero-figure">${Math.round(score)}<span class="of">/ 100</span></div>
  <div class="hero-side">
    <div class="hero-verdict">${tone ? dot(tone) : ""}${esc(verdict)}</div>
    <div class="hero-note">${esc(note)}</div>
  </div>
</div>`;
}

/** A large figure that is *not* the hero — the secondary number on a page. */
export function figure(score: number, of = "/ 100"): string {
  return `<div class="figure">${Math.round(score)}<span class="of">${esc(of)}</span></div>`;
}

/** A status mark: the colour channel, never on text. */
export function dot(tone: string, variant: "" | "hollow" | "hatch" = ""): string {
  return `<span class="dot${variant ? ` ${variant}` : ""}" style="--tone:${tone}" aria-hidden="true"></span>`;
}

export interface Tile {
  label: string;
  value: number | string;
  unit?: string;
  sub?: string;
  /** A status colour, shown as a dot beside the label. */
  tone?: string;
}

/** Stat tiles: label, value, optional unit and sub-line. No colour on the number. */
export function statTiles(tiles: Tile[]): string {
  return `<div class="tiles">${tiles.map((t) => `<div class="tile">
  <div class="tile-label">${t.tone ? dot(t.tone) : ""}${esc(t.label)}</div>
  <div class="tile-value">${esc(t.value)}${t.unit ? `<span class="unit">${esc(t.unit)}</span>` : ""}</div>
  ${t.sub ? `<div class="tile-sub">${esc(t.sub)}</div>` : ""}
</div>`).join("")}</div>`;
}

export interface MeterRow {
  name: string;
  value: number;
  /** True when the data behind this score was never collected. */
  unmeasured?: boolean;
  /** Shown instead of the number — "30/40" for a component with its own max. */
  label?: string;
}

/**
 * A score meter per category.
 *
 * The fill carries severity and the track is the same hue lightened, so state
 * reads across the whole bar rather than only where it is filled.
 *
 * An unmeasured category is hatched and shows no number at all. Painting a
 * placeholder 50 as amber would tell the owner they scored badly on something
 * nobody looked at — the single most damaging thing this page could do, and
 * the reason scoring v2 exists.
 */
export function meters(rows: MeterRow[]): string {
  const body = rows.map((r) => {
    if (r.unmeasured) {
      // The hatch says "no data" and the short label repeats it in words. The
      // *reason* goes in the list underneath, where a sentence has room.
      return `<div class="meter-row unmeasured">
  <div class="meter-name">${esc(r.name)}</div>
  <div class="meter-track"></div>
  <div class="meter-value">${esc(thWeb.notMeasured)}</div>
</div>`;
    }
    const pct = Math.max(0, Math.min(100, Math.round(r.value)));
    return `<div class="meter-row" style="--tone:${scoreTone(pct)}">
  <div class="meter-name">${esc(r.name)}</div>
  <div class="meter-track"><div class="meter-fill" style="width:${pct}%"></div></div>
  <div class="meter-value">${r.label === undefined ? pct : esc(r.label)}</div>
</div>`;
  }).join("\n");
  return `<div class="meters">${body}</div>`;
}

/** Score bands. One place, so the hero and the meters cannot disagree. */
export function scoreTone(score: number): string {
  if (score >= 70) return "var(--good)";
  if (score >= 45) return "var(--warning)";
  if (score >= 25) return "var(--serious)";
  return "var(--critical)";
}

/**
 * How much of the picture was actually measured.
 *
 * The overall score is an average over measured categories only (scoring v3),
 * so a high score on thin coverage is a real and important state — "82, but we
 * only looked at 40% of it" is a different sentence from "82". This is the bar
 * that stops the first one being read as the second.
 */
export function coverageBar(fraction: number, note: string): string {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  const tone = pct >= 80 ? "var(--good)" : pct >= 50 ? "var(--warning)" : "var(--serious)";
  return `<div class="coverage">
  <div class="coverage-head">
    <span class="coverage-pct">${pct}%</span>
    <span class="coverage-note">${esc(note)}</span>
  </div>
  <div class="coverage-track" style="--tone:${tone}">
    <div class="coverage-fill" style="width:${pct}%"></div>
  </div>
</div>`;
}

export interface StackRow {
  label: string;
  /** Segments in a fixed order; zero-value segments are dropped. */
  segments: { key: string; value: number; tone: string }[];
}

/**
 * A stacked bar per row — findings by category, split by severity.
 *
 * Answers "where are the problems", which no list sorted by priority can:
 * a reader scanning twenty rows cannot tell that six of them are conversion.
 *
 * Segments are separated by a 2px gap in the surface colour rather than a
 * stroke, values ride the end of each bar, and the legend carries identity so
 * nothing depends on telling amber from orange.
 */
export function stackedBars(
  rows: StackRow[], legend: { key: string; label: string; tone: string }[],
): string {
  const max = Math.max(1, ...rows.map((r) => r.segments.reduce((a, s) => a + s.value, 0)));

  const body = rows.map((r) => {
    const total = r.segments.reduce((a, s) => a + s.value, 0);
    const bar = r.segments
      .filter((s) => s.value > 0)
      .map((s) =>
        `<span class="seg" style="flex:${s.value};background:${s.tone}" title="${
          esc(legendLabel(legend, s.key))}: ${s.value}"></span>`)
      .join("");

    return `<div class="stack-row">
  <div class="stack-label">${esc(r.label)}</div>
  <div class="stack-lane">
    <div class="stack-bar" style="width:${(total / max) * 100}%">${bar}</div>
  </div>
  <div class="stack-total">${total}</div>
</div>`;
  }).join("");

  const keys = legend.map((l) =>
    `<span class="key"><span class="key-dot" style="background:${l.tone}"></span>${
      esc(l.label)}</span>`).join("");

  return `<div class="stack">${body}</div><div class="legend">${keys}</div>`;
}

function legendLabel(legend: { key: string; label: string }[], key: string): string {
  return legend.find((l) => l.key === key)?.label ?? key;
}

export function counts(items: { n: number | string; label: string; tone?: string }[]): string {
  const body = items.map((i) =>
    `<div class="count-item">
  <div class="n">${i.tone ? dot(i.tone) : ""}${esc(i.n)}</div>
  <div class="l">${esc(i.label)}</div>
</div>`).join("\n");
  return `<div class="counts">${body}</div>`;
}

// ---------------------------------------------------------------------------
// opportunity signal table
// ---------------------------------------------------------------------------
export interface SignalRow {
  name: string;
  points: number;
  max: number;
  status: "hit" | "partial" | "miss" | "unmeasured";
  /** Already-escaped HTML — evidence sentences, finding titles, a link. */
  why: string;
}

const SIGNAL_TONE: Record<SignalRow["status"], string> = {
  hit: "var(--good)", partial: "var(--warning)", miss: "var(--axis)", unmeasured: "var(--axis)",
};

/**
 * The operator's own scoring table, one row per signal: a status mark, the
 * signal's name with its evidence underneath, and the points on the right.
 *
 * Points are text and stay in ink. The mark beside the name carries status —
 * filled for a hit, hollow for a miss, hatched when nothing could be measured —
 * and the word under the total says what the hatch means.
 */
export function signalTable(
  rows: SignalRow[], total: { points: number; max: number; note: string },
): string {
  const t = thWeb.opportunity;
  const body = rows.map((r) => {
    const mark = r.status === "unmeasured" ? dot(SIGNAL_TONE[r.status], "hatch")
      : r.status === "miss" ? dot(SIGNAL_TONE[r.status], "hollow")
      : dot(SIGNAL_TONE[r.status]);
    const pts = r.status === "unmeasured"
      ? esc(t.status.unmeasured)
      : r.status === "partial"
        ? `+${r.points}<span class="of"> / ${r.max}</span>`
        : `+${r.points}`;
    return `<div class="sig-row ${r.status}">
  ${mark}
  <div><div class="sig-name">${esc(r.name)}</div>${r.why ? `<div class="sig-why">${r.why}</div>` : ""}</div>
  <div class="sig-pts">${pts}</div>
</div>`;
  }).join("");

  return `<div class="sig">
<div class="sig-head"><span></span><span>${esc(t.signalHead)}</span><span style="text-align:right">${esc(t.pointsHead)}</span></div>
${body}
<div class="sig-foot"><span></span><div><div class="sig-name">${esc(t.total)}</div><div class="sig-why">${esc(total.note)}</div></div>
  <div class="sig-pts">${total.points}<span class="of"> / ${total.max}</span></div></div>
</div>`;
}

// ---------------------------------------------------------------------------
// small pieces
// ---------------------------------------------------------------------------
export function card(title: string, body: string, note?: string, right?: string): string {
  const head = title
    ? `<div class="card-head"><h2>${esc(title)}</h2>${note ? `<span class="note">${esc(note)}</span>` : ""}${
        right ? `<span class="right">${right}</span>` : ""}</div>`
    : "";
  return `<section class="card">${head}${body}</section>`;
}

/** A pill with a status dot; `tone` tints it, `cls` picks a named variant. */
export function pill(text: string, opts: { tone?: string; cls?: string } = {}): string {
  const cls = ["pill", opts.tone ? "tone" : "", opts.cls ?? ""].filter(Boolean).join(" ");
  const style = opts.tone ? ` style="--tone:${opts.tone}"` : "";
  return `<span class="${cls}"${style}>${opts.tone || opts.cls ? `<span class="dot"></span>` : ""}${esc(text)}</span>`;
}

export function chip(text: string): string {
  return `<span class="chip">${esc(text)}</span>`;
}

export function table(
  headers: { label: string; num?: boolean; sort?: string }[],
  rows: string[][],
  opts: { id?: string; rowAttrs?: string[] } = {},
): string {
  const head = headers
    .map((h) => `<th${h.num ? ' class="num"' : ""}${h.sort ? ` data-sort="${esc(h.sort)}"` : ""}>${esc(h.label)}</th>`)
    .join("");
  const body = rows
    .map((cells, i) =>
      `<tr${opts.rowAttrs?.[i] ? ` ${opts.rowAttrs[i]}` : ""}>` + cells
        .map((c, j) => `<td${headers[j]?.num ? ' class="num"' : ""}>${c}</td>`)
        .join("") + "</tr>")
    .join("\n");
  return `<div class="scroll-x"><table${opts.id ? ` id="${esc(opts.id)}"` : ""}><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function empty(message: string): string {
  return `<div class="empty">${esc(message)}</div>`;
}

/**
 * A block of text the operator copies out by hand — the one way anything
 * leaves this tool. There is deliberately no "send" anywhere.
 */
export function copyBlock(id: string, text: string, label: string, done: string): string {
  return `<textarea class="brief" id="${esc(id)}" readonly spellcheck="false">${esc(text)}</textarea>
<p style="margin:10px 0 0;display:flex;gap:10px;align-items:center">
  <button type="button" class="small" data-copy="${esc(id)}">${esc(label)}</button>
  <span class="muted" style="font-size:12.5px" data-copied-for="${esc(id)}"></span>
</p>
<script>
(function () {
  var btn = document.querySelector('[data-copy="${esc(id)}"]');
  var out = document.querySelector('[data-copied-for="${esc(id)}"]');
  var ta = document.getElementById(${JSON.stringify(id)});
  if (!btn || !ta) return;
  btn.addEventListener("click", function () {
    var text = ta.value;
    var ok = function () { if (out) out.textContent = ${JSON.stringify(done)}; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { ta.select(); document.execCommand("copy"); ok(); });
    } else { ta.select(); document.execCommand("copy"); ok(); }
  });
})();
</script>`;
}

/** Client-side search and sort for a table — no round trip for a filter. */
export function tableControls(tableId: string, searchId: string): string {
  return `<script>
(function () {
  var table = document.getElementById(${JSON.stringify(tableId)});
  var search = document.getElementById(${JSON.stringify(searchId)});
  if (!table) return;
  var tbody = table.tBodies[0];
  var rows = function () { return Array.prototype.slice.call(tbody.rows); };

  if (search) search.addEventListener("input", function () {
    var q = search.value.trim().toLowerCase();
    rows().forEach(function (tr) {
      tr.hidden = q !== "" && (tr.getAttribute("data-q") || "").indexOf(q) === -1;
    });
  });

  Array.prototype.forEach.call(table.querySelectorAll("th[data-sort]"), function (th, i) {
    th.addEventListener("click", function () {
      var dir = th.classList.contains("asc") ? "desc" : "asc";
      Array.prototype.forEach.call(table.querySelectorAll("th"), function (h) { h.classList.remove("asc", "desc"); });
      th.classList.add(dir);
      var numeric = th.getAttribute("data-sort") === "num";
      var sorted = rows().sort(function (a, b) {
        var x = a.cells[i].getAttribute("data-v") || a.cells[i].textContent.trim();
        var y = b.cells[i].getAttribute("data-v") || b.cells[i].textContent.trim();
        var r = numeric ? (parseFloat(x) || 0) - (parseFloat(y) || 0) : x.localeCompare(y, "th");
        return dir === "asc" ? r : -r;
      });
      sorted.forEach(function (tr) { tbody.appendChild(tr); });
    });
  });
})();
</script>`;
}
