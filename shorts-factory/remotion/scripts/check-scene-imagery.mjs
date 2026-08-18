#!/usr/bin/env node
// Counts how many top-level scenes in each vox shot have a background plate behind them.
//
// WHY THIS EXISTS. brand.md §4a locks the rule that every scene sits on a photograph rather
// than a flat fill. vox-11 needed THREE full renders to get there — four images, then twelve,
// then twenty-four — because nobody counted the empty scenes before rendering. Counting takes
// a second; a render takes fifteen minutes. This is that count.
//
//   node scripts/check-scene-imagery.mjs          # report every vox shot
//   node scripts/check-scene-imagery.mjs --check  # exit 1 if a non-grandfathered shot is short
//
// HOW IT DECIDES, and where it is only a heuristic. A top-level scene is a `<Scene` at the
// SHALLOWEST indentation any `<Scene` uses in that file; everything until the next one belongs
// to it. The depth is derived per file rather than hardcoded, because the first version looked
// for six spaces and silently skipped vox-9, which nests at eight — and a checker that says
// nothing about a file it could not parse is worse than no checker, since silence reads as a
// pass. Files with no `<Scene` at all are reported as unparsed rather than omitted.
//
// It is still a heuristic, not a JSX parser, so a surprising number is a reason to open the
// file rather than to trust the tool.

import { readdirSync, readFileSync, statSync } from 'node:fs';
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

const shots = readdirSync(SHOTS).filter((d) => statSync(join(SHOTS, d)).isDirectory() && d.startsWith('vox-'));

let failed = 0;
const rows = [];

for (const shot of shots.sort()) {
  const files = readdirSync(join(SHOTS, shot)).filter((f) => f.endsWith('.tsx'));
  for (const file of files) {
    const src = readFileSync(join(SHOTS, shot, file), 'utf8');
    const lines = src.split('\n');

    // Shallowest indentation any <Scene> uses in THIS file is the top level.
    const depths = lines.filter((l) => /^\s*<Scene\b/.test(l)).map((l) => l.match(/^\s*/)[0].length);
    if (!depths.length) {
      rows.push({ shot, unparsed: true });
      continue;
    }
    const top0 = Math.min(...depths);

    const scenes = [];
    let cur = null;
    for (const line of lines) {
      const top = new RegExp(`^ {${top0}}<Scene\\b`).test(line);
      if (top) {
        if (cur) scenes.push(cur);
        cur = { plates: 0, props: 0, head: line.trim().slice(0, 46) };
        continue;
      }
      if (!cur) continue;
      if (/<Plate\s+src=/.test(line)) cur.plates++;
      if (/<Prop\s+src=/.test(line)) cur.props++;
    }
    if (cur) scenes.push(cur);

    const bare = scenes.filter((s) => s.plates === 0);
    const noProp = scenes.filter((s) => s.props === 0);
    const old = GRANDFATHERED.has(shot);
    const bad = bare.length > 0 && !old;
    if (bad) failed++;

    rows.push({ shot, scenes: scenes.length, bare: bare.length, noProp: noProp.length, old, bad });
  }
}

const w = Math.max(...rows.map((r) => r.shot.length), 5);
console.log(`${'shot'.padEnd(w)}  scenes  no plate  no prop`);
for (const r of rows) {
  if (r.unparsed) {
    console.log(`${r.shot.padEnd(w)}       —         —        —  no <Scene> found — check by hand`);
    continue;
  }
  const flag = r.bad ? '  ✗ brand.md §4a: every scene needs a plate' : r.old ? '  (predates the rule)' : '  ok';
  console.log(`${r.shot.padEnd(w)}  ${String(r.scenes).padStart(6)}  ${String(r.bare).padStart(8)}  ${String(r.noProp).padStart(7)}${flag}`);
}

if (process.argv.includes('--check') && failed) {
  console.error(`\n✗ ${failed} shot(s) have scenes with a flat background. See brand.md §4a.`);
  process.exit(1);
}
