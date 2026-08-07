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
  SketchArrow,
  VOX,
  useTheme,
} from '../../lib/collage';
import { FONT_TH, FONT_TH_DISPLAY } from '../../fonts';

// =============================================================================
// "การได้ยิน กับสมองเสื่อม" — vox-7, สุขภาพแบบเข้าใจง่าย
// Facts, sources and the deliberate omissions: vox-shorts/vox-7-hearing-dementia/script.md
//
// 58s — a Short, deliberately. vox-6 went to 113s because the brief asked for it; the health
// channel's value is reach, so this one is cut to fit under the 60s ceiling. Two lines were
// trimmed AFTER the first voice pass measured 60.06s, which is the whole point of generating
// the voice first.
//
// SPINE: hearing loss and midlife LDL cholesterol are the SAME number — 7% each. The idea file
// said hearing loss was the single biggest modifiable risk factor and that is wrong; searching
// again before writing caught it. The corrected version is the better one, because "equal to
// blood lipids" gives the viewer a yardstick they already own.
//
// CHANNEL RULE (channels/health.json): hook -> story -> ANSWER -> caveat. s04 is the answer and
// owns a full card to itself; s05 is the caveat and is NOT optional — the 48% figure everyone
// repeats comes from a pre-specified subgroup of a trial whose primary outcome was null, and a
// health channel that repeats the headline without that is just a slower news site.
//
// CUES ARE THE MEASURED VOICE. Generated before this file existed, so no retime pass ran.
// =============================================================================
export const compositionConfig = {
  id: 'Vox7Hearing',
  durationInSeconds: 58,
  fps: 30,
  width: 1080,
  height: 1920,
};

const W = 1080;
const H = 1920;

// Same lesson as vox-6: left margin and peak camera zoom are ONE decision. Peak z here is 1.16,
// so the board's visible left edge sits at x ~= 62; 140 keeps a chip ~90px off a phone's edge.
const MARGIN_L = 140;
const A7 = (f: string) => staticFile(`projects/vox-7-hearing-dementia/layers/${f}`);

// Measured line starts (frames). Offsets inside a line land on the phrase named.
const CUE = {
  hookTitle: -52,
  hookEar: -34,

  hookCard: 120, //    s01 — "เกือบครึ่งป้องกันหรือชะลอได้"

  spine: 311, //       s02 — the equal-7% reveal
  spineBars: 352,
  spineTie: 470, //    lands on "เท่ากับไขมัน แอล ดี แอล พอดี"

  mech: 628, //        s03 — why hearing touches memory
  mechDiagram: 668,
  mechAvoid: 800, //   "แล้วคนก็ค่อยๆ เลี่ยงวงสนทนา"

  answer: 909, //      s04 — THE ANSWER BEAT
  answerAid: 960,
  answerChip: 1050,

  caveat: 1201, //     s05 — THE CAVEAT BEAT
  caveatSplit: 1250,
  caveatVerdict: 1360,

  thai: 1486, //       s06 — air pollution, new in the 2026 edition
  thaiHaze: 1510,
  thaiChip: 1580,

  titleBack: 1660,
} as const;

const CAM = [
  { f: 0, x: 540, y: 960, z: 1 },
  { f: 280, x: 540, y: 960, z: 1.05 },
  { f: 350, x: 540, y: 985, z: 1.1 },
  { f: 600, x: 542, y: 988, z: 1.12 },
  { f: 670, x: 540, y: 1000, z: 1.15 },
  { f: 880, x: 542, y: 1002, z: 1.16 },
  { f: 950, x: 540, y: 975, z: 1.06 },
  { f: 1180, x: 542, y: 978, z: 1.09 },
  { f: 1250, x: 540, y: 990, z: 1.13 },
  { f: 1460, x: 542, y: 992, z: 1.15 },
  { f: 1520, x: 540, y: 970, z: 1.05 },
  { f: 1640, x: 540, y: 962, z: 1.02 },
  { f: 1700, x: 540, y: 960, z: 1 },
  { f: 1740, x: 540, y: 960, z: 1 },
];

const TITLE_WORDS = [{ t: 'สมองเสื่อม' }, { t: 'เกือบครึ่ง ป้องกันได้', hl: true }];

// =============================================================================
const Panel: React.FC<{
  at: number; y: number; kicker: string; head: string; sub?: string;
  headSize?: number; accent?: string; w?: number;
}> = ({ at, y, kicker, head, sub, headSize = 42, accent, w = 800 }) => {
  const T = useTheme();
  return (
    <Layer x={540} y={y} w={w} at={at} dur={14} enter="place" rotate={-0.5} depth={0.03} drift={0.4}>
      <div style={{ background: T.cream, padding: '30px 38px 34px', borderLeft: `8px solid ${accent ?? T.teal}`, boxShadow: '0 12px 26px rgba(40,28,12,0.20)' }}>
        <div style={{ fontFamily: FONT_TH, fontSize: 21, fontWeight: 600, color: accent ?? T.teal, marginBottom: 9 }}>{kicker}</div>
        <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: headSize, fontWeight: 700, color: T.ink, lineHeight: 1.32 }}>{head}</div>
        {sub ? <div style={{ fontFamily: FONT_TH, fontSize: 23, fontWeight: 400, color: T.inkSoft, lineHeight: 1.45, marginTop: 12 }}>{sub}</div> : null}
      </div>
    </Layer>
  );
};

// The spine, drawn. Four of the fourteen factors, to scale, so the eye can check the claim:
// the two 7% bars are the SAME LENGTH. That equality is the whole video, and a viewer who does
// not believe the narration can measure it. The other ten factors exist — the caption says so
// rather than the chart implying these are all of them.
const RiskBars: React.FC<{ at: number; tieAt: number }> = ({ at, tieAt }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 24], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tie = interpolate(frame, [tieAt, tieAt + 18], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const unit = 74; // px per percentage point
  const rows = [
    { label: 'หูตึง', v: 7, c: T.red, d: 0, hi: true },
    { label: 'ไขมัน LDL สูง วัยกลางคน', v: 7, c: T.red, d: 10, hi: true },
    { label: 'การศึกษาน้อย', v: 5, c: T.inkSoft, d: 20, hi: false },
    { label: 'สายตาเสื่อม ไม่ได้รักษา', v: 2, c: T.inkSoft, d: 28, hi: false },
  ];
  return (
    <svg viewBox={`0 0 ${W} 520`} style={{ display: 'block', width: W, height: 520, overflow: 'visible' }}>
      {rows.map((r, i) => {
        const y = 20 + i * 112;
        return (
          <g key={r.label} opacity={g(r.d)}>
            <text x={MARGIN_L} y={y + 22} fontFamily={FONT_TH} fontSize={24} fontWeight={r.hi ? 700 : 400} fill={r.hi ? T.ink : T.inkSoft}>{r.label}</text>
            <rect x={MARGIN_L} y={y + 38} width={r.v * unit * g(r.d)} height={44} fill={r.c} opacity={r.hi ? 0.88 : 0.34} />
            <text x={MARGIN_L + 12 + r.v * unit} y={y + 72} fontFamily={FONT_TH_DISPLAY} fontSize={34} fontWeight={700} fill={r.hi ? T.red : T.inkSoft} opacity={g(r.d)}>
              {r.v}%
            </text>
          </g>
        );
      })}
      {/* the equality made visible — a bracket joining the two bars that end at the same x */}
      <g opacity={tie}>
        <path d={`M ${MARGIN_L + 7 * unit + 74} 58 L ${MARGIN_L + 7 * unit + 104} 58 L ${MARGIN_L + 7 * unit + 104} 170 L ${MARGIN_L + 7 * unit + 74} 170`}
          fill="none" stroke={T.red} strokeWidth={3} />
        <text x={MARGIN_L + 7 * unit + 118} y={122} fontFamily={FONT_TH_DISPLAY} fontSize={30} fontWeight={700} fill={T.red}>เท่ากัน</text>
      </g>
      <text x={MARGIN_L} y={498} fontFamily={FONT_TH} fontSize={21} fill={T.inkSoft} opacity={g(36)}>
        4 จาก 14 ปัจจัย · ตัวเลขคือสัดส่วนที่เชื่อมโยง ไม่ใช่การพิสูจน์เหตุ-ผล
      </text>
    </svg>
  );
};

// The mechanism as a budget: one pot of attention, and when the ear delivers a poor signal the
// decoding share grows and the remembering share shrinks. Drawn as one bar splitting, because
// the claim is about a share of a fixed total, not about two separate things getting worse.
const LoadDiagram: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const shift = interpolate(frame, [at + 26, at + 74], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const g = interpolate(frame, [at, at + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const total = 800;
  const decode = 0.3 + 0.42 * shift; // share spent decoding speech
  const row = (y: number, label: string, dec: number, note: string) => (
    <g>
      <text x={MARGIN_L} y={y - 14} fontFamily={FONT_TH} fontSize={23} fontWeight={600} fill={T.inkSoft}>{label}</text>
      <rect x={MARGIN_L} y={y} width={total * dec} height={54} fill={T.red} opacity={0.8} />
      <rect x={MARGIN_L + total * dec} y={y} width={total * (1 - dec)} height={54} fill={T.teal} opacity={0.8} />
      <text x={MARGIN_L} y={y + 84} fontFamily={FONT_TH} fontSize={21} fill={T.inkSoft}>{note}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} 420`} style={{ display: 'block', width: W, height: 420, overflow: 'visible' }} opacity={g}>
      <text x={MARGIN_L} y={26} fontFamily={FONT_TH_DISPLAY} fontSize={26} fontWeight={700} fill={T.ink}>กำลังของสมองมีเท่าเดิม</text>
      {row(112, 'เมื่อได้ยินชัด', 0.3, '')}
      {row(252, 'เมื่อเสียงมาไม่ชัด', decode, '')}
      <g opacity={g}>
        <rect x={MARGIN_L} y={368} width={22} height={22} fill={T.red} opacity={0.8} />
        <text x={MARGIN_L + 32} y={386} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>ใช้ถอดเสียง</text>
        <rect x={MARGIN_L + 210} y={368} width={22} height={22} fill={T.teal} opacity={0.8} />
        <text x={MARGIN_L + 242} y={386} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>เหลือไว้จดจำ</text>
      </g>
    </svg>
  );
};

// The caveat, drawn honestly: 977 people, and the 48% belongs to the 238 of them who were
// already at higher risk. Drawing the whole cohort and shading only the slice the number came
// from is the one picture that cannot be misread the way the headline is.
const TrialSplit: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 22], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cols = 20;
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < 40; i++) {
    const inSub = i < 10; // 238/977 ~ 24%, so ~10 of 40 dots
    dots.push(
      <circle key={i} cx={MARGIN_L + 14 + (i % cols) * 40} cy={40 + Math.floor(i / cols) * 46} r={13}
        fill={inSub ? T.red : T.inkSoft} opacity={inSub ? 0.85 : 0.22} />
    );
  }
  return (
    <svg viewBox={`0 0 ${W} 260`} style={{ display: 'block', width: W, height: 260, overflow: 'visible' }}>
      <g opacity={g(0)}>{dots}</g>
      <g opacity={g(16)}>
        <text x={MARGIN_L} y={150} fontFamily={FONT_TH} fontSize={23} fill={T.inkSoft}>ทั้งการทดลอง 977 คน · ผลรวมทั้งกลุ่ม ไม่พบความต่าง</text>
        <rect x={MARGIN_L} y={172} width={16} height={16} fill={T.red} opacity={0.85} />
        <text x={MARGIN_L + 26} y={187} fontFamily={FONT_TH} fontSize={23} fontWeight={700} fill={T.red}>
          กลุ่มย่อยเสี่ยงสูง 238 คน — ตัวเลข 48% มาจากตรงนี้
        </text>
      </g>
    </svg>
  );
};

const SceneFade: React.FC<{ out: number; dur?: number; children: React.ReactNode }> = ({ out, dur = 16, children }) => {
  const frame = useCurrentFrame();
  return <div style={{ opacity: interpolate(frame, [out - dur, out], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>{children}</div>;
};

const Hook: React.FC<{ titleAt: number; earAt: number }> = ({ titleAt, earAt }) => (
  <>
    <SerifStatement x={540} y={520} w={960} at={titleAt} size={66} words={TITLE_WORDS} />
    <Cutout src={A7('ear.png')} x={560} y={1240} w={620} at={earAt} enter="place" rotate={-1.5} depth={0.08} sticker={0} shadow={2} />
  </>
);

const Vox7Hearing: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: VOX.paper }}>
    <CollageBoard cam={CAM} fontBody={FONT_TH} fontDisplay={FONT_TH_DISPLAY} tracking="0.6px">
      <PaperBG w={W} h={H} />

      {/* ---- s01 HOOK ---- */}
      <Sequence from={0} durationInFrames={300} layout="none">
        <SceneFade out={296}>
          <Hook titleAt={CUE.hookTitle} earAt={CUE.hookEar} />
          <Sequence from={CUE.hookCard} layout="none">
            <LabelChip x={MARGIN_L} y={1690} at={0} anchor="left" text="ปัจจัยเสี่ยงที่ปรับได้ 14 อย่าง" kicker="Lancet Commission 2024" accent={VOX.teal} size={30} rotate={-1} z={6} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- s02 THE SPINE — two bars, same length ---- */}
      <Sequence from={CUE.spine} durationInFrames={303} layout="none">
        <SceneFade out={299}>
          <Panel at={0} y={560} kicker="สัดส่วนที่เชื่อมโยงกับสมองเสื่อม" head="การได้ยิน อยู่ที่ตัวเลขเดียวกับไขมันในเลือด" headSize={38} accent={VOX.red} />
          <Layer x={540} y={1240} w={W} at={CUE.spineBars - CUE.spine} dur={1} enter="none" depth={0.05} drift={0.3}>
            <RiskBars at={0} tieAt={CUE.spineTie - CUE.spineBars} />
          </Layer>
        </SceneFade>
      </Sequence>

      {/* ---- s03 MECHANISM ---- */}
      <Sequence from={CUE.mech} durationInFrames={267} layout="none">
        <SceneFade out={263}>
          <Panel at={0} y={520} kicker="ทำไมหูถึงเกี่ยวกับความจำ" head="สมองต้องแบ่งกำลังไปเดาคำที่หายไป" headSize={38} />
          <Layer x={540} y={1080} w={W} at={CUE.mechDiagram - CUE.mech} dur={1} enter="none" depth={0.05} drift={0.3}>
            <LoadDiagram at={0} />
          </Layer>
          <Sequence from={CUE.mechAvoid - CUE.mech} layout="none">
            <Cutout src={A7('ear.png')} x={830} y={1580} w={300} at={0} enter="place" rotate={2} depth={0.1} sticker={0} shadow={2} />
            <LabelChip x={MARGIN_L} y={1620} at={10} anchor="left" text="แล้วคนก็ค่อยๆ เลี่ยงวงสนทนา" kicker="ผลที่ตามมา" accent={VOX.red} size={28} rotate={-1} z={6} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- s04 THE ANSWER — channel rule, owns its own card ---- */}
      <Sequence from={CUE.answer} durationInFrames={278} layout="none">
        <SceneFade out={274}>
          <Panel at={0} y={560}
            kicker="แนวทางองค์การอนามัยโลก ฉบับที่ 2 · 15 ก.ค. 2026"
            head="เครื่องช่วยฟัง เสนอให้ใช้ลดความเสี่ยงได้"
            sub="เป็นข้อเสนอระดับแนวทาง ไม่ใช่คำสั่งรายบุคคล" headSize={36} accent={VOX.teal} />
          <Sequence from={CUE.answerAid - CUE.answer} layout="none">
            <Cutout src={A7('hearing-aid.png')} x={540} y={1130} w={620} at={0} enter="place" rotate={-2} depth={0.09} sticker={0} shadow={3} />
          </Sequence>
          <Sequence from={CUE.answerChip - CUE.answer} layout="none">
            <SerifStatement x={540} y={1660} w={940} at={0} size={40} backing
              words={[{ t: 'ตรวจการได้ยิน' }, { t: 'คือเรื่องของสมอง', hl: true }]} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- s05 THE CAVEAT — not optional ---- */}
      <Sequence from={CUE.caveat} durationInFrames={271} layout="none">
        <SceneFade out={267}>
          <Panel at={0} y={540} kicker="แต่ต้องพูดให้ครบ · งานวิจัย ACHIEVE" head="ผลรวมทั้งกลุ่ม ไม่พบความต่าง" headSize={42} accent={VOX.red} />
          <Layer x={540} y={1010} w={W} at={CUE.caveatSplit - CUE.caveat} dur={1} enter="none" depth={0.05} drift={0.3}>
            <TrialSplit at={0} />
          </Layer>
          <Sequence from={CUE.caveatVerdict - CUE.caveat} layout="none">
            <SerifStatement x={540} y={1480} w={940} at={0} size={38} backing
              words={[{ t: 'พาดหัวข่าวบอกครึ่งเดียว' }, { t: 'ของสิ่งที่งานวิจัยพบ', hl: true }]} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- s06 the 2026 edition's new entry, and the Thai one ---- */}
      <Sequence from={CUE.thai} durationInFrames={240} layout="none">
        <SceneFade out={236}>
          <Sequence from={CUE.thaiHaze - CUE.thai} layout="none">
            {/* Cropped to the tower band. The full square is ~80% empty haze, which rendered as
                a grey placeholder rather than an image; objectPosition keeps the silhouettes. */}
            <Layer x={540} y={1170} w={800} at={0} dur={18} enter="place" rotate={0.6} depth={0.07} drift={0.4}>
              <Img src={A7('haze.png')} style={{ width: '100%', height: 300, objectFit: 'cover', objectPosition: '50% 96%', display: 'block', boxShadow: '0 14px 30px rgba(40,28,12,0.24)' }} />
            </Layer>
          </Sequence>
          <Panel at={0} y={620} kicker="ที่ฉบับ 2026 เพิ่มเข้ามาเป็นครั้งแรก" head="มลพิษทางอากาศ" headSize={46} accent={VOX.teal} w={700} />
          <Sequence from={CUE.thaiChip - CUE.thai} layout="none">
            <LabelChip x={MARGIN_L} y={1760} at={0} anchor="left" text="ฝุ่น PM 2.5 ที่เราหายใจอยู่ทุกปี" kicker="ภาพประกอบ ไม่ใช่ภาพถ่ายสถานที่จริง" accent={VOX.red} size={30} rotate={-1} z={6} />
            <SketchArrow id="haze-to-chip" d="M 250 1350 Q 215 1560 205 1700" vb={{ w: W, h: H }} at={8} dur={16} head color={VOX.red} width={3} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- LOOP ---- */}
      <Sequence from={CUE.titleBack} layout="none">
        <Hook titleAt={4} earAt={14} />
      </Sequence>
    </CollageBoard>
    <Grain opacity={0.05} />
  </AbsoluteFill>
);

export default Vox7Hearing;
