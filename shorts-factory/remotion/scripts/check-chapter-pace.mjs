#!/usr/bin/env node
// How long each chapter shows NOTHING BUT ITS HEADLINE.
//
// WHY THIS EXISTS. vox-15 was rendered, muxed and delivered before anybody measured this. Three
// of its ten chapters ran 11.1s, 14.9s and 20.2s with only a title over a dimmed photograph,
// and the twenty-second one was not merely slow — it was half of a comparison, drawn on one
// side only. Frame QA missed it because ten sampled frames out of 14,370 land almost anywhere
// except in a gap. A gap is a property of the SOURCE, not of a sampled frame, so read the
// source.
//
//   node scripts/check-chapter-pace.mjs          # report every vox shot
//   node scripts/check-chapter-pace.mjs --check  # exit 1 if any chapter is over the limit
//
// HOW IT DECIDES. For each `<Chapter from={C.a} to={C.b}>` it finds the earliest entrance cue
// of anything that is NOT a `<Head>` — `at={0}`, `at={R(C.x, C.y)}` or a nested `<Rise at=…>` —
// and reports the distance from the chapter's start to it. `at={0}` means "with the chapter",
// so it scores zero; that case is why the first hand-rolled version of this measurement was
// wrong about two chapters and had to be rewritten.
//
// It is a heuristic over JSX text, not a parser. A surprising number is a reason to render that
// frame and look at it, not to trust the tool — and a long gap is not automatically a fault: a
// chapter whose plate is doing real work can carry one. It is a prompt to go and check.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(HERE, '../src/shots');
const LIMIT = 10; // seconds of headline-only before it is worth a second look
const FPS = 30;

// Shots that predate the measurement. As in check-scene-imagery.mjs, listed by name so that
// removing one is a decision somebody makes rather than a threshold quietly moving.
const GRANDFATHERED = new Set([
  'vox-1', 'vox-2', 'vox-3', 'vox-4', 'vox-5', 'vox-6', 'vox-7', 'vox-8', 'vox-8w',
  'vox-9', 'vox-10', 'vox-11', 'vox-12', 'vox-13', 'vox-14',
]);

const check = process.argv.includes('--check');
let bad = 0;

for (const dir of readdirSync(SHOTS).filter((d) => d.startsWith('vox-')).sort()) {
  const d = join(SHOTS, dir);
  const file = readdirSync(d).find((f) => f.endsWith('.tsx'));
  if (!file) continue;
  const src = readFileSync(join(d, file), 'utf8');

  const cueBlock = src.match(/const C = \{([\s\S]*?)\n\};/);
  if (!cueBlock) { console.log(`${dir.padEnd(9)} — no cue table, nothing to measure`); continue; }
  const C = {};
  for (const m of cueBlock[1].matchAll(/(\w+):\s*(\d+),/g)) C[m[1]] = Number(m[2]);

  const chapters = [...src.matchAll(/<Chapter from=\{(C\.\w+|0)\}[\s\S]*?<\/Chapter>/g)];
  if (!chapters.length) { console.log(`${dir.padEnd(9)} — no <Chapter>, skipped`); continue; }

  const gaps = [];
  for (const m of chapters) {
    const body = m[0];
    const from = m[1] === '0' ? 0 : C[m[1].slice(2)];
    // strip <Head …/> — a headline is the thing we are measuring the absence of company for
    const rest = body.replace(/<Head\b[^>]*\/>/g, '');
    let first = null;
    if (/\bat=\{0\}/.test(rest)) first = from;
    else {
      for (const r of rest.matchAll(/\bat=\{R\(C\.(\w+),\s*C\.\w+\)/g)) {
        const f = C[r[1]];
        if (f !== undefined && (first === null || f < first)) first = f;
      }
    }
    gaps.push(first === null ? Infinity : (first - from) / FPS);
  }

  const worst = Math.max(...gaps.map((g) => (g === Infinity ? 0 : g)));
  const over = gaps.filter((g) => g !== Infinity && g > LIMIT).length;
  const old = GRANDFATHERED.has(dir);
  const note = old ? '(predates the check)' : over ? `⚠ ${over} chapter(s) over ${LIMIT}s` : 'ok';
  if (over && !old) bad++;
  console.log(`${dir.padEnd(9)} ${String(chapters.length).padStart(3)} chapters  worst ${worst.toFixed(1)}s  ${note}`);
  if (over && !old) {
    gaps.forEach((g, i) => { if (g !== Infinity && g > LIMIT) console.log(`            chapter ${i + 1}: ${g.toFixed(1)}s headline-only`); });
  }
}

if (check && bad) { console.error(`\n${bad} shot(s) with a chapter over ${LIMIT}s of headline-only.`); process.exit(1); }
