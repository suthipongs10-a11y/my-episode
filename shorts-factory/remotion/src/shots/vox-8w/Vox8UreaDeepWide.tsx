import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import {
  CollageBoard,
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
// "ปุ๋ยที่หว่านลงนา หายไปไหน" — vox-8, เกษตรที่คนไทยควรรู้ · LANDSCAPE
// Facts and sources: vox-shorts/vox-8-urea-deep/script.md
//
// 1920x1080, 9:30. This REPLACES the 1080x1920 cut in ../vox-8/Vox8UreaDeep.tsx, which was
// built vertical because the format was inherited from the Shorts pipeline and never
// re-examined when the length went to nine minutes. A long-form documentary is watched on a
// wide player. PIPELINE §3 now states the rule: past 60s, width and height swap.
//
// SAME VOICE, SAME CUES, SAME SCRIPT. Only the layout is new — every frame number in C below
// is unchanged, so the audio bed drops straight on.
//
// Landscape is not the vertical cut stretched. Three things genuinely change:
//   - Text sits LEFT and picture RIGHT instead of stacking. That also makes the band-collision
//     bug of the vertical cut nearly impossible, because the two live in different columns.
//   - Wide diagrams finally fit. The soil cross-section, the daily pH curve and the loss bar
//     are all naturally wide and were cramped at 1080.
//   - ThreeWays becomes three columns and SummaryCard two, instead of stacked lists.
//
// Ten new 16:9 photographs were generated for this cut, six of them for the second half where
// the vertical version was thinnest. A 1:1 image dropped into a 16:9 slot is mostly crop.
// =============================================================================
export const compositionConfig = {
  id: 'Vox8UreaDeepWide',
  durationInSeconds: 570,
  fps: 30,
  width: 1920,
  height: 1080,
};

const W = 1920;
const H = 1080;

// Wider board, and YouTube's own chrome eats the edges, so the margin is bigger in absolute
// terms than the vertical cut's. Peak zoom is held to 1.08 (vertical went to 1.14) — a wide
// frame magnifies camera motion, and 9 minutes of it would be tiring.
const MARGIN_L = 170;
const COL_L = 620;   // centre of the text column
const COL_R = 1370;  // centre of the picture column
const A8 = (f: string) => staticFile(`projects/vox-8-urea-deep/layers/${f}`);

// Measured line starts, in frames — identical to the vertical cut and to beats.json.
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

const CAM = [
  { f: 0, x: 960, y: 540, z: 1 },
  { f: 320, x: 960, y: 543, z: 1.03 },
  { f: 1340, x: 962, y: 546, z: 1.05 },
  { f: 1400, x: 960, y: 540, z: 1.02 },
  { f: 2100, x: 962, y: 544, z: 1.04 },
  { f: 2200, x: 960, y: 546, z: 1.06 },
  { f: 3020, x: 962, y: 548, z: 1.08 },
  { f: 3100, x: 960, y: 542, z: 1.02 },
  { f: 3560, x: 962, y: 545, z: 1.04 },
  { f: 3640, x: 960, y: 546, z: 1.05 },
  { f: 5240, x: 962, y: 549, z: 1.08 },
  { f: 5320, x: 960, y: 542, z: 1.02 },
  { f: 6770, x: 962, y: 546, z: 1.05 },
  { f: 6850, x: 960, y: 544, z: 1.03 },
  { f: 7290, x: 962, y: 547, z: 1.06 },
  { f: 7360, x: 960, y: 541, z: 1.02 },
  { f: 7960, x: 962, y: 544, z: 1.04 },
  { f: 8040, x: 960, y: 546, z: 1.05 },
  { f: 9270, x: 962, y: 549, z: 1.08 },
  { f: 9350, x: 960, y: 543, z: 1.02 },
  { f: 10250, x: 962, y: 546, z: 1.05 },
  { f: 10340, x: 960, y: 546, z: 1.04 },
  { f: 11730, x: 962, y: 549, z: 1.07 },
  { f: 11810, x: 960, y: 542, z: 1.02 },
  { f: 12540, x: 962, y: 545, z: 1.04 },
  { f: 12620, x: 960, y: 543, z: 1.02 },
  { f: 13850, x: 962, y: 547, z: 1.05 },
  { f: 13930, x: 960, y: 542, z: 1.02 },
  { f: 14710, x: 962, y: 545, z: 1.04 },
  { f: 14790, x: 960, y: 545, z: 1.04 },
  { f: 15310, x: 962, y: 548, z: 1.06 },
  { f: 15390, x: 960, y: 541, z: 1.02 },
  // dead still through the summary and the checklist — the frames people screenshot
  { f: 15840, x: 960, y: 540, z: 1 },
  { f: 16740, x: 960, y: 540, z: 1 },
  { f: 16800, x: 960, y: 540, z: 1.02 },
  { f: 16900, x: 960, y: 540, z: 1 },
  { f: 17100, x: 960, y: 540, z: 1 },
];

const TITLE = [{ t: 'ปุ๋ยที่หว่านลงนา' }, { t: 'หายไปไหน', hl: true }];

// =============================================================================
const Panel: React.FC<{
  at: number; x?: number; y: number; kicker: string; head: string; sub?: string;
  headSize?: number; accent?: string; w?: number;
}> = ({ at, x = COL_L, y, kicker, head, sub, headSize = 44, accent, w = 800 }) => {
  const T = useTheme();
  return (
    <Layer x={x} y={y} w={w} at={at} dur={14} enter="place" rotate={-0.4} depth={0.03} drift={0.4}>
      <div style={{ background: T.cream, padding: '30px 38px 34px', borderLeft: `9px solid ${accent ?? T.teal}`, boxShadow: '0 14px 30px rgba(40,28,12,0.22)' }}>
        <div style={{ fontFamily: FONT_TH, fontSize: 22, fontWeight: 600, color: accent ?? T.teal, marginBottom: 9 }}>{kicker}</div>
        <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: headSize, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>{head}</div>
        {sub ? <div style={{ fontFamily: FONT_TH, fontSize: 24, color: T.inkSoft, lineHeight: 1.45, marginTop: 12 }}>{sub}</div> : null}
      </div>
    </Layer>
  );
};

const FadeOut: React.FC<{ at: number; dur: number; children: React.ReactNode }> = ({ at, dur, children }) => {
  const frame = useCurrentFrame();
  return <div style={{ opacity: interpolate(frame, [at - dur, at], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>{children}</div>;
};

const Scene: React.FC<{ from: number; dur: number; children: React.ReactNode }> = ({ from, dur, children }) => (
  <Sequence from={from} durationInFrames={dur} layout="none">
    <FadeOut at={dur - 4} dur={16}>{children}</FadeOut>
  </Sequence>
);

const Photo: React.FC<{ src: string; x: number; y: number; w: number; h: number; at: number; rot?: number; pos?: string }> =
  ({ src, x, y, w, h, at, rot = 0.5, pos = '50% 50%' }) => (
    <Layer x={x} y={y} w={w} at={at} dur={18} enter="place" rotate={rot} depth={0.05} drift={0.35}>
      <Img src={src} style={{ width: '100%', height: h, objectFit: 'cover', objectPosition: pos, display: 'block', boxShadow: '0 16px 34px rgba(40,28,12,0.26)' }} />
    </Layer>
  );

// A photograph that fills the board behind everything, dimmed so cream cards stay readable.
const Plate: React.FC<{ src: string; at: number; pos?: string; dim?: number }> =
  ({ src, at, pos = '50% 50%', dim = 0.42 }) => {
    const frame = useCurrentFrame();
    const o = interpolate(frame, [at, at + 24], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return (
      <Layer x={960} y={540} w={W * 1.12} at={0} dur={1} enter="none" depth={-0.04} drift={0.2}>
        <div style={{ position: 'relative', opacity: o }}>
          <Img src={src} style={{ width: '100%', height: H * 1.12, objectFit: 'cover', objectPosition: pos, display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: VOX.paper, opacity: dim }} />
        </div>
      </Layer>
    );
  };

// --- 38 in, 62 gone. Wide enough here that the split reads at a glance ------
const LossSplit: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 26], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const total = 1520;
  return (
    <svg viewBox={`0 0 ${W} 300`} style={{ display: 'block', width: W, height: 300, overflow: 'visible' }}>
      <text x={MARGIN_L} y={30} fontFamily={FONT_TH} fontSize={26} fill={T.inkSoft}>ปุ๋ยไนโตรเจน 100 ส่วนที่หว่านลงไป</text>
      <rect x={MARGIN_L} y={58} width={total} height={92} fill={T.inkSoft} opacity={0.16} stroke={T.inkSoft} strokeWidth={1.4} strokeDasharray="7 8" />
      <rect x={MARGIN_L} y={58} width={total * 0.38 * g(0)} height={92} fill={T.teal} opacity={0.85} />
      <rect x={MARGIN_L + total * 0.38} y={58} width={total * 0.62 * g(20)} height={92} fill={T.red} opacity={0.8} />
      <text x={MARGIN_L + 24} y={122} fontFamily={FONT_TH_DISPLAY} fontSize={52} fontWeight={700} fill={T.cream} opacity={g(0)}>38</text>
      <text x={MARGIN_L + total * 0.38 + 24} y={122} fontFamily={FONT_TH_DISPLAY} fontSize={52} fontWeight={700} fill={T.cream} opacity={g(20)}>62</text>
      <g opacity={g(30)}>
        <rect x={MARGIN_L} y={182} width={20} height={20} fill={T.teal} opacity={0.85} />
        <text x={MARGIN_L + 32} y={199} fontFamily={FONT_TH} fontSize={26} fill={T.ink}>ต้นข้าวได้กิน</text>
        <rect x={MARGIN_L + 320} y={182} width={20} height={20} fill={T.red} opacity={0.8} />
        <text x={MARGIN_L + 352} y={199} fontFamily={FONT_TH} fontSize={26} fontWeight={700} fill={T.red}>หายไป</text>
        <text x={MARGIN_L + 700} y={199} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>ประสิทธิภาพการดูดใช้ไนโตรเจนจากยูเรียที่หว่าน · วัดในแปลงจริง</text>
      </g>
    </svg>
  );
};

// --- the cross-section, at last as wide as it wants to be -------------------
const SoilLayers: React.FC<{ at: number; pellet?: 'surface' | 'deep' | 'none'; labels?: boolean; depthMark?: boolean }> =
  ({ at, pellet = 'none', labels = true, depthMark = false }) => {
    const T = useTheme();
    const frame = useCurrentFrame();
    const g = (d: number) => interpolate(frame, [at + d, at + d + 22], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const x0 = MARGIN_L, wBox = labels ? 1220 : 1500;
    const yWater = 24, hWater = 96, yOx = yWater + hWater, hOx = 24, yRed = yOx + hOx, hRed = 240;
    return (
      <svg viewBox={`0 0 ${W} 430`} style={{ display: 'block', width: W, height: 430, overflow: 'visible' }}>
        <g opacity={g(0)}>
          <rect x={x0} y={yWater} width={wBox} height={hWater} fill="#7fa7bd" opacity={0.5} />
          <rect x={x0} y={yOx} width={wBox} height={hOx} fill="#b98b52" opacity={0.88} />
          <rect x={x0} y={yRed} width={wBox} height={hRed} fill="#3f4d5c" opacity={0.9} />
          <rect x={x0} y={yWater} width={wBox} height={hWater + hOx + hRed} fill="none" stroke={T.ink} strokeWidth={1.8} opacity={0.5} />
        </g>
        {labels ? (
          <g opacity={g(14)}>
            <text x={x0 + wBox + 24} y={yWater + 56} fontFamily={FONT_TH} fontSize={26} fill={T.inkSoft}>น้ำในนา</text>
            <text x={x0 + wBox + 24} y={yOx + 20} fontFamily={FONT_TH} fontSize={25} fontWeight={700} fill="#8a5f2c">มีออกซิเจน</text>
            <text x={x0 + wBox + 24} y={yRed + 44} fontFamily={FONT_TH} fontSize={26} fontWeight={700} fill={T.ink}>ไม่มีออกซิเจน</text>
          </g>
        ) : null}
        {pellet === 'surface' ? (
          <g opacity={g(26)}>
            {Array.from({ length: 13 }, (_, i) => (
              <circle key={i} cx={x0 + 60 + i * (wBox - 120) / 12} cy={yWater + 28} r={10} fill={T.cream} stroke={T.ink} strokeWidth={1.8} />
            ))}
            <text x={x0} y={yWater - 10} fontFamily={FONT_TH} fontSize={25} fontWeight={700} fill={T.red}>หว่านบนผิวน้ำ</text>
          </g>
        ) : null}
        {pellet === 'deep' ? (
          <g opacity={g(26)}>
            <rect x={x0 + wBox / 2 - 22} y={yRed + 62} width={44} height={58} rx={9} fill={T.cream} stroke={T.ink} strokeWidth={2.2} />
            <text x={x0} y={yWater - 10} fontFamily={FONT_TH} fontSize={25} fontWeight={700} fill={T.teal}>ฝังลงในโคลน</text>
            {depthMark ? (
              <g opacity={g(38)}>
                <line x1={x0 + wBox / 2 + 52} y1={yOx} x2={x0 + wBox / 2 + 52} y2={yRed + 91} stroke={T.teal} strokeWidth={2.6} />
                <line x1={x0 + wBox / 2 + 40} y1={yOx} x2={x0 + wBox / 2 + 64} y2={yOx} stroke={T.teal} strokeWidth={2.6} />
                <line x1={x0 + wBox / 2 + 40} y1={yRed + 91} x2={x0 + wBox / 2 + 64} y2={yRed + 91} stroke={T.teal} strokeWidth={2.6} />
                <rect x={x0 + wBox / 2 + 76} y={yRed + 6} width={214} height={58} fill={T.cream} stroke={T.teal} strokeWidth={2.2} />
                <text x={x0 + wBox / 2 + 98} y={yRed + 47} fontFamily={FONT_TH_DISPLAY} fontSize={38} fontWeight={700} fill={T.teal}>7–10 ซม.</text>
              </g>
            ) : null}
          </g>
        ) : null}
      </svg>
    );
  };

// --- three exits as three COLUMNS: the layout landscape was waiting for -----
const ThreeWays: React.FC<{ at: number; lit?: 0 | 1 | 2 | 3 }> = ({ at, lit = 0 }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cols = [
    { n: '1', t: 'ระเหยขึ้นฟ้า', s: 'เป็นก๊าซแอมโมเนีย' },
    { n: '2', t: 'จุลินทรีย์เปลี่ยนรูป', s: 'แล้วกลายเป็นก๊าซไนโตรเจน' },
    { n: '3', t: 'ไหลไปกับน้ำ', s: 'ทั้งน้ำล้นและน้ำที่ซึมลึก' },
  ];
  const cw = 500, gap = 40, x0 = (W - (cw * 3 + gap * 2)) / 2;
  return (
    <svg viewBox={`0 0 ${W} 260`} style={{ display: 'block', width: W, height: 260, overflow: 'visible' }}>
      {cols.map((c, i) => {
        const on = lit === 0 || lit === i + 1;
        const x = x0 + i * (cw + gap);
        return (
          <g key={c.n} opacity={g(i * 12) * (on ? 1 : 0.26)}>
            <rect x={x} y={20} width={cw} height={200} fill={on ? T.cream : 'none'} stroke={on ? T.red : T.inkSoft} strokeWidth={on ? 2.6 : 1.4} />
            <circle cx={x + 62} cy={84} r={32} fill={on ? T.red : T.inkSoft} opacity={on ? 0.88 : 0.3} />
            <text x={x + 62} y={97} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={34} fontWeight={700} fill={T.cream}>{c.n}</text>
            <text x={x + 112} y={78} fontFamily={FONT_TH_DISPLAY} fontSize={33} fontWeight={700} fill={T.ink}>{c.t}</text>
            <text x={x + 112} y={116} fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft}>{c.s}</text>
            <text x={x + 28} y={182} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft} opacity={0.9}>
              {i === 0 ? 'สาหร่ายดัน pH ขึ้นทุกบ่าย' : i === 1 ? 'ไนเตรตไหลลงชั้นไร้ออกซิเจน' : 'พาไนโตรเจนออกนอกแปลง'}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// --- floodwater pH across one day ------------------------------------------
const PhClock: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [at, at + 60], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const g = (d: number) => interpolate(frame, [at + d, at + d + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x0 = MARGIN_L + 60, wPlot = 1420, y0 = 60, hPlot = 250;
  const ph = (h: number) => 7 + 2.9 * Math.max(0, Math.sin(((h - 6) / 12) * Math.PI)) ** 1.6;
  const pts: string[] = [];
  for (let h = 0; h <= 24; h += 0.25) {
    pts.push(`${(x0 + (h / 24) * wPlot).toFixed(1)},${(y0 + hPlot - ((ph(h) - 6.5) / 3.6) * hPlot).toFixed(1)}`);
  }
  const keep = Math.max(2, Math.round(pts.length * draw));
  return (
    <svg viewBox={`0 0 ${W} 400`} style={{ display: 'block', width: W, height: 400, overflow: 'visible' }}>
      <g opacity={g(0)}>
        {[7, 8, 9, 10].map((v) => {
          const y = y0 + hPlot - ((v - 6.5) / 3.6) * hPlot;
          return (
            <g key={v}>
              <line x1={x0} y1={y} x2={x0 + wPlot} y2={y} stroke={T.inkSoft} strokeWidth={1} opacity={0.28} strokeDasharray="5 8" />
              <text x={x0 - 16} y={y + 8} textAnchor="end" fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft}>{v}</text>
            </g>
          );
        })}
        <text x={x0 - 16} y={y0 - 20} textAnchor="end" fontFamily={FONT_TH} fontSize={22} fontWeight={700} fill={T.inkSoft}>pH</text>
        <text x={x0} y={y0 + hPlot + 40} fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft}>เที่ยงคืน</text>
        <text x={x0 + wPlot / 2} y={y0 + hPlot + 40} textAnchor="middle" fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft}>เที่ยงวัน</text>
        <text x={x0 + wPlot} y={y0 + hPlot + 40} textAnchor="end" fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft}>เที่ยงคืน</text>
      </g>
      <polyline points={pts.slice(0, keep).join(' ')} fill="none" stroke={T.red} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <g opacity={g(66)}>
        <text x={x0 + wPlot / 2 + 24} y={y0 + 4} fontFamily={FONT_TH_DISPLAY} fontSize={36} fontWeight={700} fill={T.red}>9.5–10</text>
        <text x={x0} y={y0 + hPlot + 82} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>
          รูปทรงของเส้นเป็นภาพประกอบ ตัวเลขที่ยึดคือช่วงค่าสูงสุดตอนบ่ายที่วัดได้
        </text>
      </g>
    </svg>
  );
};

const RangeBar: React.FC<{ at: number; lo: number; hi: number; caption: string }> = ({ at, lo, hi, caption }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = interpolate(frame, [at, at + 30], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x0 = MARGIN_L, wPlot = 1560;
  const px = (v: number) => x0 + (v / 100) * wPlot;
  return (
    <svg viewBox={`0 0 ${W} 230`} style={{ display: 'block', width: W, height: 230, overflow: 'visible' }}>
      <rect x={x0} y={58} width={wPlot} height={68} fill={T.inkSoft} opacity={0.14} />
      <rect x={px(lo)} y={58} width={(px(hi) - px(lo)) * g} height={68} fill={T.red} opacity={0.8} />
      <text x={px(lo)} y={44} fontFamily={FONT_TH_DISPLAY} fontSize={36} fontWeight={700} fill={T.red} opacity={g}>{lo}%</text>
      <text x={px(hi)} y={44} textAnchor="end" fontFamily={FONT_TH_DISPLAY} fontSize={36} fontWeight={700} fill={T.red} opacity={g}>{hi}%</text>
      <text x={x0} y={170} fontFamily={FONT_TH} fontSize={26} fill={T.inkSoft} opacity={g}>{caption}</text>
      <text x={x0} y={206} fontFamily={FONT_TH} fontSize={21} fill={T.inkSoft} opacity={g}>0% ทางซ้าย · 100% ทางขวา — ช่วงกว้างเพราะขึ้นกับลม อุณหภูมิ และความเป็นด่างของน้ำ</text>
    </svg>
  );
};

// --- two ions, two columns --------------------------------------------------
const ChargeDiagram: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 22], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cw = 700, gap = 60, x0 = (W - (cw * 2 + gap)) / 2;
  const col = (i: number, ion: string, sign: string, verdict: string, held: boolean, d: number) => {
    const x = x0 + i * (cw + gap);
    return (
      <g opacity={g(d)}>
        <rect x={x} y={40} width={cw} height={150} fill={T.cream} stroke={held ? T.teal : T.red} strokeWidth={2.4} />
        <circle cx={x + 76} cy={115} r={38} fill={held ? T.teal : T.red} opacity={0.82} />
        <text x={x + 76} y={130} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={38} fontWeight={700} fill={T.cream}>{sign}</text>
        <text x={x + 140} y={104} fontFamily={FONT_TH_DISPLAY} fontSize={34} fontWeight={700} fill={T.ink}>{ion}</text>
        <text x={x + 140} y={146} fontFamily={FONT_TH} fontSize={25} fill={held ? T.teal : T.red}>{verdict}</text>
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${W} 230`} style={{ display: 'block', width: W, height: 230, overflow: 'visible' }}>
      <text x={x0} y={26} fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft}>อนุภาคดินมีประจุลบ</text>
      {col(0, 'แอมโมเนียม', '+', 'ดินยึดไว้ได้ อยู่กับที่', true, 0)}
      {col(1, 'ไนเตรต', '−', 'ดินยึดไม่อยู่ ไหลไปกับน้ำ', false, 14)}
    </svg>
  );
};

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
        const y = 22 + i * 136;
        const wPer = 30;
        return (
          <g key={r.label} opacity={g(r.d)}>
            <text x={MARGIN_L} y={y + 24} fontFamily={FONT_TH} fontSize={28} fontWeight={600} fill={T.ink}>{r.label}</text>
            <rect x={MARGIN_L} y={y + 42} width={r.hi * wPer * g(r.d)} height={58} fill={r.c} opacity={0.5} />
            <rect x={MARGIN_L} y={y + 42} width={r.lo * wPer * g(r.d)} height={58} fill={r.c} opacity={0.9} />
            <text x={MARGIN_L + 22 + r.hi * wPer} y={y + 84} fontFamily={FONT_TH_DISPLAY} fontSize={40} fontWeight={700} fill={T.ink} opacity={g(r.d)}>
              {r.lo}–{r.hi}%
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// --- summary as two columns, sized to be read from a screenshot -------------
const SummaryCard: React.FC<{ at: number; fixAt: number }> = ({ at, fixAt }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (t: number) => interpolate(frame, [t, t + 22], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cw = 760, gap = 60, x0 = (W - (cw * 2 + gap)) / 2;
  const col = (i: number, tag: string, c: string, head: string, body: string, appear: number) => {
    const x = x0 + i * (cw + gap);
    return (
      <g opacity={g(appear)}>
        <rect x={x} y={0} width={cw} height={250} fill={T.cream} stroke={c} strokeWidth={2.4} />
        <rect x={x} y={0} width={10} height={250} fill={c} />
        <text x={x + 36} y={54} fontFamily={FONT_TH} fontSize={26} fontWeight={700} fill={c}>{tag}</text>
        <text x={x + 36} y={122} fontFamily={FONT_TH_DISPLAY} fontSize={38} fontWeight={700} fill={T.ink}>{head}</text>
        <text x={x + 36} y={172} fontFamily={FONT_TH} fontSize={25} fill={T.inkSoft}>{body}</text>
        <text x={x + 36} y={210} fontFamily={FONT_TH} fontSize={25} fill={T.inkSoft}>{i === 0 ? 'ครบทั้งสี่อย่างที่ทำให้ไนโตรเจนหนีได้' : 'ให้พ้นจากทั้งสี่อย่างนั้นพร้อมกัน'}</text>
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${W} 270`} style={{ display: 'block', width: W, height: 270, overflow: 'visible' }}>
      {col(0, 'ปัญหา', T.red, 'ปุ๋ยบนผิวน้ำ ต้นข้าวได้ไม่ถึงครึ่ง', 'ผิวน้ำมีทั้งแดด ลม ออกซิเจน น้ำไหล', at)}
      {col(1, 'ทางแก้', T.teal, 'ย้ายปุ๋ยลงไปในดิน', 'ลึกพอที่จะพ้นจากผิวน้ำ', fixAt)}
    </svg>
  );
};

// --- the checklist as a 2x2 grid -------------------------------------------
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
  const cw = 780, gap = 60, x0 = (W - (cw * 2 + gap)) / 2;
  return (
    <svg viewBox={`0 0 ${W} 340`} style={{ display: 'block', width: W, height: 340, overflow: 'visible' }}>
      <text x={x0} y={34} fontFamily={FONT_TH_DISPLAY} fontSize={42} fontWeight={700} fill={T.ink}>ทำได้เลย โดยไม่ต้องมีก้อนปุ๋ย</text>
      {items.map((t, i) => {
        const x = x0 + (i % 2) * (cw + gap);
        const y = 76 + Math.floor(i / 2) * 96;
        return (
          <g key={t} opacity={g(i * 34)}>
            <rect x={x} y={y} width={40} height={40} fill="none" stroke={T.teal} strokeWidth={3} />
            <path d={`M ${x + 10} ${y + 21} l 9 11 l 17 -21`} fill="none" stroke={T.teal} strokeWidth={4.4}
              strokeLinecap="round" strokeLinejoin="round" opacity={g(i * 34 + 8)} />
            <text x={x + 62} y={y + 33} fontFamily={FONT_TH} fontSize={31} fontWeight={600} fill={T.ink}>{t}</text>
          </g>
        );
      })}
      <text x={x0} y={318} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft} opacity={g(150)}>
        ทั้งสี่ข้อมาจากกลไกเดียวกับที่อธิบายไปทั้งคลิป · คลิปนี้ไม่ได้ให้สูตรหรืออัตราปุ๋ย
      </text>
    </svg>
  );
};

const Hook: React.FC<{ t: number; p: number }> = ({ t, p }) => (
  <>
    <Plate src={A8('sower-wide.png')} at={p} pos="50% 55%" dim={0.5} />
    <SerifStatement x={960} y={480} w={1500} at={t} size={82} words={TITLE} />
  </>
);

const Vox8UreaDeepWide: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: VOX.paper }}>
    <CollageBoard cam={CAM} fontBody={FONT_TH} fontDisplay={FONT_TH_DISPLAY} tracking="0.6px">
      <PaperBG w={W} h={H} />

      {/* ===== ACT 1 — the problem ===== */}
      <Scene from={0} dur={820}>
        <Sequence from={0} durationInFrames={C.ans38 - 18} layout="none">
          <Hook t={C.hook - 60} p={C.hook - 45} />
        </Sequence>
        <Sequence from={C.ans38} layout="none">
          <Panel at={0} x={960} y={300} w={1100} kicker="ประสิทธิภาพการดูดใช้ไนโตรเจน" head="ต้นข้าวได้กินราว 38%" headSize={54} accent={VOX.red} />
          <Layer x={960} y={660} w={W} at={26} dur={1} enter="none" depth={0.04}>
            <LossSplit at={0} />
          </Layer>
        </Sequence>
        <Sequence from={C.measured} layout="none">
          <LabelChip x={MARGIN_L} y={930} at={16} anchor="left" text="ติดตามไนโตรเจนที่ใส่ในแปลงจริง ไม่ใช่ห้องแล็บ" kicker="ที่มาของตัวเลข" accent={VOX.teal} size={28} rotate={-0.6} z={6} />
        </Sequence>
      </Scene>

      <Scene from={C.cost} dur={504}>
        <Plate src={A8('sack-wide.png')} at={0} dim={0.66} />
        <Panel at={0} y={430} kicker="บริบทไทย" head="ปุ๋ยคือราว 37% ของต้นทุนการทำนา" headSize={44} accent={VOX.red} />
        <Sequence from={C.scale - C.cost} layout="none">
          <Panel at={0} x={COL_R} y={430} w={780} kicker="ไทยใช้ปุ๋ยเคมี 5–6 ล้านตันต่อปี" head="ข้าวใช้ไป 41% ของทั้งหมด" sub="และเกือบทั้งหมดคือของนำเข้า เราแทบไม่ได้ผลิตเอง" headSize={40} accent={VOX.teal} />
        </Sequence>
      </Scene>

      {/* ===== ACT 2 — Bangladesh, and the one change ===== */}
      <Scene from={C.bd} dur={751}>
        <Plate src={A8('paddy-wide.png')} at={0} pos="50% 58%" dim={0.5} />
        <Sequence from={C.onething - C.bd} layout="none">
          <SerifStatement x={960} y={330} w={1500} at={0} size={58} backing
            words={[{ t: 'เขาเปลี่ยนแค่' }, { t: 'ที่วางปุ๋ย', hl: true }]} />
        </Sequence>
        <Sequence from={C.place - C.bd} layout="none">
          <Layer x={960} y={700} w={W} at={0} dur={1} enter="none" depth={0.05}>
            <SoilLayers at={0} pellet="deep" depthMark labels={false} />
          </Layer>
        </Sequence>
      </Scene>

      <Scene from={C.jump} dur={200}>
        <SerifStatement x={960} y={440} w={1500} at={0} size={96} words={[{ t: '38%' }, { t: '→ 85%', hl: true }]} />
        <LabelChip x={MARGIN_L} y={720} at={26} anchor="left" text="ด้วยการย้ายที่วางอย่างเดียว" kicker="ประสิทธิภาพการดูดใช้ไนโตรเจน" accent={VOX.teal} size={34} rotate={-0.8} z={6} />
      </Scene>

      {/* ===== ACT 3 — broadcasting is fast, and that is the trade ===== */}
      <Scene from={C.why} dur={900}>
        <Panel at={0} x={960} y={280} w={1000} kicker="ก่อนจะไปต่อ" head="ปุ๋ยที่หายไป หายไปทางไหน" headSize={50} />
        <Sequence from={C.dflt - C.why} layout="none">
          <Photo src={A8('sower-wide.png')} x={COL_R} y={680} w={980} h={520} at={0} rot={-0.6} pos="50% 58%" />
          <Panel at={16} x={560} y={680} w={700} kicker="การหว่านไม่ใช่เรื่องโง่" head="มันคือวิธีที่เร็วที่สุด" sub="และความเร็วมีค่าจริง ในฤดูที่ทุกอย่างต้องแข่งกับน้ำ" headSize={40} accent={VOX.teal} />
        </Sequence>
        <Sequence from={C.tradeoff - C.why} layout="none">
          <SerifStatement x={960} y={1000} w={1600} at={0} size={44} backing
            words={[{ t: 'ประหยัดแรงวันนั้น' }, { t: 'จ่ายคืนทั้งฤดู', hl: true }]} />
        </Sequence>
      </Scene>

      {/* ===== ACT 4 — the mechanism ===== */}
      <Scene from={C.urea} dur={523}>
        <Panel at={0} y={420} kicker="จนถึงตรงนี้ยังไม่มีอะไรผิด" head="ยูเรีย → แอมโมเนียม → รากดูดใช้ได้" headSize={40} />
        <Photo src={A8('roots.png')} x={COL_R} y={520} w={620} h={640} at={18} rot={0.9} />
        <Sequence from={C.three - C.urea} layout="none">
          <SerifStatement x={620} y={840} w={900} at={0} size={48} backing
            words={[{ t: 'แต่มันมีทางออก' }, { t: 'สามทาง', hl: true }]} />
        </Sequence>
      </Scene>

      {/* --- way 1 --- */}
      <Scene from={C.w1} dur={1660}>
        <Layer x={960} y={230} w={W} at={0} dur={1} enter="none" depth={0.04}>
          <ThreeWays at={0} lit={1} />
        </Layer>
        <Sequence from={C.algae - C.w1} durationInFrames={C.ph - C.algae - 18} layout="none">
          <Photo src={A8('algae-wide.png')} x={960} y={740} w={1420} h={480} at={0} rot={0.4} />
          <LabelChip x={MARGIN_L} y={1000} at={26} anchor="left" text="สาหร่ายสังเคราะห์แสง ดึง CO₂ ออกจากน้ำ น้ำจึงเป็นด่างขึ้น" kicker="ต้นเหตุที่คาดไม่ถึง" accent={VOX.teal} size={30} rotate={-0.6} z={6} />
        </Sequence>
        <Sequence from={C.ph - C.w1} durationInFrames={C.n1num - C.ph - 18} layout="none">
          <Layer x={960} y={720} w={W} at={0} dur={1} enter="none" depth={0.05}>
            <PhClock at={0} />
          </Layer>
        </Sequence>
        <Sequence from={C.n1num - C.w1} layout="none">
          <Layer x={960} y={640} w={W} at={0} dur={1} enter="none" depth={0.05}>
            <RangeBar at={0} lo={10} hi={56} caption="สัดส่วนไนโตรเจนที่สูญเสียทางการระเหย จากการวัดในนาจริง" />
          </Layer>
        </Sequence>
        <Sequence from={C.shade - C.w1} layout="none">
          <Photo src={A8('sun.png')} x={1560} y={880} w={420} h={300} at={0} rot={1.2} />
          <LabelChip x={MARGIN_L} y={900} at={16} anchor="left" text="ข้าวโตแล้วบังแดด สาหร่ายทำงานน้อยลง" kicker="ทำไมใส่ตอนต้นเล็กถึงได้ผลน้อย" accent={VOX.yellow} kickerColor={VOX.ink} size={28} rotate={-0.7} z={6} />
        </Sequence>
      </Scene>

      {/* --- way 2 --- */}
      <Scene from={C.w2} dur={1512}>
        <Layer x={960} y={230} w={W} at={0} dur={1} enter="none" depth={0.04}>
          <ThreeWays at={0} lit={2} />
        </Layer>
        <Sequence from={C.layers - C.w2} durationInFrames={C.nitrif - C.layers - 18} layout="none">
          <Layer x={960} y={720} w={W} at={0} dur={1} enter="none" depth={0.05}>
            <SoilLayers at={0} pellet="none" labels />
          </Layer>
          <Sequence from={C.boundary - C.layers} layout="none">
            <Photo src={A8('mudcore.png')} x={1680} y={720} w={340} h={440} at={0} rot={1} pos="50% 30%" />
          </Sequence>
        </Sequence>
        <Sequence from={C.nitrif - C.w2} durationInFrames={C.n2num - C.nitrif - 18} layout="none">
          <Layer x={960} y={760} w={W} at={0} dur={1} enter="none" depth={0.05}>
            <ChargeDiagram at={0} />
          </Layer>
          <Photo src={A8('clay.png')} x={960} y={470} w={900} h={280} at={10} rot={-0.5} />
        </Sequence>
        <Sequence from={C.n2num - C.w2} layout="none">
          <Layer x={960} y={680} w={W} at={0} dur={1} enter="none" depth={0.05}>
            <RangeBar at={0} lo={33} hi={40} caption="สัดส่วนที่สูญเสียทางดีไนตริฟิเคชัน · ราว 33% และบางงานพบสูงกว่า 40%" />
          </Layer>
        </Sequence>
      </Scene>

      {/* --- way 3 + what all three share --- */}
      <Scene from={C.w3} dur={492}>
        <Layer x={960} y={230} w={W} at={0} dur={1} enter="none" depth={0.04}>
          <ThreeWays at={0} lit={3} />
        </Layer>
        <Photo src={A8('drain-wide.png')} x={960} y={730} w={1360} h={440} at={18} rot={-0.5} />
        <Sequence from={C.common - C.w3} layout="none">
          <SerifStatement x={960} y={1010} w={1600} at={0} size={44} backing
            words={[{ t: 'ทั้งสามทางเริ่มที่เดียวกัน' }, { t: 'ผิวน้ำ', hl: true }]} />
        </Sequence>
      </Scene>

      {/* --- the trap --- */}
      <Scene from={C.more} dur={505}>
        <SerifStatement x={960} y={330} w={1400} at={0} size={62} words={[{ t: 'แล้วถ้า' }, { t: 'ใส่เพิ่ม', hl: true }]} />
        <Sequence from={C.trap - C.more} layout="none">
          <Layer x={960} y={650} w={W} at={0} dur={1} enter="none" depth={0.04}>
            <LossSplit at={0} />
          </Layer>
          <LabelChip x={MARGIN_L} y={930} at={46} anchor="left" text="สัดส่วนที่หายไม่มีเพดาน ใส่เพิ่มสองเท่า ก็หายมากขึ้นตามส่วน" kicker="กับดัก" accent={VOX.red} size={29} rotate={-0.6} z={6} />
        </Sequence>
      </Scene>

      {/* --- where it goes --- */}
      <Scene from={C.where} dur={1447}>
        <Panel at={0} x={960} y={280} w={1100} kicker="ไนโตรเจนที่หายไป" head="ไม่ได้หายไปเฉย ๆ มันไปอยู่ที่อื่น" headSize={46} accent={VOX.red} />
        <Sequence from={C.n2o - C.where} durationInFrames={C.nh3air - C.n2o - 18} layout="none">
          <SerifStatement x={960} y={640} w={1600} at={0} size={50} backing
            words={[{ t: 'ไนตรัสออกไซด์' }, { t: 'แรงกว่า CO₂ 273 เท่า', hl: true }]} />
          <LabelChip x={MARGIN_L} y={880} at={26} anchor="left" text="และอยู่ในบรรยากาศได้นานเฉลี่ย 116 ปี" kicker="IPCC AR6" accent={VOX.red} size={30} rotate={-0.6} z={6} />
        </Sequence>
        <Sequence from={C.nh3air - C.where} layout="none">
          <Panel at={0} x={620} y={660} w={760} kicker="ส่วนแอมโมเนียที่ระเหยไป" head="ทำปฏิกิริยาในอากาศ กลายเป็นฝุ่น PM 2.5" headSize={36} accent={VOX.red} />
        </Sequence>
        <Sequence from={C.euchina - C.where} layout="none">
          <LabelChip x={1080} y={620} at={0} anchor="left" text="ยุโรป: ราวครึ่งหนึ่งของ PM 2.5 มาจากอนุภาคแบบนี้" kicker="งานศึกษาต่างประเทศ" accent={VOX.red} size={28} rotate={-0.8} z={6} />
          <LabelChip x={1080} y={790} at={30} anchor="left" text="จีน: ปุ๋ยเคมี = 42% ของแอมโมเนียทั้งประเทศ" kicker="งานศึกษาต่างประเทศ" accent={VOX.red} size={28} rotate={0.6} z={6} />
        </Sequence>
        <Sequence from={C.notthai - C.where} layout="none">
          <LabelChip x={MARGIN_L} y={980} at={0} anchor="left" text="ทั้งสองตัวเลขไม่ใช่ของไทย คลิปนี้ไม่มีตัวเลขไทย" kicker="ต้องพูดให้ชัด" accent={VOX.teal} size={28} rotate={-0.5} z={6} />
        </Sequence>
      </Scene>

      {/* ===== ACT 5 — the technique ===== */}
      <Scene from={C.flip} dur={967}>
        <Panel at={0} x={960} y={260} w={1080} kicker="IFDC ร่วมกับ IRRI" head="ถ้าปัญหาคือที่วาง ก็ย้ายที่วาง" headSize={48} accent={VOX.teal} />
        {/* The card sits alone for 8.6s before the briquette line lands, so the broadcast prills
            hold the frame — they are the "before" the next shot answers. */}
        <Sequence from={0} durationInFrames={C.briq - C.flip - 18} layout="none">
          <Photo src={A8('urea.png')} x={960} y={720} w={780} h={420} at={20} rot={-0.5} />
          <LabelChip x={MARGIN_L} y={920} at={40} anchor="left" text="ยูเรียเม็ดธรรมดาที่หว่านกันอยู่" kicker="ของเดิม" accent={VOX.red} size={28} rotate={-0.6} z={6} />
        </Sequence>
        <Sequence from={C.briq - C.flip} layout="none">
          <Photo src={A8('briquette.png')} x={560} y={680} w={640} h={430} at={0} rot={-0.8} />
          <LabelChip x={MARGIN_L} y={960} at={26} anchor="left" text="อัดยูเรียเป็นก้อน หนัก 1–3 กรัม" kicker="แข็งพอที่จะไม่ละลายหมดทันที" accent={VOX.teal} size={30} rotate={-0.7} z={6} />
        </Sequence>
        <Sequence from={C.howto - C.flip} layout="none">
          <Photo src={A8('placing-wide.png')} x={1400} y={680} w={940} h={470} at={0} rot={0.7} pos="60% 55%" />
        </Sequence>
        <Sequence from={C.geom - C.flip} layout="none">
          <LabelChip x={1010} y={975} at={0} anchor="left" text="หนึ่งก้อนต่อสี่กอ วางตรงกลางระหว่างสี่กอ" kicker="ลึก 7–10 ซม. · ไม่ใช่ฝังตรงไหนก็ได้" accent={VOX.yellow} kickerColor={VOX.ink} size={29} rotate={-0.5} z={6} />
        </Sequence>
      </Scene>

      {/* --- the three exits close --- */}
      <Scene from={C.close2} dur={1460}>
        <Layer x={960} y={700} w={W} at={0} dur={1} enter="none" depth={0.05}>
          <SoilLayers at={0} pellet="deep" depthMark labels />
        </Layer>
        <Sequence from={0} durationInFrames={C.close1 - C.close2 - 12} layout="none">
          <Panel at={0} x={960} y={250} w={1000} kicker="ที่ความลึกนั้นไม่มีออกซิเจน" head="ทางที่สองปิดลง" headSize={50} accent={VOX.teal} />
        </Sequence>
        <Sequence from={C.close1 - C.close2} durationInFrames={C.close3 - C.close1 - 12} layout="none">
          <Panel at={0} x={960} y={250} w={1000} kicker="ดินยึดแอมโมเนียมไว้ตรงที่ฝัง" head="ทางที่หนึ่งปิดลง" headSize={50} accent={VOX.teal} />
        </Sequence>
        <Sequence from={C.close3 - C.close2} durationInFrames={C.onemove - C.close3 - 12} layout="none">
          <Panel at={0} x={960} y={250} w={1080} kicker="อยู่ในเขตราก ไม่ใช่ในน้ำที่ไหลผ่าน" head="ทางที่สามแคบลงมาก" headSize={48} accent={VOX.teal} />
        </Sequence>
        <Sequence from={C.onemove - C.close2} layout="none">
          <SerifStatement x={960} y={250} w={1600} at={0} size={50} backing
            words={[{ t: 'ย้ายที่วางครั้งเดียว' }, { t: 'ปิดทั้งสามทาง', hl: true }]} />
        </Sequence>
      </Scene>

      {/* ===== ACT 6 — evidence ===== */}
      <Scene from={C.field} dur={794}>
        <Plate src={A8('harvest-wide.png')} at={0} pos="50% 60%" dim={0.62} />
        <Layer x={960} y={420} w={W} at={0} dur={1} enter="none" depth={0.04}>
          <ResultBars at={0} />
        </Layer>
        <Sequence from={C.both - C.field} layout="none">
          <SerifStatement x={960} y={800} w={1500} at={0} size={48} backing
            words={[{ t: 'ใส่น้อยลง' }, { t: 'แต่ได้มากขึ้น', hl: true }]} />
        </Sequence>
        <Sequence from={C.scaleup - C.field} layout="none">
          <LabelChip x={MARGIN_L} y={1000} at={0} anchor="left" text="ขยายผลในบังกลาเทศระดับล้านคน · ทดสอบในรวันดาด้วย" kicker="ไม่ได้อยู่แค่ในแปลงทดลอง" accent={VOX.teal} size={28} rotate={-0.5} z={6} />
        </Sequence>
      </Scene>

      {/* ===== ACT 7 — the price ===== */}
      <Scene from={C.price} dur={1291}>
        <SerifStatement x={960} y={280} w={1500} at={0} size={56} words={[{ t: 'แต่มันมี' }, { t: 'ราคาที่ต้องจ่าย', hl: true }]} />
        <Sequence from={C.labour - C.price} durationInFrames={C.supply - C.labour - 18} layout="none">
          <Photo src={A8('placing-wide.png')} x={1370} y={700} w={960} h={480} at={0} rot={0.7} pos="60% 60%" />
          <Panel at={16} x={580} y={700} w={720} kicker="กดด้วยมือ" head="6–8 วันคน ต่อเฮกตาร์" sub="แรงงานที่การหว่านไม่ต้องใช้เลย และเป็นงานที่ต้องก้มทั้งวัน" headSize={44} accent={VOX.red} />
        </Sequence>
        <Sequence from={C.econ - C.price} layout="none">
          <Panel at={0} x={620} y={1000} w={860} kicker="ต้องคิดเป็นบัญชี ไม่ใช่ความรู้สึก" head="ค่าแรงที่เพิ่ม หักกับค่าปุ๋ยที่ประหยัด บวกข้าวที่ได้เพิ่ม" headSize={32} accent={VOX.yellow} />
        </Sequence>
        <Sequence from={C.econ2 - C.price} layout="none">
          <LabelChip x={1360} y={1010} at={0} anchor="left" text="หักแล้วยังคุ้ม แต่ขึ้นกับค่าแรงในพื้นที่" kicker="ไม่เท่ากันทุกจังหวัด ทุกปี" accent={VOX.red} size={26} rotate={-0.5} z={6} />
        </Sequence>
        <Sequence from={C.supply - C.price} layout="none">
          <Photo src={A8('sack-wide.png')} x={1370} y={680} w={900} h={460} at={0} rot={-0.6} />
          <Panel at={10} x={580} y={680} w={700} kicker="และต้องมีก้อนยูเรียให้ซื้อ" head="ทั้งหมดนี้คือระบบ ไม่ใช่แค่เทคนิค" headSize={36} accent={VOX.red} />
        </Sequence>
      </Scene>

      <Scene from={C.barrier} dur={838}>
        <Panel at={0} x={620} y={420} w={800} kicker="อุปสรรคใหญ่ที่สุด" head="ไม่ใช่วิทยาศาสตร์ แต่คือแรงงานกับการหาก้อนปุ๋ย" headSize={38} accent={VOX.red} />
        <Photo src={A8('applicator.png')} x={1450} y={560} w={420} h={780} at={18} rot={1} />
        <LabelChip x={MARGIN_L} y={760} at={40} anchor="left" text="มีเครื่องหยอดใช้แรงคน ทั้งแบบจิ้มและแบบเข็น" kicker="ที่พัฒนาไว้แล้ว" accent={VOX.teal} size={28} rotate={-0.6} z={6} />
        <Sequence from={C.thairesearch - C.barrier} layout="none">
          <Panel at={0} x={620} y={940} w={880} kicker="และไม่ใช่ของใหม่สำหรับไทย" head="มีงานวิจัยไทยที่ทดสอบการฝังยูเรียก้อนแล้ว" sub="สิ่งที่ยังไม่เกิด คือการหาซื้อก้อนปุ๋ยได้ทั่วไป" headSize={32} accent={VOX.teal} />
        </Sequence>
      </Scene>

      {/* ===== ACT 8 — the Thai caveat ===== */}
      <Scene from={C.thaiwarn} dur={582}>
        <Plate src={A8('paddy-wide.png')} at={0} pos="50% 62%" dim={0.6} />
        <Panel at={0} x={960} y={300} w={1200} kicker="ข้อสำคัญที่สุดสำหรับคนดูไทย" head="ตัวเลขทั้งหมดมาจากนาปักดำที่ขังน้ำ" headSize={44} accent={VOX.red} />
        <Sequence from={C.thaidiff - C.thaiwarn} layout="none">
          <LabelChip x={MARGIN_L} y={640} at={0} anchor="left" text="นาหว่านน้ำตม ไม่มีกอให้กะระยะ จัดการน้ำก็ต่างกัน" kicker="วิธีที่ชาวนาไทยส่วนใหญ่ใช้" accent={VOX.red} size={29} rotate={-0.6} z={6} />
          <SerifStatement x={960} y={880} w={1600} at={30} size={46} backing
            words={[{ t: 'อย่าเพิ่งคาดหวัง' }, { t: 'ตัวเลข 85 กับนาตัวเอง', hl: true }]} />
        </Sequence>
      </Scene>

      <Scene from={C.principle} dur={518}>
        <SerifStatement x={960} y={300} w={1600} at={0} size={50} backing
          words={[{ t: 'ปุ๋ยที่อยู่บนผิวน้ำ' }, { t: 'คือปุ๋ยที่กำลังจะหายไป', hl: true }]} />
        <Layer x={960} y={700} w={W} at={26} dur={1} enter="none" depth={0.05}>
          <SoilLayers at={0} pellet="surface" labels={false} />
        </Layer>
        <Sequence from={C.principle2 - C.principle} layout="none">
          <LabelChip x={MARGIN_L} y={1000} at={0} anchor="left" text="ไนโตรเจนที่รากดูดไม่ทัน มีทางไปของมันเสมอ" kicker="หลักการข้อที่สอง" accent={VOX.red} size={29} rotate={-0.5} z={6} />
        </Sequence>
      </Scene>

      {/* ===== ACT 9 — summary and checklist ===== */}
      <Scene from={C.sum} dur={370}>
        <SerifStatement x={960} y={300} w={1200} at={0} size={62} words={[{ t: 'สรุป' }, { t: 'ให้ชัด', hl: true }]} />
        <Layer x={960} y={700} w={W} at={0} dur={1} enter="none" depth={0.03} drift={0.15}>
          <SummaryCard at={20} fixAt={170} />
        </Layer>
      </Scene>

      <Scene from={C.todo} dur={518}>
        <Plate src={A8('handsoil-wide.png')} at={0} pos="50% 50%" dim={0.74} />
        <Layer x={960} y={560} w={W} at={0} dur={1} enter="none" depth={0.03} drift={0.15}>
          <TodoList at={10} />
        </Layer>
        <Sequence from={300} layout="none">
          <Photo src={A8('soiltest-wide.png')} x={1470} y={900} w={560} h={280} at={0} rot={0.8} />
        </Sequence>
      </Scene>

      <Scene from={C.close} dur={180}>
        <Plate src={A8('rake-wide.png')} at={0} dim={0.66} />
        <SerifStatement x={960} y={520} w={1700} at={10} size={56} backing
          words={[{ t: 'สูตรลับนั้นไม่เคยเป็นสูตร' }, { t: 'มันคือความลึก', hl: true }]} />
      </Scene>

      {/* ===== LOOP ===== */}
      <Sequence from={C.titleBack} layout="none">
        <Hook t={6} p={0} />
      </Sequence>
    </CollageBoard>
    <Grain opacity={0.05} />
  </AbsoluteFill>
);

export default Vox8UreaDeepWide;
