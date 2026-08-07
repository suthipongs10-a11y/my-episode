import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import {
  BLUEPRINT,
  CollageBoard,
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
// "ไม่ใช่แรงดัน แต่เป็นกระแส" — vox-4, The EV Insight
// Facts + sources + the deliberate omissions: vox-shorts/vox-4-ev-800v/script.md
//
// The mechanism, which is what this channel owes its audience: power is V×I, so the same power
// is available two ways — but resistive loss is I²R, not I×R. Halve the current and the heat
// falls to a QUARTER. 800V does not push harder; it gets the same power with less current, and
// current is what limits everything downstream.
//
// NOTHING HERE IS A GENERATED IMAGE. Every element is drawn, and for this topic that is a
// correctness requirement rather than a saving: the two heat squares must ACTUALLY differ by
// 4x in area, because the whole argument is a quantitative relationship. An illustration that
// merely looks explanatory would break the same rule that forbids an AI painting inside a
// document frame.
//
// TIMING IS PROVISIONAL — the voice has not been recorded. Every CUE below comes from
// beats.json's ESTIMATED windows. After Umbriel is generated, --retime and push every cue and
// camera keyframe through the piecewise-linear map (PIPELINE §8). Leda ran 10% off Algieba on
// an identical script; assume Umbriel can too.
// =============================================================================
export const compositionConfig = {
  id: 'Vox4Ev800V',
  durationInSeconds: 52,
  fps: 30,
  width: 1080,
  height: 1920,
};

const W = 1080;
const H = 1920;

const CUE = {
  // Hook: negative so frame 0 is the finished page — thumbnail and loop point both.
  hookTitle: -46,
  hookBadges: -30,

  // s02 equation  f165-393
  eqCard: 158,
  pathThick: 206,
  pathThin: 250,

  // s03 mechanism  f411-675 — the payoff of the whole video
  sqCard: 408,
  sqBig: 448,
  sqSmall: 512,
  sqVerdict: 566,

  // s04 result  f693-987
  packIn: 690,
  cableCmp: 748,
  specChip: 830,

  // s05 tradeoff  f1005-1293
  devCard: 1000,
  sicRow: 1078,
  costStamp: 1180,

  // s06 twist  f1311-1479
  twistCard: 1306,
  titleBack: 1440,
} as const;

const CAM = [
  { f: 0, x: 540, y: 960, z: 1 },
  { f: 160, x: 540, y: 960, z: 1.05 },
  { f: 300, x: 540, y: 980, z: 1.14 },
  { f: 430, x: 540, y: 1000, z: 1.18 },
  { f: 600, x: 542, y: 1004, z: 1.26 },
  { f: 700, x: 540, y: 960, z: 1.06 },
  { f: 970, x: 542, y: 962, z: 1.08 },
  { f: 1050, x: 540, y: 985, z: 1.14 },
  { f: 1290, x: 540, y: 988, z: 1.16 },
  { f: 1360, x: 540, y: 975, z: 1.04 },
  { f: 1470, x: 540, y: 960, z: 1 },
  { f: 1559, x: 540, y: 960, z: 1 },
];

const TITLE_WORDS = [{ t: 'ไม่ใช่แรงดัน' }, { t: 'แต่เป็นกระแส', hl: true }];

// =============================================================================
// SHOT-LOCAL PIECES
// =============================================================================

const Grid: React.FC = () => {
  const T = useTheme();
  const minor = 40;
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= W * 1.2; x += minor)
    lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={H * 1.2} stroke={T.inkSoft} strokeWidth={x % 200 === 0 ? 1.1 : 0.5} opacity={x % 200 === 0 ? 0.3 : 0.14} />);
  for (let y = 0; y <= H * 1.2; y += minor)
    lines.push(<line key={`h${y}`} x1={0} y1={y} x2={W * 1.2} y2={y} stroke={T.inkSoft} strokeWidth={y % 200 === 0 ? 1.1 : 0.5} opacity={y % 200 === 0 ? 0.3 : 0.14} />);
  return (
    <div style={{ position: 'absolute', left: -W * 0.1, top: -H * 0.1 }}>
      <svg viewBox={`0 0 ${W * 1.2} ${H * 1.2}`} style={{ display: 'block', width: W * 1.2, height: H * 1.2 }}>{lines}</svg>
    </div>
  );
};

// A panel of technical type. Cards are 760 wide against a peak zoom of 1.26 (visible board
// 857px) — width and max zoom are one decision, which is the defect vox-3's QA caught.
const Panel: React.FC<{
  at: number; y: number; kicker: string; head: string; sub?: string;
  headSize?: number; accent?: string; mono?: boolean; children?: React.ReactNode;
}> = ({ at, y, kicker, head, sub, headSize = 44, accent, mono = false, children }) => {
  const T = useTheme();
  return (
    <Layer x={540} y={y} w={760} at={at} dur={14} enter="place" rotate={0.4} depth={0.03} drift={0.4}>
      <div style={{ background: T.cream, padding: '32px 40px 36px', borderLeft: `8px solid ${accent ?? T.teal}`, boxShadow: '0 14px 32px rgba(0,0,0,0.45)' }}>
        <div style={{ fontFamily: FONT_TH, fontSize: 21, fontWeight: 600, color: accent ?? T.teal, marginBottom: 10 }}>{kicker}</div>
        <div style={{ fontFamily: mono ? FONT_TH_DISPLAY : FONT_TH_DISPLAY, fontSize: headSize, fontWeight: 700, color: T.ink, lineHeight: 1.3, letterSpacing: mono ? 2 : 0 }}>{head}</div>
        {sub ? <div style={{ fontFamily: FONT_TH, fontSize: 25, fontWeight: 400, color: T.inkSoft, lineHeight: 1.45, marginTop: 14 }}>{sub}</div> : null}
        {children}
      </div>
    </Layer>
  );
};

// Two conductors carrying the same POWER. The thick one is the 400V case at double the
// current; stroke width is proportional to current, so the picture states the trade directly.
const CurrentPaths: React.FC<{ atThick: number; atThin: number }> = ({ atThick, atThin }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const grow = (at: number) => interpolate(frame, [at, at + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <svg viewBox={`0 0 ${W} 340`} style={{ display: 'block', width: W, height: 340, overflow: 'visible' }}>
      {[
        { y: 90, at: atThick, sw: 26, label: '400V · กระแส 2I', c: T.red },
        { y: 240, at: atThin, sw: 13, label: '800V · กระแส I', c: T.teal },
      ].map((r) => (
        <g key={r.y} opacity={grow(r.at)}>
          <line x1={190} y1={r.y} x2={190 + 620 * grow(r.at)} y2={r.y} stroke={r.c} strokeWidth={r.sw} strokeLinecap="round" opacity={0.85} />
          <text x={190} y={r.y - r.sw / 2 - 18} fontFamily={FONT_TH} fontSize={26} fontWeight={600} fill={T.ink}>{r.label}</text>
        </g>
      ))}
      <text x={190} y={320} fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft}>ความหนาของเส้น = ขนาดกระแส · กำลังเท่ากันทั้งสองเส้น</text>
    </svg>
  );
};

// THE payoff. Two squares whose AREAS are the heat. Side length is proportional to current,
// so the areas land at 4:1 by construction rather than by choosing two nice-looking sizes —
// which is the only honest way to draw a squared relationship.
const HeatSquares: React.FC<{ atBig: number; atSmall: number; atVerdict: number }> = ({ atBig, atSmall, atVerdict }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (at: number) => interpolate(frame, [at, at + 22], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const unit = 108; // px per unit of CURRENT; area therefore scales as the square
  const big = unit * 2;
  const small = unit * 1;
  const baseY = 400;
  return (
    <svg viewBox={`0 0 ${W} 470`} style={{ display: 'block', width: W, height: 470, overflow: 'visible' }}>
      <g opacity={g(atBig)}>
        <rect x={180} y={baseY - big} width={big} height={big} fill={T.red} opacity={0.28} stroke={T.red} strokeWidth={2.6} />
        <text x={180 + big / 2} y={baseY + 36} textAnchor="middle" fontFamily={FONT_TH} fontSize={27} fontWeight={600} fill={T.ink}>กระแส 2I</text>
        <text x={180 + big / 2} y={baseY - big / 2 + 10} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={54} fontWeight={700} fill={T.ink}>4</text>
      </g>
      <g opacity={g(atSmall)}>
        <rect x={660} y={baseY - small} width={small} height={small} fill={T.teal} opacity={0.34} stroke={T.teal} strokeWidth={2.6} />
        <text x={660 + small / 2} y={baseY + 36} textAnchor="middle" fontFamily={FONT_TH} fontSize={27} fontWeight={600} fill={T.ink}>กระแส I</text>
        <text x={660 + small / 2} y={baseY - small / 2 + 10} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={40} fontWeight={700} fill={T.ink}>1</text>
      </g>
      <text x={540} y={baseY + 96} textAnchor="middle" fontFamily={FONT_TH} fontSize={25} fill={T.inkSoft} opacity={g(atVerdict)}>
        พื้นที่ = ความร้อนที่เสียไป · วาดตามสัดส่วนจริง
      </text>
    </svg>
  );
};

// The pack, reused from the skin proof. Simplified plan of a prismatic-cell pack: modules in a
// row under a common busbar.
const PackPlan: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const MOD = 6, CELLS = 4, mw = 122, mh = 264, gap = 13;
  const x0 = (W - (MOD * mw + (MOD - 1) * gap)) / 2;
  return (
    <svg viewBox={`0 0 ${W} 400`} style={{ display: 'block', width: W, height: 400, overflow: 'visible' }}>
      {Array.from({ length: MOD }, (_, m) => {
        const p = interpolate(frame, [at + m * 4, at + m * 4 + 12], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const mx = x0 + m * (mw + gap);
        return (
          <g key={m} opacity={p}>
            <rect x={mx} y={60} width={mw} height={mh} fill="none" stroke={T.ink} strokeWidth={2.2} />
            {Array.from({ length: CELLS }, (_, c) => (
              <rect key={c} x={mx + 9} y={72 + c * ((mh - 24) / CELLS)} width={mw - 18} height={(mh - 24) / CELLS - 8}
                fill={T.teal} opacity={0.22} stroke={T.teal} strokeWidth={1.3} />
            ))}
          </g>
        );
      })}
      <line x1={x0 - 26} y1={38} x2={x0 + MOD * mw + (MOD - 1) * gap + 26} y2={38} stroke={T.yellow} strokeWidth={5} strokeLinecap="round"
        opacity={interpolate(frame, [at + 26, at + 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
    </svg>
  );
};

const SceneFade: React.FC<{ out: number; dur?: number; children: React.ReactNode }> = ({ out, dur = 18, children }) => {
  const frame = useCurrentFrame();
  return <div style={{ opacity: interpolate(frame, [out - dur, out], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>{children}</div>;
};

// Frame 0 was two chips and a lot of empty grid. It is the thumbnail AND the loop point, so it
// has to be the finished page — and the thing that fills it should preview the argument rather
// than decorate: one thick conductor beside 400V, one half as thick beside 800V. A viewer who
// only sees the thumbnail already has the video's claim.
const HookPaths: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const grow = (d: number) => interpolate(frame, [at + d, at + d + 22], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <svg viewBox={`0 0 ${W} 420`} style={{ display: 'block', width: W, height: 420, overflow: 'visible' }}>
      {[
        { y: 60, sw: 30, c: T.red, d: 0 },
        { y: 300, sw: 15, c: T.teal, d: 10 },
      ].map((r) => (
        <line key={r.y} x1={430} y1={r.y} x2={430 + 520 * grow(r.d)} y2={r.y}
          stroke={r.c} strokeWidth={r.sw} strokeLinecap="round" opacity={0.85} />
      ))}
    </svg>
  );
};

const Hook: React.FC<{ titleAt: number; badgeAt: number }> = ({ titleAt, badgeAt }) => (
  <>
    <SerifStatement x={540} y={640} w={960} at={titleAt} size={74} words={TITLE_WORDS} />
    <LabelChip x={110} y={1010} at={badgeAt} anchor="left" text="400 โวลต์" kicker="สถาปัตยกรรมเดิม" accent={BLUEPRINT.red} size={38} rotate={-1.5} z={6} />
    <LabelChip x={110} y={1250} at={badgeAt + 12} anchor="left" text="800 โวลต์" kicker="สถาปัตยกรรมใหม่" accent={BLUEPRINT.teal} size={38} rotate={1.2} z={6} />
    <Layer x={540} y={1130} w={W} at={badgeAt} dur={1} enter="none" depth={0.06} drift={0.3}>
      <HookPaths at={badgeAt + 6} />
    </Layer>
    <LabelChip x={110} y={1520} at={badgeAt + 26} anchor="left" text="ความหนา = ขนาดกระแส" kicker="กำลังเท่ากันทั้งคู่" accent={BLUEPRINT.yellow} kickerColor={BLUEPRINT.inkSoft} size={28} rotate={-0.8} z={6} />
  </>
);

const Vox4Ev800V: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: BLUEPRINT.paper }}>
    <CollageBoard cam={CAM} fontBody={FONT_TH} fontDisplay={FONT_TH_DISPLAY} tracking="0.6px" theme="blueprint">
      <PaperBG w={W} h={H} />
      <Grid />

      {/* ---- HOOK ---- */}
      <Sequence from={0} durationInFrames={184} layout="none">
        <SceneFade out={162}>
          <Hook titleAt={CUE.hookTitle} badgeAt={CUE.hookBadges} />
        </SceneFade>
      </Sequence>

      {/* ---- P = V x I : the same power, two ways ---- */}
      <Sequence from={CUE.eqCard} durationInFrames={260} layout="none">
        <SceneFade out={256}>
          <Panel at={0} y={720} kicker="กำลังไฟฟ้า" head="P = V × I" headSize={62} mono
            sub="กำลังเท่ากัน ได้จากแรงดันต่ำ+กระแสสูง หรือแรงดันสูง+กระแสต่ำ" />
          <Layer x={540} y={1330} w={W} at={CUE.pathThick - CUE.eqCard} dur={1} enter="none" depth={0.05} drift={0.3}>
            <CurrentPaths atThick={0} atThin={CUE.pathThin - CUE.pathThick} />
          </Layer>
        </SceneFade>
      </Sequence>

      {/* ---- THE MECHANISM: heat goes as the SQUARE ---- */}
      <Sequence from={CUE.sqCard} durationInFrames={295} layout="none">
        <SceneFade out={291}>
          <Panel at={0} y={660} kicker="ความร้อนที่เสียไปในตัวนำ" head="P = I² × R" headSize={62} mono accent={BLUEPRINT.yellow}
            sub="ยกกำลังสอง ไม่ใช่เชิงเส้น — นี่คือทั้งเรื่อง" />
          <Layer x={540} y={1290} w={W} at={CUE.sqBig - CUE.sqCard} dur={1} enter="none" depth={0.05} drift={0.3}>
            <HeatSquares atBig={0} atSmall={CUE.sqSmall - CUE.sqBig} atVerdict={CUE.sqVerdict - CUE.sqBig} />
          </Layer>
          <Sequence from={CUE.sqVerdict - CUE.sqCard} layout="none">
            <SerifStatement x={540} y={1660} w={920} at={0} size={44} backing
              words={[{ t: 'ครึ่งกระแส' }, { t: 'เหลือหนึ่งในสี่', hl: true }]} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- what that buys ---- */}
      <Sequence from={CUE.packIn} durationInFrames={300} layout="none">
        <SceneFade out={296}>
          <Layer x={540} y={880} w={W} at={0} dur={18} enter="place" rotate={0.3} depth={0} drift={0.3}>
            <PackPlan at={4} />
          </Layer>
          <Sequence from={CUE.cableCmp - CUE.packIn} layout="none">
            <Panel at={0} y={1310} kicker="ผลที่ตามมา" head="สายเล็กลง เบาลง ร้อนน้อยลง" headSize={40}
              sub="ตู้ชาร์จจึงดันกำลังสูงค้างไว้ได้นานกว่า ก่อนต้องลดเพราะความร้อน" />
          </Sequence>
          <Sequence from={CUE.specChip - CUE.packIn} layout="none">
            <LabelChip x={130} y={1640} at={0} anchor="left" text="320 kW · 10→80% ~18 นาที" kicker="Porsche Taycan · 800V" accent={BLUEPRINT.teal} size={30} rotate={-1.2} z={6} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- the trade: the switches have to change ---- */}
      <Sequence from={CUE.devCard} durationInFrames={310} layout="none">
        <SceneFade out={306}>
          <Panel at={0} y={800} kicker="ข้อแลก" head="สวิตช์ต้องเปลี่ยนทั้งชุด" headSize={44} accent={BLUEPRINT.red}
            sub="IGBT ซิลิคอนของระบบ 400V ทนได้ราว 650 โวลต์ — พอที่ 400V ไม่พอที่ 800V" />
          <Sequence from={CUE.sicRow - CUE.devCard} layout="none">
            <LabelChip x={130} y={1180} at={0} anchor="left" text="IGBT ซิลิคอน · 650V" kicker="ใช้ไม่ได้ที่ 800V" accent={BLUEPRINT.red} size={30} rotate={-1.4} z={6} />
            <SketchArrow id="to-sic" d={`M 230 1250 Q 280 1310 240 1372`} vb={{ w: W, h: H }} at={14} dur={16} head color={BLUEPRINT.inkSoft} width={3} />
            <LabelChip x={130} y={1430} at={22} anchor="left" text="SiC MOSFET · 1200V" kicker="ต้องใช้ตัวนี้แทน" accent={BLUEPRINT.teal} size={30} rotate={1.1} z={6} />
          </Sequence>
          <Sequence from={CUE.costStamp - CUE.devCard} layout="none">
            <RubberStamp text="แพงกว่า" x={760} y={1620} at={0} size={48} rotate={-9} z={7} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- twist: the number on the sign is the charger's ---- */}
      <Sequence from={CUE.twistCard} durationInFrames={150} layout="none">
        <SceneFade out={146}>
          <Panel at={0} y={980} kicker="อ่านสเปกให้ถูก" head="350 kW คือกำลังของตู้" headSize={50} accent={BLUEPRINT.yellow}
            sub="ไม่ใช่กำลังที่รถรับได้จริง — รถไม่ได้แตะตัวเลขนั้น" />
        </SceneFade>
      </Sequence>

      {/* ---- LOOP ---- */}
      <Sequence from={CUE.titleBack} layout="none">
        <Hook titleAt={4} badgeAt={14} />
      </Sequence>
    </CollageBoard>
    <Grain opacity={0.04} />
  </AbsoluteFill>
);

export default Vox4Ev800V;
