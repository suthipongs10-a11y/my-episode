/**
 * The whole stylesheet, in one string.
 *
 * No build step anywhere in this app: no bundler, no CSS framework, no npm
 * install beyond what the audit engine already needs. `pnpm dash` starts and
 * the page is there. That is deliberate — a dashboard the operator cannot get
 * running on a Tuesday morning is worth less than no dashboard, and this one
 * has to work on a Windows laptop with nothing installed but Node.
 *
 * ## Colour
 *
 * Values are the validated reference palette. Two jobs only:
 *
 *   - **Status** (good / warning / serious / critical) for severity and for
 *     score meters. Fixed, never themed, and never reused as a series colour.
 *   - **Sequential blue** for anything showing magnitude without a verdict.
 *
 * There is no categorical palette here because nothing in this product is
 * categorical — six category scores are six magnitudes, not six identities.
 *
 * The validator reports warning ↔ serious at ΔE 13.6 on the light surface,
 * below the 15 floor: side by side, "medium" and "high" are hard to tell apart
 * by hue. That is the documented property of this status palette, and its
 * documented mitigation is that a status colour never carries meaning alone.
 * So every severity badge here ships a Thai word *and* a distinct glyph, and
 * hue is the third channel rather than the only one.
 *
 * ## Thai
 *
 * The font stack names Leelawadee UI (Windows) and Noto Sans Thai (Linux,
 * Android) ahead of the generic sans. Without them Thai falls back to a face
 * with no proper tone-mark positioning and the report looks amateur — which
 * matters when the operator is showing it to a paying customer.
 */
export const CSS = `
:root {
  color-scheme: light;
  --surface:      #fcfcfb;
  --plane:        #f9f9f7;
  --ink:          #0b0b0b;
  --ink-2:        #52514e;
  --muted:        #898781;
  --grid:         #e1e0d9;
  --axis:         #c3c2b7;
  --hairline:     rgba(11,11,11,0.10);

  --good:         #0ca30c;
  --warning:      #fab219;
  --serious:      #ec835a;
  --critical:     #d03b3b;

  --blue:         #2a78d6;
  --blue-100:     #cde2fb;
  --blue-600:     #184f95;

  --radius:       10px;
  --gap:          16px;
  --sans: system-ui, -apple-system, "Segoe UI", "Leelawadee UI",
          "Noto Sans Thai", "IBM Plex Sans Thai", Tahoma, sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --surface:  #1a1a19;
    --plane:    #0d0d0d;
    --ink:      #ffffff;
    --ink-2:    #c3c2b7;
    --muted:    #898781;
    --grid:     #2c2c2a;
    --axis:     #383835;
    --hairline: rgba(255,255,255,0.10);
    --blue:     #3987e5;
    --blue-100: #184f95;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --surface:  #1a1a19;
  --plane:    #0d0d0d;
  --ink:      #ffffff;
  --ink-2:    #c3c2b7;
  --grid:     #2c2c2a;
  --axis:     #383835;
  --hairline: rgba(255,255,255,0.10);
  --blue:     #3987e5;
  --blue-100: #184f95;
}

* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--plane);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.6;
}
a { color: var(--blue); text-decoration: none; }
a:hover { text-decoration: underline; }

.wrap { max-width: 1040px; margin: 0 auto; padding: 28px 20px 80px; }
.wrap.narrow { max-width: 760px; }

/* -- header ------------------------------------------------------------- */
.top {
  display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap;
  padding-bottom: 18px; margin-bottom: 24px;
  border-bottom: 1px solid var(--grid);
}
.top h1 { font-size: 19px; margin: 0; font-weight: 650; letter-spacing: -0.01em; }
.top .sub { color: var(--muted); font-size: 13px; }
.top .spacer { flex: 1; }

/* -- cards -------------------------------------------------------------- */
.card {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: var(--radius);
  padding: 20px;
}
.card + .card { margin-top: var(--gap); }
.card h2 {
  font-size: 13px; font-weight: 650; margin: 0 0 14px;
  color: var(--ink-2); letter-spacing: 0.02em;
}
.card .note { color: var(--muted); font-size: 13px; margin: 10px 0 0; }

/* -- hero: exactly one per view ---------------------------------------- */
.hero { display: flex; align-items: center; gap: 26px; flex-wrap: wrap; }
.hero-figure { font-size: 60px; font-weight: 680; line-height: 1; letter-spacing: -0.03em; }
.hero-figure .of { font-size: 20px; font-weight: 500; color: var(--muted); }
.hero-side { flex: 1; min-width: 240px; }
.hero-verdict { font-size: 17px; font-weight: 620; margin-bottom: 2px; }
.hero-note { color: var(--ink-2); font-size: 14px; }

/* -- meters: fill carries severity, track is the same hue lightened ----- */
/* Thai labels do not abbreviate, and a wrapped category name reads as a
   layout bug. The name column fits the longest of them on one line. */
.meters { display: grid; gap: 13px; }
.meter-row {
  display: grid; grid-template-columns: minmax(150px, auto) 1fr 92px;
  gap: 14px; align-items: center;
}
.meter-name { font-size: 14px; color: var(--ink-2); white-space: nowrap; }
.meter-track {
  height: 9px; border-radius: 5px; overflow: hidden;
  background: color-mix(in srgb, var(--tone) 22%, var(--surface));
}
.meter-fill { height: 100%; border-radius: 5px; background: var(--tone); }
.meter-value { font-size: 14px; text-align: right; font-variant-numeric: tabular-nums; }
.meter-row.unmeasured .meter-track {
  background: repeating-linear-gradient(135deg,
    var(--grid) 0 5px, transparent 5px 10px);
}
.meter-row.unmeasured .meter-value { color: var(--muted); font-size: 12.5px; white-space: nowrap; }
/* Why each one is unmeasured, under the meters rather than squeezed beside
   them — the reason is a sentence and a sentence needs a line. */
.why { margin: 14px 0 0; padding: 0; list-style: none; }
.why li { font-size: 12.5px; color: var(--muted); }
.why li + li { margin-top: 3px; }

/* -- severity badge: glyph + word + hue, in that order of reliability --- */
.sev {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12.5px; font-weight: 600; white-space: nowrap;
}
.sev .glyph {
  width: 13px; height: 13px; flex: none;
  display: inline-grid; place-items: center;
  font-size: 10px; line-height: 1; color: var(--surface);
  background: var(--tone); border-radius: 3px;
}
.sev.low .glyph { background: transparent; color: var(--muted); border: 1.5px solid var(--axis); }

/* -- counts row --------------------------------------------------------- */
.counts { display: flex; gap: 22px; flex-wrap: wrap; }
.count-item .n { font-size: 25px; font-weight: 650; line-height: 1.15; }
.count-item .l { font-size: 12.5px; color: var(--muted); }

/* -- tables ------------------------------------------------------------- */
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th {
  text-align: left; font-size: 12px; font-weight: 600; color: var(--muted);
  padding: 0 10px 8px 0; border-bottom: 1px solid var(--grid); white-space: nowrap;
}
td { padding: 11px 10px 11px 0; border-bottom: 1px solid var(--grid); vertical-align: top; }
tr:last-child td { border-bottom: 0; }
/* Numeric columns need real space on their right, or the last one collides
   with whatever follows it — a right-aligned cost against a status pill. */
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; padding-right: 20px; }
td:last-child, th:last-child { padding-right: 0; }
.scroll-x { overflow-x: auto; }

/* -- findings ----------------------------------------------------------- */
.finding { padding: 16px 0; border-bottom: 1px solid var(--grid); }
.finding:first-of-type { padding-top: 0; }
.finding:last-child { border-bottom: 0; padding-bottom: 0; }
.finding-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.finding-rank {
  font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums;
  min-width: 20px;
}
.finding-title { font-size: 15.5px; font-weight: 620; flex: 1; min-width: 260px; }
.finding-fix { color: var(--ink-2); margin: 7px 0 0 30px; font-size: 14px; }
.finding-meta { margin: 8px 0 0 30px; font-size: 12.5px; color: var(--muted); }
.finding-meta code {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 11.5px; background: var(--plane); padding: 1px 5px; border-radius: 4px;
}
details.ev { margin: 8px 0 0 30px; }
details.ev summary {
  cursor: pointer; font-size: 12.5px; color: var(--muted); width: fit-content;
}
details.ev pre {
  margin: 8px 0 0; padding: 12px; background: var(--plane);
  border-radius: 8px; overflow-x: auto; font-size: 12px; line-height: 1.5;
}

/* -- forms -------------------------------------------------------------- */
.form { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 12.5px; color: var(--muted); }
input[type=text], select {
  font: inherit; font-size: 14px; padding: 9px 11px;
  border: 1px solid var(--axis); border-radius: 8px;
  background: var(--surface); color: var(--ink); min-width: 220px;
}
input[type=text]:focus, select:focus {
  outline: 2px solid var(--blue); outline-offset: -1px; border-color: var(--blue);
}
button {
  font: inherit; font-size: 14px; font-weight: 600; padding: 9px 20px;
  border: 0; border-radius: 8px; background: var(--blue); color: #fff; cursor: pointer;
}
button:hover { filter: brightness(1.08); }
button.ghost {
  background: transparent; color: var(--ink-2); border: 1px solid var(--axis);
}

/* -- status pill -------------------------------------------------------- */
.pill {
  display: inline-block; font-size: 12px; font-weight: 600;
  padding: 2px 9px; border-radius: 999px;
  border: 1px solid var(--hairline); color: var(--ink-2); background: var(--plane);
}
.pill.running { border-color: var(--blue); color: var(--blue); }
.pill.failed  { border-color: var(--critical); color: var(--critical); }

/* -- progress ----------------------------------------------------------- */
.stages { display: grid; gap: 7px; }
.stage-row { display: flex; align-items: center; gap: 10px; font-size: 13.5px; }
.stage-dot {
  width: 9px; height: 9px; border-radius: 50%; flex: none;
  background: var(--grid); border: 1px solid var(--axis);
}
.stage-row.done .stage-dot { background: var(--good); border-color: var(--good); }
.stage-row.done .stage-name { color: var(--ink-2); }
.stage-row.pending .stage-name { color: var(--muted); }

/* -- misc --------------------------------------------------------------- */
.empty { text-align: center; padding: 46px 20px; color: var(--muted); }
.row-link { color: inherit; font-weight: 600; }
.banner {
  border-left: 3px solid var(--warning); background: var(--plane);
  padding: 11px 14px; border-radius: 0 8px 8px 0; font-size: 13.5px; color: var(--ink-2);
}
.banner.bad { border-left-color: var(--critical); }
.grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--gap); }
.grid-2 > .card + .card { margin-top: 0; }

/* -- print: the report is handed to a customer as a PDF ----------------- */
@media print {
  :root { --plane: #fff; --surface: #fff; }
  body { background: #fff; font-size: 12pt; }
  .no-print { display: none !important; }
  .wrap { max-width: none; padding: 0; }
  .card { border: 0; padding: 0 0 18pt; break-inside: avoid; }
  .card + .card { margin-top: 18pt; }
  .finding { break-inside: avoid; }
  details.ev { display: none; }
  a { color: inherit; text-decoration: none; }
}
`;
