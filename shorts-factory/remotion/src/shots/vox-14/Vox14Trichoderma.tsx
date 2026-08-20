import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { BLUEPRINT, CollageBoard, EASE_OUT, Grain, Layer, useTheme } from '../../lib/collage';
import { FONT_TH, FONT_TH_DISPLAY } from '../../fonts';

// =============================================================================
// vox-14 — ขยายเชื้อไตรโคเดอร์มาเอง · เกษตรที่คนไทยควรรู้ · 1920x1080
//
// THE CHANNEL'S FIRST HANDS-ON VIDEO, and that changes the stakes rather than the style.
// An explainer that is wrong leaves somebody misinformed; a how-to that is wrong leaves
// somebody with a week gone, a bag of rice wasted, and possibly an unidentified organism on
// their field. channels/agri.json gained two rules for this, and both are visible here:
//
//   1. Every step carries a checkpoint — "what should I be seeing right now" — and the
//      chapter that teaches FAILURE is the longest in the film. If the viewer can read the
//      bag, our day count being a day out does not hurt them.
//
//   2. NO GENERATED PHOTOGRAPH OF A CULTURE. In this video the colour of the bag IS the
//      test result, so a picture of it would be doing the job of reference data, and agri's
//      rule is that generated illustration and real data must not swap roles. The white /
//      green / black states are drawn in code as a labelled colour key, on a NEUTRAL PALE
//      CARD rather than on the dark board — a swatch judged against dark navy reads as a
//      different colour than the same swatch against the daylight the viewer is holding
//      their real bag in. The card says on screen that it is a reference key, not a photo.
//
// Motion is vox-12's, unchanged (brand.md §5): type never drifts, the entrance is the craft,
// chapters cross-fade with the outgoing content lingering past the next chapter's first cue.
// =============================================================================

export const compositionConfig = {
  id: 'Vox14Trichoderma',
  durationInSeconds: 465,   // beats.json: VO ends 462.94s
  fps: 30,
  width: 1920,
  height: 1080,
};

const W = 1920;
const H = 1080;
const MARGIN_L = 170;
const A = (f: string) => staticFile(`projects/vox-14-trichoderma/layers/${f}`);

// ---- GENERATED CUES — rebuilt from beats.json by scripts/gen-cues.mjs. Do not hand-edit.
// Cue name === segment id in beats.json, so there is no map to keep in sync.
// All 51 windows are measured from the real audio.
const C = {
  s01_sachet: 15,
  s02_easy: 368,
  s03_butfail: 699,
  s04_promise: 958,

  s05_whatis: 1263,
  s06_how: 1532,
  s07_which: 1769,
  s08_notall: 2146,
  s09_before: 2453,

  s10_kit: 2845,
  s11_bag: 3209,
  s12_starter: 3553,
  s13_nowild: 3802,

  s14_step1: 4121,
  s15_why: 4352,
  s16_bacteria: 4636,
  s17_scoop: 4874,

  s18_step2: 5204,
  s19_wait: 5489,
  s20_whyhot: 5773,
  s21_invisible: 6051,

  s22_step3: 6314,
  s23_label: 6526,
  s24_shake: 6719,
  s25_holes: 7027,
  s26_air: 7258,

  s27_step4: 7481,
  s28_sun: 7840,
  s29_day2: 8045,
  s30_seven: 8317,

  s31_step5: 8505,
  s32_why: 8726,
  s33_white: 9025,
  s34_whitewait: 9263,
  s35_green: 9555,
  s36_bad: 9814,
  s37_slime: 10093,
  s37b_smell: 10341,
  s37c_partial: 10659,
  s37d_because: 10978,
  s38_throw: 11193,

  s39_use: 11425,
  s40_spray: 11632,
  s41_spraymix: 11931,
  s42_soil: 12157,
  s43_chem: 12442,
  s44_ask: 12721,

  s45_sum: 12945,
  s46_problem: 13045,
  s47_fix: 13293,
  s48_start: 13587,
  tail: 13888,
} as const;
// ---- END GENERATED CUES

const CAM = [
  { f: 0, x: 960, y: 540, z: 1 },
  { f: 7000, x: 988, y: 530, z: 1.012 },
  { f: 14400, x: 938, y: 550, z: 1.004 },
];

const R = (cue: number, from: number) => cue - from;
const XFADE = 26;
const XOVER = 14;
const XOUT = 26;

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

// -----------------------------------------------------------------------------
// PLATES
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// CHAPTERS
// -----------------------------------------------------------------------------
const SceneBody: React.FC<{ dur: number; fadeOut: number; children: React.ReactNode }> = ({ dur, fadeOut, children }) => {
  const frame = useCurrentFrame();
  const o = fadeOut
    ? interpolate(frame, [dur - fadeOut, dur], [1, 0], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1;
  return <div style={{ opacity: o, transform: `translateY(${(1 - o) * -14}px)` }}>{children}</div>;
};

const Scene: React.FC<{ from: number; dur: number; fadeOut?: number; children: React.ReactNode }> =
  ({ from, dur, fadeOut = 0, children }) => (
    <Sequence from={from} durationInFrames={Math.max(1, dur)} layout="none">
      <SceneBody dur={Math.max(1, dur)} fadeOut={fadeOut}>{children}</SceneBody>
    </Sequence>
  );

const Chapter: React.FC<{ from: number; to: number; last?: boolean; children: React.ReactNode }> =
  ({ from, to, last = false, children }) => (
    <Scene from={from} dur={to - from + (last ? 0 : XOVER)} fadeOut={last ? 0 : XOUT}>{children}</Scene>
  );

const EndFade: React.FC<{ at: number; dur: number }> = ({ at, dur }) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [at, at + dur], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ background: BLUEPRINT.paper, opacity: k, pointerEvents: 'none' }} />;
};

// -----------------------------------------------------------------------------
// TYPE AND FIGURES
// -----------------------------------------------------------------------------
const Head: React.FC<{ at: number; kicker?: string; head: string; sub?: string; y?: number; accent?: string; w?: number }> =
  ({ at, kicker, head, sub, y = 330, accent, w = 620 }) => {
    const T = useTheme();
    return (
      <Layer x={MARGIN_L + 300} y={y} w={w} at={0} dur={1} enter="none" depth={0.04} drift={0}>
        <Rise at={at}>
          {kicker ? <div style={{ fontFamily: FONT_TH, fontSize: 24, color: accent ?? T.inkSoft, letterSpacing: '0.6px', marginBottom: 12 }}>{kicker}</div> : null}
          <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 54, lineHeight: 1.28, fontWeight: 700, color: T.ink, letterSpacing: '0.6px' }}>{head}</div>
          {sub ? <div style={{ fontFamily: FONT_TH, fontSize: 27, lineHeight: 1.5, color: T.inkSoft, marginTop: 18, letterSpacing: '0.6px' }}>{sub}</div> : null}
        </Rise>
      </Layer>
    );
  };

const Prop: React.FC<{ src: string; x: number; y: number; w: number; at: number; rot?: number; caption?: string }> =
  ({ src, x, y, w, at, rot = -1.5, caption }) => {
    const T = useTheme();
    return (
      <Layer x={x} y={y} w={w} at={0} dur={1} enter="none" rotate={rot} depth={0.08} drift={0.5}>
        <Rise at={at} dy={34}>
          <Img src={src} style={{ width: '100%', display: 'block' }} />
          {caption ? <div style={{ fontFamily: FONT_TH, fontSize: 21, color: T.inkSoft, marginTop: 10, textAlign: 'center' }}>{caption}</div> : null}
        </Rise>
      </Layer>
    );
  };

const Card: React.FC<{ w: number; pad?: number; bg?: string; children: React.ReactNode }> = ({ w, pad = 30, bg, children }) => {
  const T = useTheme();
  return <div style={{ width: w, background: bg ?? T.cream, border: `2px solid ${T.landHi}`, borderRadius: 10, padding: pad }}>{children}</div>;
};

const Figure: React.FC<{ at: number; x?: number; y?: number; w: number; bg?: string; children: React.ReactNode }> =
  ({ at, x = 1240, y = 520, w, bg, children }) => (
    <Layer x={x} y={y} w={w} at={0} dur={1} enter="none" depth={0.04} drift={0}>
      <Rise at={at} dy={30}><Card w={w} bg={bg}>{children}</Card></Rise>
    </Layer>
  );

const Note: React.FC<{ at: number; colour?: string; children: React.ReactNode }> = ({ at, colour, children }) => {
  const frame = useCurrentFrame();
  const T = useTheme();
  const k = interpolate(frame, [at, at + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      marginTop: 20, paddingTop: 18, borderTop: `1px solid ${T.landHi}`,
      fontFamily: FONT_TH, fontSize: 22, color: colour ?? T.yellow, lineHeight: 1.45,
      opacity: k, transform: `translateY(${(1 - k) * 10}px)`,
    }}>{children}</div>
  );
};

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
            <div key={t} style={{ opacity: on, transform: `translateY(${(1 - on) * 14}px)`, display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: i === items.length - 1 ? 0 : 15 }}>
              <div style={{ width: 9, height: 9, borderRadius: 5, background: colour, marginTop: 12, flexShrink: 0 }} />
              <div style={{ fontFamily: FONT_TH, fontSize: 25, color: T.ink, lineHeight: 1.45 }}>{t}</div>
            </div>
          );
        })}
      </>
    );
  };

// =============================================================================
// THE STEP RAIL — a how-to affordance, not decoration. It answers "how far in am I and how
// much is left", which is the question a viewer following along in their kitchen actually has.
// =============================================================================
const STEPS = ['หุงข้าว', 'รอให้เย็น', 'ใส่เชื้อ เจาะรู', 'บ่ม 7 วัน', 'อ่านถุง'];
const StepRail: React.FC<{ current: number; at: number }> = ({ current, at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  return (
    <Layer x={960} y={132} w={1500} at={0} dur={1} enter="none" depth={0.02} drift={0}>
      <Rise at={at} dy={18} dur={20}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
          {STEPS.map((s, i) => {
            const done = i < current;
            const now = i === current;
            const k = interpolate(frame, [at + i * 5, at + i * 5 + 16], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <React.Fragment key={s}>
                {i > 0 ? <div style={{ width: 26, height: 2, background: done || now ? T.yellow : T.landHi, opacity: k }} /> : null}
                <div style={{
                  opacity: k * (now ? 1 : done ? 0.8 : 0.42),
                  display: 'flex', gap: 10, alignItems: 'center',
                  background: now ? T.yellow : 'transparent',
                  border: `2px solid ${now ? T.yellow : T.landHi}`,
                  borderRadius: 999, padding: '7px 16px',
                }}>
                  <span style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 19, fontWeight: 700, color: now ? T.paper : done ? T.yellow : T.inkSoft }}>{i + 1}</span>
                  <span style={{ fontFamily: FONT_TH, fontSize: 20, color: now ? T.paper : T.inkSoft, whiteSpace: 'nowrap' }}>{s}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </Rise>
    </Layer>
  );
};

// =============================================================================
// THE COLOUR KEY — the reason this video exists.
//
// Drawn, never photographed, and deliberately on a PALE NEUTRAL CARD: the viewer is holding
// a real bag in daylight, and a swatch surrounded by dark navy would read as a different
// colour than the same swatch surrounded by white. The label on the card says what it is.
// =============================================================================
const KEY_CARD = '#f3efe4';
const KEY_INK = '#2a2418';
const KEY_SOFT = '#6b6252';
const STATES: { swatch: string; name: string; means: string; act: string; ok: boolean }[] = [
  { swatch: '#efeadd', name: 'ขาว ฟู เป็นปุย', means: 'เส้นใย — ขึ้นก่อนเสมอ', act: 'ยังไม่เสร็จ บ่มต่อ', ok: true },
  { swatch: '#7d9440', name: 'เขียว ทั่วทั้งถุง', means: 'สปอร์ — ที่เรารอ', act: 'ใช้ได้', ok: true },
  { swatch: '#26241f', name: 'ดำ', means: 'คนละเชื้อ', act: 'ทิ้ง', ok: false },
  { swatch: '#cbb43f', name: 'เหลืองจัด', means: 'คนละเชื้อ', act: 'ทิ้ง', ok: false },
  { swatch: '#c8828c', name: 'ชมพู', means: 'คนละเชื้อ', act: 'ทิ้ง', ok: false },
  { swatch: '#b9b09a', name: 'เมือกลื่น กลิ่นบูด', means: 'แบคทีเรียชนะ', act: 'ทิ้ง', ok: false },
];
const ColourKey: React.FC<{ ats: number[] }> = ({ ats }) => {
  const frame = useCurrentFrame();
  return (
    <>
      <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 28, fontWeight: 700, color: KEY_INK, marginBottom: 4 }}>
        เปิดถุงวันที่เจ็ด แล้วดูสี
      </div>
      <div style={{ fontFamily: FONT_TH, fontSize: 18, color: KEY_SOFT, marginBottom: 20 }}>
        แถบสีอ้างอิงที่วาดขึ้น ไม่ใช่ภาพถ่าย — ใช้ดูทิศทาง ไม่ใช่เทียบเฉดเป๊ะ ๆ
      </div>
      {STATES.map((s, i) => {
        const a = ats[Math.min(i, ats.length - 1)];
        const k = interpolate(frame, [a, a + 18], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={s.name} style={{
            opacity: k, transform: `translateY(${(1 - k) * 12}px)`,
            display: 'flex', gap: 16, alignItems: 'center', marginBottom: i === STATES.length - 1 ? 0 : 12,
          }}>
            <div style={{ width: 58, height: 40, borderRadius: 6, background: s.swatch, border: `1px solid ${KEY_SOFT}55`, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT_TH, fontSize: 23, color: KEY_INK, lineHeight: 1.25 }}>{s.name}</div>
              <div style={{ fontFamily: FONT_TH, fontSize: 18, color: KEY_SOFT, marginTop: 2 }}>{s.means}</div>
            </div>
            <div style={{
              fontFamily: FONT_TH_DISPLAY, fontSize: 21, fontWeight: 700, whiteSpace: 'nowrap',
              color: s.ok ? '#3f7a46' : '#b23b2c',
              border: `2px solid ${s.ok ? '#3f7a46' : '#b23b2c'}`, borderRadius: 6, padding: '5px 12px',
            }}>{s.act}</div>
          </div>
        );
      })}
    </>
  );
};

/**
 * A recipe with MIXED UNITS. No bars: 1 kg, 5 ml and 100 L do not share a scale, and drawing
 * them on one makes the culture look like a rounding error next to the water. Quantities get
 * their own line and their own unit, which is how a person reads a recipe anyway.
 */
const QtyList: React.FC<{ at: number; title: string; rows: [string, string, string][]; note?: string }> =
  ({ at, title, rows, note }) => {
    const T = useTheme();
    const frame = useCurrentFrame();
    return (
      <>
        <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 28, fontWeight: 700, color: T.yellow, marginBottom: 18 }}>{title}</div>
        {rows.map(([label, qty, colour], i) => {
          const k = interpolate(frame, [at + i * 12, at + i * 12 + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={label} style={{
              opacity: k, transform: `translateY(${(1 - k) * 12}px)`,
              display: 'flex', alignItems: 'baseline', gap: 14,
              borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${T.landHi}`,
              paddingBottom: i === rows.length - 1 ? 0 : 12, marginBottom: i === rows.length - 1 ? 0 : 12,
            }}>
              <div style={{ fontFamily: FONT_TH, fontSize: 24, color: T.ink, flex: 1 }}>{label}</div>
              <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 30, fontWeight: 700, color: colour, whiteSpace: 'nowrap' }}>{qty}</div>
            </div>
          );
        })}
        {note ? <Note at={at + 46} colour={T.inkSoft}>{note}</Note> : null}
      </>
    );
  };

/** A ratio, drawn as bars rather than asserted as text. Unitless proportions only. */
const RatioBars: React.FC<{ at: number; title: string; parts: [string, number, string][]; note?: string }> =
  ({ at, title, parts, note }) => {
    const T = useTheme();
    const frame = useCurrentFrame();
    const max = Math.max(...parts.map((p) => p[1]));
    return (
      <>
        <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 28, fontWeight: 700, color: T.yellow, marginBottom: 18 }}>{title}</div>
        {parts.map(([label, v, colour], i) => {
          const k = interpolate(frame, [at + i * 10, at + i * 10 + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={label} style={{ marginBottom: i === parts.length - 1 ? 0 : 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT_TH, fontSize: 22, color: T.ink, marginBottom: 6, opacity: k }}>
                <span>{label}</span><span style={{ color: colour, fontWeight: 700 }}>{v}</span>
              </div>
              <div style={{ height: 20, width: `${(v / max) * 100 * k}%`, minWidth: 8, background: colour, borderRadius: 4 }} />
            </div>
          );
        })}
        {note ? <Note at={at + 40} colour={T.inkSoft}>{note}</Note> : null}
      </>
    );
  };

const DayTimeline: React.FC<{ ats: number[] }> = ({ ats }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const ROWS: [string, string][] = [
    ['วันที่ 0', 'ใส่เชื้อ เจาะรู เอาเข้าที่ร่ม'],
    ['วันที่ 2–3', 'เอามาขยำให้ข้าวร่วน แล้วบ่มต่อ'],
    ['วันที่ 7', 'เปิดดูสี — นี่คือวันที่ตัดสิน'],
  ];
  return (
    <>
      {ROWS.map(([d, t], i) => {
        const k = interpolate(frame, [ats[i], ats[i] + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={d} style={{ opacity: k, transform: `translateY(${(1 - k) * 14}px)`, display: 'flex', gap: 20, marginBottom: i === 2 ? 0 : 20 }}>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 28, fontWeight: 700, color: i === 2 ? T.yellow : T.teal, width: 130, flexShrink: 0 }}>{d}</div>
            <div style={{ fontFamily: FONT_TH, fontSize: 24, color: T.ink, lineHeight: 1.4 }}>{t}</div>
          </div>
        );
      })}
    </>
  );
};

/** The channel rule: anything the viewer takes to their own field ends on problem / fix / start. */
const SummaryCard: React.FC<{ ats: number[] }> = ({ ats }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const rows: [string, string, string][] = [
    ['ปัญหา', 'โรคจากเชื้อราในดิน รากเน่า โคนเน่า เหี่ยว — ฉีดสารเคมีทุกฤดูก็ยังกลับมา', T.red],
    ['ทางแก้', 'ใส่เชื้อราฝ่ายเราไปรอในดินก่อนโรคมา และขยายเองได้ในครัว', T.yellow],
    ['เริ่มยังไง', 'หัวเชื้อระบุสายพันธุ์ · ข้าวแข็ง 3:2 · รอให้เย็นสนิท · เจาะรู · บ่ม 7 วัน · รอให้เขียวก่อนใช้', T.teal],
  ];
  return (
    <>
      {rows.map(([k, v, c], i) => {
        const on = interpolate(frame, [ats[i], ats[i] + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={k} style={{ opacity: on, transform: `translateY(${(1 - on) * 16}px)`, marginBottom: i === 2 ? 0 : 22 }}>
            <div style={{ fontFamily: FONT_TH, fontSize: 21, color: c, marginBottom: 6 }}>{k}</div>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 27, fontWeight: 700, color: T.ink, lineHeight: 1.4 }}>{v}</div>
          </div>
        );
      })}
    </>
  );
};

const Title: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  return (
    <Layer x={MARGIN_L + 320} y={420} w={720} at={0} dur={1} enter="none" depth={0.04} drift={0}>
      <Rise at={at} dur={24} dy={42}>
        <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 64, lineHeight: 1.26, fontWeight: 700, color: T.ink, letterSpacing: '0.6px' }}>
          ซองเดียว
          <br />
          <span style={{ background: T.yellow, color: T.paper, padding: '2px 14px', borderRadius: 6 }}>ขยายได้เป็นกิโล</span>
        </div>
      </Rise>
    </Layer>
  );
};

const KIT = [
  'ปลายข้าว หรือข้าวสารเจ้าชนิดแข็ง',
  'ถุงพลาสติกทนร้อน 9 × 14 นิ้ว',
  'ยางรัดปากถุง และเข็มหมุด 1 อัน',
  'หัวเชื้อไตรโคเดอร์มา ที่ระบุสายพันธุ์บนซอง',
];

// =============================================================================
export default function Vox14Trichoderma() {
  return (
    <AbsoluteFill style={{ background: BLUEPRINT.paper }}>
      <CollageBoard cam={CAM} theme="blueprint" fontBody={FONT_TH} fontDisplay={FONT_TH_DISPLAY} tracking="0.6px">
        <Backdrop
          end={C.tail}
          shots={[
            { at: 0, src: A('p-farm-shop-raw.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [-12, 0] },
            { at: C.s03_butfail, src: A('p-kitchen-table-raw.png'), pos: '50% 55%', dim: 0.86, zoom: 0.05, pan: [10, 0] },

            { at: C.s05_whatis, src: A('p-soil-close-raw.png'), pos: '50% 50%', dim: 0.84, zoom: 0.07, pan: [0, 8] },
            { at: C.s07_which, src: A('p-durian-raw.png'), pos: '50% 50%', dim: 0.83, zoom: 0.06, pan: [12, 0] },
            { at: C.s09_before, src: A('p-seedlings-raw.png'), pos: '50% 50%', dim: 0.85, zoom: 0.05, pan: [-8, 0] },

            { at: C.s10_kit, src: A('p-rice-sacks-raw.png'), pos: '50% 50%', dim: 0.84, zoom: 0.06, pan: [8, 0] },
            { at: C.s12_starter, src: A('p-farm-shop-raw.png'), pos: '55% 50%', dim: 0.86, zoom: 0.05, pan: [0, 6] },

            { at: C.s14_step1, src: A('p-pot-steam-raw.png'), pos: '50% 50%', dim: 0.82, zoom: 0.07, pan: [-10, 0] },

            { at: C.s18_step2, src: A('p-window-air-raw.png'), pos: '50% 50%', dim: 0.85, zoom: 0.05, pan: [8, 4] },
            { at: C.s20_whyhot, src: A('p-kitchen-table-raw.png'), pos: '45% 55%', dim: 0.87, zoom: 0.06, pan: [0, -6] },

            { at: C.s22_step3, src: A('p-nethouse-raw.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [0, 8] },

            { at: C.s27_step4, src: A('p-shaded-shelf-raw.png'), pos: '50% 50%', dim: 0.84, zoom: 0.05, pan: [10, 0] },

            { at: C.s31_step5, src: A('p-kitchen-table-raw.png'), pos: '50% 50%', dim: 0.88, zoom: 0.05, pan: [-6, 0] },
            { at: C.s36_bad, src: A('p-window-air-raw.png'), pos: '55% 50%', dim: 0.87, zoom: 0.06, pan: [0, 6] },

            { at: C.s39_use, src: A('p-veg-field-raw.png'), pos: '50% 55%', dim: 0.83, zoom: 0.06, pan: [8, -6] },
            { at: C.s40_spray, src: A('p-bucket-water-raw.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [-10, 0] },
            { at: C.s42_soil, src: A('p-manure-pile-raw.png'), pos: '50% 50%', dim: 0.84, zoom: 0.06, pan: [10, 4] },
            { at: C.s43_chem, src: A('p-sprayer-field-raw.png'), pos: '50% 50%', dim: 0.83, zoom: 0.05, pan: [0, -8] },

            { at: C.s45_sum, src: A('p-paddy-raw.png'), pos: '50% 55%', dim: 0.82, zoom: 0.07, pan: [0, 6] },
          ]}
        />

        {/* 1 — HOOK */}
        <Chapter from={0} to={C.s05_whatis}>
          <Title at={C.s01_sachet} />
          <Prop src={A('o-sachet.png')} x={380} y={800} w={260} at={R(C.s01_sachet, 0) + 20} rot={1} caption="หัวเชื้อ 1 ซอง" />
          <Figure at={R(C.s02_easy, 0)} x={1250} y={540} w={720}>
            <div style={{ fontFamily: FONT_TH, fontSize: 26, color: BLUEPRINT.ink, lineHeight: 1.6 }}>
              ใช้แค่ <b style={{ color: BLUEPRINT.yellow }}>ข้าว ถุง ยางรัด เข็มหมุด</b>
              <br />ไม่ต้องมีหม้อนึ่งความดัน ไม่ต้องมีตู้อบ
            </div>
            <Note at={R(C.s03_butfail, 0)} colour={BLUEPRINT.red}>
              แต่มีขั้นหนึ่งที่พลาดตั้งแต่นาทีแรก แล้วไม่รู้ตัวจนถึงวันที่เจ็ด
            </Note>
          </Figure>
        </Chapter>

        {/* 2 — WHAT IT IS, and what it is not */}
        <Chapter from={C.s05_whatis} to={C.s10_kit}>
          <Head at={0} kicker="มันคืออะไร" head="ราที่กินราด้วยกัน" sub="เข้าไปพันเส้นใยของเชื้อโรค แล้วปล่อยเอนไซม์ย่อยผนังเซลล์" y={310} w={700} />
          <Figure at={R(C.s07_which, C.s05_whatis)} w={740}>
            <List at={0} title="ใช้กับโรคกลุ่มนี้" colour={BLUEPRINT.teal}
              items={['รากเน่า โคนเน่า', 'เหี่ยว ทั้งที่ดินยังชื้น', 'กล้ายุบตายเป็นหย่อมในแปลงเพาะ']}
              ats={[0, 55, 110].map((d) => R(C.s07_which, C.s05_whatis) + d)} />
            <Note at={R(C.s08_notall, C.s05_whatis)} colour={BLUEPRINT.red}>
              ไม่ใช่ยาครอบจักรวาล — ไม่ฆ่าแมลง ไม่จัดการแบคทีเรีย ไม่จัดการไวรัส และไม่ใช่ปุ๋ย
            </Note>
          </Figure>
          <Prop src={A('o-rice-bran.png')} x={400} y={870} w={300} at={R(C.s09_before, C.s05_whatis)} rot={-2} />
        </Chapter>

        {/* 3 — THE KIT */}
        <Chapter from={C.s10_kit} to={C.s14_step1}>
          <Head at={0} kicker="ของที่ต้องเตรียม" head="ทั้งหมดมีสี่อย่าง" y={320} />
          <Figure at={R(C.s10_kit, C.s10_kit)} w={760}>
            <List at={0} title="เช็กลิสต์" colour={BLUEPRINT.yellow} items={KIT}
              ats={[C.s10_kit, C.s11_bag, C.s11_bag + 90, C.s12_starter].map((f) => R(f, C.s10_kit))} />
            <Note at={R(C.s13_nowild, C.s10_kit)} colour={BLUEPRINT.red}>
              อย่าเก็บราเขียวจากกองฟางมาต่อเชื้อเอง — ราเขียวในธรรมชาติมีหลายชนิด และบางชนิดสร้างสารพิษ
            </Note>
          </Figure>
          <Prop src={A('o-rice-grains.png')} x={330} y={820} w={280} at={R(C.s10_kit, C.s10_kit) + 20} rot={1.5} />
          <Prop src={A('o-empty-bag.png')} x={640} y={930} w={300} at={R(C.s11_bag, C.s10_kit)} rot={-1} />
        </Chapter>

        {/* 4 — STEP 1: COOK */}
        <Chapter from={C.s14_step1} to={C.s18_step2}>
          <StepRail current={0} at={0} />
          <Head at={0} kicker="ขั้นที่ 1" head="หุงข้าวให้แข็งกว่าข้าวกิน" y={360} />
          <Figure at={R(C.s14_step1, C.s14_step1) + 20} w={720}>
            <RatioBars at={R(C.s14_step1, C.s14_step1) + 20} title="สัดส่วนที่ใช้"
              parts={[['ข้าว', 3, BLUEPRINT.yellow], ['น้ำ', 2, BLUEPRINT.teal]]}
              note="ข้าวแฉะจะจับกันเป็นก้อน อากาศเข้าไม่ถึง กลายเป็นบ้านของแบคทีเรีย" />
          </Figure>
          <Prop src={A('o-measuring-cup.png')} x={380} y={860} w={260} at={R(C.s15_why, C.s14_step1)} rot={1} />
          <Prop src={A('o-scale.png')} x={700} y={930} w={280} at={R(C.s17_scoop, C.s14_step1)} rot={-1.5} caption="250 กรัม ต่อถุง" />
        </Chapter>

        {/* 5 — STEP 2: WAIT. The step that decides everything. */}
        <Chapter from={C.s18_step2} to={C.s22_step3}>
          <StepRail current={1} at={0} />
          <Head at={0} kicker="ขั้นที่ 2 — ขั้นที่คนพลาดมากที่สุด" head="รอให้เย็นสนิท" sub="จับข้างถุงแล้วต้องไม่รู้สึกอุ่นเลยแม้แต่นิดเดียว" y={350} accent={BLUEPRINT.red} w={700} />
          <Prop src={A('o-empty-bag.png')} x={380} y={840} w={340} at={R(C.s19_wait, C.s18_step2)} rot={1}
            caption="จับข้างถุง — ต้องไม่อุ่น" />
          <Figure at={R(C.s20_whyhot, C.s18_step2)} w={720}>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 30, fontWeight: 700, color: BLUEPRINT.red, lineHeight: 1.35 }}>
              หัวเชื้อคือสิ่งมีชีวิต
            </div>
            <div style={{ fontFamily: FONT_TH, fontSize: 25, color: BLUEPRINT.ink, lineHeight: 1.5, marginTop: 14 }}>
              ไม่ใช่ผงเคมีที่ทนความร้อน เจอข้าวร้อนเมื่อไหร่ มันตายทันที
            </div>
            <Note at={R(C.s21_invisible, C.s18_step2)} colour={BLUEPRINT.red}>
              และวันนั้นคุณจะไม่เห็นอะไรผิดปกติเลย — กว่าจะรู้ก็อีกเจ็ดวันให้หลัง
            </Note>
          </Figure>
        </Chapter>

        {/* 6 — STEP 3: INOCULATE */}
        <Chapter from={C.s22_step3} to={C.s27_step4}>
          <StepRail current={2} at={0} />
          <Head at={0} kicker="ขั้นที่ 3" head="ใส่เชื้อ เขย่า เจาะรู" y={350} />
          <Figure at={R(C.s22_step3, C.s22_step3) + 20} w={740}>
            <List at={0} title="ทำสามอย่างนี้ตามลำดับ" colour={BLUEPRINT.yellow}
              items={['ใส่หัวเชื้อ 1–2 ช้อนชา ต่อถุง — ยึดตามฉลากที่ซื้อมาเป็นหลัก',
                      'รัดปากถุง แล้วเขย่าให้กระจายทั่ว ไม่ใช่กองอยู่จุดเดียว',
                      'เจาะรูด้วยเข็มหมุด 15–20 รู ใต้ยางรัด']}
              ats={[C.s22_step3, C.s24_shake, C.s25_holes].map((f) => R(f, C.s22_step3))} />
            <Note at={R(C.s26_air, C.s22_step3)}>
              ต้องมีอากาศ เชื้อถึงจะสร้างสปอร์ — ถุงที่ปิดสนิทจะได้กลิ่นบูดแทนสีเขียว
            </Note>
          </Figure>
          <Prop src={A('o-teaspoon.png')} x={350} y={840} w={320} at={R(C.s22_step3, C.s22_step3) + 20} rot={1} />
          <Prop src={A('o-pin.png')} x={700} y={930} w={280} at={R(C.s25_holes, C.s22_step3)} rot={-2} />
        </Chapter>

        {/* 7 — STEP 4: INCUBATE */}
        <Chapter from={C.s27_step4} to={C.s31_step5}>
          <StepRail current={3} at={0} />
          <Head at={0} kicker="ขั้นที่ 4" head="บ่มเจ็ดวัน ในที่ร่ม" sub="ห้ามโดนแดดตรง ๆ เด็ดขาด" y={350} />
          <Figure at={R(C.s27_step4, C.s27_step4) + 20} w={720}>
            <DayTimeline ats={[C.s27_step4 + 20, C.s29_day2, C.s30_seven].map((f) => R(f, C.s27_step4))} />
          </Figure>
          <Prop src={A('o-rubber-bands.png')} x={390} y={880} w={300} at={R(C.s29_day2, C.s27_step4)} rot={1.5} />
        </Chapter>

        {/* 8 — STEP 5: READ THE BAG. The longest chapter, and the reason the video exists. */}
        <Chapter from={C.s31_step5} to={C.s39_use}>
          <StepRail current={4} at={0} />
          <Head at={0} kicker="ขั้นที่ 5 — หัวใจของคลิปนี้" head="อ่านถุงให้เป็น" y={340} accent={BLUEPRINT.yellow} />
          <Figure at={R(C.s33_white, C.s31_step5)} x={1230} y={600} w={820} bg={KEY_CARD}>
            <ColourKey ats={[C.s33_white, C.s35_green, C.s36_bad, C.s36_bad + 45, C.s36_bad + 90, C.s37_slime].map((f) => R(f, C.s31_step5))} />
          </Figure>
          <Figure at={R(C.s37c_partial, C.s31_step5)} x={470} y={800} w={620}>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 26, fontWeight: 700, color: BLUEPRINT.red, lineHeight: 1.35 }}>
              เจอเขียวปนดำ = ทั้งถุงเสีย
            </div>
            <div style={{ fontFamily: FONT_TH, fontSize: 23, color: BLUEPRINT.ink, lineHeight: 1.5, marginTop: 12 }}>
              สีดำที่เห็นคือสปอร์ แต่เส้นใยเดินไปทั่วถุงตั้งแต่ก่อนหน้านั้นแล้ว
              อย่าแยกเอาเฉพาะส่วนที่ดูดี
            </div>
          </Figure>
        </Chapter>

        {/* 9 — HOW TO USE */}
        <Chapter from={C.s39_use} to={C.s45_sum}>
          <Head at={0} kicker="เอาไปใช้" head="สองวิธี" y={320} />
          <Figure at={R(C.s40_spray, C.s39_use)} x={1250} y={430} w={740}>
            <QtyList at={R(C.s40_spray, C.s39_use)} title="ฉีดพ่น — ต่อพื้นที่ 1 ไร่"
              rows={[['เชื้อสด', '1 กิโลกรัม', BLUEPRINT.yellow], ['สารจับใบ', '5 มิลลิลิตร', BLUEPRINT.red], ['น้ำ', '100 ลิตร', BLUEPRINT.teal]]}
              note="กวนล้างสปอร์ในน้ำ กรองด้วยผ้าขาวบาง แล้วทิ้งกากข้าว" />
          </Figure>
          <Figure at={R(C.s42_soil, C.s39_use)} x={1250} y={830} w={740}>
            <RatioBars at={R(C.s42_soil, C.s39_use)} title="ผสมลงดิน — โดยน้ำหนัก"
              parts={[['เชื้อสด', 1, BLUEPRINT.yellow], ['รำละเอียด', 4, BLUEPRINT.red], ['ปุ๋ยคอก/ปุ๋ยหมัก', 100, BLUEPRINT.teal]]} />
          </Figure>
          <Prop src={A('o-strainer.png')} x={330} y={720} w={300} at={R(C.s40_spray, C.s39_use)} rot={1} />
          <Prop src={A('o-sprayer.png')} x={330} y={950} w={240} at={R(C.s43_chem, C.s39_use)} rot={-1} />
          <Figure at={R(C.s43_chem, C.s39_use)} x={700} y={950} w={430}>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 24, fontWeight: 700, color: BLUEPRINT.red, lineHeight: 1.35 }}>
              ห้ามผสมกับสารเคมีกำจัดเชื้อราหรือปูนขาวโดยตรง
            </div>
            <div style={{ fontFamily: FONT_TH, fontSize: 22, color: BLUEPRINT.ink, marginTop: 10 }}>
              เว้นระยะห่างกัน 5–7 วัน
            </div>
          </Figure>
        </Chapter>

        {/* 10 — SUMMARY. The channel rule for anything a viewer takes to their own field. */}
        <Chapter from={C.s45_sum} to={C.tail} last>
          <Head at={0} kicker="สรุป" head="ปัญหา · ทางแก้ · เริ่มยังไง" y={280} w={700} />
          <Figure at={0} x={1250} y={540} w={800}>
            <SummaryCard ats={[C.s46_problem, C.s47_fix, C.s48_start].map((f) => R(f, C.s45_sum))} />
          </Figure>
          <Prop src={A('o-bucket.png')} x={380} y={880} w={260} at={R(C.s47_fix, C.s45_sum)} rot={-1.5} />
          <Layer x={MARGIN_L + 300} y={680} w={640} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s48_start, C.s45_sum)} dy={30}>
              <div style={{
                fontFamily: FONT_TH_DISPLAY, fontSize: 30, fontWeight: 700, color: BLUEPRINT.ink, lineHeight: 1.42,
                borderLeft: `5px solid ${BLUEPRINT.yellow}`, paddingLeft: 20,
              }}>
                อัตราสำหรับพืชและโรคเฉพาะอย่าง
                <br />ถามเกษตรอำเภอในพื้นที่อีกที
              </div>
            </Rise>
          </Layer>
        </Chapter>

        <Grain opacity={0.04} />
        <EndFade at={C.tail - 44} dur={40} />
      </CollageBoard>
    </AbsoluteFill>
  );
}
