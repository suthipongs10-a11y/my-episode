#!/usr/bin/env node
// Rewrites the GENERATED CUES block in Vox9SpecSheet.tsx from beats.json.
//
// vox-9's voice landed in two sittings — Gemini TTS is capped at 100 requests per day per
// model and ran out at line 16 — so its cue table had to be regenerated after the second
// pass. Doing that by hand across 48 lines is how a cue quietly ends up on the wrong phrase,
// which is exactly the failure PIPELINE §8 says to avoid by remapping mechanically.
//
//   node scripts/gen-cues-vox9.mjs            # rewrite in place
//   node scripts/gen-cues-vox9.mjs --check    # exit 1 if the file is stale (for CI)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BEATS = resolve(HERE, '../../vox-shorts/vox-9-spec-sheet/beats.json');
const SHOT = resolve(HERE, '../src/shots/vox-9/Vox9SpecSheet.tsx');
const BEGIN = '// ---- GENERATED CUES';
const END = '// ---- END GENERATED CUES';

// segment id -> cue name used in the TSX. Every vo entry must appear here: an unmapped
// segment is a script edit that has not reached the composition yet, so it is a hard error
// rather than a silently missing cue.
const KEY = {
  s01_hook: 'hook', s01b_spread: 'spread', s01c_gap: 'gap',
  s02_norank: 'norank', s02b_why: 'whyno',
  s03_setup: 'setup', s03b_china: 'china', s03c_uk: 'uk', s03d_delta: 'delta',
  s04_what: 'cyc', s04b_nedc: 'nedc', s04c_others: 'others', s04d_factors: 'factors', s04e_check: 'check',
  s05_intro: 'tbl', s05b_row1: 'row1', s05b2_row2: 'row2', s05c_rows34: 'row34', s05d_point: 'tblPoint',
  s06_intro: 'kwh', s06b_buffer: 'buffer', s06c_why: 'bufWhy', s06d_disclosure: 'disclose',
  s07_intro: 'chg', s07b_curve: 'curve', s07c_mg49: 'mg49', s07d_mg64: 'mg64', s07e_window: 'window',
  s07f_samename: 'same', s07g_evidence: 'sameEv', s07h_lesson: 'sameLesson',
  s08_intro: 'pwr', s08b_r85: 'r85', s08c_point: 'pwrPoint',
  s09_intro: 'safe', s09b_protocol: 'proto', s09c_years: 'years', s09d_point: 'safePoint',
  s10_intro: 'adas', s10b_j3016: 'j3016', s10c_point: 'adasPoint',
  s11_q: 'cmpQ', s11b_answer: 'cmpA', s11c_example: 'cmpEx',
  s12_norank: 'sum', s12b_lead: 'sumLead', s12c_three: 'three', s12d_close: 'close',
};

const GROUPS = [
  ['hook', 'spread', 'gap'],
  ['norank', 'whyno'],
  ['setup', 'china', 'uk', 'delta'],
  ['cyc', 'nedc', 'others', 'factors', 'check'],
  ['tbl', 'row1', 'row2', 'row34', 'tblPoint'],
  ['kwh', 'buffer', 'bufWhy', 'disclose'],
  ['chg', 'curve', 'mg49', 'mg64', 'window'],
  ['same', 'sameEv', 'sameLesson'],
  ['pwr', 'r85', 'pwrPoint'],
  ['safe', 'proto', 'years', 'safePoint'],
  ['adas', 'j3016', 'adasPoint'],
  ['cmpQ', 'cmpA', 'cmpEx'],
  ['sum', 'sumLead', 'three', 'close'],
  ['tail'],
];

const beats = JSON.parse(readFileSync(BEATS, 'utf8'));
const fps = beats.format.fps;
const cue = {};
for (const v of beats.vo) {
  const k = KEY[v.segment];
  if (!k) throw new Error(`beats.json has segment "${v.segment}" with no cue name in KEY`);
  cue[k] = Math.round(v.start * fps);
}
cue.tail = Math.round(beats.vo[beats.vo.length - 1].end * fps);

const missing = GROUPS.flat().filter((k) => cue[k] === undefined);
if (missing.length) throw new Error(`no vo entry produced these cues: ${missing.join(', ')}`);

const estimated = beats.vo.filter((v) => v.timing === 'estimated').length;
const block = [
  `${BEGIN} — rebuilt from beats.json by scripts/gen-cues-vox9.mjs. Do not hand-edit.`,
  ...(estimated
    ? [`// ${estimated} of ${beats.vo.length} lines are still ESTIMATED windows, not measured audio.`,
       '// Re-run the voice tool with --retime, then re-run this script, before the final render.']
    : ['// All windows are measured from the real audio.']),
  'const C = {',
  ...GROUPS.map((g) => '  ' + g.map((k) => `${k}: ${cue[k]},`).join(' ')),
  '} as const;',
  END,
].join('\n');

const src = readFileSync(SHOT, 'utf8');
const a = src.indexOf(BEGIN);
const b = src.indexOf(END);
if (a < 0 || b < 0) throw new Error('cue markers not found in Vox9SpecSheet.tsx');
const next = src.slice(0, a) + block + src.slice(b + END.length);

if (process.argv.includes('--check')) {
  if (next !== src) {
    console.error('Vox9SpecSheet.tsx cue block is STALE — run: node scripts/gen-cues-vox9.mjs');
    process.exit(1);
  }
  console.log('cue block is up to date');
} else {
  writeFileSync(SHOT, next);
  console.log(`wrote ${Object.keys(cue).length} cues (${estimated} lines still estimated)`);
}
