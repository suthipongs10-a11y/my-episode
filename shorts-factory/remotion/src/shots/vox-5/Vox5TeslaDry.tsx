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
// "เทคโนโลยีใหม่ล่าสุด คือการเอาเครื่องจักรออก" — vox-5, The EV Insight
// Facts, sources and the deliberate omissions: vox-shorts/vox-5-tesla-dry/script.md
//
// The mechanism: making a battery electrode the conventional way dissolves the binder in NMP,
// coats it on foil, then drives the solvent off in an oven that can be tens of metres long and
// recovers it afterwards. That drying-and-recovery pair is ~40% of cell manufacturing cost and
// is the line's SPEED LIMIT — going faster means building a longer oven. The dry process
// fibrillates the powder with PTFE and presses it straight onto the foil, so all of it goes.
//
// SEVEN PHOTOGRAPHIC LAYERS, and none of them claims to be a Tesla product. Every Tesla-specific
// claim lives on a typeset card with its source. Same rule that made vox-3 typeset the 1945
// memo instead of generating a picture of old paper.
//
// The car took two attempts. The first, prompted "must not resemble any specific real
// manufacturer, no badges", came back as a Model Y in all but name — because a "modern EV
// crossover" IS a Model Y in the model's training data. It is kept as car-modelY-lookalike.png
// and must not be used. Telling a model what NOT to look like does not work; specifying a
// genuinely different form (small orange city hatchback, steel wheels) does.
//
// TIMING IS PROVISIONAL — no voice yet. See beats.json, and PIPELINE §8 before retiming.
// =============================================================================
export const compositionConfig = {
  id: 'Vox5TeslaDry',
  durationInSeconds: 54,
  fps: 30,
  width: 1080,
  height: 1920,
};

const W = 1080;
const H = 1920;
const asset = (f: string) => staticFile(`projects/vox-5-tesla-dry/layers/${f}`);

const CUE = {
  hookTitle: -46,
  hookCar: -34,
  hookCell: -20,

  // s02 wet  f207-435
  powderIn: 200,
  foilIn: 250,
  nmpCard: 300,

  // s03 oven  f453-717 — the hero image
  ovenIn: 448,
  ovenChip: 520,
  recoverChip: 600,

  // s04 cost  f735-1041
  costCard: 730,
  costBar: 790,
  limitLine: 900,

  // s05 dry  f1059-1347
  rollersIn: 1050,
  dryCard: 1110,
  strike: 1210,

  // s06 twist  f1365-1623
  cellIn: 1360,
  robotIn: 1400,
  gigaCard: 1440,
  titleBack: 1520,
} as const;

const CAM = [
  { f: 0, x: 540, y: 960, z: 1 },
  { f: 200, x: 540, y: 960, z: 1.05 },
  { f: 330, x: 540, y: 985, z: 1.12 },
  { f: 440, x: 540, y: 990, z: 1.14 },
  { f: 520, x: 540, y: 940, z: 1.02 },
  { f: 720, x: 540, y: 945, z: 1.04 },
  { f: 820, x: 540, y: 990, z: 1.12 },
  { f: 1040, x: 542, y: 992, z: 1.14 },
  { f: 1120, x: 540, y: 975, z: 1.08 },
  { f: 1350, x: 540, y: 978, z: 1.1 },
  { f: 1430, x: 540, y: 970, z: 1.04 },
  { f: 1540, x: 540, y: 960, z: 1 },
  { f: 1619, x: 540, y: 960, z: 1 },
];

const TITLE_WORDS = [{ t: 'เทคโนโลยีใหม่ล่าสุด' }, { t: 'คือการเอาเครื่องจักรออก', hl: true }];

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
}> = ({ at, y, kicker, head, sub, headSize = 42, accent, w = 760 }) => {
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

// 40% of cell manufacturing cost, drawn as 40% of the bar. Same discipline as vox-4's heat
// squares: the number and the picture have to be the same statement.
const CostBar: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = interpolate(frame, [at, at + 34], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const BW = 800;
  return (
    <Layer x={540} y={1360} w={880} at={at} dur={14} enter="rise" depth={0.05} drift={0.4}>
      <div style={{ background: T.cream, padding: '30px 38px 34px', boxShadow: '0 12px 28px rgba(0,0,0,0.5)' }}>
        <div style={{ fontFamily: FONT_TH, fontSize: 23, fontWeight: 600, color: T.red, marginBottom: 18 }}>ต้นทุนการผลิตเซลล์ทั้งหมด</div>
        <svg viewBox={`0 0 ${BW} 118`} style={{ display: 'block', width: BW, height: 118, overflow: 'visible' }}>
          <rect x={0} y={0} width={BW} height={56} fill={T.inkSoft} opacity={0.22} />
          <rect x={0} y={0} width={BW * 0.4 * g} height={56} fill={T.red} opacity={0.85} />
          <text x={BW * 0.4 + 18} y={38} fontFamily={FONT_TH_DISPLAY} fontSize={40} fontWeight={700} fill={T.ink} opacity={g}>40%</text>
          <text x={0} y={100} fontFamily={FONT_TH} fontSize={24} fill={T.ink}>อบไล่ตัวทำละลาย + เก็บกลับคืน</text>
        </svg>
      </div>
    </Layer>
  );
};

const SceneFade: React.FC<{ out: number; dur?: number; children: React.ReactNode }> = ({ out, dur = 18, children }) => {
  const frame = useCurrentFrame();
  return <div style={{ opacity: interpolate(frame, [out - dur, out], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>{children}</div>;
};

const Hook: React.FC<{ titleAt: number; carAt: number; cellAt: number }> = ({ titleAt, carAt, cellAt }) => (
  <>
    <SerifStatement x={540} y={560} w={980} at={titleAt} size={62} words={TITLE_WORDS} />
    <Cutout src={asset('car.png')} x={520} y={1090} w={720} at={carAt} enter="slide-l" rotate={-1.2} depth={0.08} sticker={0} shadow={3} />
    <Cutout src={asset('cell.png')} x={790} y={1500} w={200} at={cellAt} enter="place" rotate={4} depth={0.12} sticker={0} shadow={2} />
    <LabelChip x={110} y={1520} at={cellAt + 8} anchor="left" text="เซลล์ 4680" kicker="แบตเตอรี่ที่อยู่ในนั้น" accent={BLUEPRINT.teal} size={32} rotate={-1.2} z={6} />
  </>
);

const Vox5TeslaDry: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: BLUEPRINT.paper }}>
    <CollageBoard cam={CAM} fontBody={FONT_TH} fontDisplay={FONT_TH_DISPLAY} tracking="0.6px" theme="blueprint">
      <PaperBG w={W} h={H} />
      <Grid />

      {/* ---- HOOK ---- */}
      <Sequence from={0} durationInFrames={224} layout="none">
        <SceneFade out={202}>
          <Hook titleAt={CUE.hookTitle} carAt={CUE.hookCar} cellAt={CUE.hookCell} />
        </SceneFade>
      </Sequence>

      {/* ---- the wet way: powder + solvent onto foil ---- */}
      <Sequence from={CUE.powderIn} durationInFrames={262} layout="none">
        <SceneFade out={258}>
          <Cutout src={asset('powder.png')} x={330} y={760} w={420} at={0} enter="place" rotate={-2} depth={0.1} sticker={0} shadow={2} />
          <Sequence from={CUE.foilIn - CUE.powderIn} layout="none">
            <Cutout src={asset('foil.png')} x={760} y={1120} w={420} at={0} enter="slide-r" rotate={2.5} depth={0.09} sticker={0} shadow={3} />
            <SketchArrow id="powder-to-foil" d={`M 470 880 Q 610 980 700 1040`} vb={{ w: W, h: H }} at={10} dur={18} head color={BLUEPRINT.inkSoft} width={3.4} />
          </Sequence>
          <Sequence from={CUE.nmpCard - CUE.powderIn} layout="none">
            <Panel at={0} y={1560} kicker="วิธีเดิม · wet slurry" head="ต้องละลายในตัวทำละลาย NMP" headSize={38} accent={BLUEPRINT.red}
              sub="ระเหยง่ายและเป็นพิษ — ปล่อยทิ้งไม่ได้" />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- THE HERO IMAGE: the oven, and its length ---- */}
      <Sequence from={CUE.ovenIn} durationInFrames={278} layout="none">
        <SceneFade out={274}>
          <Cutout src={asset('oven.png')} x={560} y={900} w={1010} at={0} enter="slide-r" rotate={-0.8} depth={0.06} sticker={0} shadow={3} />
          <Sequence from={CUE.ovenChip - CUE.ovenIn} layout="none">
            <LabelChip x={110} y={1300} at={0} anchor="left" text="ยาวได้หลายสิบเมตร" kicker="เตาอบไล่ตัวทำละลาย" accent={BLUEPRINT.yellow} kickerColor={BLUEPRINT.inkSoft} size={34} rotate={-1.3} z={6} />
          </Sequence>
          <Sequence from={CUE.recoverChip - CUE.ovenIn} layout="none">
            <LabelChip x={110} y={1500} at={0} anchor="left" text="ต้องเก็บ NMP กลับคืนอีกระบบ" kicker="แล้วยังไม่จบ" accent={BLUEPRINT.red} size={30} rotate={1.1} z={6} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- what it costs ---- */}
      <Sequence from={CUE.costCard} durationInFrames={320} layout="none">
        <SceneFade out={316}>
          <Panel at={0} y={760} kicker="ราคาของสองขั้นตอนนั้น" head="กินพลังงานมากที่สุดในกระบวนการ" headSize={38} accent={BLUEPRINT.red} />
          <Sequence from={CUE.costBar - CUE.costCard} layout="none">
            <CostBar at={0} />
          </Sequence>
          <Sequence from={CUE.limitLine - CUE.costCard} layout="none">
            <SerifStatement x={540} y={1700} w={940} at={0} size={38} backing
              words={[{ t: 'อยากเดินสายเร็วขึ้น' }, { t: 'ต้องต่อเตาให้ยาวขึ้น', hl: true }]} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- the dry way ---- */}
      <Sequence from={CUE.rollersIn} durationInFrames={310} layout="none">
        <SceneFade out={306}>
          <Cutout src={asset('rollers.png')} x={560} y={840} w={780} at={0} enter="place" rotate={1} depth={0.08} sticker={0} shadow={3} />
          <Cutout src={asset('powder.png')} x={200} y={620} w={280} at={8} enter="slide-l" rotate={-3} depth={0.12} sticker={0} shadow={2} />
          <SketchArrow id="powder-direct" d={`M 300 720 Q 400 780 470 812`} vb={{ w: W, h: H }} at={18} dur={16} head color={BLUEPRINT.teal} width={3.4} />
          <Sequence from={CUE.dryCard - CUE.rollersIn} layout="none">
            <Panel at={0} y={1290} kicker="วิธีใหม่ · dry electrode" head="อัดผงติดฟอยล์ตรงๆ" headSize={44} accent={BLUEPRINT.teal}
              sub="ผงเกิดเส้นใยด้วยสารยึดเกาะ PTFE — ไม่ต้องละลายอะไรเลย" />
          </Sequence>
          <Sequence from={CUE.strike - CUE.rollersIn} layout="none">
            <LabelChip x={110} y={1580} at={0} anchor="left" text="ไม่มีตัวทำละลาย · ไม่มีเตา · ไม่มีระบบเก็บคืน" kicker="สิ่งที่หายไป" accent={BLUEPRINT.yellow} kickerColor={BLUEPRINT.inkSoft} size={28} rotate={-0.9} z={6} />
            <RubberStamp text="ลบทิ้งทั้งหมด" x={740} y={1660} at={14} size={40} rotate={-8} z={7} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- twist: the newest technology is a subtraction ---- */}
      <Sequence from={CUE.cellIn} durationInFrames={180} layout="none">
        <SceneFade out={176}>
          <Cutout src={asset('cell.png')} x={310} y={880} w={210} at={0} enter="place" rotate={-3} depth={0.12} sticker={0} shadow={3} />
          <Sequence from={CUE.robotIn - CUE.cellIn} layout="none">
            <Cutout src={asset('robot.png')} x={700} y={800} w={620} at={0} enter="slide-r" rotate={2} depth={0.07} sticker={0} shadow={3} />
          </Sequence>
          <Sequence from={CUE.gigaCard - CUE.cellIn} layout="none">
            <Panel at={0} y={1330} kicker="ม.ค. 2026 · investor update" head="Giga Texas ผลิตแบบแห้งทั้งสองขั้ว" headSize={38} accent={BLUEPRINT.teal}
              sub="ยืนยันว่าทำได้ตั้งแต่ปลายปี 2025" />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- LOOP ---- */}
      <Sequence from={CUE.titleBack} layout="none">
        <Hook titleAt={4} carAt={12} cellAt={24} />
      </Sequence>
    </CollageBoard>
    <Grain opacity={0.04} />
  </AbsoluteFill>
);

export default Vox5TeslaDry;
