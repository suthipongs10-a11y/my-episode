#!/usr/bin/env node
// Rewrites the GENERATED CUES block in Vox10ChargeCurve.tsx from beats.json.
//
// Unlike gen-cues-vox9.mjs this keeps NO hand-written segment->cue map. vox-9's map has to be
// edited every time a line is added or renamed, and an unmapped segment is a hard error that
// stops the build — safe, but it is a second place the truth lives. Here the segment id IS the
// cue name, so a script edit reaches the composition by itself and the two cannot drift.
//
// The cost is that renaming a segment in beats.json breaks the TSX that references the old
// name. That is a compile error, which is the good kind: TypeScript points at every use.
//
//   node scripts/gen-cues-vox10.mjs            # rewrite in place
//   node scripts/gen-cues-vox10.mjs --check    # exit 1 if stale (CI)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BEATS = resolve(HERE, '../../vox-shorts/vox-10-charge-curve/beats.json');
const SHOT = resolve(HERE, '../src/shots/vox-10/Vox10ChargeCurve.tsx');
const BEGIN = '// ---- GENERATED CUES';
const END = '// ---- END GENERATED CUES';

const beats = JSON.parse(readFileSync(BEATS, 'utf8'));
const fps = beats.format.fps;

const seen = new Set();
const rows = [];
let group = null;
for (const v of beats.vo) {
  if (!v.segment) throw new Error(`a vo entry has no segment id: ${(v.text || '').slice(0, 40)}`);
  if (seen.has(v.segment)) throw new Error(`duplicate segment id "${v.segment}" — cue names must be unique`);
  seen.add(v.segment);
  if (v.beat !== group) { rows.push(null); group = v.beat; }   // blank line between beats
  rows.push(`  ${v.segment}: ${Math.round(v.start * fps)},`);
}
const tail = Math.round(beats.vo[beats.vo.length - 1].end * fps);

const estimated = beats.vo.filter((v) => v.timing === 'estimated').length;
const block = [
  `${BEGIN} — rebuilt from beats.json by scripts/gen-cues-vox10.mjs. Do not hand-edit.`,
  `// Cue name === segment id in beats.json, so there is no map to keep in sync.`,
  ...(estimated
    ? [`// !! ${estimated} of ${beats.vo.length} lines are ESTIMATED, not measured audio.`,
       '// Run the voice tool with --retime, then re-run this script, BEFORE the final render.']
    : [`// All ${beats.vo.length} windows are measured from the real audio.`]),
  'const C = {',
  ...rows.filter((r, i) => !(r === null && i === 0)).map((r) => (r === null ? '' : r)),
  `  tail: ${tail},`,
  '} as const;',
  END,
].join('\n');

const src = readFileSync(SHOT, 'utf8');
const a = src.indexOf(BEGIN);
const b = src.indexOf(END);
if (a < 0 || b < 0) throw new Error('cue markers not found in Vox10ChargeCurve.tsx');
const next = src.slice(0, a) + block + src.slice(b + END.length);

if (process.argv.includes('--check')) {
  if (next !== src) {
    console.error('Vox10ChargeCurve.tsx cue block is STALE — run: node scripts/gen-cues-vox10.mjs');
    process.exit(1);
  }
  console.log('cue block is up to date');
} else {
  writeFileSync(SHOT, next);
  console.log(`wrote ${seen.size} cues + tail (${estimated} lines still estimated)`);
}
