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
  SerifStatement,
  useTheme,
} from '../../lib/collage';
import { FONT_TH, FONT_TH_DISPLAY } from '../../fonts';

// =============================================================================
// "ตู้ 360 กิโลวัตต์ แต่จอขึ้น 68" — vox-10, The EV Insight · LANDSCAPE 1920x1080
// Facts, source grades and the deliberate omissions: vox-shorts/vox-10-charge-curve/script.md
//
// WHY THIS VIDEO EXISTS NEXT TO vox-9. vox-9 lists "peak kW is not charging time" as one of
// five spec-sheet traps. This one goes underneath that sentence: why the taper is not a
// choice anyone made, and why it will not go away as batteries improve.
//
// THREE EDITORIAL RULES ENFORCED IN THIS FILE, not just in the script:
//   1. NO CAR MODEL IS NAMED ANYWHERE, on screen or in the voice, across all 67 lines.
//      channels/ev.json rule 3 forbids brand promotion, and the honest version of "which car
//      charges fastest" is a measurement this video did not make. The Ioniq 5 figures the
//      research turned up are grade C and stayed out — see script.md ⛔.
//   2. EVERY DIAGRAM CARRYING A NUMBER IS DRAWN HERE, NOT GENERATED. An image model draws a
//      plausible wrong graph extremely convincingly, and a wrong charge curve is the one
//      thing this video cannot ship. The five generated layers are unbranded hardware and
//      conceptual models with no numbers on them.
//   3. THE HERO CURVE IS PLOTTED FROM THE CC/CV MODEL, not drawn to look right. `curveY()`
//      below is the actual piecewise shape the script describes: flat while current is
//      constant, then falling once the cell hits its voltage ceiling. If the explanation and
//      the picture ever disagree, the picture is what people remember.
//
// LENGTH CAME FROM THE AUDIO, NOT FROM A PLAN. The voice was recorded before this file
// existed (voice-first, PIPELINE §7), measured 526.14s, and durationSec is 528. vox-5 had to
// be stretched after the fact because its composition was written against an estimate; this
// one never had that problem because nothing here was written until the wavs existed.
// =============================================================================
export const compositionConfig = {
  id: 'Vox10ChargeCurve',
  durationInSeconds: 528,
  fps: 30,
  width: 1920,
  height: 1080,
};

const W = 1920;
const H = 1080;

// Landscape geometry inherited from vox-8w/vox-9. Margin and peak zoom are ONE decision
// (PIPELINE §6) so the margin lives next to the CAM table, not at thirty call sites.
const MARGIN_L = 170;
const A = (f: string) => staticFile(`projects/vox-10-charge-curve/layers/${f}`);

// ---- GENERATED CUES — rebuilt from beats.json by scripts/gen-cues.mjs. Do not hand-edit.
// Cue name === segment id in beats.json, so there is no map to keep in sync.
// All 67 windows are measured from the real audio.
const C = {
  s01_scene: 15,
  s02_number: 241,
  s03_nothing_broken: 435,

  s04_peak_is_a_point: 655,
  s05_average: 871,
  s06_window: 1082,

  s07_cell: 1307,
  s08_cc: 1544,
  s09_ceiling: 1811,
  s10_hit: 2042,
  s11_cv: 2273,
  s12_arithmetic: 2495,

  s13_why_ceiling: 2767,
  s14_graphite: 2998,
  s15_intercalation: 3209,
  s16_rate_limit: 3410,
  s17_plating: 3644,
  s18_trigger: 3898,
  s19_permanent: 4159,
  s20_dendrite: 4390,
  s21_window: 4708,
  s22_bms_buys: 4916,

  s23_balance: 5152,
  s24_cells_differ: 5323,
  s25_slowest: 5541,
  s26_heat_intro: 5801,

  s27_numbers: 5975,
  s28_last20: 6224,
  s29_punch: 6439,

  s30_target_temp: 6689,
  s31_charging_makes_heat: 6976,
  s32_headroom: 7185,
  s33_derate_car: 7437,
  s34_charger_too: 7665,
  s35_rectifier: 7894,
  s36_both_ends: 8247,

  s37_kw_not_speed: 8469,
  s38_small_pack: 8747,
  s39_big_pack: 9005,
  s40_slower_percent: 9256,
  s41_same_km: 9464,
  s42_real_reason: 9709,
  s43_crate: 9939,
  s43b_home_question: 10203,
  s43c_home_crate: 10420,
  s43d_home_answer: 10659,

  s44_800v_intro: 10912,
  s45_half_current: 11096,
  s46_quarter_heat: 11317,
  s47_less_derate: 11617,

  s48_thai_money: 11819,
  s49_tiered: 12100,
  s50_ladder: 12313,
  s51_per_unit: 12643,
  s52_punch: 12896,
  s53_no_discount: 13150,

  s54_intro: 13351,
  s55_arrive_low: 13541,
  s56_unplug80: 13751,
  s56b_lfp_exception: 13943,
  s56c_lfp_what: 14125,
  s56d_lfp_flat: 14314,
  s56e_lfp_advice: 14558,
  s57_precondition: 14865,
  s58_compare: 15122,

  s59_not_defect: 15380,
  s60_final: 15595,
  tail: 15784,
} as const;
// ---- END GENERATED CUES

// Camera: slow drifts that settle on each diagram. Peak zoom 1.16 with MARGIN_L 170 keeps the
// left edge of every chip inside frame — vox-6 shipped chips that clipped at z=1.18.
const CAM = [
  { f: 0, x: 960, y: 540, z: 1 },
  { f: 600, x: 960, y: 545, z: 1.05 },
  { f: 2600, x: 962, y: 548, z: 1.1 },
  { f: 5200, x: 960, y: 540, z: 1.04 },
  { f: 7800, x: 958, y: 546, z: 1.12 },
  { f: 10200, x: 960, y: 542, z: 1.06 },
  { f: 12600, x: 960, y: 548, z: 1.14 },
  { f: 14600, x: 960, y: 540, z: 1.05 },
  { f: 15840, x: 960, y: 540, z: 1 },
];

// -----------------------------------------------------------------------------
// SHARED HELPERS — same contract as vox-9's, kept identical so the two files read alike.
// -----------------------------------------------------------------------------
const Scene: React.FC<{ from: number; dur: number; children: React.ReactNode }> = ({ from, dur, children }) => (
  <Sequence from={from} durationInFrames={Math.max(1, dur)} layout="none">
    {children}
  </Sequence>
);

const FadeOut: React.FC<{ at: number; dur?: number; children: React.ReactNode }> = ({ at, dur = 18, children }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + dur], [1, 0], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <div style={{ opacity: o }}>{children}</div>;
};

const grow = (frame: number, at: number, d = 24) =>
  interpolate(frame, [at, at + d], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const Plate: React.FC<{ src: string; at: number; pos?: string; dim?: number }> = ({ src, at, pos = '50% 50%', dim = 0.66 }) => {
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

const Prop: React.FC<{ src: string; x: number; y: number; w: number; at: number; rot?: number; caption?: string }> =
  ({ src, x, y, w, at, rot = -1.5, caption }) => {
    const T = useTheme();
    return (
      <Layer x={x} y={y} w={w} at={at} dur={1} enter="pop" rotate={rot} depth={0.08} drift={0.8}>
        <div>
          <Img src={src} style={{ width: '100%', display: 'block' }} />
          {caption ? (
            <div style={{ fontFamily: FONT_TH, fontSize: 21, color: T.inkSoft, marginTop: 10, textAlign: 'center' }}>{caption}</div>
          ) : null}
        </div>
      </Layer>
    );
  };

// A headline that sits in the left column while a diagram occupies the right.
const Head: React.FC<{ at: number; kicker?: string; head: string; sub?: string; y?: number; accent?: string }> =
  ({ at, kicker, head, sub, y = 300, accent }) => {
    const T = useTheme();
    return (
      <Layer x={MARGIN_L + 300} y={y} w={620} at={at} dur={1} enter="rise" depth={0.05} drift={0.4}>
        <div>
          {kicker ? (
            <div style={{ fontFamily: FONT_TH, fontSize: 24, color: accent ?? T.inkSoft, letterSpacing: '0.6px', marginBottom: 12 }}>{kicker}</div>
          ) : null}
          <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 54, lineHeight: 1.28, fontWeight: 700, color: T.ink, letterSpacing: '0.6px' }}>{head}</div>
          {sub ? (
            <div style={{ fontFamily: FONT_TH, fontSize: 27, lineHeight: 1.5, color: T.inkSoft, marginTop: 18, letterSpacing: '0.6px' }}>{sub}</div>
          ) : null}
        </div>
      </Layer>
    );
  };

// =============================================================================
// THE HERO DIAGRAM — CC/CV plotted from the model, not eyeballed.
//
// `curveY` IS the explanation: while the cell is below its voltage ceiling the charger holds
// current constant, so power is flat. Once the ceiling is reached, voltage is pinned and
// current has to fall — power decays. `knee` is the state of charge where that happens.
// Nothing here is fitted to a particular car; the SHAPE is the claim, and the shape is what
// the physics gives. Axis values are deliberately unlabelled in kW: naming a peak would be
// naming a car (rule 1).
// =============================================================================
const KNEE = 55;
const curveY = (p: number) => (p <= KNEE ? 1 : Math.max(0.1, Math.pow(1 - (p - KNEE) / (100 - KNEE), 1.35) * 0.92 + 0.08));

const CurveCCCV: React.FC<{
  at: number;
  showKnee?: boolean;      // mark where CC becomes CV
  showPhases?: boolean;    // shade the two phases
  showWindow?: boolean;    // the 10-80 vs 80-100 comparison
  showPeakLie?: boolean;   // peak vs average
}> = ({ at, showKnee = false, showPhases = false, showWindow = false, showPeakLie = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const x0 = MARGIN_L + 60, y0 = 120, wPlot = 1180, hPlot = 500;
  const soc = (p: number) => x0 + (p / 100) * wPlot;
  const pw = (v: number) => y0 + hPlot - v * hPlot;
  const path = () => {
    const pts: string[] = [];
    for (let p = 0; p <= 100; p += 2) pts.push(`${p === 0 ? 'M' : 'L'} ${soc(p)} ${pw(curveY(p))}`);
    return pts.join(' ');
  };
  const area = () => `${path()} L ${soc(100)} ${y0 + hPlot} L ${soc(0)} ${y0 + hPlot} Z`;
  return (
    <svg viewBox={`0 0 ${W} 760`} style={{ display: 'block', width: W, height: 760, overflow: 'visible' }}>
      <g opacity={grow(frame, at)}>
        <line x1={x0} y1={y0 - 10} x2={x0} y2={y0 + hPlot} stroke={T.inkSoft} strokeWidth={1.8} />
        <line x1={x0} y1={y0 + hPlot} x2={x0 + wPlot} y2={y0 + hPlot} stroke={T.inkSoft} strokeWidth={1.8} />
        <text x={x0 - 18} y={y0 + 6} textAnchor="end" fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft}>กำลัง</text>
        {[0, 20, 40, 60, 80, 100].map((p) => (
          <g key={p}>
            <line x1={soc(p)} y1={y0 + hPlot} x2={soc(p)} y2={y0 + hPlot + 9} stroke={T.inkSoft} strokeWidth={1.5} />
            <text x={soc(p)} y={y0 + hPlot + 36} textAnchor="middle" fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft}>{p}</text>
          </g>
        ))}
        <text x={x0 + wPlot / 2} y={y0 + hPlot + 72} textAnchor="middle" fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft}>ระดับแบต (%)</text>
        <path d={area()} fill={T.yellow} opacity={0.1} />
        <path d={path()} fill="none" stroke={T.yellow} strokeWidth={4.2} strokeLinecap="round" />
      </g>

      {showPhases ? (
        <g opacity={grow(frame, at + 8, 26)}>
          <rect x={soc(0)} y={y0 - 10} width={soc(KNEE) - soc(0)} height={hPlot + 10} fill={T.teal} opacity={0.1} />
          <text x={(soc(0) + soc(KNEE)) / 2} y={y0 + 34} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={31} fontWeight={700} fill={T.teal}>กระแสคงที่</text>
          <text x={(soc(0) + soc(KNEE)) / 2} y={y0 + 70} textAnchor="middle" fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>แรงดันยังไต่ขึ้นได้</text>
          <text x={(soc(KNEE) + soc(100)) / 2} y={y0 + 34} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={31} fontWeight={700} fill={T.red}>แรงดันคงที่</text>
          <text x={(soc(KNEE) + soc(100)) / 2} y={y0 + 70} textAnchor="middle" fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>กระแสต้องลดลง</text>
        </g>
      ) : null}

      {showKnee ? (
        <g opacity={grow(frame, at + 4, 22)}>
          <line x1={soc(KNEE)} y1={y0 - 10} x2={soc(KNEE)} y2={y0 + hPlot} stroke={T.red} strokeWidth={2.6} strokeDasharray="9 7" />
          <circle cx={soc(KNEE)} cy={pw(curveY(KNEE))} r={9} fill={T.red} />
          <text x={soc(KNEE) + 20} y={pw(curveY(KNEE)) - 22} fontFamily={FONT_TH_DISPLAY} fontSize={30} fontWeight={700} fill={T.red}>ชนเพดานแรงดัน</text>
        </g>
      ) : null}

      {showPeakLie ? (
        <g opacity={grow(frame, at, 24)}>
          <line x1={soc(0)} y1={pw(1)} x2={soc(100)} y2={pw(1)} stroke={T.ink} strokeWidth={2} strokeDasharray="6 8" opacity={0.5} />
          <text x={soc(100) + 14} y={pw(1) + 8} fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft}>ตัวเลขบนโบรชัวร์</text>
          <line x1={soc(0)} y1={pw(0.62)} x2={soc(100)} y2={pw(0.62)} stroke={T.yellow} strokeWidth={2.6} />
          <text x={soc(100) + 14} y={pw(0.62) + 8} fontFamily={FONT_TH_DISPLAY} fontSize={26} fontWeight={700} fill={T.yellow}>ค่าเฉลี่ยจริง</text>
        </g>
      ) : null}

      {showWindow ? (
        <g opacity={grow(frame, at, 24)}>
          <rect x={soc(10)} y={y0 - 10} width={soc(80) - soc(10)} height={hPlot + 10} fill="none" stroke={T.teal} strokeWidth={2.6} strokeDasharray="10 7" />
          <rect x={soc(80)} y={y0 - 10} width={soc(100) - soc(80)} height={hPlot + 10} fill={T.red} opacity={0.18} />
          <text x={(soc(10) + soc(80)) / 2} y={y0 + hPlot + 116} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={36} fontWeight={700} fill={T.teal}>10→80% · 18–35 นาที</text>
          <text x={soc(90)} y={y0 + hPlot + 116} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={36} fontWeight={700} fill={T.red}>80→100%</text>
          <text x={soc(90)} y={y0 + hPlot + 156} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={36} fontWeight={700} fill={T.red}>อีก 25–45 นาที</text>
        </g>
      ) : null}
    </svg>
  );
};

// =============================================================================
// CellsBalance — several cells at different levels; the pack waits for the slowest.
// =============================================================================
const CELLS = [0.93, 0.99, 0.9, 0.96, 1.0, 0.88, 0.95, 0.97];
const CellsBalance: React.FC<{ at: number; showWait?: boolean }> = ({ at, showWait = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = grow(frame, at, 30);
  const bw = 96, gap = 26, hMax = 340;
  const x0 = (W - (CELLS.length * bw + (CELLS.length - 1) * gap)) / 2;
  const yBase = 470;
  const slowest = CELLS.indexOf(Math.min(...CELLS));
  return (
    <svg viewBox={`0 0 ${W} 620`} style={{ display: 'block', width: W, height: 620, overflow: 'visible' }}>
      {CELLS.map((v, i) => {
        const x = x0 + i * (bw + gap);
        const h = hMax * v * g;
        const isSlow = showWait && i === slowest;
        return (
          <g key={i}>
            <rect x={x} y={yBase - hMax} width={bw} height={hMax} rx={6} fill="none" stroke={T.inkSoft} strokeWidth={1.6} opacity={0.5} />
            <rect x={x} y={yBase - h} width={bw} height={h} rx={6} fill={isSlow ? T.red : T.teal} opacity={isSlow ? 0.95 : 0.75} />
          </g>
        );
      })}
      <line x1={x0 - 30} y1={yBase - hMax} x2={x0 + CELLS.length * (bw + gap)} y2={yBase - hMax} stroke={T.yellow} strokeWidth={2.4} strokeDasharray="8 6" opacity={g} />
      <text x={x0 + CELLS.length * (bw + gap) + 16} y={yBase - hMax + 8} fontFamily={FONT_TH} fontSize={23} fill={T.yellow} opacity={g}>เพดาน</text>
      {showWait ? (
        <g opacity={grow(frame, at + 12, 24)}>
          <text x={W / 2} y={yBase + 74} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={40} fontWeight={700} fill={T.red}>
            ทั้งแพ็กต้องรอเซลล์ที่ช้าที่สุด
          </text>
        </g>
      ) : null}
    </svg>
  );
};

// =============================================================================
// TwoEndsDerate — the beat nobody else covers: the CHARGER backs off too.
// =============================================================================
const TwoEndsDerate: React.FC<{ at: number; showCar?: boolean; showCharger?: boolean }> =
  ({ at, showCar = false, showCharger = false }) => {
    const T = useTheme();
    const frame = useCurrentFrame();
    const g = grow(frame, at, 26);
    const cy = 300;
    return (
      <svg viewBox={`0 0 ${W} 620`} style={{ display: 'block', width: W, height: 620, overflow: 'visible' }}>
        <g opacity={g}>
          <rect x={MARGIN_L} y={cy - 90} width={330} height={180} rx={12} fill={T.paperDeep} stroke={T.inkSoft} strokeWidth={2.2} />
          <text x={MARGIN_L + 165} y={cy + 10} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={38} fontWeight={700} fill={T.ink}>ตู้ชาร์จ</text>
          <rect x={W - MARGIN_L - 330} y={cy - 90} width={330} height={180} rx={12} fill={T.paperDeep} stroke={T.inkSoft} strokeWidth={2.2} />
          <text x={W - MARGIN_L - 165} y={cy + 10} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={38} fontWeight={700} fill={T.ink}>รถ</text>
          <line x1={MARGIN_L + 330} y1={cy} x2={W - MARGIN_L - 330} y2={cy} stroke={T.ink} strokeWidth={14} strokeLinecap="round" opacity={0.75} />
        </g>
        {showCharger ? (
          <g opacity={grow(frame, at + 6, 22)}>
            <path d={`M ${MARGIN_L + 470} ${cy - 60} L ${MARGIN_L + 360} ${cy - 60}`} stroke={T.red} strokeWidth={7} markerEnd="" strokeLinecap="round" />
            <path d={`M ${MARGIN_L + 372} ${cy - 74} L ${MARGIN_L + 356} ${cy - 60} L ${MARGIN_L + 372} ${cy - 46}`} fill="none" stroke={T.red} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
            <text x={MARGIN_L + 486} y={cy - 52} fontFamily={FONT_TH} fontSize={25} fill={T.red}>ชุดแปลงไฟร้อน · หรี่กำลัง</text>
          </g>
        ) : null}
        {showCar ? (
          <g opacity={grow(frame, at + 6, 22)}>
            <path d={`M ${W - MARGIN_L - 470} ${cy + 60} L ${W - MARGIN_L - 360} ${cy + 60}`} stroke={T.red} strokeWidth={7} strokeLinecap="round" />
            <path d={`M ${W - MARGIN_L - 372} ${cy + 46} L ${W - MARGIN_L - 356} ${cy + 60} L ${W - MARGIN_L - 372} ${cy + 74}`} fill="none" stroke={T.red} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
            <text x={W - MARGIN_L - 486} y={cy + 68} textAnchor="end" fontFamily={FONT_TH} fontSize={25} fill={T.red}>แพ็กร้อน · หรี่กำลัง</text>
          </g>
        ) : null}
        {showCar && showCharger ? (
          <g opacity={grow(frame, at + 18, 24)}>
            <text x={W / 2} y={cy + 210} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={42} fontWeight={700} fill={T.yellow}>
              ปลายสายทั้งสองข้างถอยพร้อมกัน
            </text>
            <text x={W / 2} y={cy + 256} textAnchor="middle" fontFamily={FONT_TH} fontSize={26} fill={T.inkSoft}>
              และไม่มีฝั่งไหนแจ้งให้คุณรู้
            </text>
          </g>
        ) : null}
      </svg>
    );
  };

// =============================================================================
// CrateCompare — same kW into two pack sizes. The arithmetic is the point, so it is drawn
// as arithmetic: the bars are the packs, the fill is one minute of charging.
// =============================================================================
const CrateCompare: React.FC<{ at: number; showBig?: boolean; showVerdict?: boolean; showHome?: boolean }> =
  ({ at, showBig = false, showVerdict = false, showHome = false }) => {
    const T = useTheme();
    const frame = useCurrentFrame();
    const row = (y: number, label: string, kwh: number, pct: string, crate: string, tint: string, on: boolean) => {
      const g = grow(frame, at + (on ? 0 : 0), 24);
      const barW = 620, barX = MARGIN_L + 330;
      const fill = barW * (parseFloat(pct) / 100) * 8;   // one minute, exaggerated 8x to be visible
      return (
        <g opacity={g}>
          <text x={barX - 24} y={y + 12} textAnchor="end" fontFamily={FONT_TH_DISPLAY} fontSize={34} fontWeight={700} fill={T.ink}>{label}</text>
          <rect x={barX} y={y - 34} width={barW} height={68} rx={8} fill="none" stroke={T.inkSoft} strokeWidth={2} />
          <rect x={barX} y={y - 34} width={fill} height={68} rx={8} fill={tint} opacity={0.85} />
          <text x={barX + barW + 26} y={y + 2} fontFamily={FONT_TH_DISPLAY} fontSize={38} fontWeight={700} fill={tint}>{pct}%</text>
          <text x={barX + barW + 26} y={y + 34} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>ต่อนาที · {crate}</text>
        </g>
      );
    };
    return (
      <svg viewBox={`0 0 ${W} 700`} style={{ display: 'block', width: W, height: 700, overflow: 'visible' }}>
        <text x={MARGIN_L} y={60} fontFamily={FONT_TH} fontSize={26} fill={T.inkSoft} opacity={grow(frame, at, 20)}>
          กำลังเท่ากันทั้งคู่ · 150 กิโลวัตต์
        </text>
        {row(190, 'แบต 50', 50, '5.0', '3C', String(BLUEPRINT.teal), true)}
        {showBig ? row(330, 'แบต 100', 100, '2.5', '1.5C', String(BLUEPRINT.yellow), true) : null}
        {showVerdict ? (
          <g opacity={grow(frame, at + 10, 24)}>
            <text x={MARGIN_L} y={470} fontFamily={FONT_TH_DISPLAY} fontSize={40} fontWeight={700} fill={T.ink}>
              แบตใหญ่กว่า เปอร์เซ็นต์ขึ้นช้ากว่า
            </text>
            <text x={MARGIN_L} y={522} fontFamily={FONT_TH} fontSize={28} fill={T.inkSoft}>
              แต่ได้ระยะทางต่อนาทีเท่ากัน — และในชีวิตจริงมันรับกิโลวัตต์ได้มากกว่า
            </text>
          </g>
        ) : null}
        {showHome ? (
          <g opacity={grow(frame, at, 24)}>
            <rect x={MARGIN_L} y={560} width={1580} height={110} rx={10} fill={T.teal} opacity={0.12} stroke={T.teal} strokeWidth={2.4} />
            <text x={MARGIN_L + 34} y={606} fontFamily={FONT_TH} fontSize={25} fill={T.inkSoft}>ชาร์จที่บ้าน · 7 กิโลวัตต์ เข้าแบต 60</text>
            <text x={MARGIN_L + 34} y={650} fontFamily={FONT_TH_DISPLAY} fontSize={36} fontWeight={700} fill={T.teal}>
              ราว 0.12C — ช้าจนไม่เคยแตะเพดาน เส้นโค้งจึงมองไม่เห็น
            </text>
          </g>
        ) : null}
      </svg>
    );
  };

// =============================================================================
// IIR — current halves, heat quarters. Squares, because area IS the square law.
// =============================================================================
const IIRBlocks: React.FC<{ at: number; showAfter?: boolean }> = ({ at, showAfter = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = grow(frame, at, 26);
  const s = 300, y = 200;
  return (
    <svg viewBox={`0 0 ${W} 640`} style={{ display: 'block', width: W, height: 640, overflow: 'visible' }}>
      <g opacity={g}>
        <rect x={MARGIN_L + 170} y={y} width={s} height={s} rx={8} fill={T.inkSoft} opacity={0.55} />
        <text x={MARGIN_L + 170 + s / 2} y={y + s + 52} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={34} fontWeight={700} fill={T.ink}>400 โวลต์</text>
        <text x={MARGIN_L + 170 + s / 2} y={y + s + 92} textAnchor="middle" fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft}>กระแสเต็ม</text>
      </g>
      {showAfter ? (
        <g opacity={grow(frame, at + 8, 26)}>
          <path d={`M ${MARGIN_L + 540} ${y + s / 2} L ${MARGIN_L + 700} ${y + s / 2}`} stroke={T.yellow} strokeWidth={9} strokeLinecap="round" />
          <path d={`M ${MARGIN_L + 682} ${y + s / 2 - 18} L ${MARGIN_L + 704} ${y + s / 2} L ${MARGIN_L + 682} ${y + s / 2 + 18}`} fill="none" stroke={T.yellow} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
          <rect x={MARGIN_L + 760} y={y + s / 2 - s / 4} width={s / 2} height={s / 2} rx={8} fill={T.yellow} opacity={0.95} />
          <text x={MARGIN_L + 760 + s / 4} y={y + s + 52} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={34} fontWeight={700} fill={T.yellow}>800 โวลต์</text>
          <text x={MARGIN_L + 760 + s / 4} y={y + s + 92} textAnchor="middle" fontFamily={FONT_TH} fontSize={24} fill={T.inkSoft}>กระแสครึ่งเดียว</text>
          <text x={MARGIN_L + 1120} y={y + s / 2 + 14} fontFamily={FONT_TH_DISPLAY} fontSize={64} fontWeight={700} fill={T.yellow}>ความร้อน ¼</text>
        </g>
      ) : null}
    </svg>
  );
};

// =============================================================================
// TariffLadder — Thai pricing, with the curve laid over it. The point is that the two move
// in opposite directions: the strongest cabinet costs the most per unit and, past 80%,
// delivers the slowest.
// =============================================================================
const TIERS = [
  { kw: '25 kW', off: '4.90', peak: '5.90' },
  { kw: '50–180 kW', off: '5.90', peak: '6.90' },
  { kw: '300–360 kW', off: '6.90', peak: '7.90' },
];
const TariffLadder: React.FC<{ at: number; showPunch?: boolean }> = ({ at, showPunch = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  return (
    <svg viewBox={`0 0 ${W} 660`} style={{ display: 'block', width: W, height: 660, overflow: 'visible' }}>
      {TIERS.map((t, i) => {
        const g = grow(frame, at + i * 8, 22);
        const bw = 380 + i * 250;
        const y = 120 + i * 130;
        const hot = i === TIERS.length - 1;
        return (
          <g key={t.kw} opacity={g}>
            <rect x={MARGIN_L} y={y} width={bw} height={96} rx={10} fill={hot ? T.red : T.inkSoft} opacity={hot ? 0.85 : 0.35} />
            <text x={MARGIN_L + 28} y={y + 60} fontFamily={FONT_TH_DISPLAY} fontSize={36} fontWeight={700} fill={T.ink}>{t.kw}</text>
            <text x={MARGIN_L + bw + 28} y={y + 60} fontFamily={FONT_TH_DISPLAY} fontSize={36} fontWeight={700} fill={hot ? T.red : T.inkSoft}>
              {t.off}–{t.peak} บาท/หน่วย
            </text>
          </g>
        );
      })}
      {showPunch ? (
        <g opacity={grow(frame, at, 26)}>
          <rect x={MARGIN_L} y={520} width={1580} height={116} rx={10} fill={T.red} opacity={0.14} stroke={T.red} strokeWidth={2.6} />
          <text x={MARGIN_L + 790} y={576} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={40} fontWeight={700} fill={T.red}>
            เกิน 80% บนตู้ที่แรงที่สุด
          </text>
          <text x={MARGIN_L + 790} y={620} textAnchor="middle" fontFamily={FONT_TH} fontSize={28} fill={T.inkSoft}>
            จ่ายในอัตราแพงที่สุด เพื่อรับพลังงานในจังหวะที่ช้าที่สุด
          </text>
        </g>
      ) : null}
    </svg>
  );
};

// =============================================================================
// FourRules — the screenshot frame. The LFP exception is attached to rule 2 IN THE SAME
// FRAME, because channels/ev.json now requires it: advice a viewer applies to their own car
// must carry the case where it does not apply, or the screenshot teaches the wrong thing.
// =============================================================================
const RULES = [
  'มาถึงตู้ตอนแบตเหลือน้อย',
  'ถอดปลั๊กที่ราว 80 แล้วขับต่อ',
  'เปิดฟังก์ชันปรับอุณหภูมิแบตก่อนชาร์จ',
  'เทียบรถด้วยเวลา 10→80% ไม่ใช่กิโลวัตต์สูงสุด',
];
const FourRules: React.FC<{ at: number; upto?: number; showLfp?: boolean }> = ({ at, upto = 4, showLfp = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  return (
    <svg viewBox={`0 0 ${W} 880`} style={{ display: 'block', width: W, height: 880, overflow: 'visible' }}>
      {RULES.slice(0, upto).map((r, i) => {
        const g = grow(frame, at + i * 10, 22);
        // The LFP caveat belongs between rule 2 and rule 3, not over rule 3 (PIPELINE §6 —
        // an element placed in an occupied band draws on top of it). Everything below the
        // caveat moves down by exactly the caveat's height.
        const y = 90 + i * 118 + (showLfp && i >= 2 ? 166 : 0);
        return (
          <g key={i} opacity={g}>
            <circle cx={MARGIN_L + 34} cy={y + 26} r={30} fill={T.yellow} opacity={0.9} />
            <text x={MARGIN_L + 34} y={y + 39} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={34} fontWeight={700} fill={T.paperDeep}>{i + 1}</text>
            <text x={MARGIN_L + 92} y={y + 40} fontFamily={FONT_TH_DISPLAY} fontSize={40} fontWeight={700} fill={T.ink}>{r}</text>
          </g>
        );
      })}
      {showLfp ? (
        <g opacity={grow(frame, at, 26)}>
          <rect x={MARGIN_L + 92} y={330} width={1420} height={132} rx={10} fill={T.teal} opacity={0.14} stroke={T.teal} strokeWidth={2.6} />
          <text x={MARGIN_L + 122} y={378} fontFamily={FONT_TH_DISPLAY} fontSize={30} fontWeight={700} fill={T.teal}>ยกเว้นแบต LFP</text>
          <text x={MARGIN_L + 122} y={426} fontFamily={FONT_TH} fontSize={26} fill={T.ink}>
            หลายยี่ห้อแนะนำให้ชาร์จเต็ม 100 เป็นประจำ เพื่อให้ระบบมีจุดอ้างอิง — ให้ทำตามคู่มือรถ
          </text>
        </g>
      ) : null}
    </svg>
  );
};

// =============================================================================
// TITLE — frame 0 and the last frame are the same picture, which closes the loop.
// =============================================================================
const Title: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  return (
    <>
      <Layer x={960} y={430} w={1400} at={at} dur={1} enter="rise" depth={0.04} drift={0.3}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: FONT_TH, fontSize: 30, color: T.inkSoft, letterSpacing: '0.6px', marginBottom: 22 }}>The EV Insight</div>
          <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 96, fontWeight: 700, color: T.ink, lineHeight: 1.22, letterSpacing: '0.6px' }}>
            ตู้ 360 กิโลวัตต์
          </div>
          <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 96, fontWeight: 700, color: T.yellow, lineHeight: 1.22, letterSpacing: '0.6px' }}>
            แต่จอขึ้น 68
          </div>
        </div>
      </Layer>
      <Layer x={960} y={700} w={1100} at={at + 16} dur={1} enter="fade" depth={0.03} drift={0.2}>
        <div style={{ textAlign: 'center', fontFamily: FONT_TH, fontSize: 32, color: T.inkSoft, letterSpacing: '0.6px' }}>
          และไม่มีอะไรพังสักอย่าง
        </div>
      </Layer>
    </>
  );
};

// =============================================================================
// FILM
// =============================================================================
const Vox10ChargeCurve: React.FC = () => (
  <AbsoluteFill style={{ background: BLUEPRINT.paper }}>
    <CollageBoard cam={CAM} theme="blueprint">
      <PaperBG w={W} h={H} />

      {/* 1 — the scene */}
      <Scene from={0} dur={C.s04_peak_is_a_point - 12}>
        <Plate src={A('charger-post.png')} at={0} pos="50% 46%" dim={0.72} />
        <Title at={0} />
        <FadeOut at={C.s03_nothing_broken - C.s01_scene + 40}>
          <LabelChip at={C.s02_number - C.s01_scene} x={960} y={880} anchor="center"
            text="ตู้บอก 360 · รถรับได้ 150 · จอขึ้น 68" accent={BLUEPRINT.yellow} />
        </FadeOut>
      </Scene>

      {/* 2 — peak is a single point */}
      <Scene from={C.s04_peak_is_a_point} dur={C.s07_cell - C.s04_peak_is_a_point - 12}>
        <Head at={0} kicker="ตัวเลขที่โกหก" head="พีคคือจุดเดียวบนเส้นโค้ง" y={250}
          sub="สิ่งที่กำหนดว่าคุณยืนรอนานแค่ไหน คือค่าเฉลี่ยตลอดช่วง ไม่ใช่จุดสูงสุด" />
        <Layer x={960} y={700} w={W} at={C.s05_average - C.s04_peak_is_a_point} dur={1} enter="fade" depth={0.02} drift={0.2}>
          <CurveCCCV at={0} showPeakLie />
        </Layer>
      </Scene>

      {/* 3 — CC/CV, the mechanism */}
      <Scene from={C.s07_cell} dur={C.s13_why_ceiling - C.s07_cell - 12}>
        <Head at={0} kicker="กลไกที่หนึ่ง" head="กระแสไม่ได้ลดเพราะใครสั่ง" y={210}
          sub="มันลดเพราะเลขคณิต — เพดานแรงดันมาถึงก่อน" accent={BLUEPRINT.yellow} />
        <Layer x={960} y={640} w={W} at={C.s08_cc - C.s07_cell} dur={1} enter="fade" depth={0.02} drift={0.2}>
          <CurveCCCV
            at={0}
            showPhases={true}
            showKnee={false}
          />
        </Layer>
        <Scene from={C.s10_hit - C.s07_cell} dur={C.s13_why_ceiling - C.s10_hit - 12}>
          <Layer x={960} y={640} w={W} at={0} dur={1} enter="none" depth={0.02} drift={0.2}>
            <CurveCCCV at={0} showPhases showKnee />
          </Layer>
        </Scene>
        <LabelChip at={C.s12_arithmetic - C.s07_cell} x={960} y={1000} anchor="center"
          text="ไม่ใช่การตัดสินใจของใคร — มันคือเลขคณิต" accent={BLUEPRINT.yellow} />
      </Scene>

      {/* 4 — why the ceiling exists: plating */}
      <Scene from={C.s13_why_ceiling} dur={C.s23_balance - C.s13_why_ceiling - 12}>
        <Head at={0} kicker="กลไกที่สอง" head="ไอออนต้องแทรกเข้าไป ไม่ใช่กองไว้ข้างบน" y={230}
          sub="กราไฟต์รับได้เร็วระดับหนึ่ง เร็วกว่านั้นมันเกาะเป็นโลหะบนผิว และไม่กลับมาอีก" />
        <Prop src={A('graphite.png')} x={1420} y={560} w={620} at={C.s14_graphite - C.s13_why_ceiling} rot={-1.2}
          caption="ไอออนแทรกอยู่ระหว่างชั้น" />
        <Scene from={C.s17_plating - C.s13_why_ceiling} dur={C.s23_balance - C.s17_plating - 12}>
          <Prop src={A('plating.png')} x={620} y={720} w={640} at={0} rot={1.4}
            caption="เร็วเกินไป — ลิเทียมเกาะเป็นโลหะ" />
          <LabelChip at={C.s19_permanent - C.s17_plating} x={1430} y={880} anchor="center"
            text="ความจุที่หายไปแบบนี้ ไม่กลับมา" accent={BLUEPRINT.red} />
        </Scene>
      </Scene>

      {/* 5 — cell balancing */}
      <Scene from={C.s23_balance} dur={C.s27_numbers - C.s23_balance - 12}>
        <Head at={0} kicker="กลไกที่สาม" head="เซลล์หลายร้อยก้อน ไม่เท่ากันเป๊ะ" y={190} />
        <Layer x={960} y={660} w={W} at={C.s24_cells_differ - C.s23_balance} dur={1} enter="fade" depth={0.02} drift={0.2}>
          <CellsBalance at={0} showWait={true} />
        </Layer>
      </Scene>

      {/* 6 — the last 20% */}
      <Scene from={C.s27_numbers} dur={C.s30_target_temp - C.s27_numbers - 12}>
        <SerifStatement at={0} x={960} y={220} w={1560} size={62}
          words={[{ t: '20% สุดท้าย' }, { t: 'กินเวลามากกว่า' }, { t: '70% แรก', hl: true }]} />
        <Layer x={960} y={680} w={W} at={C.s28_last20 - C.s27_numbers} dur={1} enter="fade" depth={0.02} drift={0.2}>
          <CurveCCCV at={0} showWindow />
        </Layer>
      </Scene>

      {/* 7 — heat, both ends */}
      <Scene from={C.s30_target_temp} dur={C.s37_kw_not_speed - C.s30_target_temp - 12}>
        <Plate src={A('coldplate.png')} at={0} pos="50% 50%" dim={0.8} />
        <Head at={0} kicker="กลไกที่สี่ · และข้อนี้คือเมืองไทย" head="แพ็กอยากอยู่ 20–30 องศา" y={220}
          sub="ระบายความร้อนคือการเอาไปทิ้งในอากาศ ถ้าอากาศ 38 องศา ที่ว่างให้ทิ้งก็เหลือน้อย" />
        <Scene from={C.s34_charger_too - C.s30_target_temp} dur={C.s37_kw_not_speed - C.s34_charger_too - 12}>
          <Prop src={A('rectifier.png')} x={1440} y={330} w={620} at={0} rot={1.1}
            caption="ชุดแปลงไฟในตู้ — ร้อนได้เหมือนกัน" />
          <Layer x={960} y={700} w={W} at={C.s35_rectifier - C.s34_charger_too} dur={1} enter="fade" depth={0.02} drift={0.2}>
            <TwoEndsDerate at={0} showCar showCharger />
          </Layer>
        </Scene>
      </Scene>

      {/* 8 — the unit */}
      <Scene from={C.s37_kw_not_speed} dur={C.s44_800v_intro - C.s37_kw_not_speed - 12}>
        <Head at={0} kicker="กลไกที่ห้า" head="กิโลวัตต์ไม่ใช่หน่วยของความเร็ว" y={155} />
        <Layer x={960} y={690} w={W} at={C.s38_small_pack - C.s37_kw_not_speed} dur={1} enter="fade" depth={0.02} drift={0.2}>
          <CrateCompare
            at={0}
            showBig={true}
            showVerdict={true}
            showHome={false}
          />
        </Layer>
        <Scene from={C.s43b_home_question - C.s37_kw_not_speed} dur={C.s44_800v_intro - C.s43b_home_question - 12}>
          <Layer x={960} y={690} w={W} at={0} dur={1} enter="fade" depth={0.02} drift={0.2}>
            <CrateCompare at={0} showBig showVerdict showHome />
          </Layer>
        </Scene>
      </Scene>

      {/* 9 — 800V */}
      <Scene from={C.s44_800v_intro} dur={C.s48_thai_money - C.s44_800v_intro - 12}>
        <Head at={0} kicker="กลไกที่หก" head="กำลังสูญเสียแปรตามกระแสยกกำลังสอง" y={200} />
        <Layer x={960} y={660} w={W} at={C.s45_half_current - C.s44_800v_intro} dur={1} enter="fade" depth={0.02} drift={0.2}>
          <IIRBlocks at={0} showAfter />
        </Layer>
      </Scene>

      {/* 10 — money */}
      <Scene from={C.s48_thai_money} dur={C.s54_intro - C.s48_thai_money - 12}>
        <Head at={0} kicker="และมันกลายเป็นเงิน" head="ค่าไฟคิดตามกำลังของตู้" y={170} />
        <Layer x={960} y={640} w={W} at={C.s49_tiered - C.s48_thai_money} dur={1} enter="fade" depth={0.02} drift={0.2}>
          <TariffLadder at={0} showPunch={true} />
        </Layer>
      </Scene>

      {/* 11 — the four rules, with the LFP exception in the same frame */}
      <Scene from={C.s54_intro} dur={C.s59_not_defect - C.s54_intro - 12}>
        <Head at={0} kicker="สรุป" head="สี่ข้อที่ทำได้จริง" y={140} />
        <Layer x={960} y={640} w={W} at={C.s55_arrive_low - C.s54_intro} dur={1} enter="fade" depth={0.02} drift={0.2}>
          <FourRules at={0} upto={4} showLfp={true} />
        </Layer>
      </Scene>

      {/* 12 — close, back to the opening picture */}
      <Sequence from={C.s59_not_defect} layout="none">
        <Plate src={A('charger-post.png')} at={0} pos="50% 46%" dim={0.72} />
        <Title at={4} />
        <Layer x={960} y={890} w={1300} at={40} dur={1} enter="fade" depth={0.04} drift={0.3}>
          <div style={{ textAlign: 'center', fontFamily: FONT_TH, fontSize: 30, color: BLUEPRINT.inkSoft, letterSpacing: '0.6px' }}>
            ไม่ใช่ข้อบกพร่อง — คือราคาของการอัดพลังงานให้เร็วที่สุดเท่าที่สารเคมีจะยอม
          </div>
        </Layer>
      </Sequence>
    </CollageBoard>
    <Grain opacity={0.04} />
  </AbsoluteFill>
);

export default Vox10ChargeCurve;
