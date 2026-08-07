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
// "การได้ยิน กับสมองเสื่อม" — vox-7, สุขภาพแบบเข้าใจง่าย
// Facts, sources and the deliberate omissions: vox-shorts/vox-7-hearing-dementia/script.md
//
// VERSION 2 — 104s, and deliberately NOT a Short. v1 was 58s, had its answer beat, and still
// drew the same note vox-3 did: the viewer reaches the end without a clear "so what do I do".
// An answer in the middle of a video is not a summary. The operator's ruling (2026-08-07):
// "เรื่องสุขภาพมันสำคัญที่จะต้องพูดให้กระจ่าง ให้คนเข้าใจ" — comprehension beats distribution
// on this channel, so the 60s ceiling is what gets cut, never the summary.
//
// STRUCTURE (channels/health.json, now a hard rule):
//   hook -> scale -> SPINE -> mechanism -> ANSWER -> caveat -> what NOT to buy
//        -> SUMMARY (ปัญหา / ทางแก้) -> RECOMMENDATIONS (the guideline's own list) -> close
//
// s08 and s09 are the beats v1 lacked. They are built to be SCREENSHOTTED: the summary card
// states the problem and the fix as two labelled rows, and the list is the guideline's, not
// ours. A still of either is useful with no video around it, which is how health content
// actually travels.
//
// s07 is the negative recommendation, and it is the cheapest trust the channel will ever buy:
// a guideline saying vitamin B/E, omega-3 and multivitamins do NOT prevent dementia without a
// diagnosed deficiency saves the viewer money in a market full of supplement advertising.
//
// SPINE: hearing loss and midlife LDL cholesterol are the SAME number — 7% each. The idea file
// claimed hearing loss was the single biggest factor and that is wrong; re-searching caught it.
//
// CUES ARE THE MEASURED VOICE. Generated before this file, so no retime pass ran.
// =============================================================================
export const compositionConfig = {
  id: 'Vox7Hearing',
  durationInSeconds: 109,
  fps: 30,
  width: 1080,
  height: 1920,
};

const W = 1080;
const H = 1920;

// Left margin and peak camera zoom are ONE decision (vox-6's lesson). Peak z is 1.16, so the
// board's visible left edge sits at x ~= 62; 140 keeps a chip ~90px off a phone's edge.
const MARGIN_L = 140;
const A7 = (f: string) => staticFile(`projects/vox-7-hearing-dementia/layers/${f}`);

const CUE = {
  hookTitle: -52,
  hookEar: -34,
  hookCard: 120,

  scale: 311, //       s02 — WHO 2nd edition: 20 factors, 4 groups
  scaleGroups: 356,

  spine: 575, //       s03 — the equal-7% reveal
  spineBars: 616,
  spineTie: 735, //    lands on "เท่ากับไขมัน แอล ดี แอล พอดี"

  mech: 894, //        s04 — why hearing touches memory
  mechDiagram: 934,
  mechAvoid: 1070, //  "แล้วคนก็ค่อยๆ เลี่ยงวงสนทนา"

  answer: 1194, //     s05 — THE ANSWER BEAT
  answerAid: 1240,
  answerLine: 1330,

  caveat: 1458, //     s06 — THE CAVEAT BEAT
  caveatSplit: 1505,
  caveatVerdict: 1610,

  notthis: 1738, //    s07 — what the guideline says NOT to buy
  notthisList: 1790,
  notthisIf: 1990, //  "ถ้าไม่ได้ขาดสารนั้นจริง"

  summary: 2082, //    s08 — THE SUMMARY BEAT
  summaryProblem: 2110,
  summaryFix: 2270, // "ทางแก้คือตรวจให้รู้ก่อน"

  recs: 2471, //       s09 — the guideline's own list
  recsList: 2500,

  close: 2979, //      s10
  closeLine: 3000,

  titleBack: 3140,
} as const;

const CAM = [
  { f: 0, x: 540, y: 960, z: 1 },
  { f: 280, x: 540, y: 960, z: 1.05 },
  { f: 350, x: 540, y: 980, z: 1.09 },
  { f: 550, x: 542, y: 982, z: 1.11 },
  { f: 620, x: 540, y: 995, z: 1.14 },
  { f: 870, x: 542, y: 997, z: 1.16 },
  { f: 930, x: 540, y: 985, z: 1.08 },
  { f: 1170, x: 542, y: 987, z: 1.1 },
  { f: 1240, x: 540, y: 975, z: 1.06 },
  { f: 1450, x: 542, y: 977, z: 1.09 },
  { f: 1510, x: 540, y: 990, z: 1.12 },
  { f: 1730, x: 542, y: 992, z: 1.14 },
  { f: 1790, x: 540, y: 975, z: 1.06 },
  { f: 2070, x: 542, y: 977, z: 1.08 },
  // The summary and the list are the beats people screenshot. The camera sits still and wide
  // for both — a slow push would blur a frame someone is trying to capture.
  { f: 2110, x: 540, y: 960, z: 1 },
  { f: 2960, x: 540, y: 960, z: 1 },
  { f: 3000, x: 540, y: 960, z: 1.03 },
  { f: 3120, x: 540, y: 960, z: 1 },
  { f: 3270, x: 540, y: 960, z: 1 },
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

// s02 — the four categories the WHO edition is organised into. NO per-category counts: the
// total (20) is sourced, the split between categories is not, and inventing four numbers that
// happen to sum to 20 would be a fabrication nobody would ever catch.
const FactorGroups: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 18], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const items = ['พฤติกรรมสุขภาพ', 'จัดการโรคประจำตัว', 'สิ่งแวดล้อม', 'ทำหลายอย่างพร้อมกัน'];
  return (
    <svg viewBox={`0 0 ${W} 420`} style={{ display: 'block', width: W, height: 420, overflow: 'visible' }}>
      <g opacity={g(0)}>
        <text x={MARGIN_L} y={54} fontFamily={FONT_TH_DISPLAY} fontSize={86} fontWeight={700} fill={T.red}>20</text>
        <text x={MARGIN_L + 118} y={54} fontFamily={FONT_TH} fontSize={28} fill={T.inkSoft}>ปัจจัยเสี่ยงที่ปรับได้</text>
      </g>
      {items.map((t, i) => (
        <g key={t} opacity={g(20 + i * 12)}>
          <rect x={MARGIN_L} y={100 + i * 78} width={800} height={62} fill={T.cream} stroke={T.teal} strokeWidth={2} />
          <text x={MARGIN_L + 24} y={139 + i * 78} fontFamily={FONT_TH} fontSize={27} fontWeight={600} fill={T.ink}>{t}</text>
        </g>
      ))}
    </svg>
  );
};

// s03 — the spine, drawn. Four of the fourteen factors, to scale, so the eye can check the
// claim: the two 7% bars are the SAME LENGTH. A viewer who does not believe the narration can
// measure it. The caption says these are 4 of 14, so the chart never implies it is the set.
const RiskBars: React.FC<{ at: number; tieAt: number }> = ({ at, tieAt }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 24], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tie = interpolate(frame, [tieAt, tieAt + 18], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const unit = 74;
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

// s04 — the mechanism as a budget: one pot of attention, and when the ear delivers a poor
// signal the decoding share grows and the remembering share shrinks. One bar splitting, because
// the claim is about a share of a fixed total, not two separate things getting worse.
const LoadDiagram: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const shift = interpolate(frame, [at + 26, at + 74], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const g = interpolate(frame, [at, at + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const total = 800;
  const decode = 0.3 + 0.42 * shift;
  const row = (y: number, label: string, dec: number) => (
    <g>
      <text x={MARGIN_L} y={y - 14} fontFamily={FONT_TH} fontSize={23} fontWeight={600} fill={T.inkSoft}>{label}</text>
      <rect x={MARGIN_L} y={y} width={total * dec} height={54} fill={T.red} opacity={0.8} />
      <rect x={MARGIN_L + total * dec} y={y} width={total * (1 - dec)} height={54} fill={T.teal} opacity={0.8} />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} 420`} style={{ display: 'block', width: W, height: 420, overflow: 'visible' }} opacity={g}>
      <text x={MARGIN_L} y={26} fontFamily={FONT_TH_DISPLAY} fontSize={26} fontWeight={700} fill={T.ink}>กำลังของสมองมีเท่าเดิม</text>
      {row(112, 'เมื่อได้ยินชัด', 0.3)}
      {row(252, 'เมื่อเสียงมาไม่ชัด', decode)}
      <g>
        <rect x={MARGIN_L} y={368} width={22} height={22} fill={T.red} opacity={0.8} />
        <text x={MARGIN_L + 32} y={386} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>ใช้ถอดเสียง</text>
        <rect x={MARGIN_L + 210} y={368} width={22} height={22} fill={T.teal} opacity={0.8} />
        <text x={MARGIN_L + 242} y={386} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>เหลือไว้จดจำ</text>
      </g>
    </svg>
  );
};

// s06 — the caveat, drawn honestly: 977 people, and the 48% belongs to the 238 already at
// higher risk. Drawing the whole cohort and shading only the slice the number came from is the
// one picture that cannot be misread the way the headline is.
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

// s07 — the negative recommendation. Struck through rather than crossed out with an X, because
// the guideline's position is "not for this purpose", not "harmful".
const NotThis: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 16], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const strike = (d: number) => interpolate(frame, [at + d + 10, at + d + 26], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const items = ['วิตามินบี', 'วิตามินอี', 'โอเมกา-3', 'มัลติวิตามิน'];
  const boxW = (t: string) => t.replace(/[ัิ-ฺ็-๎]/g, '').length * 32 * 0.68 + 56;
  return (
    <svg viewBox={`0 0 ${W} 400`} style={{ display: 'block', width: W, height: 400, overflow: 'visible' }}>
      {items.map((t, i) => {
        const y = 20 + i * 88;
        const d = i * 14;
        const bw = boxW(t);
        return (
          <g key={t} opacity={g(d)}>
            <rect x={MARGIN_L} y={y} width={bw} height={62} fill={T.cream} stroke={T.inkSoft} strokeWidth={1.6} opacity={0.9} />
            <text x={MARGIN_L + 24} y={y + 42} fontFamily={FONT_TH_DISPLAY} fontSize={32} fontWeight={700} fill={T.inkSoft}>{t}</text>
            <line x1={MARGIN_L + 12} y1={y + 32} x2={MARGIN_L + 12 + (bw - 24) * strike(d)} y2={y + 32} stroke={T.red} strokeWidth={4} />
          </g>
        );
      })}
    </svg>
  );
};

// s08 — THE SUMMARY. Two labelled rows, big enough to read in a screenshot with no video
// around it. This is the beat v1 did not have and the reason v2 exists.
const SummaryCard: React.FC<{ at: number; fixAt: number }> = ({ at, fixAt }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (t: number) => interpolate(frame, [t, t + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const block = (y: number, tag: string, tagColor: string, head: string, body: string, appear: number) => (
    <g opacity={g(appear)}>
      <rect x={MARGIN_L} y={y} width={800} height={196} fill={T.cream} stroke={tagColor} strokeWidth={2} />
      <rect x={MARGIN_L} y={y} width={8} height={196} fill={tagColor} />
      <text x={MARGIN_L + 30} y={y + 46} fontFamily={FONT_TH} fontSize={24} fontWeight={700} fill={tagColor}>{tag}</text>
      <text x={MARGIN_L + 30} y={y + 100} fontFamily={FONT_TH_DISPLAY} fontSize={38} fontWeight={700} fill={T.ink}>{head}</text>
      <text x={MARGIN_L + 30} y={y + 152} fontFamily={FONT_TH} fontSize={25} fill={T.inkSoft}>{body}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} 460`} style={{ display: 'block', width: W, height: 460, overflow: 'visible' }}>
      {block(0, 'ปัญหา', T.red, 'การได้ยินค่อยๆ แย่ลงโดยไม่มีใครสังเกต', 'และมันเชื่อมโยงกับสมอง ไม่ใช่แค่กับหู', at)}
      {block(244, 'ทางแก้', T.teal, 'ตรวจการได้ยินให้รู้ก่อน', 'สิ่งที่ไม่รู้ว่ามี ก็จัดการไม่ได้', fixAt)}
    </svg>
  );
};

// s09 — THE RECOMMENDATIONS. Every line is the guideline's, not ours, which is why the source
// sits under the list rather than in a corner. Rows arrive ~2s apart so the narration can name
// each one as it lands, and the whole card holds still afterwards to be screenshotted.
const RecsList: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 16], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const items = [
    'ขยับร่างกายให้สม่ำเสมอ',
    'ใช้สมอง และพบปะผู้คน',
    'คุมความดัน เบาหวาน ไขมัน',
    'เลิกบุหรี่ · ลดแอลกอฮอล์',
    'ไม่ปล่อยให้หูตึงโดยไม่ตรวจ',
    'ลดการรับฝุ่น PM 2.5',
  ];
  return (
    <svg viewBox={`0 0 ${W} 620`} style={{ display: 'block', width: W, height: 620, overflow: 'visible' }}>
      <text x={MARGIN_L} y={34} fontFamily={FONT_TH_DISPLAY} fontSize={36} fontWeight={700} fill={T.ink}>คำแนะนำ ที่ทำได้เลย</text>
      {items.map((t, i) => {
        const y = 70 + i * 78;
        return (
          <g key={t} opacity={g(i * 30)}>
            <rect x={MARGIN_L} y={y} width={34} height={34} fill="none" stroke={T.teal} strokeWidth={2.6} />
            <path d={`M ${MARGIN_L + 8} ${y + 18} l 8 9 l 14 -18`} fill="none" stroke={T.teal} strokeWidth={4}
              strokeLinecap="round" strokeLinejoin="round" opacity={g(i * 30 + 8)} />
            <text x={MARGIN_L + 54} y={y + 28} fontFamily={FONT_TH} fontSize={30} fontWeight={600} fill={T.ink}>{t}</text>
          </g>
        );
      })}
      <text x={MARGIN_L} y={584} fontFamily={FONT_TH} fontSize={21} fill={T.inkSoft} opacity={g(150)}>
        จากแนวทางลดความเสี่ยงสมองเสื่อม องค์การอนามัยโลก ฉบับที่ 2 · 15 ก.ค. 2026
      </text>
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

      {/* ---- s02 the guideline, and how big the list is ---- */}
      <Sequence from={CUE.scale} durationInFrames={250} layout="none">
        <SceneFade out={246}>
          <Panel at={0} y={560} kicker="องค์การอนามัยโลก · ฉบับที่ 2 · 15 ก.ค. 2026" head="แนวทางลดความเสี่ยงสมองเสื่อม" headSize={40} />
          <Layer x={540} y={1130} w={W} at={CUE.scaleGroups - CUE.scale} dur={1} enter="none" depth={0.05} drift={0.3}>
            <FactorGroups at={0} />
          </Layer>
        </SceneFade>
      </Sequence>

      {/* ---- s03 THE SPINE — two bars, same length ---- */}
      <Sequence from={CUE.spine} durationInFrames={305} layout="none">
        <SceneFade out={301}>
          <Panel at={0} y={560} kicker="สัดส่วนที่เชื่อมโยงกับสมองเสื่อม" head="การได้ยิน อยู่ที่ตัวเลขเดียวกับไขมันในเลือด" headSize={38} accent={VOX.red} />
          <Layer x={540} y={1240} w={W} at={CUE.spineBars - CUE.spine} dur={1} enter="none" depth={0.05} drift={0.3}>
            <RiskBars at={0} tieAt={CUE.spineTie - CUE.spineBars} />
          </Layer>
        </SceneFade>
      </Sequence>

      {/* ---- s04 MECHANISM ---- */}
      <Sequence from={CUE.mech} durationInFrames={286} layout="none">
        <SceneFade out={282}>
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

      {/* ---- s05 THE ANSWER ---- */}
      <Sequence from={CUE.answer} durationInFrames={250} layout="none">
        <SceneFade out={246}>
          <Panel at={0} y={560}
            kicker="สิ่งที่แนวทางระบุ"
            head="เครื่องช่วยฟัง เสนอให้ใช้ลดความเสี่ยงได้"
            sub="แนวทางระบุเองว่า ความเชื่อมั่นของหลักฐานยังอยู่ในระดับต่ำ" headSize={38} accent={VOX.teal} />
          <Sequence from={CUE.answerAid - CUE.answer} layout="none">
            <Cutout src={A7('hearing-aid.png')} x={540} y={1160} w={600} at={0} enter="place" rotate={-2} depth={0.09} sticker={0} shadow={3} />
          </Sequence>
          <Sequence from={CUE.answerLine - CUE.answer} layout="none">
            <SerifStatement x={540} y={1640} w={940} at={0} size={40} backing
              words={[{ t: 'ตรวจการได้ยิน' }, { t: 'คือเรื่องของสมอง', hl: true }]} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- s06 THE CAVEAT ---- */}
      <Sequence from={CUE.caveat} durationInFrames={266} layout="none">
        <SceneFade out={262}>
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

      {/* ---- s07 what the guideline says NOT to buy ---- */}
      <Sequence from={CUE.notthis} durationInFrames={330} layout="none">
        <SceneFade out={326}>
          <Panel at={0} y={540} kicker="และอีกอย่างที่แนวทางระบุไว้ชัด" head="ไม่ควรใช้เพื่อป้องกันสมองเสื่อม" headSize={40} accent={VOX.red} />
          <Layer x={540} y={1180} w={W} at={CUE.notthisList - CUE.notthis} dur={1} enter="none" depth={0.05} drift={0.3}>
            <NotThis at={0} />
          </Layer>
          <Sequence from={CUE.notthisIf - CUE.notthis} layout="none">
            <LabelChip x={MARGIN_L} y={1600} at={0} anchor="left" text="เว้นแต่ตรวจแล้วพบว่าขาดสารนั้นจริง" kicker="ข้อยกเว้นเดียว" accent={VOX.teal} size={30} rotate={-1} z={6} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- s08 THE SUMMARY — built to be screenshotted ---- */}
      <Sequence from={CUE.summary} durationInFrames={375} layout="none">
        <SceneFade out={371}>
          <SerifStatement x={540} y={620} w={900} at={0} size={54} words={[{ t: 'สรุป' }, { t: 'ให้ชัด', hl: true }]} />
          <Layer x={540} y={1140} w={W} at={0} dur={1} enter="none" depth={0.03} drift={0.2}>
            <SummaryCard at={CUE.summaryProblem - CUE.summary} fixAt={CUE.summaryFix - CUE.summary} />
          </Layer>
        </SceneFade>
      </Sequence>

      {/* ---- s09 THE RECOMMENDATIONS — the guideline's own list ---- */}
      <Sequence from={CUE.recs} durationInFrames={494} layout="none">
        <SceneFade out={490}>
          <Layer x={540} y={860} w={W} at={CUE.recsList - CUE.recs} dur={1} enter="none" depth={0.03} drift={0.2}>
            <RecsList at={0} />
          </Layer>
          <Sequence from={330} layout="none">
            <Layer x={760} y={1500} w={520} at={0} dur={18} enter="place" rotate={1.2} depth={0.07} drift={0.4}>
              <Img src={A7('haze.png')} style={{ width: '100%', height: 200, objectFit: 'cover', objectPosition: '50% 96%', display: 'block', boxShadow: '0 12px 24px rgba(40,28,12,0.22)' }} />
            </Layer>
            <LabelChip x={MARGIN_L} y={1650} at={12} anchor="left" text="ภาพประกอบ ไม่ใช่ภาพถ่ายสถานที่จริง" kicker="ฝุ่น PM 2.5" accent={VOX.red} size={24} rotate={-0.8} z={6} />
          </Sequence>
        </SceneFade>
      </Sequence>

      {/* ---- s10 close ---- */}
      <Sequence from={CUE.close} durationInFrames={160} layout="none">
        <SceneFade out={156}>
          <SerifStatement x={540} y={900} w={960} at={CUE.closeLine - CUE.close} size={50} backing
            words={[{ t: 'ทำหลายอย่างพร้อมกัน' }, { t: 'ได้ผลกว่าทำอย่างเดียว', hl: true }]} />
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
