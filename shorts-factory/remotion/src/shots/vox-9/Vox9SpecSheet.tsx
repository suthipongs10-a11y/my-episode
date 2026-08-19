import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import {
  BLUEPRINT,
  CollageBoard,
  EASE_OUT,
  Grain,
  LabelChip,
  Layer,
  PaperBG,
  RubberStamp,
  SerifStatement,
  useTheme,
} from '../../lib/collage';
import { FONT_TH, FONT_TH_DISPLAY } from '../../fonts';

// =============================================================================
// "สเปกชีตสี่คัน ที่เทียบกันไม่ได้" — vox-9, The EV Insight · LANDSCAPE 1920x1080
// Facts, sources, confidence grades and the deliberate omissions:
//   vox-shorts/vox-9-spec-sheet/script.md
//
// THE BRIEF was "compare 3-4 cars, don't say who wins". Read literally that is a spec table
// read aloud, which has no mechanism in it and so does not belong on this channel
// (channels/ev.json rule 1). The mechanism here is instead HOW THE NUMBERS ARE MEASURED, and
// the payoff is that "no winner" stops being a restriction and becomes the conclusion: a spec
// sheet with the measurement conditions restored cannot crown one.
//
// TWO HARD EDITORIAL RULES, both enforced in this file and not just in the script:
//   1. NO IMAGE OF ANY OF THE FOUR CARS. PIPELINE §4 forbids presenting a generated image as
//      a real company's product, and vox-5 proved the prompt's intent is not evidence (it
//      asked for a generic EV and got a Model Y). Every car on screen here is an OUTLINE
//      DRAWN FROM ITS PUBLISHED LENGTH AND HEIGHT — a diagram from the fact table, which is
//      the one category §4 allows. The photographs are unbranded hardware and empty test
//      halls, generated at 16:9, and none of them contains a vehicle.
//   2. EVERY NUMBER ON SCREEN CARRIES ITS MEASUREMENT LABEL. A range with no cycle name on it
//      is exactly the defect the video is about, so the composition may not commit it.
//
// The cues below are the MEASURED voice, not estimates — the voice was generated before this
// file existed (vox-6's order, now the default for a from-scratch video), so no retime pass
// runs and every frame number comes from beats.json's real windows.
// =============================================================================
export const compositionConfig = {
  id: 'Vox9SpecSheet',
  durationInSeconds: 499,
  fps: 30,
  width: 1920,
  height: 1080,
};

const W = 1920;
const H = 1080;

// vox-8w's landscape geometry, kept: margin and peak zoom are ONE decision (PIPELINE §6), so
// the margin lives here next to the CAM table rather than in thirty call sites.
const MARGIN_L = 170;
const A = (f: string) => staticFile(`projects/vox-9-spec-sheet/layers/${f}`);

// ---- GENERATED CUES — rebuilt from beats.json by scripts/gen-cues.mjs. Do not hand-edit.
// Cue name === segment id in beats.json, so there is no map to keep in sync.
// All 48 windows are measured from the real audio.
const C = {
  s01_hook: 15,
  s01b_spread: 295,
  s01c_gap: 539,

  s02_norank: 793,
  s02b_why: 955,

  s03_setup: 1250,
  s03b_china: 1456,
  s03c_uk: 1799,
  s03d_delta: 2110,

  s04_what: 2403,
  s04b_nedc: 2729,
  s04c_others: 3104,
  s04d_factors: 3575,
  s04e_check: 3917,

  s05_intro: 4331,
  s05b_row1: 4483,
  s05b2_row2: 4709,
  s05c_rows34: 4941,
  s05d_point: 5308,

  s06_intro: 5711,
  s06b_buffer: 5895,
  s06c_why: 6211,
  s06d_disclosure: 6671,

  s07_intro: 7052,
  s07b_curve: 7207,
  s07c_mg49: 7593,
  s07d_mg64: 7985,
  s07e_window: 8494,

  s07f_samename: 8968,
  s07g_evidence: 9293,
  s07h_lesson: 9695,

  s08_intro: 10005,
  s08b_r85: 10107,
  s08c_point: 10547,

  s09_intro: 10855,
  s09b_protocol: 10972,
  s09c_years: 11367,
  s09d_point: 11705,

  s10_intro: 12010,
  s10b_j3016: 12175,
  s10c_point: 12583,

  s11_q: 12957,
  s11b_answer: 13108,
  s11c_example: 13471,

  s12_norank: 13850,
  s12b_lead: 14096,
  s12c_three: 14269,
  s12d_close: 14677,
  tail: 14865,
} as const;
// ---- END GENERATED CUES

// Wide frames magnify camera motion and this is eight minutes of it, so peak zoom is held to
// 1.06 and every move is a slow drift between two near-identical anchors. One pair of keys per
// scene: arrive as the scene composes, settle back before the next one needs the space.
const CAM: { f: number; x: number; y: number; z: number }[] = [
  { f: 0, x: 960, y: 540, z: 1 },
  { f: 760, x: 962, y: 544, z: 1.04 },
  { f: 840, x: 960, y: 540, z: 1.01 },
  { f: 1230, x: 962, y: 546, z: 1.05 },
  { f: 1320, x: 960, y: 542, z: 1.02 },
  { f: 2380, x: 962, y: 545, z: 1.05 },
  { f: 2470, x: 960, y: 540, z: 1.01 },
  { f: 4300, x: 962, y: 546, z: 1.06 },
  { f: 4400, x: 960, y: 542, z: 1.02 },
  { f: 5740, x: 962, y: 544, z: 1.05 },
  { f: 5840, x: 960, y: 540, z: 1.01 },
  { f: 7090, x: 962, y: 546, z: 1.05 },
  { f: 7190, x: 960, y: 542, z: 1.02 },
  { f: 8960, x: 962, y: 545, z: 1.06 },
  { f: 9060, x: 960, y: 540, z: 1.01 },
  { f: 10010, x: 962, y: 544, z: 1.04 },
  { f: 10110, x: 960, y: 542, z: 1.02 },
  { f: 10870, x: 962, y: 546, z: 1.05 },
  { f: 10970, x: 960, y: 540, z: 1.01 },
  { f: 11990, x: 962, y: 545, z: 1.05 },
  { f: 12090, x: 960, y: 542, z: 1.02 },
  { f: 12950, x: 962, y: 544, z: 1.04 },
  { f: 13050, x: 960, y: 540, z: 1.01 },
  { f: 13900, x: 962, y: 546, z: 1.05 },
  { f: 14020, x: 960, y: 540, z: 1.01 },
  { f: 14876, x: 960, y: 540, z: 1 },
];

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------
const Scene: React.FC<{ from: number; dur: number; children: React.ReactNode }> = ({ from, dur, children }) => (
  <Sequence from={from} durationInFrames={Math.max(1, dur)} layout="none">
    {children}
  </Sequence>
);

// A Sequence with no durationInFrames never leaves, and in scenes this long the next element
// draws straight over it. vox-8 shipped that bug three times in one pass; Scene makes the
// duration mandatory and FadeOut gives the departing element its 18 frames.
const FadeOut: React.FC<{ at: number; dur?: number; children: React.ReactNode }> = ({ at, dur = 18, children }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + dur], [1, 0], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <div style={{ opacity: o }}>{children}</div>;
};

const grow = (frame: number, at: number, d = 24) =>
  interpolate(frame, [at, at + d], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// Full-bleed photograph, dimmed back toward the board so type stays readable on top.
const Plate: React.FC<{ src: string; at: number; pos?: string; dim?: number }> = ({ src, at, pos = '50% 50%', dim = 0.62 }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const o = grow(frame, at, 28);
  return (
    <Layer x={960} y={540} w={W * 1.1} at={0} dur={1} enter="none" depth={-0.05} drift={0.2}>
      <div style={{ position: 'relative', opacity: o }}>
        <Img src={src} style={{ width: '100%', height: H * 1.1, objectFit: 'cover', objectPosition: pos, display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: T.paper, opacity: dim }} />
      </div>
    </Layer>
  );
};

// A cut-out object sitting in the right-hand column, on a panel so it reads as placed.
const Prop: React.FC<{ src: string; x: number; y: number; w: number; at: number; rot?: number; caption?: string }> =
  ({ src, x, y, w, at, rot = -1.5, caption }) => {
    const T = useTheme();
    return (
      <Layer x={x} y={y} w={w} at={at} dur={1} enter="pop" rotate={rot} depth={0.08} drift={0.8}>
        <div>
          <Img src={src} style={{ width: '100%', display: 'block' }} />
          {caption ? (
            <div style={{ fontFamily: FONT_TH, fontSize: 20, color: T.inkSoft, marginTop: 10, textAlign: 'center' }}>{caption}</div>
          ) : null}
        </div>
      </Layer>
    );
  };

// -----------------------------------------------------------------------------
// THE FOUR CARS — the single source of truth for every number in this file.
// Grades and sources: script.md §ตารางข้อเท็จจริง. `cycle` is not decoration: it is the
// column the whole video is about, and nothing here renders a range without it.
// -----------------------------------------------------------------------------
type Car = { name: string; kwh: string; range: number; cycle: 'NEDC' | 'CLTC'; L: number; Ht: number; tint: string };
const CARS: Car[] = [
  { name: 'BYD Atto 3', kwh: '60.48', range: 480, cycle: 'NEDC', L: 4455, Ht: 1615, tint: '#3fd0c9' },
  { name: 'AION Y Plus', kwh: '63.2', range: 490, cycle: 'NEDC', L: 4535, Ht: 1650, tint: '#8fb4cc' },
  { name: 'MG S5 EV', kwh: '64', range: 550, cycle: 'NEDC', L: 4476, Ht: 1621, tint: '#ffc94a' },
  { name: 'Deepal S05', kwh: '68.8', range: 620, cycle: 'CLTC', L: 4620, Ht: 1600, tint: '#ff5c47' },
];

// -----------------------------------------------------------------------------
// SpecTable — the hook, the middle and the summary all return to this object, which is what
// makes frame 0 and the last frame the same picture and closes the loop.
// -----------------------------------------------------------------------------
const SpecTable: React.FC<{ at: number; rows?: number; labels?: boolean; flagCltc?: boolean; spreadAt?: number }> =
  ({ at, rows = 4, labels = false, flagCltc = false, spreadAt }) => {
    const T = useTheme();
    const frame = useCurrentFrame();
    const x0 = MARGIN_L, wBox = 1580;
    // Column x's are spaced by the WIDEST header, not by the widest value — "ระยะทางที่ประกาศ"
    // is 250px of Thai and collided with the cycle header on the first pass.
    const cName = x0 + 30, cKwh = x0 + 560, cRange = x0 + 830, cCycle = x0 + 1230;
    const rowH = 88, y0 = 96;
    return (
      <svg viewBox={`0 0 ${W} 560`} style={{ display: 'block', width: W, height: 560, overflow: 'visible' }}>
        <g opacity={grow(frame, at)}>
          <text x={cName} y={54} fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft}>รุ่น</text>
          <text x={cKwh} y={54} fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft}>แบตเตอรี่ (kWh)</text>
          <text x={cRange} y={54} fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft}>ระยะทางที่ประกาศ (กม.)</text>
          <text x={cCycle} y={54} fontFamily={FONT_TH} fontSize={24} fontWeight={700} fill={labels ? T.yellow : T.inkSoft}>
            วัดด้วยมาตรฐาน
          </text>
          <line x1={x0} y1={68} x2={x0 + wBox} y2={68} stroke={T.inkSoft} strokeWidth={1.6} opacity={0.6} />
        </g>
        {CARS.slice(0, rows).map((c, i) => {
          const g = grow(frame, at + 14 + i * 18, 22);
          const y = y0 + i * rowH;
          const odd = flagCltc && c.cycle === 'CLTC';
          return (
            <g key={c.name} opacity={g}>
              <rect x={x0} y={y - 34} width={wBox} height={rowH - 12} fill={odd ? T.red : T.paperDeep} opacity={odd ? 0.16 : 0.5} />
              <rect x={x0} y={y - 34} width={7} height={rowH - 12} fill={c.tint} opacity={0.9} />
              <text x={cName} y={y + 16} fontFamily={FONT_TH} fontSize={34} fontWeight={600} fill={T.ink}>{c.name}</text>
              <text x={cKwh} y={y + 16} fontFamily={FONT_TH_DISPLAY} fontSize={36} fontWeight={700} fill={T.ink}>{c.kwh}</text>
              <text x={cRange} y={y + 16} fontFamily={FONT_TH_DISPLAY} fontSize={44} fontWeight={700} fill={c.tint}>{c.range}</text>
              {labels ? (
                <g>
                  <rect x={cCycle} y={y - 18} width={132} height={44} rx={5} fill={odd ? T.red : T.teal} opacity={odd ? 0.9 : 0.22} />
                  <text x={cCycle + 66} y={y + 13} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={26} fontWeight={700}
                    fill={odd ? T.cream : T.ink}>{c.cycle}</text>
                </g>
              ) : (
                // The column the video is about, drawn as the hole it is. An empty right third
                // read as a layout mistake on the first QA pass; a dashed "?" reads as the point.
                <g>
                  <rect x={cCycle} y={y - 18} width={132} height={44} rx={5} fill="none"
                    stroke={T.inkSoft} strokeWidth={1.6} strokeDasharray="7 6" opacity={0.7} />
                  <text x={cCycle + 66} y={y + 13} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={26}
                    fontWeight={700} fill={T.inkSoft} opacity={0.8}>?</text>
                </g>
              )}
            </g>
          );
        })}
        {spreadAt !== undefined ? (
          <g opacity={grow(frame, spreadAt, 26)}>
            <line x1={cRange - 26} y1={y0 - 18} x2={cRange - 26} y2={y0 + 3 * rowH + 20} stroke={T.yellow} strokeWidth={3} />
            <line x1={cRange - 40} y1={y0 - 18} x2={cRange - 12} y2={y0 - 18} stroke={T.yellow} strokeWidth={3} />
            <line x1={cRange - 40} y1={y0 + 3 * rowH + 20} x2={cRange - 12} y2={y0 + 3 * rowH + 20} stroke={T.yellow} strokeWidth={3} />
            <text x={x0 + wBox - 20} y={y0 + 3 * rowH + 96} textAnchor="end" fontFamily={FONT_TH_DISPLAY} fontSize={64} fontWeight={700} fill={T.yellow}>
              ห่างกัน 140 กม.
            </text>
            <text x={x0 + wBox - 20} y={y0 + 3 * rowH + 134} textAnchor="end" fontFamily={FONT_TH} fontSize={26} fill={T.inkSoft}>
              ขณะที่แบตเตอรี่ห่างกันไม่ถึง 9 kWh
            </text>
          </g>
        ) : null}
      </svg>
    );
  };

// -----------------------------------------------------------------------------
// OneCarTwoNumbers — the spine. One outline, two labels, and the gap between them.
// -----------------------------------------------------------------------------
const CarOutline: React.FC<{ L: number; Ht: number; scale: number; color: string; opacity?: number }> =
  ({ L, Ht, scale, color, opacity = 1 }) => {
    // Silhouette is a generic SUV profile in normalised coordinates; the BOX it is drawn into
    // is the car's real length and height. The shape is a pictogram, the proportions are data.
    const w = L * scale, h = Ht * scale;
    const px = (n: number) => n * w, py = (n: number) => n * h;
    // Crossover profile: high flat roof, upright tail, short overhangs. The first pass used a
    // low rounded roofline and read as a sedan at any size — wrong body style for all four.
    const body = `M ${px(0.02)} ${py(0.84)} L ${px(0.02)} ${py(0.54)}
      C ${px(0.035)} ${py(0.45)} ${px(0.09)} ${py(0.40)} ${px(0.17)} ${py(0.375)}
      L ${px(0.30)} ${py(0.35)} C ${px(0.335)} ${py(0.19)} ${px(0.375)} ${py(0.09)} ${px(0.45)} ${py(0.075)}
      L ${px(0.79)} ${py(0.07)} C ${px(0.865)} ${py(0.085)} ${px(0.915)} ${py(0.19)} ${px(0.945)} ${py(0.34)}
      L ${px(0.965)} ${py(0.40)} C ${px(0.982)} ${py(0.47)} ${px(0.985)} ${py(0.58)} ${px(0.98)} ${py(0.84)} Z`;
    const belt = `M ${px(0.22)} ${py(0.375)} L ${px(0.935)} ${py(0.335)}`;
    const glass = `M ${px(0.34)} ${py(0.335)} C ${px(0.37)} ${py(0.20)} ${px(0.40)} ${py(0.125)} ${px(0.46)} ${py(0.115)}
      L ${px(0.78)} ${py(0.11)} C ${px(0.845)} ${py(0.125)} ${px(0.885)} ${py(0.21)} ${px(0.905)} ${py(0.315)} Z`;
    const rw = h * 0.205;
    return (
      <g opacity={opacity}>
        <path d={body} fill={color} fillOpacity={0.14} stroke={color} strokeWidth={2.8} strokeLinejoin="round" />
        <path d={glass} fill={color} fillOpacity={0.1} stroke={color} strokeWidth={1.8} strokeLinejoin="round" opacity={0.75} />
        <path d={belt} fill="none" stroke={color} strokeWidth={1.6} opacity={0.55} />
        {[0.225, 0.795].map((cx) => (
          <g key={cx}>
            <circle cx={px(cx)} cy={py(0.84)} r={rw} fill="none" stroke={color} strokeWidth={3} />
            <circle cx={px(cx)} cy={py(0.84)} r={rw * 0.42} fill="none" stroke={color} strokeWidth={1.8} opacity={0.6} />
          </g>
        ))}
      </g>
    );
  };

const OneCarTwoNumbers: React.FC<{ at: number; showUk?: boolean; showDelta?: boolean }> = ({ at, showUk = false, showDelta = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const s = 0.16; // px per mm — the first pass at 0.088 rendered a 407px blob on a 1920 frame
  const car = CARS[3];
  const cw = car.L * s;
  // Card geometry is derived, not typed twice, so the badge can never drift off its card.
  const cardW = 600, cardH = 150, cardY = 96;
  const card = (x: number, tag: string, val: string, badge: string, col: string, d: number) => (
    <g opacity={grow(frame, at + d, 24)}>
      <rect x={x} y={cardY} width={cardW} height={cardH} rx={8} fill={T.paperDeep} stroke={col} strokeWidth={2.4} />
      <text x={x + 26} y={cardY + 42} fontFamily={FONT_TH} fontSize={25} fill={T.inkSoft}>{tag}</text>
      <text x={x + 26} y={cardY + 116} fontFamily={FONT_TH_DISPLAY} fontSize={58} fontWeight={700} fill={col}>{val}</text>
      <rect x={x + cardW - 130} y={cardY + 18} width={110} height={40} rx={5} fill={col} opacity={0.9} />
      <text x={x + cardW - 75} y={cardY + 47} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={24} fontWeight={700} fill={T.paper}>{badge}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} 700`} style={{ display: 'block', width: W, height: 700, overflow: 'visible' }}>
      <text x={960} y={40} textAnchor="middle" fontFamily={FONT_TH} fontSize={27} fill={T.inkSoft} opacity={grow(frame, at)}>
        Deepal S05 · แบตเตอรี่ 68.8 kWh ก้อนเดียวกัน · ภาพร่างตามสัดส่วนจริง 4,620 × 1,600 มม.
      </text>
      <g opacity={grow(frame, at + 6)} transform={`translate(${960 - cw / 2}, 300)`}>
        <CarOutline L={car.L} Ht={car.Ht} scale={s} color={T.inkSoft} />
      </g>
      {card(MARGIN_L, 'ประกาศในจีน', '610–620 กม.', 'CLTC', T.teal, 26)}
      {showUk ? card(W - MARGIN_L - cardW, 'ประกาศในอังกฤษ', '488 กม.', 'WLTP', T.yellow, 4) : null}
      {showDelta ? (
        <g opacity={grow(frame, at, 26)}>
          <rect x={630} y={592} width={660} height={100} rx={8} fill={T.red} opacity={0.16} stroke={T.red} strokeWidth={2.4} />
          <text x={960} y={632} textAnchor="middle" fontFamily={FONT_TH} fontSize={26} fill={T.inkSoft}>รถคันเดียวกัน ต่างกัน</text>
          <text x={960} y={676} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={46} fontWeight={700} fill={T.red}>~125 กิโลเมตร</text>
        </g>
      ) : null}
    </svg>
  );
};

// -----------------------------------------------------------------------------
// CycleBars — the four test cycles as what they are: scripts of speed against time.
// -----------------------------------------------------------------------------
const CYCLES = [
  { k: 'NEDC', note: 'ยุค 90 · ความเร็วต่ำ เร่งนุ่ม จอดนิ่งเยอะ', opt: 'ตัวเลขสูงที่สุด', bars: [0.22, 0.18, 0.3, 0.26, 0.62], col: '#ffc94a' },
  { k: 'WLTP', note: 'ใหม่กว่า · เร่งแรงกว่า ความเร็วสูงสุดสูงกว่า', opt: 'กลาง ๆ', bars: [0.34, 0.46, 0.4, 0.62, 0.86], col: '#3fd0c9' },
  { k: 'EPA', note: 'อเมริกา · เข้มที่สุดในกลุ่มนี้', opt: 'ตัวเลขต่ำที่สุด', bars: [0.38, 0.52, 0.48, 0.7, 0.9], col: '#8fb4cc' },
  { k: 'CLTC', note: 'จีน · สัดส่วนขับในเมืองสูง ความเร็วเฉลี่ยต่ำ', opt: 'ตัวเลขสูง', bars: [0.2, 0.26, 0.22, 0.34, 0.44], col: '#ff5c47' },
];

const CycleBars: React.FC<{ at: number; lit?: number }> = ({ at, lit = 4 }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const x0 = MARGIN_L, rowH = 118, wTrace = 780;
  return (
    <svg viewBox={`0 0 ${W} 540`} style={{ display: 'block', width: W, height: 540, overflow: 'visible' }}>
      <text x={x0} y={26} fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft} opacity={grow(frame, at)}>
        รูปร่างของบทขับ — ความเร็วเทียบกับเวลา (แผนภาพเชิงแนวคิด ไม่ใช่กราฟจากข้อมูลดิบ)
      </text>
      {CYCLES.map((c, i) => {
        const g = i < lit ? grow(frame, at + i * 20, 22) : 0;
        const y = 66 + i * rowH;
        return (
          <g key={c.k} opacity={g}>
            <text x={x0} y={y + 34} fontFamily={FONT_TH_DISPLAY} fontSize={38} fontWeight={700} fill={c.col}>{c.k}</text>
            <text x={x0} y={y + 66} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>{c.note}</text>
            <g transform={`translate(${x0 + 470}, ${y})`}>
              <line x1={0} y1={78} x2={wTrace} y2={78} stroke={T.inkSoft} strokeWidth={1.4} opacity={0.5} />
              {c.bars.map((b, j) => (
                <rect key={j} x={j * (wTrace / 5) + 8} y={78 - b * 74} width={wTrace / 5 - 18} height={b * 74} fill={c.col} opacity={0.55} />
              ))}
            </g>
            <text x={x0 + 470 + wTrace + 26} y={y + 50} fontFamily={FONT_TH} fontSize={24} fontWeight={700} fill={c.col}>{c.opt}</text>
          </g>
        );
      })}
    </svg>
  );
};

const Factors: React.FC<{ at: number; showCheck?: boolean }> = ({ at, showCheck = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  return (
    <svg viewBox={`0 0 ${W} 300`} style={{ display: 'block', width: W, height: 300, overflow: 'visible' }}>
      <g opacity={grow(frame, at)}>
        <text x={960} y={40} textAnchor="middle" fontFamily={FONT_TH} fontSize={26} fill={T.inkSoft}>กฎคร่าว ๆ ของอุตสาหกรรม — ไม่ใช่ค่าที่วัดของรถสี่คันนี้</text>
        <text x={960} y={116} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={54} fontWeight={700} fill={T.ink}>
          WLTP ≈ CLTC × 0.8     ·     EPA ≈ WLTP × 0.85–0.90
        </text>
      </g>
      {showCheck ? (
        <g opacity={grow(frame, at + 30, 24)}>
          <rect x={560} y={158} width={800} height={104} rx={8} fill={T.teal} opacity={0.14} stroke={T.teal} strokeWidth={2.2} />
          <text x={960} y={196} textAnchor="middle" fontFamily={FONT_TH} fontSize={25} fill={T.inkSoft}>ตรวจกับดีพอลเมื่อครู่</text>
          <text x={960} y={244} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={44} fontWeight={700} fill={T.teal}>488 ÷ 615 = 0.79</text>
        </g>
      ) : null}
    </svg>
  );
};

// -----------------------------------------------------------------------------
// CarProfiles — all four outlines to one scale. Honest use of the dimension data: it shows
// they are NOT quite the same size, which the range table alone hides.
// -----------------------------------------------------------------------------
const CarProfiles: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const s = 0.062;
  const slot = 420;
  return (
    <svg viewBox={`0 0 ${W} 300`} style={{ display: 'block', width: W, height: 300, overflow: 'visible' }}>
      <text x={MARGIN_L} y={24} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>
        ภาพร่างด้านข้าง วาดตามความยาว × ความสูงจริง มาตราส่วนเดียวกันทั้งสี่คัน · รูปทรงเป็นสัญลักษณ์ สัดส่วนเป็นข้อมูล
      </text>
      {CARS.map((c, i) => {
        const g = grow(frame, at + i * 16, 22);
        const x = MARGIN_L + i * slot;
        return (
          <g key={c.name} opacity={g}>
            <g transform={`translate(${x}, ${170 - c.Ht * s})`}>
              <CarOutline L={c.L} Ht={c.Ht} scale={s} color={c.tint} />
            </g>
            <line x1={x} y1={178} x2={x + c.L * s} y2={178} stroke={T.inkSoft} strokeWidth={1.4} opacity={0.6} />
            <text x={x} y={212} fontFamily={FONT_TH} fontSize={24} fontWeight={600} fill={T.ink}>{c.name}</text>
            <text x={x} y={242} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>{c.L.toLocaleString()} × {c.Ht.toLocaleString()} มม.</text>
          </g>
        );
      })}
    </svg>
  );
};

// -----------------------------------------------------------------------------
// PackBar — gross vs usable, with the buffer as what it is: a fenced-off region.
// -----------------------------------------------------------------------------
const PackBar: React.FC<{ at: number; showBuffer?: boolean; showId4?: boolean }> = ({ at, showBuffer = false, showId4 = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const x0 = MARGIN_L, total = 1580, hBar = 128, y = 96;
  const usable = 0.86;
  return (
    <svg viewBox={`0 0 ${W} 420`} style={{ display: 'block', width: W, height: 420, overflow: 'visible' }}>
      <g opacity={grow(frame, at)}>
        <text x={x0} y={54} fontFamily={FONT_TH} fontSize={26} fill={T.inkSoft}>ความจุรวมของแพ็ก</text>
        <rect x={x0} y={y} width={total} height={hBar} fill={T.paperDeep} stroke={T.inkSoft} strokeWidth={1.8} />
      </g>
      {showBuffer ? (
        <g opacity={grow(frame, at + 20, 24)}>
          <rect x={x0} y={y} width={total * usable} height={hBar} fill={T.teal} opacity={0.5} />
          <rect x={x0 + total * usable} y={y} width={total * (1 - usable)} height={hBar} fill={T.red} opacity={0.32} />
          <line x1={x0 + total * usable} y1={y - 14} x2={x0 + total * usable} y2={y + hBar + 14} stroke={T.red} strokeWidth={2.6} strokeDasharray="8 7" />
          <text x={x0 + 30} y={y + 78} fontFamily={FONT_TH_DISPLAY} fontSize={40} fontWeight={700} fill={T.ink}>ความจุที่ใช้งานได้จริง</text>
          <text x={x0 + total * usable + 20} y={y + hBar + 48} fontFamily={FONT_TH} fontSize={26} fontWeight={700} fill={T.red}>บัฟเฟอร์</text>
          <text x={x0 + total * usable + 20} y={y + hBar + 80} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>BMS กันไว้ ผู้ใช้แตะไม่ได้</text>
        </g>
      ) : null}
      {showId4 ? (
        <g opacity={grow(frame, at, 24)}>
          <rect x={x0} y={296} width={720} height={100} rx={8} fill={T.paperDeep} stroke={T.inkSoft} strokeWidth={2} />
          <text x={x0 + 26} y={332} fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft}>ตัวอย่างที่ประกาศทั้งสองค่า · Volkswagen ID.4</text>
          <text x={x0 + 26} y={378} fontFamily={FONT_TH_DISPLAY} fontSize={40} fontWeight={700} fill={T.ink}>รวม 82 kWh → ใช้ได้ 77 kWh</text>
        </g>
      ) : null}
    </svg>
  );
};

// -----------------------------------------------------------------------------
// ChargeCurve — peak power is one point on a curve, and the two MG trims prove that the
// higher peak is the slower car over the same window.
// -----------------------------------------------------------------------------
const ChargeCurve: React.FC<{ at: number; show49?: boolean; show64?: boolean; showWindow?: boolean }> =
  ({ at, show49 = false, show64 = false, showWindow = false }) => {
    const T = useTheme();
    const frame = useCurrentFrame();
    // Plot keeps the left two thirds; the two trim callouts live in CARDS on the right. First
    // pass floated them next to their peaks and three labels collided — with each other, with
    // the header, and with the axis title. Cards cannot collide.
    const x0 = MARGIN_L + 90, y0 = 96, wPlot = 1020, hPlot = 330;
    const cardX = x0 + wPlot + 110;
    const soc = (p: number) => x0 + (p / 100) * wPlot;
    const kw = (v: number) => y0 + hPlot - (v / 150) * hPlot;
    // Conceptual taper shapes, drawn to the two published peaks and the two published
    // 10-80% times — the SHAPE is illustrative, the two peaks and the two times are data.
    const path = (peak: number) => {
      const pts: string[] = [];
      for (let p = 5; p <= 100; p += 5) {
        const v = p < 25 ? peak * (0.72 + 0.28 * (p / 25)) : peak * Math.max(0.16, 1 - Math.pow((p - 25) / 82, 1.5));
        pts.push(`${p === 5 ? 'M' : 'L'} ${soc(p)} ${kw(v)}`);
      }
      return pts.join(' ');
    };
    return (
      <svg viewBox={`0 0 ${W} 520`} style={{ display: 'block', width: W, height: 520, overflow: 'visible' }}>
        <g opacity={grow(frame, at)}>
          <line x1={x0} y1={y0} x2={x0} y2={y0 + hPlot} stroke={T.inkSoft} strokeWidth={1.6} />
          <line x1={x0} y1={y0 + hPlot} x2={x0 + wPlot} y2={y0 + hPlot} stroke={T.inkSoft} strokeWidth={1.6} />
          <text x={x0 - 16} y={y0 + 8} textAnchor="end" fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>kW</text>
          {[0, 25, 50, 75, 100].map((p) => (
            <g key={p}>
              <line x1={soc(p)} y1={y0 + hPlot} x2={soc(p)} y2={y0 + hPlot + 8} stroke={T.inkSoft} strokeWidth={1.4} />
              <text x={soc(p)} y={y0 + hPlot + 32} textAnchor="middle" fontFamily={FONT_TH} fontSize={21} fill={T.inkSoft}>{p}</text>
            </g>
          ))}
          <text x={x0 + wPlot / 2} y={y0 + hPlot + 62} textAnchor="middle" fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>สถานะประจุ (%)</text>
          <text x={MARGIN_L} y={38} fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft}>
            MG S5 EV รุ่นที่ขายในอังกฤษ · รูปเส้นโค้งเป็นภาพประกอบ ค่ายอดและเวลาเป็นตัวเลขที่วัดได้
          </text>
        </g>
        {show49 ? (
          <g opacity={grow(frame, at + 10, 24)}>
            <path d={path(120)} fill="none" stroke={T.teal} strokeWidth={3.4} />
            <circle cx={soc(25)} cy={kw(120)} r={7} fill={T.teal} />
            <rect x={cardX} y={y0 + 96} width={430} height={116} rx={8} fill={T.paperDeep} stroke={T.teal} strokeWidth={2.2} />
            <text x={cardX + 22} y={y0 + 132} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>แบต 49 kWh</text>
            <text x={cardX + 22} y={y0 + 180} fontFamily={FONT_TH_DISPLAY} fontSize={34} fontWeight={700} fill={T.teal}>120 kW · 24 นาที</text>
          </g>
        ) : null}
        {show64 ? (
          <g opacity={grow(frame, at + 6, 24)}>
            <path d={path(139)} fill="none" stroke={T.yellow} strokeWidth={3.4} strokeDasharray="10 6" />
            <circle cx={soc(25)} cy={kw(139)} r={7} fill={T.yellow} />
            <rect x={cardX} y={y0 - 46} width={430} height={116} rx={8} fill={T.paperDeep} stroke={T.yellow} strokeWidth={2.2} />
            <text x={cardX + 22} y={y0 - 10} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>แบต 64 kWh</text>
            <text x={cardX + 22} y={y0 + 38} fontFamily={FONT_TH_DISPLAY} fontSize={34} fontWeight={700} fill={T.yellow}>139 kW · 28 นาที</text>
            <rect x={MARGIN_L} y={y0 + hPlot + 92} width={1580} height={96} rx={8} fill={T.yellow} opacity={0.14} stroke={T.yellow} strokeWidth={2.2} />
            <text x={MARGIN_L + 790} y={y0 + hPlot + 154} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={38} fontWeight={700} fill={T.yellow}>
              ยอดสูงกว่า แต่ใช้เวลานานกว่า — ทั้งคู่วัดที่หน้าต่าง 10→80%
            </text>
          </g>
        ) : null}
        {showWindow ? (
          <g opacity={grow(frame, at, 24)}>
            <rect x={soc(30)} y={y0} width={soc(80) - soc(30)} height={hPlot} fill={T.red} opacity={0.16} />
            <rect x={soc(10)} y={y0} width={soc(80) - soc(10)} height={hPlot} fill="none" stroke={T.red} strokeWidth={2.4} strokeDasharray="9 7" />
            <text x={MARGIN_L} y={y0 + hPlot + 108} fontFamily={FONT_TH} fontSize={26} fill={T.inkSoft}>BYD Atto 3 · เลขสองตัวของรถคันเดียวกัน</text>
            <text x={MARGIN_L} y={y0 + hPlot + 152} fontFamily={FONT_TH_DISPLAY} fontSize={38} fontWeight={700} fill={T.red}>30→80% ≈ 29 นาที</text>
            <text x={MARGIN_L + 520} y={y0 + hPlot + 152} fontFamily={FONT_TH_DISPLAY} fontSize={38} fontWeight={700} fill={T.ink}>10→80% ≈ 35 นาที</text>
          </g>
        ) : null}
      </svg>
    );
  };

// -----------------------------------------------------------------------------
// SameName — one nameplate, two answers. This is the video's own research showing its work.
// -----------------------------------------------------------------------------
const SameName: React.FC<{ at: number; showNums?: boolean }> = ({ at, showNums = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const card = (x: number, tag: string, val: string, col: string, d: number) => (
    <g opacity={showNums ? grow(frame, at + d, 24) : 0}>
      <rect x={x} y={150} width={620} height={190} rx={10} fill={T.paperDeep} stroke={col} strokeWidth={2.6} />
      <text x={x + 34} y={200} fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft}>{tag}</text>
      <text x={x + 34} y={286} fontFamily={FONT_TH_DISPLAY} fontSize={72} fontWeight={700} fill={col}>{val}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} 460`} style={{ display: 'block', width: W, height: 460, overflow: 'visible' }}>
      <g opacity={grow(frame, at)}>
        <rect x={660} y={20} width={600} height={92} rx={8} fill={T.ink} opacity={0.9} />
        <text x={960} y={80} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={44} fontWeight={700} fill={T.paper}>ชื่อรุ่นเดียวกัน</text>
      </g>
      {card(MARGIN_L, 'กำลังชาร์จสูงสุดที่พบในแหล่งหนึ่ง', '88 kW', T.teal, 0)}
      {card(W - MARGIN_L - 620, 'และในอีกแหล่งหนึ่ง', '139 kW', T.yellow, 14)}
      <g opacity={showNums ? grow(frame, at + 34, 24) : 0}>
        <text x={960} y={400} textAnchor="middle" fontFamily={FONT_TH} fontSize={28} fill={T.inkSoft}>
          เกือบแน่ว่าเป็นคนละรุ่นย่อยหรือคนละตลาด — ไม่ใช่แหล่งไหนผิด
        </text>
      </g>
    </svg>
  );
};

// -----------------------------------------------------------------------------
// PowerTime — peak vs the 30-minute rating that UNECE R85 actually defines.
// -----------------------------------------------------------------------------
const PowerTime: React.FC<{ at: number; showCont?: boolean }> = ({ at, showCont = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  // Same card discipline as ChargeCurve, and for the same reason: floating callouts beside a
  // curve collided with each other, with the axis title and with the prop on the first pass.
  const x0 = MARGIN_L + 70, y0 = 96, wPlot = 950, hPlot = 300;
  const cardX = x0 + wPlot + 130;
  const t = (m: number) => x0 + (m / 40) * wPlot;
  const p = (v: number) => y0 + hPlot - (v / 200) * hPlot;
  const pts: string[] = [];
  for (let m = 0; m <= 40; m += 0.5) {
    const v = m < 2 ? 180 : Math.max(96, 96 + 84 * Math.pow(0.9, (m - 2) * 1.15));
    pts.push(`${m === 0 ? 'M' : 'L'} ${t(m)} ${p(v)}`);
  }
  const card = (y: number, title: string, sub: string, col: string) => (
    <g>
      <rect x={cardX} y={y} width={470} height={118} rx={8} fill={T.paperDeep} stroke={col} strokeWidth={2.2} />
      <text x={cardX + 22} y={y + 50} fontFamily={FONT_TH_DISPLAY} fontSize={30} fontWeight={700} fill={col}>{title}</text>
      <text x={cardX + 22} y={y + 90} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>{sub}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} 520`} style={{ display: 'block', width: W, height: 520, overflow: 'visible' }}>
      <g opacity={grow(frame, at)}>
        <line x1={x0} y1={y0} x2={x0} y2={y0 + hPlot} stroke={T.inkSoft} strokeWidth={1.6} />
        <line x1={x0} y1={y0 + hPlot} x2={x0 + wPlot} y2={y0 + hPlot} stroke={T.inkSoft} strokeWidth={1.6} />
        <text x={x0 - 16} y={y0 + 8} textAnchor="end" fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>kW</text>
        {[0, 10, 20, 30, 40].map((m) => (
          <g key={m}>
            <line x1={t(m)} y1={y0 + hPlot} x2={t(m)} y2={y0 + hPlot + 8} stroke={T.inkSoft} strokeWidth={1.4} />
            <text x={t(m)} y={y0 + hPlot + 32} textAnchor="middle" fontFamily={FONT_TH} fontSize={21} fill={T.inkSoft}>{m}</text>
          </g>
        ))}
        <text x={x0 + wPlot / 2} y={y0 + hPlot + 62} textAnchor="middle" fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>เวลาที่กดต่อเนื่อง (นาที)</text>
        <path d={pts.join(' ')} fill="none" stroke={T.inkSoft} strokeWidth={3.2} />
        <circle cx={t(0.8)} cy={p(180)} r={8} fill={T.red} />
        {card(y0 - 40, 'ค่าสูงสุดช่วงสั้น', 'ตัวเลขที่อยู่บนโบรชัวร์', T.red)}
      </g>
      {showCont ? (
        <g opacity={grow(frame, at, 26)}>
          <line x1={x0} y1={p(96)} x2={x0 + wPlot} y2={p(96)} stroke={T.teal} strokeWidth={2.6} strokeDasharray="10 7" />
          <line x1={t(30)} y1={p(96)} x2={t(30)} y2={y0 + hPlot} stroke={T.teal} strokeWidth={2.2} opacity={0.6} />
          <circle cx={t(30)} cy={p(96)} r={7} fill={T.teal} />
          {card(y0 + 150, 'กำลังต่อเนื่อง 30 นาที', 'นิยามไว้ใน UNECE R85', T.teal)}
          <text x={MARGIN_L} y={y0 + hPlot + 116} fontFamily={FONT_TH} fontSize={25} fill={T.inkSoft}>
            สองค่านี้ต่างกันได้มาก และแทบไม่มีใครระบุว่ากำลังโชว์ตัวไหน
          </text>
          <text x={MARGIN_L} y={y0 + hPlot + 150} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft} opacity={0.8}>
            รูปเส้นโค้งเป็นภาพประกอบ · นิยามกำลังต่อเนื่อง 30 นาที เป็นตัวบทมาตรฐาน
          </text>
        </g>
      ) : null}
    </svg>
  );
};

// -----------------------------------------------------------------------------
// StarsPanel — five stars is not a unit.
// -----------------------------------------------------------------------------
const Star: React.FC<{ x: number; y: number; r: number; fill: string; op?: number }> = ({ x, y, r, fill, op = 1 }) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.44;
    pts.push(`${x + rr * Math.cos(ang)},${y + rr * Math.sin(ang)}`);
  }
  return <polygon points={pts.join(' ')} fill={fill} opacity={op} />;
};

const StarsPanel: React.FC<{ at: number; showYears?: boolean }> = ({ at, showYears = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const col = (x: number, title: string, note: string, c: string, d: number) => (
    <g opacity={grow(frame, at + d, 24)}>
      <rect x={x} y={40} width={740} height={210} rx={10} fill={T.paperDeep} stroke={c} strokeWidth={2.4} />
      <text x={x + 34} y={92} fontFamily={FONT_TH_DISPLAY} fontSize={36} fontWeight={700} fill={c}>{title}</text>
      {[0, 1, 2, 3, 4].map((i) => <Star key={i} x={x + 62 + i * 62} y={148} r={26} fill={c} op={0.9} />)}
      <text x={x + 34} y={222} fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft}>{note}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} 480`} style={{ display: 'block', width: W, height: 480, overflow: 'visible' }}>
      {col(MARGIN_L, 'ASEAN NCAP', 'ชุดการทดสอบและน้ำหนักคะแนนของอาเซียน', T.teal, 0)}
      {col(W - MARGIN_L - 740, 'Euro NCAP', 'คนละชุดการทดสอบ คนละน้ำหนักคะแนน', T.yellow, 16)}
      <g opacity={grow(frame, at + 30, 24)}>
        <text x={960} y={166} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={54} fontWeight={700} fill={T.red}>≠</text>
      </g>
      {showYears ? (
        <g opacity={grow(frame, at, 26)}>
          <rect x={MARGIN_L} y={306} width={1580} height={132} rx={10} fill={T.red} opacity={0.14} stroke={T.red} strokeWidth={2.4} />
          <text x={960} y={356} textAnchor="middle" fontFamily={FONT_TH} fontSize={26} fill={T.inkSoft}>และเกณฑ์เข้มขึ้นทุกปี</text>
          <text x={960} y={410} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={42} fontWeight={700} fill={T.red}>
            ห้าดาวของปีหนึ่ง ไม่ใช่ห้าดาวของอีกปีหนึ่ง
          </text>
        </g>
      ) : null}
    </svg>
  );
};

// -----------------------------------------------------------------------------
// LevelLadder — SAE J3016, with the responsibility line drawn where the standard puts it.
// -----------------------------------------------------------------------------
const LEVELS = ['0', '1', '2', '3', '4', '5'];
const LevelLadder: React.FC<{ at: number; showSplit?: boolean }> = ({ at, showSplit = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const x0 = MARGIN_L, slot = 262, y = 92, hBox = 118;
  return (
    <svg viewBox={`0 0 ${W} 420`} style={{ display: 'block', width: W, height: 420, overflow: 'visible' }}>
      <text x={x0} y={48} fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft}>ระดับการขับอัตโนมัติ ตามมาตรฐาน SAE J3016</text>
      {LEVELS.map((l, i) => {
        const lit = i === 2;
        return (
          <g key={l} opacity={grow(frame, at + i * 9, 20)}>
            <rect x={x0 + i * slot} y={y} width={slot - 24} height={hBox} rx={8}
              fill={lit ? T.yellow : T.paperDeep} opacity={lit ? 0.9 : 0.7} stroke={lit ? T.yellow : T.inkSoft} strokeWidth={lit ? 3 : 1.6} />
            <text x={x0 + i * slot + (slot - 24) / 2} y={y + 78} textAnchor="middle" fontFamily={FONT_TH_DISPLAY}
              fontSize={56} fontWeight={700} fill={lit ? T.paper : T.ink}>{l}</text>
          </g>
        );
      })}
      {showSplit ? (
        <g opacity={grow(frame, at, 26)}>
          <line x1={x0 + 3 * slot - 12} y1={y - 24} x2={x0 + 3 * slot - 12} y2={y + hBox + 132} stroke={T.red} strokeWidth={3} strokeDasharray="10 8" />
          <text x={x0 + 3 * slot - 40} y={y + hBox + 62} textAnchor="end" fontFamily={FONT_TH} fontSize={27} fontWeight={700} fill={T.ink}>
            คนขับต้องกำกับตลอดเวลา
          </text>
          <text x={x0 + 3 * slot + 16} y={y + hBox + 62} fontFamily={FONT_TH} fontSize={27} fill={T.inkSoft}>ระบบรับผิดชอบการขับ</text>
          <text x={x0} y={y + hBox + 132} fontFamily={FONT_TH} fontSize={26} fill={T.inkSoft}>
            Level 2 ไม่ใช่ระดับความเก่ง — มันคือเส้นแบ่งความรับผิดชอบ และเส้นนั้นยังอยู่ฝั่งคนขับ
          </text>
        </g>
      ) : null}
    </svg>
  );
};

// -----------------------------------------------------------------------------
// EffCard + ThreeQuestions — the payoff and the takeaway card.
// -----------------------------------------------------------------------------
const EffCard: React.FC<{ at: number; showEx?: boolean }> = ({ at, showEx = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  return (
    <svg viewBox={`0 0 ${W} 420`} style={{ display: 'block', width: W, height: 420, overflow: 'visible' }}>
      <g opacity={grow(frame, at)}>
        <rect x={MARGIN_L} y={40} width={1580} height={168} rx={10} fill={T.teal} opacity={0.16} stroke={T.teal} strokeWidth={2.6} />
        <text x={960} y={94} textAnchor="middle" fontFamily={FONT_TH} fontSize={26} fill={T.inkSoft}>ช่องเดียวที่เทียบกันได้จริง ถ้าวัดในมาตรฐานเดียวกัน</text>
        <text x={960} y={168} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={62} fontWeight={700} fill={T.teal}>
          กิโลวัตต์ชั่วโมง ต่อ 100 กิโลเมตร
        </text>
      </g>
      {showEx ? (
        <g opacity={grow(frame, at, 24)}>
          <rect x={MARGIN_L} y={248} width={760} height={128} rx={10} fill={T.paperDeep} stroke={T.inkSoft} strokeWidth={2} />
          <text x={MARGIN_L + 30} y={294} fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft}>AION Y Plus · ค่าที่ประกาศ</text>
          <text x={MARGIN_L + 30} y={352} fontFamily={FONT_TH_DISPLAY} fontSize={48} fontWeight={700} fill={T.ink}>13.9 kWh / 100 กม.</text>
          <text x={MARGIN_L + 830} y={300} fontFamily={FONT_TH} fontSize={26} fill={T.inkSoft}>ตัวเลขแบบนี้แทบไม่เคยขึ้นป้ายโฆษณา</text>
          <text x={MARGIN_L + 830} y={344} fontFamily={FONT_TH} fontSize={26} fill={T.inkSoft}>ทั้งที่มันบอกเรื่องประสิทธิภาพได้มากที่สุด</text>
        </g>
      ) : null}
    </svg>
  );
};

const QS = [
  { n: '1', q: 'ระยะทางนี้วัดด้วยมาตรฐานอะไร', s: 'NEDC · WLTP · EPA · CLTC' },
  { n: '2', q: 'เวลาชาร์จนี้นับจากกี่ % ถึงกี่ %', s: '10→80 กับ 30→80 คนละเลข' },
  { n: '3', q: 'ความจุแบตนี้ รวม หรือ ใช้ได้จริง', s: 'ส่วนต่างคือบัฟเฟอร์' },
];

const ThreeQuestions: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  return (
    <svg viewBox={`0 0 ${W} 400`} style={{ display: 'block', width: W, height: 400, overflow: 'visible' }}>
      {QS.map((q, i) => (
        <g key={q.n} opacity={grow(frame, at + i * 22, 24)}>
          <rect x={MARGIN_L + i * 540} y={40} width={500} height={250} rx={10} fill={T.paperDeep} stroke={T.teal} strokeWidth={2.4} />
          <circle cx={MARGIN_L + i * 540 + 62} cy={104} r={34} fill={T.teal} opacity={0.9} />
          <text x={MARGIN_L + i * 540 + 62} y={118} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={40} fontWeight={700} fill={T.paper}>{q.n}</text>
          <text x={MARGIN_L + i * 540 + 30} y={196} fontFamily={FONT_TH} fontSize={28} fontWeight={600} fill={T.ink}>{q.q}</text>
          <text x={MARGIN_L + i * 540 + 30} y={248} fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft}>{q.s}</text>
        </g>
      ))}
    </svg>
  );
};

// -----------------------------------------------------------------------------
// Hook — frame 0 must be fully composed, because frame 0 is the thumbnail.
// -----------------------------------------------------------------------------
const Hook: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  return (
    <>
      <SerifStatement
        x={960} y={96} w={1620} at={at} size={72} align="center"
        words={[{ t: 'สเปกชีต' }, { t: 'สี่คัน' }, { t: 'ที่' }, { t: 'เทียบกันไม่ได้', hl: true }]}
      />
      <LabelChip x={MARGIN_L} y={186} at={at + 12} size={26} anchor="left" accent={T.teal}
        kicker="THE EV INSIGHT" kickerColor={T.teal} text="เอสยูวีไฟฟ้าคลาสเดียวกัน สี่รุ่น" />
    </>
  );
};

// =============================================================================
export const Vox9SpecSheet: React.FC = () => {
  // Outside CollageBoard there is no theme context yet, so the page ground is read straight
  // from the palette the board is about to install. Never leave this transparent.
  const T = BLUEPRINT;
  return (
    <AbsoluteFill style={{ background: T.paper }}>
      <CollageBoard cam={CAM} fontBody={FONT_TH} fontDisplay={FONT_TH_DISPLAY} tracking="0.6px" theme="blueprint">
        <PaperBG w={W} h={H} />

        {/* s01 — the hook, and the table the video keeps returning to.
            Starts at frame 0 with NEGATIVE entrance cues so frame 0 is already composed. The
            first QA pass had this Scene starting at frame 15 and frame 0 rendered as bare
            board — the exact defect PIPELINE §5 warns about, since frame 0 is the thumbnail. */}
        <Scene from={0} dur={C.s02_norank - 18}>
          <Hook at={-30} />
          <Layer x={960} y={640} w={W} at={0} dur={1} enter="none" depth={0.02} drift={0.4}>
            <SpecTable at={-20} spreadAt={C.s01c_gap} />
          </Layer>
        </Scene>

        {/* s02 — the rule, stated up front */}
        <Scene from={C.s02_norank} dur={C.s03_setup - C.s02_norank - 18}>
          <SerifStatement
            x={960} y={360} w={1500} at={6} size={64} align="center"
            words={[{ t: 'คลิปนี้' }, { t: 'จะไม่บอก' }, { t: 'ว่าคันไหน' }, { t: 'ชนะ', hl: true }]}
          />
          <RubberStamp x={960} y={620} at={C.s02b_why - C.s02_norank} size={54} rotate={-7} text="ไม่ประกาศผู้ชนะ" />
          <LabelChip x={960} y={760} at={C.s02b_why - C.s02_norank + 20} size={28}
            text="เหตุผลเป็นเรื่องเทคนิค ไม่ใช่ความสุภาพ" />
        </Scene>

        {/* s03 — THE SPINE: one car, two numbers */}
        <Scene from={C.s03_setup} dur={C.s04_what - C.s03_setup - 18}>
          <Layer x={960} y={560} w={W} at={0} dur={1} enter="none" depth={0.02} drift={0.3}>
            <OneCarTwoNumbers
              at={C.s03b_china - C.s03_setup}
              showUk={true}
              showDelta={true}
            />
          </Layer>
        </Scene>

        {/* s04 — what a test cycle actually is */}
        <Scene from={C.s04_what} dur={C.s05_intro - C.s04_what - 18}>
          <Plate src={A('dyno-hall.png')} at={0} dim={0.72} />
          {/* The opening line of this scene runs 10.3s and the first pass gave it the photo and
              one small caption — "a long line with a short picture reads as a stall" (PIPELINE
              §6). It gets the statement instead, and `backing` is mandatory over a photo. */}
          <FadeOut at={C.s04b_nedc - C.s04_what - 24}>
            <SerifStatement
              x={960} y={430} w={1500} at={10} size={62} align="center" backing
              words={[{ t: 'วงจรทดสอบ' }, { t: 'คือ' }, { t: 'บทที่รถ' }, { t: 'ต้องขับตาม', hl: true }]}
            />
            <LabelChip x={960} y={620} at={40} size={26}
              text="บนแท่นไดนาโมมิเตอร์ ในห้องที่คุมอุณหภูมิ · ความเร็วและเวลากำหนดไว้ล่วงหน้าทุกวินาที" />
          </FadeOut>
          <FadeOut at={C.s04d_factors - C.s04_what - 20}>
            <Layer x={960} y={480} w={W} at={0} dur={1} enter="none" depth={0.02} drift={0.3}>
              <CycleBars at={C.s04b_nedc - C.s04_what} />
            </Layer>
          </FadeOut>
          <Layer x={960} y={800} w={W} at={C.s04d_factors - C.s04_what} dur={1} enter="none" depth={0.03} drift={0.4}>
            <Factors at={0} showCheck={true} />
          </Layer>
        </Scene>

        {/* s05 — the table, now with the column that was missing */}
        <Scene from={C.s05_intro} dur={C.s06_intro - C.s05_intro - 18}>
          <Layer x={960} y={420} w={W} at={0} dur={1} enter="none" depth={0.02} drift={0.3}>
            <SpecTable at={10} labels={true} flagCltc={true} />
          </Layer>
          <Layer x={960} y={880} w={W} at={C.s05d_point - C.s05_intro} dur={1} enter="none" depth={0.04} drift={0.5}>
            <CarProfiles at={0} />
          </Layer>
        </Scene>

        {/* s06 — kWh is not kWh */}
        <Scene from={C.s06_intro} dur={C.s07_intro - C.s06_intro - 18}>
          <Prop src={A('cells.png')} x={1560} y={790} w={520} at={C.s06b_buffer - C.s06_intro} rot={-2}
            caption="โมดูลแบตเตอรี่ · ภาพประกอบ" />
          <Layer x={960} y={420} w={W} at={0} dur={1} enter="none" depth={0.02} drift={0.3}>
            <PackBar at={10} showBuffer={true} showId4={true} />
          </Layer>
        </Scene>

        {/* s07 — peak kW is not charging time */}
        <Scene from={C.s07_intro} dur={C.s07f_samename - C.s07_intro - 18}>
          <Prop src={A('ccs-plug.png')} x={330} y={905} w={230} at={C.s07b_curve - C.s07_intro} rot={3}
            caption="หัวชาร์จ DC · ภาพประกอบ" />
          <FadeOut at={C.s07e_window - C.s07_intro - 20}>
            <Layer x={960} y={470} w={W} at={0} dur={1} enter="none" depth={0.02} drift={0.3}>
              <ChargeCurve at={C.s07b_curve - C.s07_intro} show49={true} show64={true} />
            </Layer>
          </FadeOut>
          <Layer x={960} y={470} w={W} at={C.s07e_window - C.s07_intro} dur={1} enter="none" depth={0.02} drift={0.3}>
            <ChargeCurve at={0} showWindow={true} />
          </Layer>
        </Scene>

        {/* s07f — same nameplate, different car */}
        <Scene from={C.s07f_samename} dur={C.s08_intro - C.s07f_samename - 18}>
          <Layer x={960} y={520} w={W} at={0} dur={1} enter="none" depth={0.02} drift={0.3}>
            <SameName at={10} showNums={true} />
          </Layer>
          <LabelChip x={MARGIN_L} y={880} at={C.s07h_lesson - C.s07f_samename} size={28} anchor="left" accent={BLUEPRINT.teal}
            text="ก่อนเทียบสองคัน ต้องรู้ว่ารุ่นย่อยไหน ตลาดไหน ปีไหน" />
        </Scene>

        {/* s08 — power, and for how many minutes */}
        <Scene from={C.s08_intro} dur={C.s09_intro - C.s08_intro - 18}>
          <Prop src={A('stator.png')} x={360} y={890} w={280} at={C.s08b_r85 - C.s08_intro} rot={-3}
            caption="สเตเตอร์มอเตอร์ · ภาพประกอบ" />
          <Layer x={960} y={430} w={W} at={0} dur={1} enter="none" depth={0.02} drift={0.3}>
            <PowerTime at={10} showCont={true} />
          </Layer>
        </Scene>

        {/* s09 — five stars is not a unit */}
        <Scene from={C.s09_intro} dur={C.s10_intro - C.s09_intro - 18}>
          <Prop src={A('barrier.png')} x={1690} y={840} w={380} at={C.s09b_protocol - C.s09_intro} rot={2}
            caption="แผงรังผึ้งทดสอบชน · ภาพประกอบ" />
          <Layer x={960} y={440} w={W} at={0} dur={1} enter="none" depth={0.02} drift={0.3}>
            <StarsPanel at={10} showYears={true} />
          </Layer>
        </Scene>

        {/* s10 — what "Level 2" is defined to mean */}
        <Scene from={C.s10_intro} dur={C.s11_q - C.s10_intro - 18}>
          <Prop src={A('wheel.png')} x={1640} y={830} w={440} at={C.s10b_j3016 - C.s10_intro} rot={-2}
            caption="พวงมาลัย · ภาพประกอบ" />
          <Layer x={960} y={420} w={W} at={0} dur={1} enter="none" depth={0.02} drift={0.3}>
            <LevelLadder at={10} showSplit={true} />
          </Layer>
        </Scene>

        {/* s11 — the one column that survives */}
        <Scene from={C.s11_q} dur={C.s12_norank - C.s11_q - 18}>
          <Prop src={A('meter.png')} x={1660} y={840} w={420} at={C.s11b_answer - C.s11_q} rot={2}
            caption="เครื่องวิเคราะห์กำลังไฟฟ้า" />
          <Layer x={960} y={430} w={W} at={0} dur={1} enter="none" depth={0.02} drift={0.3}>
            <EffCard at={C.s11b_answer - C.s11_q} showEx={true} />
          </Layer>
        </Scene>

        {/* s12 — the three questions, then back to frame 0 so the loop closes */}
        <Scene from={C.s12_norank} dur={C.tail - C.s12_norank + 200}>
          <SerifStatement
            x={960} y={130} w={1560} at={6} size={58} align="center"
            words={[{ t: 'ตารางที่ยัง' }, { t: 'ไม่ติดป้าย' }, { t: 'เงื่อนไขการวัด' }, { t: 'ประกาศผู้ชนะไม่ได้', hl: true }]}
          />
          <Layer x={960} y={470} w={W} at={C.s12c_three - C.s12_norank} dur={1} enter="none" depth={0.03} drift={0.4}>
            <ThreeQuestions at={0} />
          </Layer>
          <Layer x={960} y={840} w={W} at={C.s12d_close - C.s12_norank} dur={1} enter="none" depth={0.02} drift={0.3}>
            <SpecTable at={0} labels={true} flagCltc={true} />
          </Layer>
        </Scene>

        <Grain opacity={0.045} />
      </CollageBoard>
    </AbsoluteFill>
  );
};

export default Vox9SpecSheet;
