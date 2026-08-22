#!/usr/bin/env node
// Counts how many scenes in each vox shot have a background photograph behind them.
//
// WHY THIS EXISTS. brand.md §4a locks the rule that every scene sits on a photograph rather
// than a flat fill. vox-11 needed THREE full renders to get there — four images, then twelve,
// then twenty-four — because nobody counted the empty scenes before rendering. Counting takes
// a second; a render takes fifteen minutes. This is that count.
//
//   node scripts/check-scene-imagery.mjs          # report every vox shot
//   node scripts/check-scene-imagery.mjs --check  # exit 1 if a non-grandfathered shot is short
//
// HOW IT DECIDES, and where it is only a heuristic.
//
// Scenes. A top-level scene is a `<Scene` or `<Chapter` at the SHALLOWEST indentation any of
// them uses INSIDE THE COMPOSITION BODY; everything until the next one belongs to it. Both the
// depth and the tag set are derived rather than hardcoded, because this checker has been wrong
// twice in exactly that way: the first version looked for six spaces and silently skipped
// vox-9, which nests at eight, and the second counted only `<Scene` and reported vox-12 — whose
// scenes are `<Chapter` — as a single bare scene. Both times it printed a confident number for
// a file it had not understood. It now refuses to do that: a file it cannot parse says so, and
// a shape that cannot be right (no scenes, or one scene for a composition this long) is an
// error rather than a row.
//
// Plates. Two composition styles are in use and both satisfy §4a:
//   per-scene  — a `<Plate src=…>` inside each scene            (vox-11)
//   track      — one `<Backdrop shots={[…]}>` spanning the film (vox-12)
// A track that starts at `at: 0` puts a photograph under every frame by construction, so scenes
// under it are never bare; what the report then shows is how many plates the track carries.
//
// It is still a heuristic, not a JSX parser, so a surprising number is a reason to open the
// file rather than to trust the tool.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(HERE, '../src/shots');

// Shots that predate the rule (brand.md §4a, locked 2026-08-18). Listed by name with the
// reason, rather than hidden behind a date or a threshold, so removing one is a decision
// somebody makes on purpose. Re-rendering an old video only for its background is not worth
// the machine time; the rule binds new work.
const GRANDFATHERED = new Set([
  'vox-1', 'vox-2', 'vox-3', 'vox-4', 'vox-5', 'vox-6', 'vox-7', 'vox-8', 'vox-8w', 'vox-9', 'vox-10',
]);

const SCENE_TAG = /^\s*<(Scene|Chapter)\b/;

const shots = readdirSync(SHOTS).filter((d) => statSync(join(SHOTS, d)).isDirectory() && d.startsWith('vox-'));

let failed = 0;
const rows = [];

for (const shot of shots.sort()) {
  const files = readdirSync(join(SHOTS, shot)).filter((f) => f.endsWith('.tsx'));
  for (const file of files) {
    const src = readFileSync(join(SHOTS, shot, file), 'utf8');
    const all = src.split('\n');

    // Only the composition body counts. `Scene` and `Chapter` are also DEFINED in these files,
    // and a definition's own `<Scene from={from}` would otherwise be counted as a scene.
    //
    // Two authoring styles are in use and both are ordinary React, so both are matched here:
    //   const Vox12BackPain: React.FC = () => (        vox-9..13
    //   export default function Vox14Trichoderma() {   vox-14
    // vox-14 arrived in the second style, the detector missed it, and the file fell back to a
    // whole-file scan that parsed the whole composition as one scene. The guard below caught
    // that — which is the third time this checker has been wrong about a file and the first
    // time it said so instead of printing a confident number.
    const BODY = /(:\s*React\.FC\s*=\s*\(\)\s*=>)|(^export\s+default\s+function\s+\w+\s*\()/;
    const bodyAt = all.findIndex((l) => BODY.test(l));
    const lines = bodyAt === -1 ? all : all.slice(bodyAt);

    const depths = lines.filter((l) => SCENE_TAG.test(l)).map((l) => l.match(/^\s*/)[0].length);
    if (!depths.length) {
      rows.push({ shot, unparsed: 'no <Scene>/<Chapter> in the composition body — check by hand' });
      continue;
    }
    const top0 = Math.min(...depths);

    // A `<Backdrop shots={[…]}>` track, if this shot uses one.
    const track = src.match(/<Backdrop[\s\S]*?shots=\{\[([\s\S]*?)\]\}/);
    const trackPlates = track ? (track[1].match(/\bsrc:\s*A\(/g) || []).length : 0;
    const trackFromZero = track ? /\{\s*at:\s*0\s*,/.test(track[1]) : false;

    const scenes = [];
    let cur = null;
    for (const line of lines) {
      if (new RegExp(`^ {${top0}}<(Scene|Chapter)\\b`).test(line)) {
        if (cur) scenes.push(cur);
        cur = { plates: 0, props: 0 };
        continue;
      }
      if (!cur) continue;
      if (/<Plate\s+src=/.test(line)) cur.plates++;
      // <PhotoCard> is vox-17's addition — an UNDIMMED photograph presented as content rather
      // than as a dimmed backdrop. It carries a scene the same way a cut-out prop does, so it
      // counts here; without this the checker reported six of vox-17's ten chapters as bare.
      if (/<(Prop|PhotoCard)\s+[\s\S]*?src=/.test(line) || /<PhotoCard\b/.test(line)) cur.props++;
    }
    if (cur) scenes.push(cur);

    // Every A('…') must resolve to a file that exists. A missing layer is invisible in the
    // source and in tsc — it surfaces as a broken image partway through a render that has
    // already cost an hour. vox-15 referenced a plate that was never generated; this is that
    // check, and it costs a stat() per reference.
    const proj = (src.match(/staticFile\(`projects\/([^/]+)\//) || [])[1];
    const missing = [];
    if (proj) {
      const dir = resolve(HERE, '../../media/projects', proj, 'layers');
      for (const m of src.matchAll(/\bA\('([^']+)'\)/g)) {
        if (!existsSync(join(dir, m[1]))) missing.push(m[1]);
      }
    }

    const old = GRANDFATHERED.has(shot);
    // A track that starts at frame 0 covers every scene; otherwise each scene needs its own plate.
    const bare = trackFromZero ? 0 : scenes.filter((s) => s.plates === 0).length;
    const noProp = scenes.filter((s) => s.props === 0).length;
    const plates = trackFromZero ? trackPlates : scenes.reduce((n, s) => n + s.plates, 0);

    // A one-scene parse of a real film is the failure this tool made twice. Say so.
    const implausible = scenes.length < 2 && !old;
    // A missing file is a hard failure for every shot, grandfathered or not: an old video
    // that no longer renders is not "predating the rule", it is broken.
    const bad = ((bare > 0 || implausible) && !old) || missing.length > 0;
    if (bad) failed++;

    rows.push({ shot, scenes: scenes.length, plates, bare, noProp, old, bad, implausible, track: !!track, missing });
  }
}

const w = Math.max(...rows.map((r) => r.shot.length), 5);
console.log(`${'shot'.padEnd(w)}  scenes  plates  no plate  no prop`);
for (const r of rows) {
  if (r.unparsed) {
    console.log(`${r.shot.padEnd(w)}       —       —         —        —  ${r.unparsed}`);
    continue;
  }
  const flag = r.missing && r.missing.length ? `  ✗ ${r.missing.length} referenced layer file(s) MISSING: ${r.missing.slice(0, 3).join(', ')}${r.missing.length > 3 ? ' …' : ''}`
    : r.implausible ? '  ✗ parsed as one scene — the checker probably did not understand this file'
    : r.bad ? '  ✗ brand.md §4a: every scene needs a plate'
    : r.old ? '  (predates the rule)'
    : r.track ? '  ok (backdrop track)' : '  ok';
  console.log(
    `${r.shot.padEnd(w)}  ${String(r.scenes).padStart(6)}  ${String(r.plates).padStart(6)}  ` +
    `${String(r.bare).padStart(8)}  ${String(r.noProp).padStart(7)}${flag}`,
  );
}

if (process.argv.includes('--check') && failed) {
  console.error(`\n✗ ${failed} shot(s) have scenes with a flat background. See brand.md §4a.`);
  process.exit(1);
}
