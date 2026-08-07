import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import {
  CollageBoard,
  Cutout,
  EASE_INOUT,
  EASE_OUT,
  Grain,
  LabelChip,
  Layer,
  PaperBG,
  SerifStatement,
  VOX,
  useTheme,
} from '../../lib/collage';
import { FONT_TH, FONT_TH_DISPLAY } from '../../fonts';

// =============================================================================
// "ปุ๋ยที่หว่านลงนา หายไปไหน" — vox-8, เกษตรที่คนไทยควรรู้
// Facts, sources and the deliberate omissions: vox-shorts/vox-8-urea-deep/script.md
//
// 9:24, 61 lines, 20 scenes, 14 photographic layers. The longest video in the project by a
// factor of five, and the first of the fertiliser series.
//
// SPINE: the secret is not a formula. Nitrogen recovery goes 38% -> 85% on one change — the
// fertiliser moves from the water surface to 7-10cm down. Everything between is the mechanism
// for why the surface is the worst possible place to put it.
//
// SERIES RULES (vox-shorts/IDEAS-agri.md):
//   1. "สูตรลับ" means a TECHNIQUE, never a RATE. No kg/rai appears anywhere in this video —
//      a wrong rate costs a farmer a season and the right one needs a soil test.
//   2. It carries a SUMMARY beat (problem / fix / what to do), which the agri channel's rules
//      call optional. That exemption was written for vox-2, a history documentary. This is
//      something a viewer takes to their own field.
//
// SoilLayers is the load-bearing diagram and appears in four scenes with different annotation.
// It is drawn once and parameterised, because the whole argument is "where in this cross
// section does the fertiliser sit" — redrawing it per scene would let the layers drift.
//
// CUES ARE THE MEASURED VOICE. Generated before this file existed; no retime pass ran.
// =============================================================================
export const compositionConfig = {
  id: 'Vox8UreaDeep',
  durationInSeconds: 570,
  fps: 30,
  width: 1080,
  height: 1920,
};

const W = 1080;
const H = 1920;
const MARGIN_L = 140;
const A8 = (f: string) => staticFile(`projects/vox-8-urea-deep/layers/${f}`);

// Measured line starts, in frames. Names match beats.json segments.
const C = {
  hook: 15, ans38: 333, measured: 579,
  cost: 838, scale: 1089,
  bd: 1360, onething: 1506, place: 1751, jump: 1911,
  why: 2129, dflt: 2358, tradeoff: 2759,
  urea: 3047, three: 3342,
  w1: 3588, algae: 3805, ph: 4102, nh3: 4377, n1num: 4641, shade: 4968,
  w2: 5266, layers: 5405, boundary: 5650, nitrif: 5983, denitrif: 6253, n2num: 6568,
  w3: 6796, common: 7003,
  more: 7306, trap: 7434,
  where: 7829, n2o: 7975, nh3air: 8305, euchina: 8655, notthai: 9001,
  flip: 9294, briq: 9552, howto: 9757, geom: 10008,
  close2: 10279, close1: 10602, close3: 10890, onemove: 11181, season: 11521,
  field: 11757, both: 11986, scaleup: 12178,
  price: 12569, labour: 12751, econ: 13019, econ2: 13350, supply: 13614,
  barrier: 13878, thairesearch: 14267,
  thaiwarn: 14734, thaidiff: 14973,
  principle: 15334, principle2: 15610,
  sum: 15870, todo: 16240, close: 16758,
  titleBack: 16850,
} as const;

// A long film needs the camera to breathe, not to wander. It drifts within 1.00-1.14 and sits
// dead still at z=1 for the summary and the checklist — those are the frames people screenshot.
const CAM = [
  { f: 0, x: 540, y: 960, z: 1 },
  { f: 300, x: 540, y: 965, z: 1.05 },
  { f: 1340, x: 542, y: 970, z: 1.08 },
  { f: 1400, x: 540, y: 960, z: 1.03 },
  { f: 2100, x: 542, y: 968, z: 1.06 },
  { f: 2200, x: 540, y: 975, z: 1.1 },
  { f: 3020, x: 542, y: 978, z: 1.12 },
  { f: 3100, x: 540, y: 965, z: 1.04 },
  { f: 3560, x: 542, y: 968, z: 1.07 },
  { f: 3640, x: 540, y: 975, z: 1.1 },
  { f: 5240, x: 542, y: 980, z: 1.13 },
  { f: 5320, x: 540, y: 965, z: 1.05 },
  { f: 6770, x: 542, y: 972, z: 1.09 },
  { f: 6850, x: 540, y: 968, z: 1.06 },
  { f: 7290, x: 542, y: 972, z: 1.09 },
  { f: 7360, x: 540, y: 962, z: 1.03 },
  { f: 7960, x: 542, y: 966, z: 1.06 },
  { f: 8040, x: 540, y: 972, z: 1.09 },
  { f: 9270, x: 542, y: 976, z: 1.12 },
  { f: 9350, x: 540, y: 968, z: 1.05 },
  { f: 10250, x: 542, y: 972, z: 1.08 },
  { f: 10340, x: 540, y: 975, z: 1.11 },
  { f: 11730, x: 542, y: 978, z: 1.14 },
  { f: 11810, x: 540, y: 965, z: 1.04 },
  { f: 12540, x: 542, y: 970, z: 1.07 },
  { f: 12620, x: 540, y: 968, z: 1.05 },
  { f: 13850, x: 542, y: 972, z: 1.08 },
  { f: 13930, x: 540, y: 965, z: 1.04 },
  { f: 14710, x: 542, y: 968, z: 1.07 },
  { f: 14790, x: 540, y: 972, z: 1.09 },
  { f: 15310, x: 542, y: 975, z: 1.11 },
  { f: 15390, x: 540, y: 962, z: 1.03 },
  { f: 15840, x: 540, y: 960, z: 1 },
  // still for the summary and the checklist — a slow push blurs a screenshot
  { f: 16740, x: 540, y: 960, z: 1 },
  { f: 16800, x: 540, y: 960, z: 1.03 },
  { f: 16900, x: 540, y: 960, z: 1 },
  { f: 17100, x: 540, y: 960, z: 1 },
];

const TITLE = [{ t: 'ปุ๋ยที่หว่านลงนา' }, { t: 'หายไปไหน', hl: true }];

// =============================================================================
const Panel: React.FC<{
  at: number; y: number; kicker: string; head: string; sub?: string;
  headSize?: number; accent?: string; w?: number;
}> = ({ at, y, kicker, head, sub, headSize = 42, accent, w = 820 }) => {
  const T = useTheme();
  return (
    <Layer x={540} y={y} w={w} at={at} dur={14} enter="place" rotate={-0.4} depth={0.03} drift={0.4}>
      <div style={{ background: T.cream, padding: '28px 36px 32px', borderLeft: `8px solid ${accent ?? T.teal}`, boxShadow: '0 12px 26px rgba(40,28,12,0.20)' }}>
        <div style={{ fontFamily: FONT_TH, fontSize: 21, fontWeight: 600, color: accent ?? T.teal, marginBottom: 8 }}>{kicker}</div>
        <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: headSize, fontWeight: 700, color: T.ink, lineHeight: 1.32 }}>{head}</div>
        {sub ? <div style={{ fontFamily: FONT_TH, fontSize: 23, color: T.inkSoft, lineHeight: 1.45, marginTop: 10 }}>{sub}</div> : null}
      </div>
    </Layer>
  );
};

const Scene: React.FC<{ from: number; dur: number; fade?: number; children: React.ReactNode }> =
  ({ from, dur, fade = 16, children }) => (
    <Sequence from={from} durationInFrames={dur} layout="none">
      <FadeOut at={dur - 4} dur={fade}>{children}</FadeOut>
    </Sequence>
  );

const FadeOut: React.FC<{ at: number; dur: number; children: React.ReactNode }> = ({ at, dur, children }) => {
  const frame = useCurrentFrame();
  return <div style={{ opacity: interpolate(frame, [at - dur, at], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>{children}</div>;
};

// --- the number that opens the film: 38 in, 62 gone -------------------------
const LossSplit: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 26], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const total = 800;
  return (
    <svg viewBox={`0 0 ${W} 320`} style={{ display: 'block', width: W, height: 320, overflow: 'visible' }}>
      <text x={MARGIN_L} y={26} fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft}>ปุ๋ยไนโตรเจน 100 ส่วนที่หว่านลงไป</text>
      <rect x={MARGIN_L} y={50} width={total} height={72} fill={T.inkSoft} opacity={0.16} stroke={T.inkSoft} strokeWidth={1.4} strokeDasharray="6 7" />
      <rect x={MARGIN_L} y={50} width={total * 0.38 * g(0)} height={72} fill={T.teal} opacity={0.85} />
      <rect x={MARGIN_L + total * 0.38} y={50} width={total * 0.62 * g(20)} height={72} fill={T.red} opacity={0.8} />
      <text x={MARGIN_L + 18} y={100} fontFamily={FONT_TH_DISPLAY} fontSize={38} fontWeight={700} fill={T.cream} opacity={g(0)}>38</text>
      <text x={MARGIN_L + total * 0.38 + 18} y={100} fontFamily={FONT_TH_DISPLAY} fontSize={38} fontWeight={700} fill={T.cream} opacity={g(20)}>62</text>
      <g opacity={g(30)}>
        <rect x={MARGIN_L} y={150} width={18} height={18} fill={T.teal} opacity={0.85} />
        <text x={MARGIN_L + 28} y={165} fontFamily={FONT_TH} fontSize={23} fill={T.ink}>ต้นข้าวได้กิน</text>
        <rect x={MARGIN_L + 260} y={150} width={18} height={18} fill={T.red} opacity={0.8} />
        <text x={MARGIN_L + 288} y={165} fontFamily={FONT_TH} fontSize={23} fontWeight={700} fill={T.red}>หายไป</text>
      </g>
      <text x={MARGIN_L} y={228} fontFamily={FONT_TH} fontSize={21} fill={T.inkSoft} opacity={g(40)}>
        ประสิทธิภาพการดูดใช้ไนโตรเจนจากยูเรียที่หว่าน · วัดในแปลงจริง
      </text>
    </svg>
  );
};

// --- the cross section the whole argument lives in --------------------------
// oxidised film on top of reduced mud. `pellet` places the fertiliser: 'surface' for
// broadcasting, 'deep' for placement, 'none' to show the soil alone.
const SoilLayers: React.FC<{
  at: number; pellet?: 'surface' | 'deep' | 'none'; labels?: boolean; depthMark?: boolean;
}> = ({ at, pellet = 'none', labels = true, depthMark = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 22], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x0 = MARGIN_L, wBox = 760;
  const yWater = 20, hWater = 90;      // floodwater
  const yOx = yWater + hWater, hOx = 22; // thin oxidised film
  const yRed = yOx + hOx, hRed = 250;   // reduced mud
  return (
    <svg viewBox={`0 0 ${W} 440`} style={{ display: 'block', width: W, height: 440, overflow: 'visible' }}>
      <g opacity={g(0)}>
        <rect x={x0} y={yWater} width={wBox} height={hWater} fill="#7fa7bd" opacity={0.5} />
        <rect x={x0} y={yOx} width={wBox} height={hOx} fill="#b98b52" opacity={0.85} />
        <rect x={x0} y={yRed} width={wBox} height={hRed} fill="#3f4d5c" opacity={0.9} />
        <rect x={x0} y={yWater} width={wBox} height={hWater + hOx + hRed} fill="none" stroke={T.ink} strokeWidth={1.6} opacity={0.5} />
      </g>
      {labels ? (
        <g opacity={g(14)}>
          <text x={x0 + wBox + 16} y={yWater + 52} fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft}>น้ำในนา</text>
          <text x={x0 + wBox + 16} y={yOx + 18} fontFamily={FONT_TH} fontSize={22} fontWeight={700} fill="#8a5f2c">มีออกซิเจน</text>
          <text x={x0 + wBox + 16} y={yRed + 40} fontFamily={FONT_TH} fontSize={23} fontWeight={700} fill={T.ink}>ไม่มีออกซิเจน</text>
        </g>
      ) : null}
      {pellet === 'surface' ? (
        <g opacity={g(26)}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <circle key={i} cx={x0 + 70 + i * 105} cy={yWater + 26} r={9} fill={T.cream} stroke={T.ink} strokeWidth={1.6} />
          ))}
          <text x={x0} y={yWater - 8} fontFamily={FONT_TH} fontSize={22} fontWeight={700} fill={T.red}>หว่านบนผิวน้ำ</text>
        </g>
      ) : null}
      {pellet === 'deep' ? (
        <g opacity={g(26)}>
          <rect x={x0 + wBox / 2 - 20} y={yRed + 66} width={40} height={54} rx={8} fill={T.cream} stroke={T.ink} strokeWidth={2} />
          <text x={x0} y={yWater - 10} fontFamily={FONT_TH} fontSize={24} fontWeight={700} fill={T.teal}>ฝังลงในโคลน</text>
          {depthMark ? (
            <g opacity={g(38)}>
              <line x1={x0 + wBox / 2 + 44} y1={yOx} x2={x0 + wBox / 2 + 44} y2={yRed + 93} stroke={T.teal} strokeWidth={2.4} />
              <line x1={x0 + wBox / 2 + 34} y1={yOx} x2={x0 + wBox / 2 + 54} y2={yOx} stroke={T.teal} strokeWidth={2.4} />
              <line x1={x0 + wBox / 2 + 34} y1={yRed + 93} x2={x0 + wBox / 2 + 54} y2={yRed + 93} stroke={T.teal} strokeWidth={2.4} />
              <rect x={x0 + wBox / 2 + 62} y={yRed + 8} width={196} height={52} fill={T.cream} stroke={T.teal} strokeWidth={2} />
              <text x={x0 + wBox / 2 + 82} y={yRed + 45} fontFamily={FONT_TH_DISPLAY} fontSize={34} fontWeight={700} fill={T.teal}>7–10 ซม.</text>
            </g>
          ) : null}
        </g>
      ) : null}
    </svg>
  );
};

// --- the three exits, drawn as three arrows leaving the same point ----------
const ThreeWays: React.FC<{ at: number; lit?: 0 | 1 | 2 | 3 }> = ({ at, lit = 0 }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rows = [
    { n: '1', t: 'ระเหยขึ้นฟ้า', s: 'เป็นก๊าซแอมโมเนีย' },
    { n: '2', t: 'จุลินทรีย์เปลี่ยนรูป', s: 'แล้วกลายเป็นก๊าซไนโตรเจน' },
    { n: '3', t: 'ไหลไปกับน้ำ', s: 'ทั้งน้ำล้นและน้ำที่ซึมลงลึก' },
  ];
  return (
    <svg viewBox={`0 0 ${W} 400`} style={{ display: 'block', width: W, height: 400, overflow: 'visible' }}>
      {rows.map((r, i) => {
        const on = lit === 0 || lit === i + 1;
        return (
          <g key={r.n} opacity={g(i * 12) * (on ? 1 : 0.28)}>
            <circle cx={MARGIN_L + 34} cy={40 + i * 120} r={30} fill={on ? T.red : T.inkSoft} opacity={on ? 0.85 : 0.3} />
            <text x={MARGIN_L + 34} y={52 + i * 120} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={32} fontWeight={700} fill={T.cream}>{r.n}</text>
            <text x={MARGIN_L + 88} y={34 + i * 120} fontFamily={FONT_TH_DISPLAY} fontSize={34} fontWeight={700} fill={T.ink}>{r.t}</text>
            <text x={MARGIN_L + 88} y={70 + i * 120} fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft}>{r.s}</text>
          </g>
        );
      })}
    </svg>
  );
};

// --- floodwater pH over one day: flat at night, up to 9.5-10 by afternoon ---
const PhClock: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [at, at + 60], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const g = (d: number) => interpolate(frame, [at + d, at + d + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x0 = MARGIN_L, wPlot = 740, y0 = 60, hPlot = 200;
  const ph = (h: number) => 7 + 2.9 * Math.max(0, Math.sin(((h - 6) / 12) * Math.PI)) ** 1.6;
  const pts: string[] = [];
  for (let h = 0; h <= 24; h += 0.5) {
    const x = x0 + (h / 24) * wPlot;
    const y = y0 + hPlot - ((ph(h) - 6.5) / 3.6) * hPlot;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const keep = Math.max(2, Math.round(pts.length * draw));
  return (
    <svg viewBox={`0 0 ${W} 340`} style={{ display: 'block', width: W, height: 340, overflow: 'visible' }}>
      <g opacity={g(0)}>
        {[7, 8, 9, 10].map((v) => {
          const y = y0 + hPlot - ((v - 6.5) / 3.6) * hPlot;
          return (
            <g key={v}>
              <line x1={x0} y1={y} x2={x0 + wPlot} y2={y} stroke={T.inkSoft} strokeWidth={1} opacity={0.28} strokeDasharray="4 7" />
              <text x={x0 - 12} y={y + 7} textAnchor="end" fontFamily={FONT_TH} fontSize={21} fill={T.inkSoft}>{v}</text>
            </g>
          );
        })}
        <text x={x0 - 12} y={y0 - 18} textAnchor="end" fontFamily={FONT_TH} fontSize={20} fontWeight={700} fill={T.inkSoft}>pH</text>
        <text x={x0} y={y0 + hPlot + 34} fontFamily={FONT_TH} fontSize={21} fill={T.inkSoft}>เที่ยงคืน</text>
        <text x={x0 + wPlot / 2} y={y0 + hPlot + 34} textAnchor="middle" fontFamily={FONT_TH} fontSize={21} fill={T.inkSoft}>เที่ยงวัน</text>
        <text x={x0 + wPlot} y={y0 + hPlot + 34} textAnchor="end" fontFamily={FONT_TH} fontSize={21} fill={T.inkSoft}>เที่ยงคืน</text>
      </g>
      <polyline points={pts.slice(0, keep).join(' ')} fill="none" stroke={T.red} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <g opacity={g(66)}>
        <text x={x0 + wPlot / 2 + 16} y={y0 + 4} fontFamily={FONT_TH_DISPLAY} fontSize={30} fontWeight={700} fill={T.red}>9.5–10</text>
        <text x={MARGIN_L} y={y0 + hPlot + 72} fontFamily={FONT_TH} fontSize={21} fill={T.inkSoft}>
          รูปทรงของเส้นเป็นภาพประกอบ ตัวเลขที่ยึดคือช่วงค่าสูงสุดตอนบ่ายที่วัดได้
        </text>
      </g>
    </svg>
  );
};

// --- a measured range, drawn as a range and not as a single number ----------
const RangeBar: React.FC<{ at: number; lo: number; hi: number; caption: string }> = ({ at, lo, hi, caption }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = interpolate(frame, [at, at + 30], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x0 = MARGIN_L, wPlot = 780;
  const px = (v: number) => x0 + (v / 100) * wPlot;
  return (
    <svg viewBox={`0 0 ${W} 220`} style={{ display: 'block', width: W, height: 220, overflow: 'visible' }}>
      <rect x={x0} y={54} width={wPlot} height={56} fill={T.inkSoft} opacity={0.14} />
      <rect x={px(lo)} y={54} width={(px(hi) - px(lo)) * g} height={56} fill={T.red} opacity={0.8} />
      <text x={px(lo)} y={42} fontFamily={FONT_TH_DISPLAY} fontSize={32} fontWeight={700} fill={T.red} opacity={g}>{lo}%</text>
      <text x={px(hi)} y={42} textAnchor="end" fontFamily={FONT_TH_DISPLAY} fontSize={32} fontWeight={700} fill={T.red} opacity={g}>{hi}%</text>
      <text x={x0} y={158} fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft} opacity={g}>{caption}</text>
      <text x={x0} y={192} fontFamily={FONT_TH} fontSize={20} fill={T.inkSoft} opacity={g}>0% ทางซ้าย · 100% ทางขวา — ช่วงกว้างเพราะขึ้นกับลม อุณหภูมิ และความเป็นด่าง</text>
    </svg>
  );
};

// --- ammonium is held, nitrate is not: the charge argument ------------------
const ChargeDiagram: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 22], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const row = (y: number, ion: string, sign: string, verdict: string, held: boolean, d: number) => (
    <g opacity={g(d)}>
      <rect x={MARGIN_L} y={y} width={760} height={104} fill={T.cream} stroke={held ? T.teal : T.red} strokeWidth={2} />
      <circle cx={MARGIN_L + 56} cy={y + 52} r={30} fill={held ? T.teal : T.red} opacity={0.8} />
      <text x={MARGIN_L + 56} y={y + 63} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={30} fontWeight={700} fill={T.cream}>{sign}</text>
      <text x={MARGIN_L + 106} y={y + 44} fontFamily={FONT_TH_DISPLAY} fontSize={30} fontWeight={700} fill={T.ink}>{ion}</text>
      <text x={MARGIN_L + 106} y={y + 80} fontFamily={FONT_TH} fontSize={23} fill={held ? T.teal : T.red}>{verdict}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} 300`} style={{ display: 'block', width: W, height: 300, overflow: 'visible' }}>
      <text x={MARGIN_L} y={22} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>อนุภาคดินมีประจุลบ</text>
      {row(40, 'แอมโมเนียม', '+', 'ดินยึดไว้ได้ อยู่กับที่', true, 0)}
      {row(164, 'ไนเตรต', '−', 'ดินยึดไม่อยู่ ไหลไปกับน้ำ', false, 14)}
    </svg>
  );
};

// --- the two results, side by side ------------------------------------------
const ResultBars: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 26], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rows = [
    { label: 'ใช้ปุ๋ยไนโตรเจนน้อยลง', lo: 33, hi: 35, c: T.teal, d: 0 },
    { label: 'ผลผลิตเพิ่มขึ้น', lo: 15, hi: 25, c: T.yellow, d: 16 },
  ];
  return (
    <svg viewBox={`0 0 ${W} 300`} style={{ display: 'block', width: W, height: 300, overflow: 'visible' }}>
      {rows.map((r, i) => {
        const y = 20 + i * 130;
        const wPer = 15;
        return (
          <g key={r.label} opacity={g(r.d)}>
            <text x={MARGIN_L} y={y + 22} fontFamily={FONT_TH} fontSize={25} fontWeight={600} fill={T.ink}>{r.label}</text>
            <rect x={MARGIN_L} y={y + 38} width={r.hi * wPer * g(r.d)} height={50} fill={r.c} opacity={0.55} />
            <rect x={MARGIN_L} y={y + 38} width={r.lo * wPer * g(r.d)} height={50} fill={r.c} opacity={0.9} />
            <text x={MARGIN_L + 16 + r.hi * wPer} y={y + 74} fontFamily={FONT_TH_DISPLAY} fontSize={34} fontWeight={700} fill={T.ink} opacity={g(r.d)}>
              {r.lo}–{r.hi}%
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// --- the summary: problem, fix ---------------------------------------------
const SummaryCard: React.FC<{ at: number; fixAt: number }> = ({ at, fixAt }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (t: number) => interpolate(frame, [t, t + 22], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const block = (y: number, tag: string, c: string, head: string, body: string, appear: number) => (
    <g opacity={g(appear)}>
      <rect x={MARGIN_L} y={y} width={800} height={196} fill={T.cream} stroke={c} strokeWidth={2} />
      <rect x={MARGIN_L} y={y} width={8} height={196} fill={c} />
      <text x={MARGIN_L + 30} y={y + 46} fontFamily={FONT_TH} fontSize={24} fontWeight={700} fill={c}>{tag}</text>
      <text x={MARGIN_L + 30} y={y + 100} fontFamily={FONT_TH_DISPLAY} fontSize={36} fontWeight={700} fill={T.ink}>{head}</text>
      <text x={MARGIN_L + 30} y={y + 152} fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft}>{body}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} 460`} style={{ display: 'block', width: W, height: 460, overflow: 'visible' }}>
      {block(0, 'ปัญหา', T.red, 'ปุ๋ยบนผิวน้ำ ต้นข้าวได้ไม่ถึงครึ่ง', 'ผิวน้ำมีทั้งแดด ลม ออกซิเจน และน้ำไหล', at)}
      {block(244, 'ทางแก้', T.teal, 'ย้ายปุ๋ยลงไปในดิน', 'ให้พ้นจากทั้งสี่อย่างนั้นพร้อมกัน', fixAt)}
    </svg>
  );
};

// --- what a Thai viewer can do this season, all of it from the mechanism ----
const TodoList: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 18], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const items = [
    'ใส่ปุ๋ยแล้วคราดกลบลงดิน ไม่ทิ้งไว้บนน้ำ',
    'แบ่งใส่หลายครั้ง แทนใส่หนักครั้งเดียว',
    'เลี่ยงใส่ตอนบ่าย ที่น้ำเป็นด่างที่สุด',
    'ตรวจดินก่อน จะได้รู้ว่าต้องใส่เท่าไหร่',
  ];
  return (
    <svg viewBox={`0 0 ${W} 520`} style={{ display: 'block', width: W, height: 520, overflow: 'visible' }}>
      <text x={MARGIN_L} y={36} fontFamily={FONT_TH_DISPLAY} fontSize={38} fontWeight={700} fill={T.ink}>ทำได้เลย โดยไม่ต้องมีก้อนปุ๋ย</text>
      {items.map((t, i) => {
        const y = 82 + i * 90;
        return (
          <g key={t} opacity={g(i * 34)}>
            <rect x={MARGIN_L} y={y} width={36} height={36} fill="none" stroke={T.teal} strokeWidth={2.6} />
            <path d={`M ${MARGIN_L + 9} ${y + 19} l 8 10 l 15 -19`} fill="none" stroke={T.teal} strokeWidth={4}
              strokeLinecap="round" strokeLinejoin="round" opacity={g(i * 34 + 8)} />
            <text x={MARGIN_L + 58} y={y + 30} fontFamily={FONT_TH} fontSize={29} fontWeight={600} fill={T.ink}>{t}</text>
          </g>
        );
      })}
      <text x={MARGIN_L} y={490} fontFamily={FONT_TH} fontSize={21} fill={T.inkSoft} opacity={g(150)}>
        ทั้งสี่ข้อมาจากกลไกเดียวกับที่อธิบายไปทั้งคลิป · คลิปนี้ไม่ได้ให้สูตรหรืออัตราปุ๋ย
      </text>
    </svg>
  );
};

const Photo: React.FC<{ src: string; x: number; y: number; w: number; h: number; at: number; rot?: number; pos?: string }> =
  ({ src, x, y, w, h, at, rot = 0.6, pos = '50% 50%' }) => (
    <Layer x={x} y={y} w={w} at={at} dur={18} enter="place" rotate={rot} depth={0.06} drift={0.4}>
      <Img src={src} style={{ width: '100%', height: h, objectFit: 'cover', objectPosition: pos, display: 'block', boxShadow: '0 14px 30px rgba(40,28,12,0.24)' }} />
    </Layer>
  );

const Hook: React.FC<{ t: number; s: number }> = ({ t, s }) => (
  <>
    <SerifStatement x={540} y={520} w={980} at={t} size={64} words={TITLE} />
    <Photo src={A8('sower.png')} x={540} y={1290} w={900} h={620} at={s} rot={-0.8} pos="50% 55%" />
  </>
);

const Vox8UreaDeep: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: VOX.paper }}>
    <CollageBoard cam={CAM} fontBody={FONT_TH} fontDisplay={FONT_TH_DISPLAY} tracking="0.6px">
      <PaperBG w={W} h={H} />

      {/* ===== ACT 1 — the problem ===== */}
      <Scene from={0} dur={820}>
        <SerifStatement x={540} y={520} w={980} at={C.hook - 60} size={64} words={TITLE} />
        <Sequence from={0} durationInFrames={C.ans38 - 18} layout="none">
          <Photo src={A8('sower.png')} x={540} y={1290} w={900} h={620} at={C.hook - 40} rot={-0.8} pos="50% 55%" />
        </Sequence>
        <Sequence from={C.ans38} layout="none">
          <Layer x={540} y={1290} w={W} at={0} dur={1} enter="none" depth={0.04}>
            <LossSplit at={30} />
          </Layer>
          <Panel at={0} y={620} kicker="ประสิทธิภาพการดูดใช้ไนโตรเจน" head="ต้นข้าวได้กินราว 38%" headSize={46} accent={VOX.red} />
        </Sequence>
        <Sequence from={C.measured} layout="none">
          <LabelChip x={MARGIN_L} y={1760} at={20} anchor="left" text="ติดตามไนโตรเจนที่ใส่ในแปลงจริง ไม่ใช่ห้องแล็บ" kicker="ที่มาของตัวเลข" accent={VOX.teal} size={26} rotate={-0.8} z={6} />
        </Sequence>
      </Scene>

      <Scene from={C.cost} dur={504}>
        <Panel at={0} y={560} kicker="บริบทไทย" head="ปุ๋ยคือราว 37% ของต้นทุนการทำนา" headSize={44} accent={VOX.red} />
        <Photo src={A8('urea.png')} x={540} y={1080} w={640} h={420} at={16} rot={-1.2} />
        <Sequence from={C.scale - C.cost} layout="none">
          <LabelChip x={MARGIN_L} y={1520} at={0} anchor="left" text="ไทยใช้ปุ๋ยเคมี 5–6 ล้านตันต่อปี" kicker="ข้าวใช้ไป 41% ของทั้งหมด" accent={VOX.teal} size={30} rotate={-1} z={6} />
          <LabelChip x={MARGIN_L} y={1700} at={40} anchor="left" text="และเกือบทั้งหมดคือของนำเข้า" kicker="เราแทบไม่ได้ผลิตเอง" accent={VOX.red} size={30} rotate={0.8} z={6} />
        </Sequence>
      </Scene>

      {/* ===== ACT 2 — Bangladesh, and the one change ===== */}
      <Scene from={C.bd} dur={751}>
        <Photo src={A8('paddy.png')} x={540} y={640} w={880} h={420} at={0} rot={0.8} pos="50% 60%" />
        <Sequence from={C.onething - C.bd} layout="none">
          <SerifStatement x={540} y={1080} w={960} at={0} size={48} backing
            words={[{ t: 'เขาเปลี่ยนแค่' }, { t: 'ที่วางปุ๋ย', hl: true }]} />
        </Sequence>
        <Sequence from={C.place - C.bd} layout="none">
          <Layer x={540} y={1500} w={W} at={0} dur={1} enter="none" depth={0.05}>
            <SoilLayers at={0} pellet="deep" depthMark labels={false} />
          </Layer>
        </Sequence>
      </Scene>

      <Scene from={C.jump} dur={200}>
        <SerifStatement x={540} y={860} w={980} at={0} size={58} words={[{ t: '38%' }, { t: '→ 85%', hl: true }]} />
        <LabelChip x={MARGIN_L} y={1120} at={30} anchor="left" text="ด้วยการย้ายที่วางอย่างเดียว" kicker="ประสิทธิภาพการดูดใช้ไนโตรเจน" accent={VOX.teal} size={32} rotate={-1} z={6} />
      </Scene>

      {/* ===== ACT 3 — broadcasting is fast, and that is the trade ===== */}
      <Scene from={C.why} dur={900}>
        <Panel at={0} y={520} kicker="ก่อนจะไปต่อ" head="ปุ๋ยที่หายไป หายไปทางไหน" headSize={46} />
        <Sequence from={C.dflt - C.why} layout="none">
          <Photo src={A8('sower.png')} x={540} y={1120} w={860} h={480} at={0} rot={-0.7} pos="50% 58%" />
          <LabelChip x={MARGIN_L} y={1500} at={40} anchor="left" text="การหว่านคือวิธีที่เร็วที่สุด" kicker="และความเร็วมีค่าจริงในฤดูที่ต้องแข่งกับน้ำ" accent={VOX.teal} size={30} rotate={-1} z={6} />
        </Sequence>
        <Sequence from={C.tradeoff - C.why} layout="none">
          <SerifStatement x={540} y={1720} w={960} at={0} size={40} backing
            words={[{ t: 'ประหยัดแรงวันนั้น' }, { t: 'จ่ายคืนทั้งฤดู', hl: true }]} />
        </Sequence>
      </Scene>

      {/* ===== ACT 4 — the mechanism: urea, then three ways out ===== */}
      <Scene from={C.urea} dur={523}>
        <Panel at={0} y={560} kicker="จนถึงตรงนี้ยังไม่มีอะไรผิด" head="ยูเรีย → แอมโมเนียม → รากดูดใช้ได้" headSize={40} />
        <Photo src={A8('roots.png')} x={540} y={1200} w={520} h={560} at={20} rot={1} />
        <Sequence from={C.three - C.urea} layout="none">
          <SerifStatement x={540} y={1700} w={960} at={0} size={44} backing
            words={[{ t: 'แต่มันมีทางออก' }, { t: 'สามทาง', hl: true }]} />
        </Sequence>
      </Scene>

      {/* --- way 1: algae, pH, ammonia --- */}
      <Scene from={C.w1} dur={1660}>
        <Layer x={540} y={640} w={W} at={0} dur={1} enter="none" depth={0.04}>
          <ThreeWays at={0} lit={1} />
        </Layer>
        <Sequence from={C.algae - C.w1} durationInFrames={C.ph - C.algae - 18} layout="none">
          <Photo src={A8('algae.png')} x={540} y={1180} w={860} h={440} at={0} rot={0.7} />
          <LabelChip x={MARGIN_L} y={1490} at={30} anchor="left" text="สาหร่ายสังเคราะห์แสง ดึง CO₂ ออกจากน้ำ" kicker="ต้นเหตุที่คาดไม่ถึง" accent={VOX.teal} size={28} rotate={-0.9} z={6} />
        </Sequence>
        <Sequence from={C.ph - C.w1} durationInFrames={C.n1num - C.ph - 18} layout="none">
          <Layer x={540} y={1250} w={W} at={0} dur={1} enter="none" depth={0.05}>
            <PhClock at={0} />
          </Layer>
        </Sequence>
        <Sequence from={C.nh3 - C.w1} layout="none">
          <LabelChip x={MARGIN_L} y={1660} at={0} anchor="left" text="ที่ค่าด่างสูง แอมโมเนียมกลายเป็นก๊าซแล้วลอยหาย" kicker="ผลที่ตามมา" accent={VOX.red} size={28} rotate={-0.8} z={6} />
        </Sequence>
        <Sequence from={C.n1num - C.w1} layout="none">
          <Layer x={540} y={1230} w={W} at={0} dur={1} enter="none" depth={0.05}>
            <RangeBar at={0} lo={10} hi={56} caption="สัดส่วนไนโตรเจนที่สูญเสียทางการระเหย จากการวัดในนาจริง" />
          </Layer>
        </Sequence>
        <Sequence from={C.shade - C.w1} layout="none">
          <Photo src={A8('sun.png')} x={780} y={1600} w={440} h={300} at={0} rot={1.4} />
          <LabelChip x={MARGIN_L} y={1560} at={20} anchor="left" text="ข้าวโตแล้วบังแดด สาหร่ายทำงานน้อยลง" kicker="ทำไมใส่ตอนต้นเล็กถึงได้ผลน้อย" accent={VOX.yellow} kickerColor={VOX.ink} size={26} rotate={-1} z={6} />
        </Sequence>
      </Scene>

      {/* --- way 2: the two worlds in the mud --- */}
      <Scene from={C.w2} dur={1512}>
        <Layer x={540} y={620} w={W} at={0} dur={1} enter="none" depth={0.04}>
          <ThreeWays at={0} lit={2} />
        </Layer>
        <Sequence from={C.layers - C.w2} durationInFrames={C.nitrif - C.layers - 18} layout="none">
          <Layer x={540} y={1240} w={W} at={0} dur={1} enter="none" depth={0.05}>
            <SoilLayers at={0} pellet="none" labels />
          </Layer>
        </Sequence>
        <Sequence from={C.boundary - C.w2} layout="none">
          <Photo src={A8('mudcore.png')} x={790} y={1580} w={400} h={400} at={0} rot={1.2} pos="50% 30%" />
          <LabelChip x={MARGIN_L} y={1700} at={20} anchor="left" text="เส้นแบ่งระหว่างโลกสองใบ" kicker="จุลินทรีย์คนละกลุ่ม ต้องการไนโตรเจนก้อนเดียวกัน" accent={VOX.red} size={28} rotate={-0.9} z={6} />
        </Sequence>
        <Sequence from={C.nitrif - C.w2} durationInFrames={C.n2num - C.nitrif - 18} layout="none">
          <Layer x={540} y={1300} w={W} at={0} dur={1} enter="none" depth={0.05}>
            <ChargeDiagram at={0} />
          </Layer>
        </Sequence>
        <Sequence from={C.n2num - C.w2} layout="none">
          <Layer x={540} y={1300} w={W} at={0} dur={1} enter="none" depth={0.05}>
            <RangeBar at={0} lo={33} hi={40} caption="สัดส่วนที่สูญเสียทางดีไนตริฟิเคชัน · ราว 33% และบางงานพบสูงกว่า 40%" />
          </Layer>
        </Sequence>
      </Scene>

      {/* --- way 3, then what all three share --- */}
      <Scene from={C.w3} dur={492}>
        <Layer x={540} y={620} w={W} at={0} dur={1} enter="none" depth={0.04}>
          <ThreeWays at={0} lit={3} />
        </Layer>
        <Photo src={A8('drain.png')} x={540} y={1240} w={840} h={420} at={20} rot={-0.8} />
        <Sequence from={C.common - C.w3} layout="none">
          <SerifStatement x={540} y={1660} w={980} at={0} size={40} backing
            words={[{ t: 'ทั้งสามทางเริ่มที่เดียวกัน' }, { t: 'ผิวน้ำ', hl: true }]} />
        </Sequence>
      </Scene>

      {/* --- the "just add more" trap --- */}
      <Scene from={C.more} dur={505}>
        <SerifStatement x={540} y={640} w={960} at={0} size={50} words={[{ t: 'แล้วถ้า' }, { t: 'ใส่เพิ่ม', hl: true }]} />
        <Sequence from={C.trap - C.more} layout="none">
          <Layer x={540} y={1120} w={W} at={0} dur={1} enter="none" depth={0.04}>
            <LossSplit at={0} />
          </Layer>
          <LabelChip x={MARGIN_L} y={1560} at={50} anchor="left" text="สัดส่วนที่หายไม่มีเพดาน ใส่เพิ่มสองเท่า ก็หายมากขึ้นตามส่วน" kicker="กับดัก" accent={VOX.red} size={27} rotate={-0.9} z={6} />
        </Sequence>
      </Scene>

      {/* --- where the lost nitrogen actually goes --- */}
      <Scene from={C.where} dur={1447}>
        <Panel at={0} y={540} kicker="ไนโตรเจนที่หายไป" head="ไม่ได้หายไปเฉย ๆ มันไปอยู่ที่อื่น" headSize={42} accent={VOX.red} />
        <Sequence from={C.n2o - C.where} durationInFrames={C.nh3air - C.n2o - 18} layout="none">
          <SerifStatement x={540} y={1080} w={960} at={0} size={44} backing
            words={[{ t: 'ไนตรัสออกไซด์' }, { t: 'แรงกว่า CO₂ 273 เท่า', hl: true }]} />
          <LabelChip x={MARGIN_L} y={1330} at={30} anchor="left" text="และอยู่ในบรรยากาศได้นานเฉลี่ย 116 ปี" kicker="IPCC AR6" accent={VOX.red} size={28} rotate={-0.8} z={6} />
        </Sequence>
        <Sequence from={C.nh3air - C.where} layout="none">
          <Panel at={0} y={1080} kicker="ส่วนแอมโมเนียที่ระเหยไป" head="ทำปฏิกิริยาในอากาศ กลายเป็นฝุ่น PM 2.5" headSize={38} accent={VOX.red} />
        </Sequence>
        <Sequence from={C.euchina - C.where} layout="none">
          <LabelChip x={MARGIN_L} y={1440} at={0} anchor="left" text="ยุโรป: ราวครึ่งหนึ่งของ PM 2.5 มาจากอนุภาคแบบนี้" kicker="งานศึกษาต่างประเทศ" accent={VOX.red} size={27} rotate={-1} z={6} />
          <LabelChip x={MARGIN_L} y={1600} at={40} anchor="left" text="จีน: ปุ๋ยเคมี = 42% ของแอมโมเนียที่ปล่อยทั้งประเทศ" kicker="งานศึกษาต่างประเทศ" accent={VOX.red} size={27} rotate={0.7} z={6} />
        </Sequence>
        <Sequence from={C.notthai - C.where} layout="none">
          <LabelChip x={MARGIN_L} y={1780} at={0} anchor="left" text="ทั้งสองตัวเลขไม่ใช่ของไทย คลิปนี้ไม่มีตัวเลขไทย" kicker="ต้องพูดให้ชัด" accent={VOX.teal} size={27} rotate={-0.6} z={6} />
        </Sequence>
      </Scene>

      {/* ===== ACT 5 — the technique ===== */}
      <Scene from={C.flip} dur={967}>
        <Panel at={0} y={540} kicker="IFDC ร่วมกับ IRRI" head="ถ้าปัญหาคือที่วาง ก็ย้ายที่วาง" headSize={44} accent={VOX.teal} />
        <Sequence from={C.briq - C.flip} layout="none">
          <Photo src={A8('briquette.png')} x={540} y={1080} w={640} h={430} at={0} rot={-1} />
          <LabelChip x={MARGIN_L} y={1400} at={30} anchor="left" text="อัดยูเรียเป็นก้อน หนัก 1–3 กรัม" kicker="แข็งพอที่จะไม่ละลายหมดทันที" accent={VOX.teal} size={30} rotate={-1} z={6} />
        </Sequence>
        <Sequence from={C.howto - C.flip} layout="none">
          <Photo src={A8('hand.png')} x={790} y={1620} w={460} h={400} at={0} rot={1.4} />
          <LabelChip x={MARGIN_L} y={1560} at={0} anchor="left" text="กดลงโคลนลึก 7–10 ซม." kicker="หลังปักดำ" accent={VOX.teal} size={30} rotate={-0.9} z={6} />
        </Sequence>
        <Sequence from={C.geom - C.flip} layout="none">
          <LabelChip x={MARGIN_L} y={1740} at={0} anchor="left" text="หนึ่งก้อนต่อสี่กอ วางตรงกลางระหว่างสี่กอ" kicker="ไม่ใช่ฝังตรงไหนก็ได้" accent={VOX.yellow} kickerColor={VOX.ink} size={28} rotate={-0.7} z={6} />
        </Sequence>
      </Scene>

      {/* --- the three exits close, one by one --- */}
      <Scene from={C.close2} dur={1460}>
        <Layer x={540} y={1240} w={W} at={0} dur={1} enter="none" depth={0.05}>
          <SoilLayers at={0} pellet="deep" depthMark labels />
        </Layer>
        <Sequence from={0} durationInFrames={C.close1 - C.close2 - 12} layout="none">
          <Panel at={0} y={560} kicker="ที่ความลึกนั้นไม่มีออกซิเจน" head="ทางที่สองปิดลง" headSize={46} accent={VOX.teal} />
        </Sequence>
        <Sequence from={C.close1 - C.close2} durationInFrames={C.close3 - C.close1 - 12} layout="none">
          <Panel at={0} y={560} kicker="ดินยึดแอมโมเนียมไว้ตรงที่ฝัง" head="ทางที่หนึ่งปิดลง" headSize={46} accent={VOX.teal} />
        </Sequence>
        <Sequence from={C.close3 - C.close2} layout="none">
          <Panel at={0} y={560} kicker="อยู่ในเขตราก ไม่ใช่ในน้ำที่ไหลผ่าน" head="ทางที่สามแคบลงมาก" headSize={44} accent={VOX.teal} />
        </Sequence>
        <Sequence from={C.onemove - C.close2} layout="none">
          <SerifStatement x={540} y={1720} w={980} at={0} size={42} backing
            words={[{ t: 'ย้ายที่วางครั้งเดียว' }, { t: 'ปิดทั้งสามทาง', hl: true }]} />
        </Sequence>
      </Scene>

      {/* ===== ACT 6 — the evidence ===== */}
      <Scene from={C.field} dur={794}>
        <Layer x={540} y={800} w={W} at={0} dur={1} enter="none" depth={0.04}>
          <ResultBars at={0} />
        </Layer>
        <Sequence from={C.both - C.field} layout="none">
          <Photo src={A8('grain.png')} x={540} y={1300} w={760} h={400} at={0} rot={-0.8} />
          <SerifStatement x={540} y={1680} w={960} at={20} size={40} backing
            words={[{ t: 'ใส่น้อยลง' }, { t: 'แต่ได้มากขึ้น', hl: true }]} />
        </Sequence>
        <Sequence from={C.scaleup - C.field} layout="none">
          <LabelChip x={MARGIN_L} y={1830} at={0} anchor="left" text="ขยายผลในบังกลาเทศระดับล้านคน · ทดสอบในรวันดาด้วย" kicker="ไม่ได้อยู่แค่ในแปลงทดลอง" accent={VOX.teal} size={26} rotate={-0.7} z={6} />
        </Sequence>
      </Scene>

      {/* ===== ACT 7 — the price ===== */}
      <Scene from={C.price} dur={1291}>
        <SerifStatement x={540} y={600} w={960} at={0} size={48} words={[{ t: 'แต่มันมี' }, { t: 'ราคาที่ต้องจ่าย', hl: true }]} />
        <Sequence from={C.labour - C.price} durationInFrames={C.supply - C.labour - 18} layout="none">
          <Photo src={A8('hand.png')} x={540} y={1080} w={620} h={420} at={0} rot={1} />
          <LabelChip x={MARGIN_L} y={1420} at={30} anchor="left" text="กดด้วยมือ ใช้แรงงาน 6–8 วันคน ต่อเฮกตาร์" kicker="แรงงานที่การหว่านไม่ต้องใช้เลย" accent={VOX.red} size={28} rotate={-1} z={6} />
        </Sequence>
        <Sequence from={C.econ - C.price} layout="none">
          <Panel at={0} y={1620} kicker="ต้องคิดเป็นบัญชี ไม่ใช่ความรู้สึก" head="ค่าแรงที่เพิ่ม หักกับค่าปุ๋ยที่ประหยัด บวกข้าวที่ได้เพิ่ม" headSize={32} accent={VOX.yellow} />
        </Sequence>
        <Sequence from={C.econ2 - C.price} layout="none">
          <LabelChip x={MARGIN_L} y={1840} at={0} anchor="left" text="งานวิจัยว่าหักแล้วยังคุ้ม แต่ขึ้นกับค่าแรงในพื้นที่" kicker="ไม่เท่ากันทุกจังหวัด ไม่เท่ากันทุกปี" accent={VOX.red} size={26} rotate={-0.6} z={6} />
        </Sequence>
        <Sequence from={C.supply - C.price} layout="none">
          <Photo src={A8('applicator.png')} x={820} y={1180} w={300} h={620} at={0} rot={-1.6} />
        </Sequence>
      </Scene>

      <Scene from={C.barrier} dur={838}>
        <Panel at={0} y={560} kicker="อุปสรรคใหญ่ที่สุด" head="ไม่ใช่วิทยาศาสตร์ แต่คือแรงงานกับการหาก้อนปุ๋ย" headSize={38} accent={VOX.red} />
        <Photo src={A8('applicator.png')} x={780} y={1220} w={320} h={600} at={20} rot={1.2} />
        <LabelChip x={MARGIN_L} y={1180} at={40} anchor="left" text="มีเครื่องหยอดใช้แรงคน ทั้งแบบจิ้มและแบบเข็น" kicker="ที่พัฒนาไว้แล้ว" accent={VOX.teal} size={27} rotate={-0.9} z={6} />
        <Sequence from={C.thairesearch - C.barrier} layout="none">
          <Panel at={0} y={1620} kicker="และไม่ใช่ของใหม่สำหรับไทย" head="มีงานวิจัยไทยที่ทดสอบการฝังยูเรียก้อนแล้ว" sub="สิ่งที่ยังไม่เกิด คือการหาซื้อก้อนปุ๋ยได้ทั่วไป" headSize={32} accent={VOX.teal} />
        </Sequence>
      </Scene>

      {/* ===== ACT 8 — the Thai caveat ===== */}
      <Scene from={C.thaiwarn} dur={582}>
        <Panel at={0} y={600} kicker="ข้อสำคัญที่สุดสำหรับคนดูไทย" head="ตัวเลขทั้งหมดมาจากนาปักดำที่ขังน้ำ" headSize={40} accent={VOX.red} />
        <Photo src={A8('paddy.png')} x={540} y={1140} w={860} h={400} at={20} rot={-0.7} pos="50% 62%" />
        <Sequence from={C.thaidiff - C.thaiwarn} layout="none">
          <LabelChip x={MARGIN_L} y={1500} at={0} anchor="left" text="นาหว่านน้ำตม ไม่มีกอให้กะระยะ จัดการน้ำก็ต่างกัน" kicker="วิธีที่ชาวนาไทยส่วนใหญ่ใช้" accent={VOX.red} size={27} rotate={-0.9} z={6} />
          <SerifStatement x={540} y={1740} w={980} at={40} size={38} backing
            words={[{ t: 'อย่าเพิ่งคาดหวัง' }, { t: 'ตัวเลข 85 กับนาตัวเอง', hl: true }]} />
        </Sequence>
      </Scene>

      <Scene from={C.principle} dur={518}>
        <SerifStatement x={540} y={700} w={980} at={0} size={44} backing
          words={[{ t: 'ปุ๋ยที่อยู่บนผิวน้ำ' }, { t: 'คือปุ๋ยที่กำลังจะหายไป', hl: true }]} />
        <Layer x={540} y={1240} w={W} at={30} dur={1} enter="none" depth={0.05}>
          <SoilLayers at={0} pellet="surface" labels={false} />
        </Layer>
        <Sequence from={C.principle2 - C.principle} layout="none">
          <LabelChip x={MARGIN_L} y={1720} at={0} anchor="left" text="ไนโตรเจนที่รากดูดไม่ทัน มีทางไปของมันเสมอ" kicker="หลักการข้อที่สอง" accent={VOX.red} size={28} rotate={-0.8} z={6} />
        </Sequence>
      </Scene>

      {/* ===== ACT 9 — SUMMARY and the checklist ===== */}
      <Scene from={C.sum} dur={370}>
        <SerifStatement x={540} y={560} w={900} at={0} size={54} words={[{ t: 'สรุป' }, { t: 'ให้ชัด', hl: true }]} />
        <Layer x={540} y={1250} w={W} at={0} dur={1} enter="none" depth={0.03} drift={0.2}>
          <SummaryCard at={20} fixAt={170} />
        </Layer>
      </Scene>

      <Scene from={C.todo} dur={518}>
        <Layer x={540} y={1100} w={W} at={0} dur={1} enter="none" depth={0.03} drift={0.2}>
          <TodoList at={10} />
        </Layer>
        <Photo src={A8('seedling.png')} x={830} y={1660} w={250} h={400} at={300} rot={1.4} />
      </Scene>

      <Scene from={C.close} dur={180}>
        <SerifStatement x={540} y={900} w={980} at={10} size={48} backing
          words={[{ t: 'สูตรลับนั้นไม่เคยเป็นสูตร' }, { t: 'มันคือความลึก', hl: true }]} />
      </Scene>

      {/* ===== LOOP ===== */}
      <Sequence from={C.titleBack} layout="none">
        <Hook t={6} s={20} />
      </Sequence>
    </CollageBoard>
    <Grain opacity={0.05} />
  </AbsoluteFill>
);

export default Vox8UreaDeep;
