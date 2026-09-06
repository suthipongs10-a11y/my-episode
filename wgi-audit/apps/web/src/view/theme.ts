/**
 * The whole stylesheet, in one string.
 *
 * No build step anywhere in this app: no bundler, no CSS framework, no npm
 * install beyond what the audit engine already needs. `pnpm dash` starts and
 * the page is there. That is deliberate — a dashboard the operator cannot get
 * running on a Tuesday morning is worth less than no dashboard, and this one
 * has to work on a Windows laptop with nothing installed but Node.
 *
 * ## Shape
 *
 * A dark sidebar and a light workspace, the way every product dashboard the
 * operator has paid for is laid out — so the first impression is "this is a
 * tool", not "this is a script that prints HTML". Cards on a warm-grey plane,
 * one hairline and a soft shadow each, 12px radius, 8px rhythm.
 *
 * ## Colour
 *
 * Values are the validated reference palette. Two jobs only:
 *
 *   - **Status** (good / warning / serious / critical) for severity and for
 *     score meters. Fixed, never themed, and never reused as a series colour.
 *   - **Sequential blue** for anything showing magnitude without a verdict,
 *     and for the one action colour.
 *
 * There is no categorical palette here because nothing in this product is
 * categorical — six category scores are six magnitudes, not six identities.
 *
 * The validator reports warning ↔ serious at ΔE 13.6 on the light surface,
 * below the 15 floor: side by side, "medium" and "high" are hard to tell apart
 * by hue. That is the documented property of this status palette, and its
 * documented mitigation is that a status colour never carries meaning alone.
 * So every severity badge here ships a Thai word *and* a distinct glyph, and
 * status colour lives on a mark — a dot, a fill, a pill — never on text.
 *
 * ## Thai
 *
 * IBM Plex Sans Thai, loaded from Google Fonts by `page()`: its Thai and Latin
 * were drawn together, so a row that mixes "Website มีปัญหา Conversion" with
 * numbers sits on one baseline at one weight. Offline, or behind a proxy that
 * blocks the font host, the stack falls to Noto Sans Thai / Leelawadee UI —
 * both position tone marks properly — and the page still reads as designed.
 * Thai needs more leading than Latin (stacked vowels and tone marks), hence
 * the 1.65 line height everywhere text wraps.
 */
export const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap";

export const CSS = `
:root {
  color-scheme: light;
  --plane:        #f3f3f0;
  --surface:      #ffffff;
  --surface-2:    #f7f7f5;
  --ink:          #16161a;
  --ink-2:        #4b4b52;
  --muted:        #85857e;
  --grid:         #e5e5df;
  --axis:         #c7c7be;
  --hairline:     rgba(22,22,26,0.08);
  --shadow:       0 1px 2px rgba(22,22,26,0.04), 0 2px 6px rgba(22,22,26,0.04);

  --side:         #16181d;
  --side-ink:     #e8e8e3;
  --side-muted:   #8b8c95;
  --side-line:    rgba(255,255,255,0.08);
  --side-active:  rgba(255,255,255,0.09);

  --good:         #0ca30c;
  --warning:      #fab219;
  --serious:      #ec835a;
  --critical:     #d03b3b;

  --blue:         #2a78d6;
  --blue-100:     #cde2fb;
  --blue-600:     #184f95;

  --radius:       12px;
  --gap:          16px;
  --sans: "IBM Plex Sans Thai", "Noto Sans Thai", "Leelawadee UI", "Segoe UI",
          system-ui, -apple-system, Tahoma, sans-serif;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --plane:      #101114;
    --surface:    #1a1b20;
    --surface-2:  #202127;
    --ink:        #f2f2ee;
    --ink-2:      #c3c3bb;
    --muted:      #8b8b84;
    --grid:       #2b2c32;
    --axis:       #3d3e46;
    --hairline:   rgba(255,255,255,0.08);
    --shadow:     0 1px 2px rgba(0,0,0,0.3);
    --side:       #0b0c0f;
    --blue:       #3987e5;
    --blue-100:   #184f95;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --plane:      #101114;
  --surface:    #1a1b20;
  --surface-2:  #202127;
  --ink:        #f2f2ee;
  --ink-2:      #c3c3bb;
  --muted:      #8b8b84;
  --grid:       #2b2c32;
  --axis:       #3d3e46;
  --hairline:   rgba(255,255,255,0.08);
  --shadow:     0 1px 2px rgba(0,0,0,0.3);
  --side:       #0b0c0f;
  --blue:       #3987e5;
  --blue-100:   #184f95;
}

* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--plane);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 14.5px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
a { color: var(--blue); text-decoration: none; }
a:hover { text-decoration: underline; }
h1, h2, h3 { line-height: 1.35; }
.num, .tnum { font-variant-numeric: tabular-nums; }

/* -- app shell: sidebar + workspace ------------------------------------ */
.app { display: grid; grid-template-columns: 236px minmax(0, 1fr); min-height: 100vh; }
.side {
  position: sticky; top: 0; height: 100vh;
  background: var(--side); color: var(--side-ink);
  display: flex; flex-direction: column; padding: 22px 16px;
}
.brand { display: flex; align-items: center; gap: 11px; padding: 2px 8px 22px; }
.brand-mark {
  width: 32px; height: 32px; border-radius: 9px; flex: none;
  background: linear-gradient(135deg, var(--blue) 0%, #6fb1ff 100%);
  display: grid; place-items: center; color: #fff; font-weight: 700; font-size: 14px;
  letter-spacing: -0.02em;
}
.brand-name { font-weight: 650; font-size: 15px; letter-spacing: -0.01em; white-space: nowrap; }
.brand-sub { font-size: 11.5px; color: var(--side-muted); line-height: 1.35; }
.nav { display: grid; gap: 2px; }
.nav a {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px; border-radius: 8px; white-space: nowrap;
  color: var(--side-ink); font-size: 14px; font-weight: 500;
}
.nav a:hover { background: var(--side-active); text-decoration: none; }
.nav a.active { background: var(--side-active); color: #fff; }
.nav .ico { width: 18px; height: 18px; flex: none; opacity: 0.85; }
.side-foot {
  margin-top: auto; padding: 14px 8px 0; border-top: 1px solid var(--side-line);
  font-size: 12px; color: var(--side-muted); display: flex; align-items: center; gap: 10px;
}
.side-foot .who { flex: 1; }
.side-foot button {
  background: transparent; color: var(--side-ink); border: 1px solid var(--side-line);
  padding: 5px 11px; font-size: 12px; border-radius: 7px;
}
.main { padding: 30px 36px 90px; min-width: 0; }
.main > * { max-width: 1240px; }

@media (max-width: 900px) {
  .app { grid-template-columns: 1fr; }
  .side { position: static; height: auto; flex-direction: row; align-items: center; padding: 12px 16px; gap: 12px; }
  .brand { padding: 0; }
  .brand-sub { display: none; }
  .nav { grid-auto-flow: column; }
  .nav a { padding: 7px 10px; }
  .side-foot { margin: 0 0 0 auto; padding: 0; border: 0; }
  .side-foot .who { display: none; }
  .main { padding: 20px 16px 60px; }
}

/* -- plain wrapper for the pages without a sidebar (report, login) ------ */
.wrap { max-width: 1040px; margin: 0 auto; padding: 28px 20px 80px; }
.wrap.narrow { max-width: 760px; }

/* -- page header ---------------------------------------------------------- */
.ph { display: flex; align-items: flex-start; gap: 18px; flex-wrap: wrap; margin-bottom: 22px; }
.ph-text { flex: 1; min-width: 260px; }
.ph h1 { font-size: 23px; margin: 0; font-weight: 700; letter-spacing: -0.015em; }
.ph .sub { color: var(--muted); font-size: 13.5px; margin-top: 2px; }
.ph-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.ph-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.crumb { font-size: 13px; color: var(--muted); margin-bottom: 10px; }
.crumb a { color: var(--muted); }

/* legacy header used by the report and login pages */
.top {
  display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap;
  padding-bottom: 18px; margin-bottom: 24px;
  border-bottom: 1px solid var(--grid);
}
.top h1 { font-size: 19px; margin: 0; font-weight: 650; letter-spacing: -0.01em; }
.top .sub { color: var(--muted); font-size: 13px; }
.top .spacer { flex: 1; }

/* -- buttons --------------------------------------------------------------- */
button, .btn {
  font: inherit; font-size: 13.5px; font-weight: 600; padding: 8px 16px;
  border: 0; border-radius: 8px; background: var(--blue); color: #fff; cursor: pointer;
  display: inline-flex; align-items: center; gap: 7px; line-height: 1.4; white-space: nowrap;
}
button:hover, .btn:hover { filter: brightness(1.06); text-decoration: none; }
button.ghost, .btn.ghost {
  background: var(--surface); color: var(--ink-2); border: 1px solid var(--axis);
}
button.ghost:hover, .btn.ghost:hover { background: var(--surface-2); filter: none; }
button.small { padding: 5px 11px; font-size: 12.5px; }

/* -- cards ------------------------------------------------------------------ */
.card {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px 22px;
}
.card + .card { margin-top: var(--gap); }
.card h2 {
  font-size: 14px; font-weight: 650; margin: 0 0 14px;
  color: var(--ink); letter-spacing: 0.005em;
}
.card-head {
  display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 14px;
}
.card-head h2 { margin: 0; }
.card-head .note { margin: 0; }
.card-head .right { margin-left: auto; }
.card .note { color: var(--muted); font-size: 13px; margin: 10px 0 0; }
.grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: var(--gap); }
.grid-2 > .card + .card { margin-top: 0; }
.stack-v > * + * { margin-top: var(--gap); }

/* -- stat tiles ---------------------------------------------------------- */
.tiles {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px; margin-bottom: var(--gap);
}
.tile {
  background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--radius);
  box-shadow: var(--shadow); padding: 14px 16px 13px; min-width: 0;
}
.tile-label { font-size: 12.5px; color: var(--muted); display: flex; align-items: center; gap: 7px; }
.tile-value { font-size: 26px; font-weight: 650; line-height: 1.2; margin-top: 4px; letter-spacing: -0.02em; }
.tile-value .unit { font-size: 13px; font-weight: 500; color: var(--muted); margin-left: 4px; letter-spacing: 0; }
.tile-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.dot {
  display: inline-block; width: 9px; height: 9px; border-radius: 50%;
  background: var(--tone, var(--axis)); flex: none; vertical-align: middle;
}
.dot.hollow { background: transparent; border: 1.5px solid var(--axis); }
.dot.hatch {
  border-radius: 2px; background: repeating-linear-gradient(135deg, var(--axis) 0 2px, transparent 2px 4px);
}

/* -- hero: exactly one per view ---------------------------------------- */
.hero { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
.hero-figure {
  font-size: 58px; font-weight: 680; line-height: 1; letter-spacing: -0.035em;
  display: flex; align-items: baseline; gap: 6px;
}
.hero-figure .of { font-size: 17px; font-weight: 500; color: var(--muted); letter-spacing: 0; }
.hero-side { flex: 1; min-width: 220px; }
.hero-verdict { font-size: 16.5px; font-weight: 640; margin-bottom: 3px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.hero-note { color: var(--ink-2); font-size: 13.5px; }
.figure {
  font-size: 34px; font-weight: 680; line-height: 1; letter-spacing: -0.03em;
  display: flex; align-items: baseline; gap: 5px;
}
.figure .of { font-size: 14px; font-weight: 500; color: var(--muted); letter-spacing: 0; }

/* -- meters: fill carries severity, track is the same hue lightened ----- */
/* Thai labels do not abbreviate, and a wrapped category name reads as a
   layout bug. The name column fits the longest of them on one line. */
.meters { display: grid; gap: 12px; }
.meter-row {
  display: grid; grid-template-columns: minmax(150px, auto) 1fr 92px;
  gap: 14px; align-items: center;
}
.meter-name { font-size: 13.5px; color: var(--ink-2); white-space: nowrap; }
.meter-track {
  height: 8px; border-radius: 4px; overflow: hidden;
  background: color-mix(in srgb, var(--tone) 22%, var(--surface));
}
.meter-fill { height: 100%; border-radius: 4px; background: var(--tone); }
.meter-value { font-size: 13.5px; text-align: right; font-variant-numeric: tabular-nums; }
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
  width: 14px; height: 14px; flex: none;
  display: inline-grid; place-items: center;
  font-size: 10px; line-height: 1; color: #fff;
  background: var(--tone); border-radius: 4px;
}
.sev.low .glyph { background: transparent; color: var(--muted); border: 1.5px solid var(--axis); }

/* -- coverage ----------------------------------------------------------- */
.coverage { margin-top: 18px; }
.coverage-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
.coverage-pct { font-size: 16px; font-weight: 650; font-variant-numeric: tabular-nums; }
.coverage-note { font-size: 12.5px; color: var(--muted); }
.coverage-track {
  height: 6px; border-radius: 3px;
  background: color-mix(in srgb, var(--tone) 20%, var(--surface));
}
.coverage-fill { height: 100%; border-radius: 3px; background: var(--tone); }

/* -- opportunity signal table ------------------------------------------ */
.sig { display: grid; }
.sig-head, .sig-row, .sig-foot {
  display: grid; grid-template-columns: 22px minmax(0, 1fr) 96px;
  gap: 12px; align-items: start; padding: 11px 0;
  border-bottom: 1px solid var(--grid);
}
.sig-head { padding: 0 0 8px; font-size: 12px; font-weight: 600; color: var(--muted); align-items: end; }
.sig-row:last-of-type { border-bottom: 0; }
.sig-row .dot { margin-top: 7px; }
.sig-name { font-size: 14px; font-weight: 550; }
.sig-why { font-size: 12.5px; color: var(--muted); margin-top: 1px; }
.sig-why a { color: var(--blue); }
.sig-pts { text-align: right; font-variant-numeric: tabular-nums; font-size: 15px; font-weight: 650; white-space: nowrap; }
.sig-pts .of { font-size: 12px; font-weight: 500; color: var(--muted); }
.sig-row.miss .sig-pts, .sig-row.unmeasured .sig-pts { color: var(--muted); font-weight: 500; font-size: 13px; }
.sig-row.miss .sig-name { color: var(--ink-2); font-weight: 500; }
.sig-row.unmeasured .sig-name { color: var(--muted); font-weight: 500; }
.sig-foot { border-top: 2px solid var(--grid); border-bottom: 0; padding: 12px 0 0; margin-top: 2px; }
.sig-foot .sig-name { font-weight: 650; }
.sig-foot .sig-pts { font-size: 16px; }
.sig-status { font-size: 11.5px; color: var(--muted); }

/* -- stacked bars ------------------------------------------------------- */
.stack { display: grid; gap: 9px; }
.stack-row {
  display: grid; grid-template-columns: minmax(140px, auto) 1fr 34px;
  gap: 14px; align-items: center;
}
.stack-label { font-size: 13.5px; color: var(--ink-2); white-space: nowrap; }
.stack-lane { min-width: 0; }
.stack-bar { display: flex; height: 16px; min-width: 3px; }
/* White does the separating, never a stroke — a border would add ink that is
   not data. Rounded only at the two outer ends, so the bar reads as one bar. */
.stack-bar .seg { min-width: 3px; }
.stack-bar .seg + .seg { margin-left: 2px; }
.stack-bar .seg:first-child { border-radius: 4px 0 0 4px; }
.stack-bar .seg:last-child { border-radius: 0 4px 4px 0; }
.stack-bar .seg:only-child { border-radius: 4px; }
.stack-total {
  font-size: 13.5px; text-align: right; font-variant-numeric: tabular-nums;
  color: var(--ink-2);
}
.legend { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 14px; }
.key { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--ink-2); }
.key-dot { width: 10px; height: 10px; border-radius: 3px; flex: none; }

/* -- counts row --------------------------------------------------------- */
.counts { display: flex; gap: 22px; flex-wrap: wrap; }
.count-item .n { font-size: 24px; font-weight: 650; line-height: 1.15; display: flex; align-items: center; gap: 7px; }
.count-item .l { font-size: 12.5px; color: var(--muted); }

/* -- tables ------------------------------------------------------------- */
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th {
  text-align: left; font-size: 12px; font-weight: 600; color: var(--muted);
  padding: 0 10px 9px 0; border-bottom: 1px solid var(--grid); white-space: nowrap;
}
td { padding: 11px 10px 11px 0; border-bottom: 1px solid var(--grid); vertical-align: top; }
tr:last-child td { border-bottom: 0; }
tbody tr:hover td { background: var(--surface-2); }
/* Numeric columns need real space on their right, or the last one collides
   with whatever follows it — a right-aligned cost against a status pill. */
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; padding-right: 20px; }
td:last-child, th:last-child { padding-right: 0; }
.scroll-x { overflow-x: auto; }
th[data-sort] { cursor: pointer; user-select: none; }
th[data-sort]:hover { color: var(--ink); }
th[data-sort].asc::after { content: " ↑"; }
th[data-sort].desc::after { content: " ↓"; }
.cell-sub { display: block; font-size: 12px; color: var(--muted); font-weight: 400; margin-top: 1px; }
.score-cell { display: inline-flex; align-items: center; gap: 7px; font-weight: 600; font-variant-numeric: tabular-nums; }
.toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
.toolbar .hint { font-size: 12px; color: var(--muted); margin-left: auto; }
input.search {
  font: inherit; font-size: 13.5px; padding: 8px 12px 8px 34px; min-width: 260px;
  border: 1px solid var(--axis); border-radius: 8px; background: var(--surface); color: var(--ink);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2385857e' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='7' cy='7' r='5'/%3E%3Cpath d='m11 11 3.5 3.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: 11px center;
}
input.search:focus { outline: 2px solid var(--blue); outline-offset: -1px; border-color: var(--blue); }

/* -- findings ----------------------------------------------------------- */
.finding { padding: 16px 0; border-bottom: 1px solid var(--grid); }
.finding:first-of-type { padding-top: 0; }
.finding:last-child { border-bottom: 0; padding-bottom: 0; }
.finding-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.finding-rank {
  font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums;
  min-width: 20px;
}
.finding-title { font-size: 15px; font-weight: 620; flex: 1; min-width: 260px; }
.finding-fix { color: var(--ink-2); margin: 7px 0 0 30px; font-size: 13.5px; }
.finding-check { margin: 6px 0 0 30px; font-size: 12.5px; color: var(--muted); }
.finding-meta { margin: 8px 0 0 30px; font-size: 12.5px; color: var(--muted); }
.finding-meta code {
  font-family: var(--mono);
  font-size: 11.5px; background: var(--surface-2); padding: 1px 5px; border-radius: 4px;
}
details.ev { margin: 8px 0 0 30px; }
details.ev summary {
  cursor: pointer; font-size: 12.5px; color: var(--muted); width: fit-content;
}
details.ev pre {
  margin: 8px 0 0; padding: 12px; background: var(--surface-2);
  border-radius: 8px; overflow-x: auto; font-size: 12px; line-height: 1.5;
}

/* -- forms -------------------------------------------------------------- */
.form { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 12.5px; color: var(--muted); }
input[type=text], input[type=password], select {
  font: inherit; font-size: 14px; padding: 9px 11px;
  border: 1px solid var(--axis); border-radius: 8px;
  background: var(--surface); color: var(--ink); min-width: 220px;
}
input[type=text]:focus, input[type=password]:focus, select:focus {
  outline: 2px solid var(--blue); outline-offset: -1px; border-color: var(--blue);
}

/* -- pills ----------------------------------------------------------------- */
.pill {
  display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
  padding: 2px 10px 2px 8px; border-radius: 999px; white-space: nowrap;
  border: 1px solid var(--hairline); color: var(--ink-2); background: var(--surface-2);
}
.pill .dot { width: 7px; height: 7px; }
.pill.tone { background: color-mix(in srgb, var(--tone) 13%, var(--surface)); border-color: transparent; color: var(--ink); }
.pill.running { border-color: var(--blue); color: var(--blue); background: transparent; }
.pill.running .dot { background: var(--blue); animation: pulse 1.4s ease-in-out infinite; }
.pill.failed  { border-color: var(--critical); color: var(--critical); background: transparent; }
.pill.failed .dot { background: var(--critical); }
.chip {
  display: inline-block; font-size: 12px; padding: 1px 9px; border-radius: 6px;
  background: var(--surface-2); border: 1px solid var(--hairline); color: var(--ink-2);
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

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

/* -- copyable brief ------------------------------------------------------ */
.brief {
  width: 100%; min-height: 300px; resize: vertical;
  font: inherit; font-size: 13px; line-height: 1.6;
  padding: 12px 14px; border: 1px solid var(--axis); border-radius: 8px;
  background: var(--surface-2); color: var(--ink);
}
.brief:focus { outline: 2px solid var(--blue); outline-offset: -1px; }

/* -- misc --------------------------------------------------------------- */
.empty { text-align: center; padding: 46px 20px; color: var(--muted); }
.row-link { color: inherit; font-weight: 600; }
.banner {
  border-left: 3px solid var(--warning); background: var(--surface-2);
  padding: 11px 14px; border-radius: 0 8px 8px 0; font-size: 13.5px; color: var(--ink-2);
}
.banner.bad { border-left-color: var(--critical); }
.muted { color: var(--muted); }
.sp-18 { height: 18px; }
.sp-22 { height: 22px; }

/* -- print: the report is handed to a customer as a PDF ----------------- */
@media print {
  :root { --plane: #fff; --surface: #fff; --shadow: none; }
  body { background: #fff; font-size: 12pt; }
  .no-print { display: none !important; }
  .wrap { max-width: none; padding: 0; }
  .card { border: 0; padding: 0 0 18pt; break-inside: avoid; box-shadow: none; }
  .card + .card { margin-top: 18pt; }
  .finding { break-inside: avoid; }
  details.ev { display: none; }
  a { color: inherit; text-decoration: none; }
}
`;
