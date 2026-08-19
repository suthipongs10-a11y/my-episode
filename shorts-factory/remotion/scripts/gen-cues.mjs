#!/usr/bin/env node
// Rewrites the GENERATED CUES block in every vox shot from its own beats.json.
//
// WHY THIS EXISTS. A cue is a frame number, and a frame number typed by hand is a frame
// number that goes stale the moment a narration line changes length. Here the SEGMENT ID IS
// THE CUE NAME, so a script edit reaches the composition on its own. Renaming a segment
// breaks the TSX that referenced the old name — which is a compile error, the good kind:
// TypeScript points at every use.
//
// WHY THERE IS ONLY ONE OF IT NOW. There were four — gen-cues-vox9/10/11/12.mjs — byte
// identical apart from two file paths and a comment. Writing a fifth for vox-13 is what made
// the duplication worth removing: this version discovers its own work by reading every
// vox-shorts/*/beats.json and following its `composition` field to the matching shot, so a
// new video needs no new script and no edit here at all.
//
//   node scripts/gen-cues.mjs               # rewrite every shot that has the markers
//   node scripts/gen-cues.mjs Vox13DarkSky  # just this one
//   node scripts/gen-cues.mjs --check       # exit 1 if any block is stale (CI)

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const VOX = resolve(HERE, '../../vox-shorts');
const SHOTS = resolve(HERE, '../src/shots');
const BEGIN = '// ---- GENERATED CUES';
const END = '// ---- END GENERATED CUES';

const check = process.argv.includes('--check');
const only = process.argv.slice(2).find((a) => !a.startsWith('--'));

/** Every beats.json under vox-shorts/, paired with the .tsx its `composition` names. */
function jobs() {
  const out = [];
  for (const dir of readdirSync(VOX)) {
    const beatsPath = join(VOX, dir, 'beats.json');
    if (!existsSync(beatsPath)) continue;
    const beats = JSON.parse(readFileSync(beatsPath, 'utf8'));
    const comp = beats.composition;
    if (!comp) continue;
    if (only && comp !== only) continue;
    // src/shots/<any dir>/<Composition>.tsx
    let shot = null;
    for (const d of readdirSync(SHOTS)) {
      if (!statSync(join(SHOTS, d)).isDirectory()) continue;
      const p = join(SHOTS, d, `${comp}.tsx`);
      if (existsSync(p)) { shot = p; break; }
    }
    if (!shot) continue;                                    // composition not built yet
    if (!readFileSync(shot, 'utf8').includes(BEGIN)) continue; // shot opted out
    out.push({ dir, beats, shot, comp });
  }
  return out;
}

/** The cue block for one video, verbatim. */
function block(beats) {
  const fps = beats.format.fps;
  const seen = new Set();
  const rows = [];
  let group = null;
  for (const v of beats.vo) {
    if (!v.segment) throw new Error(`a vo entry has no segment id: ${(v.text || '').slice(0, 40)}`);
    if (seen.has(v.segment)) throw new Error(`duplicate segment id "${v.segment}" — cue names must be unique`);
    seen.add(v.segment);
    if (v.beat !== group) { rows.push(null); group = v.beat; } // blank line between beats
    rows.push(`  ${v.segment}: ${Math.round(v.start * fps)},`);
  }
  const tail = Math.round(beats.vo[beats.vo.length - 1].end * fps);
  // 'estimate' is what the builders write; 'estimated' was an older spelling. Count both,
  // because a cue block that silently claims measured timings is the failure this guards.
  const soft = beats.vo.filter((v) => v.timing !== 'measured').length;
  return {
    count: seen.size,
    soft,
    text: [
      `${BEGIN} — rebuilt from beats.json by scripts/gen-cues.mjs. Do not hand-edit.`,
      `// Cue name === segment id in beats.json, so there is no map to keep in sync.`,
      ...(soft
        ? [`// !! ${soft} of ${beats.vo.length} lines are NOT measured audio.`,
           '// Run the voice tool with --retime, then re-run this script, BEFORE the final render.']
        : [`// All ${beats.vo.length} windows are measured from the real audio.`]),
      'const C = {',
      ...rows.filter((r, i) => !(r === null && i === 0)).map((r) => (r === null ? '' : r)),
      `  tail: ${tail},`,
      '} as const;',
      END,
    ].join('\n'),
  };
}

const found = jobs();
if (!found.length) {
  console.error(only ? `no shot found for composition "${only}"` : 'no vox shot has a GENERATED CUES block');
  process.exit(1);
}

let stale = 0;
for (const { beats, shot, comp } of found) {
  const b = block(beats);
  const src = readFileSync(shot, 'utf8');
  const a = src.indexOf(BEGIN);
  const z = src.indexOf(END);
  const next = src.slice(0, a) + b.text + src.slice(z + END.length);
  const note = b.soft ? ` (${b.soft} not measured)` : '';
  if (check) {
    if (next !== src) { console.error(`${comp}: cue block is STALE — run: node scripts/gen-cues.mjs`); stale++; }
    else console.log(`${comp}: up to date — ${b.count} cues${note}`);
  } else if (next !== src) {
    writeFileSync(shot, next);
    console.log(`${comp}: wrote ${b.count} cues + tail${note}`);
  } else {
    console.log(`${comp}: unchanged — ${b.count} cues${note}`);
  }
}
if (check && stale) process.exit(1);
