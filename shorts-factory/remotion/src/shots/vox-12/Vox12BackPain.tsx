import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { BLUEPRINT, CollageBoard, EASE_OUT, Grain, Layer, PaperBG, useTheme } from '../../lib/collage';
import { FONT_TH, FONT_TH_DISPLAY } from '../../fonts';

// =============================================================================
// "เอกซเรย์หลังทันที อาจทำให้หายช้าลง" — vox-12, สุขภาพแบบเข้าใจง่าย
// LANDSCAPE 1920x1080 · facts and grades: vox-shorts/vox-12-back-pain/script.md
//
// THIS IS THE FIRST VIDEO ON THE NEW MOTION LANGUAGE (brand.md §5, locked 2026-08-18).
// Three things changed from vox-11 and they are the point of this file:
//
//   1. TYPE NEVER DRIFTS. Every layer carrying words is drift={0} enter="none", and its
//      motion comes from <Rise>, which runs once on entry and then stops. The collage kit's
//      idle breathing was built for paper scraps; on Thai type with its stacked marks it
//      reads as a wobble.
//   2. THE ENTRANCE IS THE CRAFT. <Rise> is fade + lift + a 1.5% scale over 16 frames,
//      ease-out, no overshoot. That is the moment the eye moves; everything after holds
//      still so it can be read.
//   3. SCENES CROSS-DISSOLVE, THEY DO NOT CUT. <Backdrop> is a single track of photographs
//      whose windows deliberately OVERLAP by XFADE frames, so one image is always fading
//      into the next rather than snapping. Each also drifts a slow Ken Burns, because a
//      still held for forty seconds goes dead.
//
// EDITORIAL RULE THIS FILE ENFORCES. The video says guidelines do not recommend imaging for
// ordinary back pain, which is dangerous read half-way. So `RedFlags` is the longest figure
// here, it is introduced in the FIRST scene (`s05_flagpromise`) before that conclusion can
// land, and the closing card repeats it. No screenshot of this video can carry "don't scan"
// without "unless one of these five".
//
// And there is no generated X-ray or MRI image anywhere, on purpose: a synthesised scan
// shown under narration about scan findings would be a fabricated medical document.
// The spine on screen is a photographed TEACHING MODEL, which is honest about what it is.
// =============================================================================

export const compositionConfig = {
  id: 'Vox12BackPain',
  durationInSeconds: 483,
  fps: 30,
  width: 1920,
  height: 1080,
};

const W = 1920;
const H = 1080;
const MARGIN_L = 170;
const A = (f: string) => staticFile(`projects/vox-12-back-pain/layers/${f}`);

// ---- GENERATED CUES — rebuilt from beats.json by scripts/gen-cues.mjs. Do not hand-edit.
// Cue name === segment id in beats.json, so there is no map to keep in sync.
// All 50 windows are measured from the real audio.
const C = {
  s01_scene: 15,
  s02_firstthought: 316,
  s03_sounds: 617,
  s04_butguide: 880,
  s05_flagpromise: 1118,

  s06_common: 1381,
  s07_recover: 1671,
  s08_sowhy: 1954,

  s09_willfind: 2197,
  s10_study: 2457,
  s11_twenty: 2791,
  s12_eighty: 3027,
  s13_bulge: 3311,
  s14_normal: 3631,

  s15_cantell: 3971,
  s16_named: 4259,
  s17_behave: 4552,
  s18_irony: 4885,

  s19_cohort: 5120,
  s20_surgery: 5423,
  s21_opioid: 5721,
  s22_nobetter: 5983,
  s23_caution: 6225,

  s24_turn: 6487,
  s25_exception: 6743,
  s26_one: 7009,
  s27_two: 7325,
  s28_three: 7582,
  s29_four: 7922,
  s30_five: 8215,
  s31_summary: 8588,

  s32_move: 8918,
  s33_nobedrest: 9219,
  s34_exercise: 9513,
  s35_nsaid: 9830,
  s36_noparacet: 10083,
  s37_askdoc: 10357,

  s38_intro: 10652,
  s39_belt: 10873,
  s40_traction: 11203,
  s41_tens: 11431,
  s42_money: 11689,

  s43_scope: 11969,
  s44_notyou: 12277,
  s45_notlazy: 12578,

  s46_problem: 12901,
  s47_solution: 13265,
  s48_dos: 13653,
  s49_donts: 13967,
  s50_close: 14197,
  tail: 14438,
} as const;
// ---- END GENERATED CUES

const CAM = [
  { f: 0, x: 960, y: 540, z: 1 },
  { f: 900, x: 960, y: 544, z: 1.04 },
  { f: 3600, x: 960, y: 540, z: 1.08 },
  { f: 6600, x: 958, y: 545, z: 1.03 },
  { f: 9600, x: 960, y: 542, z: 1.09 },
  { f: 12300, x: 960, y: 540, z: 1.04 },
  { f: 14490, x: 960, y: 540, z: 1 },
];

// -----------------------------------------------------------------------------
// MOTION — the whole of it. Two components, and neither of them idles.
// -----------------------------------------------------------------------------

/** Entrance only: fade + lift + a whisper of scale, then absolutely still. */
const Rise: React.FC<{ at: number; dur?: number; dy?: number; children: React.ReactNode }> =
  ({ at, dur = 16, dy = 26, children }) => {
    const frame = useCurrentFrame();
    const k = interpolate(frame, [at, at + dur], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return (
      <div style={{ opacity: k, transform: `translateY(${(1 - k) * dy}px) scale(${0.985 + k * 0.015})`, transformOrigin: 'left center' }}>
        {children}
      </div>
    );
  };

const FadeOut: React.FC<{ at: number; dur?: number; children: React.ReactNode }> = ({ at, dur = 20, children }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + dur], [1, 0], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <div style={{ opacity: o }}>{children}</div>;
};

const XFADE = 26; // frames of overlap between two backdrops — the whole transition budget

/**
 * One photograph per scene, on a track whose windows overlap so the change is a dissolve.
 * `at` is the cue the image belongs to; the window starts XFADE frames early and runs to the
 * next image's cue, so [next-XFADE, next] has both on screen, one rising and one leaving.
 */
type Shot = { at: number; src: string; pos?: string; dim?: number; zoom?: number; pan?: [number, number] };

const KenBurns: React.FC<{ shot: Shot; len: number }> = ({ shot, len }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, XFADE, len - XFADE, len], [0, 1, 1, 0], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const k = interpolate(frame, [0, len], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const z = 1 + (shot.zoom ?? 0.06) * k;
  const [px, py] = shot.pan ?? [0, 0];
  return (
    <Layer x={960} y={540} w={W * 1.12} at={0} dur={1} enter="none" depth={-0.05} drift={0}>
      <div style={{ opacity: fade, overflow: 'hidden' }}>
        <div style={{ transform: `scale(${z}) translate(${px * k}px, ${py * k}px)`, transformOrigin: '50% 50%' }}>
          <div style={{ position: 'relative' }}>
            <Img src={shot.src} style={{ width: '100%', height: H * 1.12, objectFit: 'cover', objectPosition: shot.pos ?? '50% 50%', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: T.paper, opacity: shot.dim ?? 0.84 }} />
          </div>
        </div>
      </div>
    </Layer>
  );
};

const Backdrop: React.FC<{ shots: Shot[]; end: number }> = ({ shots, end }) => (
  <>
    {shots.map((s, i) => {
      const from = Math.max(0, s.at - XFADE);
      const to = i + 1 < shots.length ? shots[i + 1].at : end;
      const len = Math.max(1, to - from);
      return (
        <Sequence key={s.src + i} from={from} durationInFrames={len} layout="none">
          <KenBurns shot={s} len={len} />
        </Sequence>
      );
    })}
  </>
);

const SceneBody: React.FC<{ dur: number; fadeOut: number; children: React.ReactNode }> = ({ dur, fadeOut, children }) => {
  const frame = useCurrentFrame();
  const o = fadeOut
    ? interpolate(frame, [dur - fadeOut, dur], [1, 0], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1;
  // leaving is the mirror of Rise: it lifts a little as it goes, so the eye reads
  // "that one is going" instead of "the screen dimmed".
  return <div style={{ opacity: o, transform: `translateY(${(1 - o) * -14}px)` }}>{children}</div>;
};

const Scene: React.FC<{ from: number; dur: number; fadeOut?: number; children: React.ReactNode }> =
  ({ from, dur, fadeOut = 0, children }) => (
    <Sequence from={from} durationInFrames={Math.max(1, dur)} layout="none">
      <SceneBody dur={Math.max(1, dur)} fadeOut={fadeOut}>{children}</SceneBody>
    </Sequence>
  );

// -----------------------------------------------------------------------------
// TYPE AND FIGURES — every one of these is drift={0} enter="none" + <Rise>.
// -----------------------------------------------------------------------------

/** A cue, expressed relative to the chapter that contains it. Every `at` in the body is one. */
const R = (cue: number, from: number) => cue - from;

const XOVER = 14; // how far a chapter's content lingers past the next chapter's first cue
const XOUT = 26;  // and how long its fade takes — the two overlap on purpose, so nothing
                  // is ever alone on a bare backdrop between two chapters.

/**
 * A chapter of the film. Content arrives on its own cue and leaves ACROSS the next one:
 * the outgoing block is still fading while the incoming block is already rising, which is
 * what makes the change read as a transition instead of a cut with a hole in it.
 */
const Chapter: React.FC<{ from: number; to: number; last?: boolean; children: React.ReactNode }> =
  ({ from, to, last = false, children }) => (
    <Scene from={from} dur={to - from + (last ? 0 : XOVER)} fadeOut={last ? 0 : XOUT}>{children}</Scene>
  );

/** The last 40 frames, to paper. Sits above everything so nothing survives the end. */
const EndFade: React.FC<{ at: number; dur: number }> = ({ at, dur }) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [at, at + dur], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ background: BLUEPRINT.paper, opacity: k, pointerEvents: 'none' }} />;
};

/**
 * A footnote inside a Card. Its box is always the same size — only the ink fades in — so the
 * card never resizes under the reader mid-sentence.
 */
const Note: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [at, at + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      marginTop: 20, paddingTop: 18, borderTop: `1px solid ${BLUEPRINT.landHi}`,
      fontFamily: FONT_TH, fontSize: 22, color: BLUEPRINT.yellow, lineHeight: 1.45,
      opacity: k, transform: `translateY(${(1 - k) * 10}px)`,
    }}>{children}</div>
  );
};

const GOOD = [
  'ขยับต่อ ทำกิจวัตรเท่าที่ไหว — ไม่ใช่นอนพัก',
  'โปรแกรมออกกำลังกาย',
  'ยากลุ่มลดการอักเสบเป็นตัวแรก',
  'พาราเซตามอลเดี่ยว ๆ ไม่ใช่ตัวหลัก',
];
const BAD = [
  'เข็มขัดพยุงหลัง · เสื้อรัดหลัง',
  'การดึงหลัง เครื่องดึงกระดูกสันหลัง',
  'เครื่องกระตุ้นไฟฟ้าแบบแปะผิว (TENS)',
  'อัลตราซาวด์',
];

const Head: React.FC<{ at: number; kicker?: string; head: string; sub?: string; y?: number; accent?: string; w?: number }> =
  ({ at, kicker, head, sub, y = 330, accent, w = 620 }) => {
    const T = useTheme();
    return (
      // the column stays clear of the figure at x=870 even at its widest
      <Layer x={MARGIN_L + 300} y={y} w={w} at={0} dur={1} enter="none" depth={0.04} drift={0}>
        <Rise at={at}>
          {kicker ? (
            <div style={{ fontFamily: FONT_TH, fontSize: 24, color: accent ?? T.inkSoft, letterSpacing: '0.6px', marginBottom: 12 }}>{kicker}</div>
          ) : null}
          <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 54, lineHeight: 1.28, fontWeight: 700, color: T.ink, letterSpacing: '0.6px' }}>{head}</div>
          {sub ? (
            <div style={{ fontFamily: FONT_TH, fontSize: 27, lineHeight: 1.5, color: T.inkSoft, marginTop: 18, letterSpacing: '0.6px' }}>{sub}</div>
          ) : null}
        </Rise>
      </Layer>
    );
  };

/** A cut-out object. Objects MAY keep a hint of drift — they are things, not words. */
const Prop: React.FC<{ src: string; x: number; y: number; w: number; at: number; rot?: number; caption?: string }> =
  ({ src, x, y, w, at, rot = -1.5, caption }) => {
    const T = useTheme();
    return (
      <Layer x={x} y={y} w={w} at={0} dur={1} enter="none" rotate={rot} depth={0.08} drift={0.5}>
        <Rise at={at} dy={34}>
          <Img src={src} style={{ width: '100%', display: 'block' }} />
          {caption ? (
            <div style={{ fontFamily: FONT_TH, fontSize: 21, color: T.inkSoft, marginTop: 10, textAlign: 'center' }}>{caption}</div>
          ) : null}
        </Rise>
      </Layer>
    );
  };

const Card: React.FC<{ w: number; pad?: number; children: React.ReactNode }> = ({ w, pad = 30, children }) => {
  const T = useTheme();
  return <div style={{ width: w, background: T.cream, border: `2px solid ${T.landHi}`, borderRadius: 10, padding: pad }}>{children}</div>;
};

const Figure: React.FC<{ at: number; x?: number; y?: number; w: number; children: React.ReactNode }> =
  ({ at, x = 1240, y = 520, w, children }) => (
    <Layer x={x} y={y} w={w} at={0} dur={1} enter="none" depth={0.04} drift={0}>
      <Rise at={at} dy={30}>
        <Card w={w}>{children}</Card>
      </Rise>
    </Layer>
  );

// =============================================================================
// THE CORE FIGURE — degeneration found in people with NO pain, by age.
// The bars are the argument: if almost everyone has it, finding it explains nothing.
// =============================================================================
const AGE = [
  { age: '20 ปี', deg: 37, bulge: 30 },
  { age: '80 ปี', deg: 96, bulge: 84 },
];
const AgeBars: React.FC<{ at: number; bulgeAt?: number }> = ({ at, bulgeAt }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const growAt = (f: number) => interpolate(frame, [f, f + 22], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const grow = (d: number) => growAt(at + d);
  const PX = 6.4; // px per percent — 96% is 614px, inside the 700px column
  return (
    <>
      <div style={{ fontFamily: FONT_TH, fontSize: 22, color: T.inkSoft, marginBottom: 6 }}>เจอในคนที่ <b style={{ color: T.ink }}>ไม่มีอาการปวดหลังเลย</b></div>
      <div style={{ fontFamily: FONT_TH, fontSize: 19, color: T.inkSoft, marginBottom: 26 }}>ทบทวน 33 งานวิจัย · 3,110 คน</div>
      {AGE.map((a, i) => (
        <div key={a.age} style={{ marginBottom: i ? 0 : 30 }}>
          <div style={{ fontFamily: FONT_TH, fontSize: 24, color: T.ink, marginBottom: 10 }}>อายุ {a.age}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <div style={{ width: a.deg * PX * grow(i * 12), height: 38, background: T.yellow, borderRadius: 4 }} />
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 32, fontWeight: 700, color: T.yellow, opacity: grow(i * 12), whiteSpace: 'nowrap' }}>{a.deg}%</div>
          </div>
          <div style={{ opacity: bulgeAt === undefined ? 0 : growAt(bulgeAt + i * 10), display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: a.bulge * PX, height: 22, background: T.teal, borderRadius: 4, opacity: 0.85 }} />
            <div style={{ fontFamily: FONT_TH, fontSize: 23, color: T.teal, whiteSpace: 'nowrap' }}>{a.bulge}% โป่ง</div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 26, paddingTop: 20, borderTop: `1px solid ${T.landHi}`, display: 'flex', gap: 22, fontFamily: FONT_TH, fontSize: 20 }}>
        <span style={{ color: T.yellow }}>■ หมอนรองกระดูกเสื่อม</span>
        {/* only claim a series once it is actually on the chart */}
        {bulgeAt === undefined ? null : (
          <span style={{ color: T.teal, opacity: growAt(bulgeAt) }}>■ หมอนรองกระดูกโป่ง</span>
        )}
      </div>
    </>
  );
};

const SurgeryBars: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = (d: number) => interpolate(frame, [at + d, at + d + 24], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const row = (label: string, v: number, colour: string, d: number) => (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontFamily: FONT_TH, fontSize: 23, color: T.ink, marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: (v / 1.48) * 460 * g(d), height: 34, background: colour, borderRadius: 4, minWidth: 3 }} />
        <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 30, fontWeight: 700, color: colour, opacity: g(d) }}>{v}%</div>
      </div>
    </div>
  );
  return (
    <>
      <div style={{ fontFamily: FONT_TH, fontSize: 22, color: T.inkSoft, marginBottom: 24 }}>สัดส่วนที่จบด้วยการผ่าตัดหลัง</div>
      {row('กลุ่มที่ได้สแกนเร็ว', 1.48, T.red, 0)}
      {row('กลุ่มที่ไม่ได้สแกนเร็ว', 0.12, T.teal, 16)}
      <div style={{ opacity: g(34), marginTop: 4, fontFamily: FONT_TH, fontSize: 21, color: T.inkSoft, lineHeight: 1.5 }}>
        และอาการปวดของสองกลุ่ม <b style={{ color: T.ink }}>ไม่ได้ต่างกัน</b>
        <br />
        <span style={{ color: T.red }}>งานวิจัยชิ้นเดียว — ดูทิศทาง อย่ายึดตัวเลข</span>
      </div>
    </>
  );
};

const FLAGS = [
  'ไข้ หนาวสั่น หรือเหงื่อออกมากตอนกลางคืน',
  'น้ำหนักลดเองโดยไม่ได้ตั้งใจ',
  'หลังอุบัติเหตุรุนแรง · กระดูกพรุน · ใช้สเตียรอยด์นาน',
  'ขาอ่อนแรงลงเรื่อย ๆ หรือชาลงขามากขึ้น',
  'กลั้นปัสสาวะอุจจาระไม่อยู่ · ชารอบก้น',
];
const RedFlags: React.FC<{ ats: number[]; urgentAt?: number }> = ({ ats, urgentAt }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  return (
    <>
      <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 30, fontWeight: 700, color: T.red, marginBottom: 20 }}>สัญญาณอันตราย — ต้องไปพบแพทย์</div>
      {FLAGS.map((f, i) => {
        const k = interpolate(frame, [ats[i], ats[i] + 18], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const last = i === FLAGS.length - 1;
        // the urgent box grows in on its own cue rather than appearing with the row
        const u = urgentAt === undefined ? 0 : interpolate(frame, [urgentAt, urgentAt + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={f} style={{
            opacity: k,
            transform: `translateY(${(1 - k) * 14}px)`,
            display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: last ? 0 : 14,
            background: last ? `rgba(11,26,42,${u * 0.85})` : 'transparent',
            border: `2px solid ${last ? `rgba(214,90,74,${u})` : 'transparent'}`,
            borderRadius: 8, padding: last ? '14px 16px' : '0 16px',
          }}>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 24, fontWeight: 700, color: T.red, width: 26, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ fontFamily: FONT_TH, fontSize: 24, color: T.ink, lineHeight: 1.45 }}>
              {f}
              {last && urgentAt !== undefined ? (
                <div style={{ color: T.red, fontSize: 21, marginTop: 6, opacity: u }}>ชุดนี้ไปโรงพยาบาลทันที รอไม่ได้</div>
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );
};

/** `ats` gives each row its own narration cue; without it the rows cascade off `at`. */
const List: React.FC<{ at: number; title: string; colour: string; items: string[]; ats?: number[] }> =
  ({ at, title, colour, items, ats }) => {
    const T = useTheme();
    const frame = useCurrentFrame();
    return (
      <>
        <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 30, fontWeight: 700, color: colour, marginBottom: 20 }}>{title}</div>
        {items.map((t, i) => {
          const a = ats ? ats[i] : at + i * 7;
          const on = interpolate(frame, [a, a + 18], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={t} style={{
              opacity: on, transform: `translateY(${(1 - on) * 14}px)`,
              display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: i === items.length - 1 ? 0 : 15,
            }}>
              <div style={{ width: 9, height: 9, borderRadius: 5, background: colour, marginTop: 12, flexShrink: 0 }} />
              <div style={{ fontFamily: FONT_TH, fontSize: 25, color: T.ink, lineHeight: 1.45 }}>{t}</div>
            </div>
          );
        })}
      </>
    );
  };

/** The screenshot card the channel's rules require: problem / fix / advice, all three visible. */
const SummaryCard: React.FC<{ at: number; ats?: number[] }> = ({ at, ats }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const rows: [string, string, string][] = [
    ['ปัญหา', 'ภาพสแกนเจอความผิดปกติได้เกือบทุกคน รวมทั้งคนที่ไม่ปวด', T.red],
    ['ทางแก้', 'ตรวจสัญญาณอันตรายก่อน ถ้าไม่มี ให้เวลาและการขยับทำงาน', T.yellow],
    ['คำแนะนำ', 'ขยับต่อ · ออกกำลังกาย · ยาถามหมอ · ไม่ต้องซื้อเข็มขัดหรือเครื่องดึงหลัง', T.teal],
  ];
  return (
    <>
      {rows.map(([k, v, c], i) => {
        const a = ats ? ats[i] : at + i * 10;
        const on = interpolate(frame, [a, a + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={k} style={{ opacity: on, transform: `translateY(${(1 - on) * 16}px)`, marginBottom: i === 2 ? 0 : 22 }}>
            <div style={{ fontFamily: FONT_TH, fontSize: 21, color: c, marginBottom: 6 }}>{k}</div>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 28, fontWeight: 700, color: T.ink, lineHeight: 1.4 }}>{v}</div>
          </div>
        );
      })}
    </>
  );
};

const Title: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  return (
    <Layer x={MARGIN_L + 320} y={400} w={680} at={0} dur={1} enter="none" depth={0.04} drift={0}>
      <Rise at={at} dur={22} dy={40}>
        <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 68, lineHeight: 1.24, fontWeight: 700, color: T.ink, letterSpacing: '0.6px' }}>
          เอกซเรย์หลังทันที
          <br />
          <span style={{ background: T.yellow, color: T.paper, padding: '2px 14px', borderRadius: 6 }}>อาจทำให้หายช้าลง</span>
        </div>
      </Rise>
    </Layer>
  );
};

// =============================================================================
const Vox12BackPain: React.FC = () => (
  <AbsoluteFill style={{ background: BLUEPRINT.paper }}>
    <CollageBoard cam={CAM} theme="blueprint" fontBody={FONT_TH} fontDisplay={FONT_TH_DISPLAY} tracking="0.6px">
      <PaperBG w={W} h={H} />

      {/* One photograph per scene, cross-dissolving, each drifting slowly. */}
      <Backdrop
        end={C.tail}
        shots={[
          { at: 0, src: A('p-hold-back-raw.png'), pos: '55% 45%', dim: 0.84, zoom: 0.07, pan: [-14, 0] },
          { at: C.s06_common, src: A('p-morning-walk-raw.png'), pos: '50% 55%', dim: 0.85, zoom: 0.06, pan: [10, -6] },

          { at: C.s09_willfind, src: A('p-scanner-raw.png'), pos: '50% 50%', dim: 0.83, zoom: 0.05, pan: [0, 8] },
          { at: C.s12_eighty, src: A('p-waiting-room-raw.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [-10, 0] },

          { at: C.s15_cantell, src: A('p-consult-room-raw.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [12, 0] },
          { at: C.s17_behave, src: A('p-stairs-home-raw.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [0, -8] },

          { at: C.s19_cohort, src: A('p-corridor-raw.png'), pos: '50% 50%', dim: 0.80, zoom: 0.08, pan: [0, -8] },
          { at: C.s21_opioid, src: A('p-theatre-lights-raw.png'), pos: '50% 45%', dim: 0.84, zoom: 0.06, pan: [8, 0] },

          { at: C.s24_turn, src: A('p-window-light-raw.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [-10, 0] },
          { at: C.s27_two, src: A('p-clinic-door-raw.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [0, 6] },
          { at: C.s30_five, src: A('p-night-ward-raw.png'), pos: '50% 50%', dim: 0.80, zoom: 0.07, pan: [10, 0] },

          { at: C.s32_move, src: A('p-stretch-raw.png'), pos: '50% 55%', dim: 0.84, zoom: 0.06, pan: [8, -6] },
          { at: C.s35_nsaid, src: A('p-park-stairs-raw.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [-8, 0] },

          { at: C.s38_intro, src: A('p-pharmacy-shelf-raw.png'), pos: '50% 50%', dim: 0.85, zoom: 0.07, pan: [-12, 0] },
          { at: C.s41_tens, src: A('p-store-aisle-raw.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [10, 4] },

          { at: C.s43_scope, src: A('p-desk-sit-raw.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [10, 4] },

          { at: C.s46_problem, src: A('p-evening-walk-raw.png'), pos: '50% 50%', dim: 0.82, zoom: 0.07, pan: [0, -6] },
          { at: C.s48_dos, src: A('p-kitchen-morning-raw.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [-8, -4] },
        ]}
      />

      {/* 1 — HOOK. The red flags are named here, before "don't scan" can land alone. */}
      <Chapter from={0} to={C.s06_common}>
        <Title at={C.s01_scene} />
        <Prop src={A('o-spine-model.png')} x={350} y={770} w={215} at={C.s02_firstthought + 15} rot={1} caption="กระดูกสันหลังส่วนล่าง" />
        <Figure at={C.s04_butguide} x={1240} y={560} w={720}>
          <div style={{ fontFamily: FONT_TH, fontSize: 26, color: BLUEPRINT.ink, lineHeight: 1.55 }}>
            แนวทางหลายประเทศระบุว่า ถ้า<b style={{ color: BLUEPRINT.yellow }}>ไม่มีสัญญาณอันตราย</b>
            <br />ยังไม่ต้องรีบถ่ายภาพ
          </div>
        </Figure>
      </Chapter>

      {/* 2 — NATURE OF IT */}
      <Chapter from={C.s06_common} to={C.s09_willfind}>
        <Head at={0} kicker="ภาพรวมก่อน" head="แทบทุกคนต้องเจอสักครั้ง" sub="และส่วนใหญ่ดีขึ้นเองภายในราวหกสัปดาห์" y={340} />
        <Prop src={A('o-calendar.png')} x={1400} y={870} w={340} at={R(C.s07_recover, C.s06_common)} rot={-2} caption="ราว 6 สัปดาห์" />
      </Chapter>

      {/* 3 — THE CORE MECHANISM */}
      <Chapter from={C.s09_willfind} to={C.s15_cantell}>
        <Head at={0} kicker="กลไกหลัก" head="สแกนแล้วจะเจอเสมอ" sub="และนั่นคือตัวปัญหา ไม่ใช่ตัวช่วย" y={300} />
        <Figure at={R(C.s10_study, C.s09_willfind)} w={740}>
          <AgeBars at={R(C.s10_study, C.s09_willfind)} bulgeAt={R(C.s13_bulge, C.s09_willfind)} />
        </Figure>
        <Prop src={A('o-magnifier.png')} x={380} y={860} w={300} at={R(C.s11_twenty, C.s09_willfind)} rot={-2} />
      </Chapter>

      {/* 4 — THE LABEL */}
      <Chapter from={C.s15_cantell} to={C.s19_cohort}>
        <Head at={0} kicker="สิ่งที่เกิดขึ้นต่อ" head="พอมันมีชื่อ คนก็เริ่มระวังตัว" sub="ขยับน้อยลง เพราะกลัวว่าจะพังไปกว่าเดิม" y={340} />
        <Figure at={R(C.s17_behave, C.s15_cantell)} w={700}>
          <List at={R(C.s17_behave, C.s15_cantell)} title="วงจรที่ตามมา" colour={BLUEPRINT.red}
            items={['ภาพเจอความเสื่อม', 'ถูกตั้งชื่อว่าเป็นสาเหตุ', 'กลัวการเคลื่อนไหว', 'ขยับน้อยลง', 'อาการแย่ลง']} />
        </Figure>
        <Prop src={A('o-remote.png')} x={400} y={880} w={300} at={R(C.s18_irony, C.s15_cantell)} rot={2} />
      </Chapter>

      {/* 5 — WHAT FOLLOWED */}
      <Chapter from={C.s19_cohort} to={C.s24_turn}>
        <Head at={0} kicker="งานติดตามผล" head="สแกนเร็ว ผ่าตัดมากกว่า" y={320} accent={BLUEPRINT.red} />
        <Figure at={R(C.s20_surgery, C.s19_cohort)} w={700}><SurgeryBars at={R(C.s20_surgery, C.s19_cohort)} /></Figure>
        <Prop src={A('o-wristband.png')} x={400} y={880} w={340} at={R(C.s21_opioid, C.s19_cohort)} rot={-1} />
      </Chapter>

      {/* 6 — RED FLAGS. The longest figure in the video, and the one that cannot be cut.
          One card; each flag arrives on the line that says it. */}
      <Chapter from={C.s24_turn} to={C.s32_move}>
        <Head at={0} kicker="ส่วนที่สำคัญที่สุด" head="ทั้งหมดนี้คือปวดหลังทั่วไป" sub="มีกลุ่มที่ต้องรีบตรวจ และต้องรีบถ่ายภาพ" y={300} w={720} accent={BLUEPRINT.red} />
        <Prop src={A('o-thermometer.png')} x={420} y={880} w={330} at={R(C.s26_one, C.s24_turn)} rot={-2} />
        <Figure at={R(C.s26_one, C.s24_turn)} x={1250} y={540} w={760}>
          <RedFlags
            ats={[C.s26_one, C.s27_two, C.s28_three, C.s29_four, C.s30_five].map((f) => R(f, C.s24_turn))}
            urgentAt={R(C.s31_summary, C.s24_turn)}
          />
        </Figure>
      </Chapter>

      {/* 7 — WHAT GUIDELINES SAY TO DO */}
      <Chapter from={C.s32_move} to={C.s38_intro}>
        <Head at={0} kicker="สำหรับคนที่ไม่มีสัญญาณอันตราย" head="แนวทางบอกให้ทำอะไร" y={320} />
        <Prop src={A('o-blister.png')} x={330} y={900} w={360} at={R(C.s35_nsaid, C.s32_move)} rot={-1} />
        <Prop src={A('o-water-glass.png')} x={690} y={880} w={175} at={R(C.s36_noparacet, C.s32_move)} rot={1} />
        <Figure at={R(C.s33_nobedrest, C.s32_move)} w={720}>
          <List at={0} title="สิ่งที่แนวทางแนะนำ" colour={BLUEPRINT.teal}
            items={GOOD}
            ats={[C.s33_nobedrest, C.s34_exercise, C.s35_nsaid, C.s36_noparacet].map((f) => R(f, C.s32_move))} />
          <Note at={R(C.s37_askdoc, C.s32_move)}>
            ยาทุกตัวมีข้อห้าม — โรคไต โรคกระเพาะ หรือกินยาอื่นอยู่ ต้องถามหมอหรือเภสัชกรก่อน
          </Note>
        </Figure>
      </Chapter>

      {/* 8 — WHAT NOT TO BUY */}
      <Chapter from={C.s38_intro} to={C.s43_scope}>
        <Head at={0} kicker="แนวทางระบุว่าไม่ควรใช้รักษาอาการนี้" head="ของที่ไม่ต้องซื้อ" y={320} accent={BLUEPRINT.red} />
        <Prop src={A('o-back-brace.png')} x={310} y={790} w={420} at={R(C.s39_belt, C.s38_intro)} rot={-2} />
        <Prop src={A('o-tens-unit.png')} x={700} y={960} w={320} at={R(C.s41_tens, C.s38_intro)} rot={1} />
        <Figure at={R(C.s39_belt, C.s38_intro)} w={720}>
          <List at={0} title="ไม่ควรใช้เพื่อรักษาอาการปวดหลัง" colour={BLUEPRINT.red}
            items={BAD}
            ats={[C.s39_belt, C.s40_traction, C.s41_tens, C.s41_tens + 60].map((f) => R(f, C.s38_intro))} />
        </Figure>
      </Chapter>

      {/* 9 — SCOPE */}
      <Chapter from={C.s43_scope} to={C.s46_problem}>
        <Head at={0} kicker="พูดให้ชัดอีกครั้ง" head="คลิปนี้พูดถึงใคร" y={330} />
        <Figure at={R(C.s44_notyou, C.s43_scope)} w={740}>
          <List at={R(C.s44_notyou, C.s43_scope)} title="ขอบเขตของคลิปนี้" colour={BLUEPRINT.yellow}
            items={['ปวดหลังส่วนล่างแบบทั่วไป ในคนที่ไม่มีสัญญาณอันตรายทั้งห้าข้อ', 'คลิปนี้ไม่ได้ตรวจร่างกายคุณ และไม่ได้บอกว่าอย่าไปหาหมอ', 'หมอที่ทำตามแนวทาง อาจยังไม่ส่งสแกนในวันแรก — ไม่ได้แปลว่าไม่ใส่ใจ']}
            ats={[C.s44_notyou, C.s44_notyou + 90, C.s45_notlazy].map((f) => R(f, C.s43_scope))} />
        </Figure>
        <Prop src={A('o-stethoscope.png')} x={300} y={820} w={330} at={R(C.s44_notyou, C.s43_scope)} rot={-2} />
        <Prop src={A('o-shoes.png')} x={660} y={940} w={340} at={R(C.s45_notlazy, C.s43_scope)} rot={1.5} />
      </Chapter>

      {/* 10 — SUMMARY. The screenshot frame: all three rows stay up together. */}
      <Chapter from={C.s46_problem} to={C.tail} last>
        <Head at={0} kicker="สรุป" head="ปัญหา · ทางแก้ · คำแนะนำ" y={280} />
        <Figure at={0} x={1250} y={520} w={780}>
          <SummaryCard at={0} ats={[C.s46_problem, C.s47_solution, C.s48_dos].map((f) => R(f, C.s46_problem))} />
        </Figure>
        <Prop src={A('o-notebook.png')} x={380} y={900} w={300} at={R(C.s47_solution, C.s46_problem)} rot={-1.5} />
        <Layer x={MARGIN_L + 300} y={700} w={620} at={0} dur={1} enter="none" depth={0.04} drift={0}>
          <Rise at={R(C.s50_close, C.s46_problem)} dy={30}>
            <div style={{
              fontFamily: FONT_TH_DISPLAY, fontSize: 34, fontWeight: 700, color: BLUEPRINT.ink, lineHeight: 1.4,
              borderLeft: `5px solid ${BLUEPRINT.red}`, paddingLeft: 20,
            }}>
              ถ้ามีสัญญาณอันตรายข้อใดข้อหนึ่ง
              <br />ไปพบแพทย์ ไม่ต้องรอ
            </div>
          </Rise>
        </Layer>
      </Chapter>

      <Grain opacity={0.04} />
      <EndFade at={C.tail - 44} dur={40} />
    </CollageBoard>
  </AbsoluteFill>
);

export default Vox12BackPain;
