import React from 'react';
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import {
  BLUEPRINT,
  CollageBoard,
  Cutout,
  EASE_INOUT,
  EASE_OUT,
  Grain,
  LabelChip,
  Layer,
  PaperBG,
  RubberStamp,
  SerifStatement,
  SketchArrow,
  useTheme,
} from '../../lib/collage';
import { FONT_TH, FONT_TH_DISPLAY } from '../../fonts';

// =============================================================================
// "ไอออนที่ใหญ่กว่า แต่ลื่นกว่า" — vox-6, The EV Insight
// Facts, sources and the deliberate omissions: vox-shorts/vox-6-sodium-ion/script.md
//
// ~2 minutes, which is DELIBERATELY not a Short. Over 60s it loses Shorts distribution and
// becomes an ordinary (vertical) YouTube video. That was the brief; the consequence is written
// down in script.md so nobody rediscovers it as a surprise.
//
// TWO mechanisms, because two minutes can carry two:
//   1. Why the energy density is lower — the sodium ion is ~3x heavier AND the cell sits at
//      ~2-3V against lithium's ~3.6V. Energy is voltage x capacity, so both terms lose at once.
//      It is physics, not a failure of engineering.
//   2. Why the cold performance is BETTER despite the bigger ion — what actually migrates is
//      not the bare ion but the ion inside its shell of solvent molecules, and sodium's shell
//      is held more loosely, so the moving object is SMALLER. That inversion is the spine.
//
// THE CUES ARE THE MEASURED VOICE, NOT ESTIMATES. The voice was generated BEFORE this file was
// written, so every frame number below comes from beats.json's real windows and no retime pass
// was needed. That order is cheaper than the one PIPELINE describes and should probably become
// the default for a video being built from scratch.
// =============================================================================
export const compositionConfig = {
  id: 'Vox6SodiumIon',
  durationInSeconds: 113,
  fps: 30,
  width: 1080,
  height: 1920,
};

// The last word lands at 108.42s. 113 leaves 4.6s for the hook to reassemble and the loop to
// close; the 117 this was first cut at left 8.6s of silence, which reads as the video ending
// twice. beats.json's durationSec must match, because that is what pads the audio bed.

const W = 1080;
const H = 1920;

// Left edge for anchor="left" chips and for anything drawn flush left inside an SVG layer.
// It is 150, not 110, because the camera zooms: at the peak z=1.18 the board's visible left edge
// has moved in to x≈85, so a chip at 110 sits 30px from the frame edge on a phone. QA caught it
// in three shots at once. Board margin and peak zoom are ONE decision — changing CAM's z changes
// this number.
const MARGIN_L = 150;
const A6 = (f: string) => staticFile(`projects/vox-6-sodium-ion/layers/${f}`);
const A5 = (f: string) => staticFile(`projects/vox-5-tesla-dry/layers/${f}`);

// Every entry is the MEASURED start of its line (see the header). Where a cue sits inside a
// line, the offset is chosen to land on the phrase named in the comment.
const CUE = {
  hookTitle: -46,
  hookSalt: -30,
  hookCell: -14,

  same: 245, //        s02 — "ต่างกันแค่ไอออนที่วิ่งไปมา"
  sameDiagram: 300,

  heavy: 489, //       s03 — "หนักกว่าลิเทียมราวสามเท่า"
  heavyBalls: 530,

  volt: 669, //        s04 — the cell-voltage card
  voltBars: 710,

  why: 880, //         s05 — energy = V x capacity, both terms lose
  whyMerge: 935,
  whyVerdict: 1070, // "นี่คือฟิสิกส์ ไม่ใช่เพราะทำได้ไม่ดี"

  trade: 1203, //      s06 — "แลกมาสามอย่าง"

  t1: 1385, //         s07 — salt is everywhere
  t1Brine: 1440,

  t2: 1606, //         s08 — no lithium, cobalt, nickel
  t2Strike: 1670,

  t3: 1850, //         s09 — THE INVERSION
  t3Frost: 1900,

  shell: 2083, //      s10 — the solvation shell explains it
  shellDiagram: 2130,

  cold: 2408, //       s11 — 90% at -40C
  coldBar: 2432,
  coldFrost: 2450,

  real: 2578, //       s12 — 175 Wh/kg, a real car
  realCar: 2700,
  realChip: 2800,

  twist: 2957, //      s13 — solid-state is still level 4 of 9
  twistLadder: 3000, // lands on "ยังอยู่แค่ระดับสี่จากเก้า"
  twistCard: 3090,

  titleBack: 3290,
} as const;

const CAM = [
  { f: 0, x: 540, y: 960, z: 1 },
  { f: 220, x: 540, y: 960, z: 1.05 },
  { f: 300, x: 540, y: 985, z: 1.1 },
  { f: 640, x: 542, y: 988, z: 1.12 },
  { f: 700, x: 540, y: 1000, z: 1.16 },
  { f: 1170, x: 542, y: 1002, z: 1.18 },
  { f: 1250, x: 540, y: 960, z: 1.04 },
  { f: 1380, x: 540, y: 975, z: 1.08 },
  { f: 1830, x: 542, y: 978, z: 1.1 },
  { f: 1900, x: 540, y: 995, z: 1.14 },
  { f: 2380, x: 542, y: 998, z: 1.16 },
  { f: 2450, x: 540, y: 975, z: 1.06 },
  { f: 2930, x: 542, y: 978, z: 1.08 },
  { f: 3000, x: 540, y: 985, z: 1.12 },
  { f: 3260, x: 540, y: 975, z: 1.04 },
  { f: 3330, x: 540, y: 960, z: 1 },
  { f: 3390, x: 540, y: 960, z: 1 },
];

const TITLE_WORDS = [{ t: 'ไอออนที่ใหญ่กว่า' }, { t: 'แต่ลื่นกว่า', hl: true }];

// =============================================================================
const Grid: React.FC = () => {
  const T = useTheme();
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= W * 1.2; x += 40)
    lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={H * 1.2} stroke={T.inkSoft} strokeWidth={x % 200 === 0 ? 1.1 : 0.5} opacity={x % 200 === 0 ? 0.3 : 0.14} />);
  for (let y = 0; y <= H * 1.2; y += 40)
    lines.push(<line key={`h${y}`} x1={0} y1={y} x2={W * 1.2} y2={y} stroke={T.inkSoft} strokeWidth={y % 200 === 0 ? 1.1 : 0.5} opacity={y % 200 === 0 ? 0.3 : 0.14} />);
  return (
    <div style={{ position: 'absolute', left: -W * 0.1, top: -H * 0.1 }}>
      <svg viewBox={`0 0 ${W * 1.2} ${H * 1.2}`} style={{ display: 'block', width: W * 1.2, height: H * 1.2 }}>{lines}</svg>
    </div>
  );
};

const Panel: React.FC<{
  at: number; y: number; kicker: string; head: string; sub?: string;
  headSize?: number; accent?: string; w?: number;
}> = ({ at, y, kicker, head, sub, headSize = 42, accent, w = 780 }) => {
  const T = useTheme();
  return (
    <Layer x={540} y={y} w={w} at={at} dur={14} enter="place" rotate={0.4} depth={0.03} drift={0.4}>
      <div style={{ background: T.cream, padding: '30px 38px 34px', borderLeft: `8px solid ${accent ?? T.teal}`, boxShadow: '0 14px 32px rgba(0,0,0,0.5)' }}>
        <div style={{ fontFamily: FONT_TH, fontSize: 21, fontWeight: 600, color: accent ?? T.teal, marginBottom: 9 }}>{kicker}</div>
        <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: headSize, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>{head}</div>
        {sub ? <div style={{ fontFamily: FONT_TH, fontSize: 24, fontWeight: 400, color: T.inkSoft, lineHeight: 1.45, marginTop: 12 }}>{sub}</div> : null}
      </div>
    </Layer>
  );
};

// A cell as a diagram: two electrodes and an ion shuttling between them. The point of s02 is
// that sodium-ion is the SAME machine with a different passenger, so the diagram is drawn once
// and only the label changes.
const CellDiagram: React.FC<{ at: number; ion: string; color: string }> = ({ at, ion, color }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const shuttle = Math.sin((frame - at) * 0.045) * 0.5 + 0.5;
  return (
    <svg viewBox={`0 0 ${W} 380`} style={{ display: 'block', width: W, height: 380, overflow: 'visible' }} opacity={p}>
      <rect x={150} y={60} width={130} height={250} fill={T.inkSoft} opacity={0.18} stroke={T.inkSoft} strokeWidth={2.4} />
      <rect x={800} y={60} width={130} height={250} fill={T.inkSoft} opacity={0.18} stroke={T.inkSoft} strokeWidth={2.4} />
      <text x={215} y={345} textAnchor="middle" fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft}>ขั้วลบ</text>
      <text x={865} y={345} textAnchor="middle" fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft}>ขั้วบวก</text>
      <line x1={290} y1={185} x2={790} y2={185} stroke={T.inkSoft} strokeWidth={1.6} strokeDasharray="8 10" opacity={0.5} />
      <circle cx={310 + 460 * shuttle} cy={185} r={30} fill={color} opacity={0.9} />
      <text x={310 + 460 * shuttle} y={195} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={26} fontWeight={700} fill={T.paper}>{ion}</text>
    </svg>
  );
};

// Two ions drawn to their real mass ratio: sodium 23, lithium 6.9, so ~3.3x. The AREA carries
// the mass, so the radius goes as the cube root — drawing the diameter at 3.3x would overstate
// it by an order of magnitude, which is the kind of quiet lie this channel exists to avoid.
const IonPair: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 20], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rLi = 46;
  const rNa = rLi * Math.cbrt(23 / 6.9); // area is the mass; radius is its cube root
  return (
    <svg viewBox={`0 0 ${W} 300`} style={{ display: 'block', width: W, height: 300, overflow: 'visible' }}>
      <g opacity={g(0)}>
        <circle cx={310} cy={150} r={rLi} fill={T.teal} opacity={0.35} stroke={T.teal} strokeWidth={2.6} />
        <text x={310} y={160} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={30} fontWeight={700} fill={T.ink}>Li</text>
        <text x={310} y={262} textAnchor="middle" fontFamily={FONT_TH} fontSize={25} fill={T.inkSoft}>มวล 6.9</text>
      </g>
      <g opacity={g(14)}>
        <circle cx={760} cy={150} r={rNa} fill={T.red} opacity={0.32} stroke={T.red} strokeWidth={2.6} />
        <text x={760} y={160} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={34} fontWeight={700} fill={T.ink}>Na</text>
        <text x={760} y={262} textAnchor="middle" fontFamily={FONT_TH} fontSize={25} fill={T.inkSoft}>มวล 23</text>
      </g>
    </svg>
  );
};

// Cell voltage, drawn to scale: 3.6 against 2.5. Bars, not icons — the gap is the argument.
const VoltBars: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 26], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const unit = 190; // px per volt
  return (
    <svg viewBox={`0 0 ${W} 300`} style={{ display: 'block', width: W, height: 300, overflow: 'visible' }}>
      {[
        { y: 40, v: 3.6, c: T.teal, label: 'ลิเทียมไอออน', d: 0 },
        { y: 170, v: 2.5, c: T.red, label: 'โซเดียมไอออน', d: 12 },
      ].map((r) => (
        <g key={r.y}>
          <text x={MARGIN_L} y={r.y + 4} fontFamily={FONT_TH} fontSize={25} fontWeight={600} fill={T.ink}>{r.label}</text>
          <rect x={MARGIN_L} y={r.y + 22} width={r.v * unit * g(r.d)} height={50} fill={r.c} opacity={0.8} />
          <text x={MARGIN_L + 8 + r.v * unit} y={r.y + 58} fontFamily={FONT_TH_DISPLAY} fontSize={34} fontWeight={700} fill={T.ink} opacity={g(r.d)}>
            {r.v.toFixed(1)}V
          </text>
        </g>
      ))}
    </svg>
  );
};

// s05 was a card alone on an empty grid for 10.16s — the longest line in the video carrying the
// least picture. This is the argument drawn: the two penalties already shown, converging into one
// result. Deliberately NO new figure — both feeders are quantities the viewer has just watched
// established (2.5 vs 3.6 V in s04, mass 23 vs 6.9 in s03), and the product is left unnumbered
// because the honest number depends on the chemistry pairing and we do not have a source for it.
const MergeDiagram: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 22], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const feeder = (cx: number, top: string, big: string, d: number) => (
    <g opacity={g(d)}>
      <rect x={cx - 190} y={20} width={380} height={132} fill={T.paperDeep} stroke={T.red} strokeWidth={2} opacity={0.95} />
      <text x={cx} y={58} textAnchor="middle" fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>{top}</text>
      <text x={cx} y={112} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={38} fontWeight={700} fill={T.red}>{big}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} 400`} style={{ display: 'block', width: W, height: 400, overflow: 'visible' }}>
      {feeder(320, 'แรงดันต่อเซลล์', 'ต่ำกว่า', 0)}
      {feeder(760, 'มวลของไอออน', 'หนักกว่า', 10)}
      <g opacity={g(24)}>
        <path d="M 320 160 L 430 236" stroke={T.red} strokeWidth={2.6} fill="none" opacity={0.7} />
        <path d="M 760 160 L 650 236" stroke={T.red} strokeWidth={2.6} fill="none" opacity={0.7} />
        <rect x={230} y={248} width={620} height={120} fill={T.paperDeep} stroke={T.yellow} strokeWidth={2.6} />
        <text x={540} y={322} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={38} fontWeight={700} fill={T.yellow}>
          พลังงานต่อกิโลกรัมต่ำกว่า
        </text>
      </g>
    </svg>
  );
};

const TradeSlots: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 16], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const items = [
    { n: '1', t: 'วัตถุดิบ' },
    { n: '2', t: 'ห่วงโซ่อุปทาน' },
    { n: '3', t: 'อากาศเย็น' },
  ];
  return (
    <svg viewBox={`0 0 ${W} 180`} style={{ display: 'block', width: W, height: 180, overflow: 'visible' }}>
      {items.map((it, i) => (
        <g key={it.n} opacity={g(i * 8)} transform={`translate(${180 + i * 300} 0)`}>
          <circle cx={60} cy={60} r={42} fill={T.teal} opacity={0.18} stroke={T.teal} strokeWidth={2.4} />
          <text x={60} y={74} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={38} fontWeight={700} fill={T.teal}>{it.n}</text>
          <text x={60} y={148} textAnchor="middle" fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft}>{it.t}</text>
        </g>
      ))}
    </svg>
  );
};

// s11's number, drawn. The ghost bar is the room-temperature capacity the claim is measured
// against; the filled bar is what is left at -40C. Both ends of a percentage have to be visible
// or the percentage is decoration.
const RetentionBar: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = interpolate(frame, [at, at + 30], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const full = 700;
  return (
    <svg viewBox={`0 0 ${W} 220`} style={{ display: 'block', width: W, height: 220, overflow: 'visible' }}>
      <text x={MARGIN_L} y={30} fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft}>ความจุที่อุณหภูมิห้อง = 100%</text>
      <rect x={MARGIN_L} y={52} width={full} height={62} fill={T.inkSoft} opacity={0.16} stroke={T.inkSoft} strokeWidth={1.6} strokeDasharray="6 7" />
      <rect x={MARGIN_L} y={52} width={full * 0.9 * g} height={62} fill={T.teal} opacity={0.85} />
      <text x={MARGIN_L + 20} y={95} fontFamily={FONT_TH_DISPLAY} fontSize={36} fontWeight={700} fill={T.paper} opacity={g}>90%</text>
      <text x={MARGIN_L} y={162} fontFamily={FONT_TH} fontSize={25} fontWeight={600} fill={T.teal} opacity={g}>ที่ −40°C</text>
    </svg>
  );
};

// "Level 4 of 9" is a technology-readiness scale, and a scale is a picture. Nine blocks with four
// lit says the same thing as the sentence and says how far is left, which the sentence does not.
const ReadinessLadder: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 14], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const gap = 12;
  const bw = (780 - gap * 8) / 9;
  return (
    <svg viewBox={`0 0 ${W} 200`} style={{ display: 'block', width: W, height: 200, overflow: 'visible' }}>
      {Array.from({ length: 9 }, (_, i) => {
        const lit = i < 4;
        return (
          <g key={i} opacity={g(i * 4)}>
            <rect x={MARGIN_L + i * (bw + gap)} y={40} width={bw} height={68}
              fill={lit ? T.red : T.inkSoft} opacity={lit ? 0.75 : 0.14}
              stroke={lit ? T.red : T.inkSoft} strokeWidth={1.8} />
            <text x={MARGIN_L + i * (bw + gap) + bw / 2} y={140} textAnchor="middle"
              fontFamily={FONT_TH_DISPLAY} fontSize={24} fontWeight={700}
              fill={lit ? T.red : T.inkSoft} opacity={lit ? 1 : 0.5}>{i + 1}</text>
          </g>
        );
      })}
      <text x={MARGIN_L} y={190} fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft} opacity={g(40)}>
        ระดับความพร้อมของเทคโนโลยี · ผลิตจำนวนมากจริงคือปลายสเกล
      </text>
    </svg>
  );
};

// The inversion, and the only picture that can carry it: the bare sodium ion is bigger, but the
// thing that actually migrates is the ion plus its solvent shell — and sodium holds that shell
// more loosely, so the moving object ends up smaller.
const ShellDiagram: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 24], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pair = (cx: number, rCore: number, rShell: number, core: string, label: string, c: string, d: number) => (
    <g opacity={g(d)}>
      <circle cx={cx} cy={190} r={rShell} fill={c} opacity={0.14} stroke={c} strokeWidth={2} strokeDasharray="7 8" />
      <circle cx={cx} cy={190} r={rCore} fill={c} opacity={0.55} stroke={c} strokeWidth={2.4} />
      <text x={cx} y={200} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={30} fontWeight={700} fill={T.paper}>{core}</text>
      <text x={cx} y={330} textAnchor="middle" fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft}>{label}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} 380`} style={{ display: 'block', width: W, height: 380, overflow: 'visible' }}>
      {pair(300, 34, 118, 'Li', 'แกนเล็ก · เปลือกใหญ่', T.teal, 0)}
      {pair(780, 46, 88, 'Na', 'แกนใหญ่ · เปลือกเล็ก', T.red, 14)}
      <text x={540} y={372} textAnchor="middle" fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft} opacity={g(28)}>
        เส้นประ = ตัวทำละลายที่ห่อไอออนไว้ · สิ่งที่เคลื่อนที่จริงคือทั้งก้อน
      </text>
    </svg>
  );
};

const SceneFade: React.FC<{ out: number; dur?: number; children: React.ReactNode }> = ({ out, dur = 18, children }) => {
  const frame = useCurrentFrame();
  return <div style={{ opacity: interpolate(frame, [out - dur, out], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>{children}</div>;
};

const Hook: React.FC<{ titleAt: number; saltAt: number; cellAt: number }> = ({ titleAt, saltAt, cellAt }) => (
  <>
    <SerifStatement x={540} y={560} w={980} at={titleAt} size={70} words={TITLE_WORDS} />
    <Cutout src={A6('salt.png')} x={430} y={1080} w={620} at={saltAt} enter="place" rotate={-1.5} depth={0.09} sticker={0} shadow={3} />
    <Cutout src={A5('cell.png')} x={820} y={1370} w={220} at={cellAt} enter="place" rotate={4} depth={0.13} sticker={0} shadow={2} />
    <SketchArrow id="salt-to-cell" d={`M 560 1200 Q 700 1290 780 1310`} vb={{ w: W, h: H }} at={cellAt + 10} dur={18} head color={BLUEPRINT.yellow} width={3.4} />
    <LabelChip x={MARGIN_L} y={1600} at={cellAt + 6} anchor="left" text="แบตเตอรี่โซเดียมไอออน" kicker="เกลือ → เซลล์" accent={BLUEPRINT.teal} size={34} rotate={-1.1} z={6} />
  </>
);

const Vox6SodiumIon: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: BLUEPRINT.paper }}>
    <CollageBoard cam={CAM} fontBody={FONT_TH} fontDisplay={FONT_TH_DISPLAY} tracking="0.6px" theme="blueprint">
      <PaperBG w={W} h={H} />
      <Grid />

      {/* ---- s01 HOOK ---- */}
      <Sequence from={0} durationInFrames={252} layout="none">
        <SceneFade out={230}>
          <Hook titleAt={CUE.hookTitle} saltAt={CUE.hookSalt} cellAt={CUE.hookCell} />
        </SceneFade>
      </Sequence>

      {/* ---- s02 the same machine, a different passenger ---- */}
      <Sequence from={CUE.same} durationInFrames={230} layout="none">
        <SceneFade out={226}>
          <Panel at={0} y={700} kicker="โครงสร้างเดียวกัน" head="เปลี่ยนแค่ไอออนที่วิ่งไปมา" headSize={42} />
          <Layer x={540} y={1240} w={W} at={CUE.sameDiagram - CUE.same} dur={1} enter="none" depth={0.05} drift={0.3}>
            <CellDiagram at={0} ion="Na⁺" color={BLUEPRINT.red} />
          </Layer>
        </SceneFade>
      </Sequence>

      {/* ---- s03 the ion is heavier ---- */}
      <Sequence from={CUE.heavy} durationInFrames={166} layout="none">
        <SceneFade out={162}>
          <Panel at={0} y={720} kicker="ข้อเสียข้อแรก" head="ไอออนหนักกว่าราว 3 เท่า" headSize={44} accent={BLUEPRINT.red} />
          <Layer x={540} y={1280} w={W} at={CUE.heavyBalls - CUE.heavy} dur={1} enter="none" depth={0.06} drift={0.3}>
            <IonPair at={0} />
          </Layer>
        </SceneFade>
      </Sequence>

      {/* ---- s04 and the cell voltage is lower ---- */}
      <Sequence from={CUE.volt} durationInFrames={198} layout="none">
        <SceneFade out={194}>
          <Panel at={0} y={720} kicker="ข้อเสียข้อที่สอง" head="แรงดันต่อเซลล์ก็ต่ำกว่า" headSize={44} accent={BLUEPRINT.red} />
          <Layer x={540} y={1290} w={W} at={CUE.voltBars - CUE.volt} dur={1} enter="none" depth={0.06} drift={0.3}>
            <VoltBars at={0} />
          </Layer>
        </SceneFade>
      </Sequence>

      {/* ---- s05 both terms lose at once ---- */}
      <Sequence from={CUE.why} durationInFrames={312} layout="none">
        <SceneFade out={308}>
          <Panel at={0} y={700} kicker="ทำไมพลังงานต่อกิโลกรัมจึงต่ำกว่า" head="พลังงาน = แรงดัน × ความจุ" headSize={46}
            sub="เสียเปรียบทั้งสองพจน์พร้อมกัน ผลจึงคูณกัน" accent={BLUEPRINT.yellow} />
          <Layer x={540} y={1230} w={W} at={CUE.whyMerge - CUE.why} dur={1} enter="none" depth={0.05} drift={0.3}>
            <MergeDiagram at={0} />
          </Layer>
          <Sequence from={CUE.whyVerdict - CUE.why} layout="none">
            <SerifStatement x={540} y={1610} w={940} at={0} size={44} backing
              words={[{ t: 'นี่คือฟิสิกส์' }, { t: 'ไม่ใช่ทำได้ไม่ดี', hl: true }]} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- s06 so why bother — three trades ---- */}
      <Sequence from={CUE.trade} durationInFrames={168} layout="none">
        <SceneFade out={164}>
          <SerifStatement x={540} y={660} w={960} at={0} size={58} words={[{ t: 'แลกมา' }, { t: 'สามอย่าง', hl: true }]} />
          {/* Three empty slots that s07-s09 then fill. A promise the viewer can count down. */}
          <Layer x={540} y={940} w={W} at={16} dur={1} enter="none" depth={0.04} drift={0.3}>
            <TradeSlots at={0} />
          </Layer>
          <Cutout src={A5('car.png')} x={540} y={1330} w={620} at={26} enter="slide-l" rotate={-1} depth={0.08} sticker={0} shadow={3} />
        </SceneFade>
      </Sequence>

      {/* ---- s07 trade 1: salt is everywhere ---- */}
      <Sequence from={CUE.t1} durationInFrames={206} layout="none">
        <SceneFade out={202}>
          <Panel at={0} y={640} kicker="ข้อแลกที่ 1" head="โซเดียมมาจากเกลือ มีทุกที่บนโลก" headSize={38} />
          <Cutout src={A6('salt.png')} x={330} y={1120} w={460} at={14} enter="place" rotate={-2} depth={0.1} sticker={0} shadow={3} />
          <Sequence from={CUE.t1Brine - CUE.t1} layout="none">
            <Cutout src={A6('brine.png')} x={790} y={1420} w={420} at={0} enter="slide-r" rotate={2} depth={0.08} sticker={0} shadow={3} />
            <LabelChip x={MARGIN_L} y={1700} at={14} anchor="left" text="บ่อระเหยน้ำเกลือลิเทียม ใช้เวลาเป็นปี" kicker="เทียบกับฝั่งลิเทียม" accent={BLUEPRINT.red} size={26} rotate={-0.8} z={6} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- s08 trade 2: no lithium, cobalt, nickel ---- */}
      <Sequence from={CUE.t2} durationInFrames={230} layout="none">
        <SceneFade out={226}>
          <Panel at={0} y={700} kicker="ข้อแลกที่ 2" head="ไม่ต้องใช้ลิเทียม โคบอลต์ นิกเกิล" headSize={38} />
          <Sequence from={CUE.t2Strike - CUE.t2} layout="none">
            <LabelChip x={MARGIN_L} y={1120} at={0} anchor="left" text="Lithium" kicker="ไม่ต้องใช้" accent={BLUEPRINT.red} size={32} rotate={-1.4} z={6} />
            <LabelChip x={MARGIN_L} y={1300} at={10} anchor="left" text="Cobalt" kicker="ไม่ต้องใช้" accent={BLUEPRINT.red} size={32} rotate={1.1} z={6} />
            <LabelChip x={MARGIN_L} y={1480} at={20} anchor="left" text="Nickel" kicker="ไม่ต้องใช้" accent={BLUEPRINT.red} size={32} rotate={-0.9} z={6} />
            <Cutout src={A5('foil.png')} x={760} y={1300} w={380} at={26} enter="slide-r" rotate={2} depth={0.09} sticker={0} shadow={3} />
            <RubberStamp text="ห่วงโซ่สั้นลง" x={760} y={1660} at={34} size={40} rotate={-8} z={7} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- s09 trade 3: THE INVERSION ---- */}
      <Sequence from={CUE.t3} durationInFrames={220} layout="none">
        <SceneFade out={216}>
          <SerifStatement x={540} y={780} w={980} at={0} size={54} backing
            words={[{ t: 'ไอออนที่ใหญ่กว่า' }, { t: 'เคลื่อนที่ดีกว่าในความเย็น', hl: true }]} />
          <Sequence from={CUE.t3Frost - CUE.t3} layout="none">
            <Cutout src={A6('frost.png')} x={540} y={1350} w={620} at={0} enter="place" rotate={1.5} depth={0.09} sticker={0} shadow={3} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- s10 the solvation shell explains it ---- */}
      <Sequence from={CUE.shell} durationInFrames={312} layout="none">
        <SceneFade out={308}>
          <Panel at={0} y={660} kicker="เพราะสิ่งที่เคลื่อนที่ ไม่ใช่ไอออนเปล่า" head="ไอออนพาเปลือกตัวทำละลายไปด้วย" headSize={38} accent={BLUEPRINT.yellow} />
          <Layer x={540} y={1300} w={W} at={CUE.shellDiagram - CUE.shell} dur={1} enter="none" depth={0.06} drift={0.3}>
            <ShellDiagram at={0} />
          </Layer>
          <LabelChip x={MARGIN_L} y={1720} at={CUE.shellDiagram - CUE.shell + 60} anchor="left" text="เปลือกยึดหลวมกว่า = ก้อนที่เคลื่อนเล็กกว่า" kicker="ฝั่งโซเดียม" accent={BLUEPRINT.teal} size={26} rotate={-0.8} z={6} />
        </SceneFade>
      </Sequence>

      {/* ---- s11 the number ---- */}
      <Sequence from={CUE.cold} durationInFrames={156} layout="none">
        <SceneFade out={152}>
          <Panel at={0} y={720} kicker="ตัวเลขที่ CATL ประกาศเอง" head="เหลือความจุราว 90% ที่ −40°C" headSize={44} accent={BLUEPRINT.teal} />
          <Layer x={540} y={1160} w={W} at={CUE.coldBar - CUE.cold} dur={1} enter="none" depth={0.05} drift={0.3}>
            <RetentionBar at={0} />
          </Layer>
          <Sequence from={CUE.coldFrost - CUE.cold} layout="none">
            <Cutout src={A6('frost.png')} x={740} y={1520} w={400} at={0} enter="place" rotate={-2} depth={0.1} sticker={0} shadow={2} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- s12 not a lab curiosity any more ---- */}
      <Sequence from={CUE.real} durationInFrames={366} layout="none">
        <SceneFade out={362}>
          <Panel at={0} y={640} kicker="ไม่ใช่ของในห้องแล็บแล้ว" head="Naxtra ของ CATL ~175 Wh/kg" headSize={40} />
          <Cutout src={A5('cell.png')} x={300} y={1100} w={240} at={16} enter="place" rotate={-3} depth={0.11} sticker={0} shadow={3} />
          <Cutout src={A5('robot.png')} x={760} y={1080} w={480} at={26} enter="slide-r" rotate={2} depth={0.08} sticker={0} shadow={3} />
          <Sequence from={CUE.realCar - CUE.real} layout="none">
            <Cutout src={A5('car.png')} x={540} y={1480} w={620} at={0} enter="slide-l" rotate={-1} depth={0.09} sticker={0} shadow={3} />
          </Sequence>
          <Sequence from={CUE.realChip - CUE.real} layout="none">
            <LabelChip x={MARGIN_L} y={1720} at={0} anchor="left" text="มีรถนั่งผลิตขายจริงใช้แพ็กนี้แล้ว" kicker="ใกล้ LFP เข้าไปทุกที" accent={BLUEPRINT.teal} size={30} rotate={-1} z={6} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- s13 TWIST: the louder story has not arrived ---- */}
      <Sequence from={CUE.twist} durationInFrames={330} layout="none">
        <SceneFade out={326}>
          <Panel at={0} y={700} kicker="ส่วน solid-state ที่ดังกว่ามาก" head="ประธาน CATL เอง: ระดับ 4 จาก 9" headSize={40} accent={BLUEPRINT.red} />
          <Layer x={540} y={1180} w={W} at={CUE.twistLadder - CUE.twist} dur={1} enter="none" depth={0.05} drift={0.3}>
            <ReadinessLadder at={0} />
          </Layer>
          <Sequence from={CUE.twistCard - CUE.twist} layout="none">
            <SerifStatement x={540} y={1560} w={960} at={0} size={46} backing
              words={[{ t: 'เทคโนโลยีที่มาถึงจริง' }, { t: 'ไม่ใช่ตัวที่ดังที่สุด', hl: true }]} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- LOOP ---- */}
      <Sequence from={CUE.titleBack} layout="none">
        <Hook titleAt={4} saltAt={12} cellAt={26} />
      </Sequence>
    </CollageBoard>
    <Grain opacity={0.04} />
  </AbsoluteFill>
);

export default Vox6SodiumIon;
