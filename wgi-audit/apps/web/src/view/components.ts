/**
 * The pieces every page is built from.
 *
 * Plain functions returning HTML strings. Everything user-supplied goes through
 * `esc` — a domain arrives from a form field and ends up in the page, so this
 * is the injection boundary and there is exactly one of it.
 */
import { CSS } from "./theme.ts";
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
export interface PageOptions {
  title: string;
  /** Poll this URL and reload when it reports the run has moved on. */
  pollUrl?: string;
  narrow?: boolean;
  bodyClass?: string;
}

export function page(opts: PageOptions, body: string): string {
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(opts.title)}</title>
<style>${CSS}</style>
</head>
<body${opts.bodyClass ? ` class="${esc(opts.bodyClass)}"` : ""}>
<div class="wrap${opts.narrow ? " narrow" : ""}">${body}</div>
${opts.pollUrl ? poller(opts.pollUrl) : ""}
</body>
</html>`;
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

export function header(title: string, sub: string, right = ""): string {
  return `<div class="top">
  <h1>${esc(title)}</h1>
  <span class="sub">${esc(sub)}</span>
  <span class="spacer"></span>
  ${right}
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
/** The hero figure. Exactly one per view — see the mark specs. */
export function hero(score: number, verdict: string, note: string): string {
  return `<div class="hero">
  <div class="hero-figure">${Math.round(score)}<span class="of"> / 100</span></div>
  <div class="hero-side">
    <div class="hero-verdict">${esc(verdict)}</div>
    <div class="hero-note">${esc(note)}</div>
  </div>
</div>`;
}

export interface MeterRow {
  name: string;
  value: number;
  /** True when the data behind this score was never collected. */
  unmeasured?: boolean;
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
  <div class="meter-value">${pct}</div>
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

export function counts(items: { n: number | string; label: string; tone?: string }[]): string {
  const body = items.map((i) =>
    `<div class="count-item">
  <div class="n"${i.tone ? ` style="color:${i.tone}"` : ""}>${esc(i.n)}</div>
  <div class="l">${esc(i.label)}</div>
</div>`).join("\n");
  return `<div class="counts">${body}</div>`;
}

export function card(title: string, body: string): string {
  return `<section class="card">${title ? `<h2>${esc(title)}</h2>` : ""}${body}</section>`;
}

export function table(
  headers: { label: string; num?: boolean }[],
  rows: string[][],
): string {
  const head = headers
    .map((h) => `<th${h.num ? ' class="num"' : ""}>${esc(h.label)}</th>`)
    .join("");
  const body = rows
    .map((cells) =>
      "<tr>" + cells
        .map((c, i) => `<td${headers[i]?.num ? ' class="num"' : ""}>${c}</td>`)
        .join("") + "</tr>")
    .join("\n");
  return `<div class="scroll-x"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function empty(message: string): string {
  return `<div class="empty">${esc(message)}</div>`;
}
