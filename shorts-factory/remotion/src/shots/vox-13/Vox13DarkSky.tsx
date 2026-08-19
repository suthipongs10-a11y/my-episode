import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import {
  CollageBoard, COSMOS, EASE_OUT, Grain, Layer, useTheme,
} from '../../lib/collage';
import { FONT_TH, FONT_TH_DISPLAY } from '../../fonts';

// =============================================================================
// vox-13 — ทำไมกลางคืนฟ้าถึงมืด · ช่อง ถอดรหัสจักรวาล · 1920x1080 · 417s
//
// FIRST VIDEO ON THE COSMOS CHANNEL, and the first to use the `cosmos` skin: the colour the
// sky actually is between the stars, with starlight-white type on it.
//
// MOTION, unchanged from vox-12 and locked in brand.md §5:
//   · type never drifts — drift={0} on every layer carrying words
//   · the entrance is the craft — <Rise>: fade + lift + a touch of scale, ease-out, no overshoot
//   · chapters cross-fade — the outgoing content LINGERS 14 frames past the next chapter's
//     first cue and fades across it, so the screen is never bare between two chapters
//   · plates Ken Burns slowly and cross-dissolve on their own track
//
// ONE RULE THIS CHANNEL ADDS (channels/cosmos.json): no image may look like real telescope
// data. There is no fabricated deep field here and no fabricated all-sky map. Every plate is
// a photograph a person on the ground could take; every diagram is drawn in code from the
// numbers in script.md. The CMB is represented by the dish that receives it and by its
// temperature, never by a picture of it.
// =============================================================================

export const compositionConfig = {
  id: 'Vox13DarkSky',
  durationInSeconds: 417,   // beats.json: VO ends 414.94s
  fps: 30,
  width: 1920,
  height: 1080,
};

const W = 1920;
const H = 1080;
const MARGIN_L = 170;
const A = (f: string) => staticFile(`projects/vox-13-dark-sky/layers/${f}`);

// ---- GENERATED CUES — rebuilt from beats.json by scripts/gen-cues.mjs. Do not hand-edit.
// Cue name === segment id in beats.json, so there is no map to keep in sync.
// All 44 windows are measured from the real audio.
const C = {
  s01_scene: 15,
  s02_notsunset: 286,
  s03_realq: 545,
  s04_named: 848,
  s05_promise: 1121,

  s06_three: 1407,
  s07_line: 1753,
  s08_must: 2011,
  s09_every: 2283,

  s10_counter: 2559,
  s11_inverse: 2823,
  s12_shell: 3098,
  s13_cancel: 3430,
  s14_sum: 3740,

  s15_result: 3994,
  s17_but: 4323,

  s18_olbers: 4658,
  s19_herschel: 4975,
  s20_reradiate: 5215,

  s21_toofar: 5521,
  s22_expand: 5821,
  s24_notmain: 6142,

  s25_which: 6421,
  s26_age: 6674,
  s27_light: 6970,
  s28_horizon: 7245,
  s29_edge: 7522,
  s30_nowall: 7799,
  s31_stars: 8068,

  s32_poe: 8354,
  s33_eureka: 8552,
  s34_quote: 8823,
  s35_kelvin: 9119,

  s36_twist: 9407,
  s37_actually: 9657,
  s38_radio: 9923,
  s39_name: 10147,
  s41_origin: 10483,
  s42_stretched: 10774,
  s43_careful: 11061,

  s44_q: 11380,
  s46_a: 11629,
  s47_remember: 11948,
  s48_close: 12211,
  tail: 12448,
} as const;
// ---- END GENERATED CUES

const CAM = [
  { f: 0, x: 960, y: 540, z: 1 },
  { f: 6000, x: 992, y: 528, z: 1.012 },
  { f: 12522, x: 936, y: 552, z: 1.004 },
];

// -----------------------------------------------------------------------------
// ENTRANCES. The one piece of motion this project spends effort on.
// -----------------------------------------------------------------------------
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

const R = (cue: number, from: number) => cue - from;
const XFADE = 26;  // plate dissolve
const XOVER = 14;  // how far a chapter's content lingers past the next chapter's first cue
const XOUT = 26;   // and how long its own fade takes

// -----------------------------------------------------------------------------
// STARFIELD. Deterministic by construction — Remotion re-renders any frame at any time, so
// Math.random() would give a different sky on every frame and on every worker. The positions
// come from a cheap integer hash of the star's index, and the twinkle is a sine of the frame,
// which means star 412 is in the same place with the same brightness on every machine.
// -----------------------------------------------------------------------------
const hash = (n: number) => {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const Starfield: React.FC<{ count?: number; opacity?: number }> = ({ count = 260, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const stars = [];
  for (let i = 0; i < count; i++) {
    const x = hash(i) * W;
    const y = hash(i + 1000) * H;
    const r = 0.6 + hash(i + 2000) * 1.6;
    const base = 0.25 + hash(i + 3000) * 0.5;
    // each star breathes on its own period, slowly — this is atmosphere, not a light show
    const tw = base * (0.75 + 0.25 * Math.sin(frame * (0.012 + hash(i + 4000) * 0.02) + i));
    stars.push(
      <circle key={i} cx={x} cy={y} r={r} fill={COSMOS.ink} opacity={tw * opacity} />,
    );
  }
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>{stars}</svg>
    </AbsoluteFill>
  );
};

// -----------------------------------------------------------------------------
// PLATES — one photograph per stretch, on a track that overlaps so the change is a dissolve.
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
            <div style={{ position: 'absolute', inset: 0, background: T.paper, opacity: shot.dim ?? 0.82 }} />
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
  return <AbsoluteFill style={{ background: COSMOS.paper, opacity: k, pointerEvents: 'none' }} />;
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

/** A cut-out object. Objects MAY keep a hint of drift — they are things, not words. */
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

const Card: React.FC<{ w: number; pad?: number; children: React.ReactNode }> = ({ w, pad = 30, children }) => {
  const T = useTheme();
  return <div style={{ width: w, background: T.cream, border: `2px solid ${T.landHi}`, borderRadius: 10, padding: pad }}>{children}</div>;
};

const Figure: React.FC<{ at: number; x?: number; y?: number; w: number; children: React.ReactNode }> =
  ({ at, x = 1240, y = 520, w, children }) => (
    <Layer x={x} y={y} w={w} at={0} dur={1} enter="none" depth={0.04} drift={0}>
      <Rise at={at} dy={30}><Card w={w}>{children}</Card></Rise>
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

/** `ats` gives each row its own narration cue; without it the rows cascade off `at`. */
const List: React.FC<{ at: number; title: string; colour: string; items: string[]; ats?: number[]; strike?: number; strikeAt?: number }> =
  ({ at, title, colour, items, ats, strike, strikeAt }) => {
    const T = useTheme();
    const frame = useCurrentFrame();
    return (
      <>
        <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 30, fontWeight: 700, color: colour, marginBottom: 20 }}>{title}</div>
        {items.map((t, i) => {
          const a = ats ? ats[i] : at + i * 7;
          const on = interpolate(frame, [a, a + 18], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          // one row can be struck through later — the chapter that finds the broken assumption
          const s = strike === i && strikeAt !== undefined
            ? interpolate(frame, [strikeAt, strikeAt + 18], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            : 0;
          return (
            <div key={t} style={{ opacity: on, transform: `translateY(${(1 - on) * 14}px)`, display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: i === items.length - 1 ? 0 : 15 }}>
              <div style={{ width: 9, height: 9, borderRadius: 5, background: s > 0.5 ? T.red : colour, marginTop: 12, flexShrink: 0 }} />
              <div style={{ position: 'relative', fontFamily: FONT_TH, fontSize: 25, color: s > 0.5 ? T.inkSoft : T.ink, lineHeight: 1.45 }}>
                {t}
                <div style={{ position: 'absolute', left: 0, top: '52%', height: 3, width: `${s * 100}%`, background: T.red, borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </>
    );
  };

// =============================================================================
// THE CORE FIGURE — the shell argument, which IS the paradox.
// Every ring carries the same amount of light: four times the stars, each a quarter as
// bright. The bars on the right are that statement drawn, and they are all the same height
// on purpose — that equality is the whole point, so it is computed, not asserted.
// =============================================================================
const SHELLS = [1, 2, 3, 4];
const ShellDiagram: React.FC<{ at: number; showBars?: number }> = ({ at, showBars }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const CX = 150, CY = 150, STEP = 32;
  return (
    <>
      <div style={{ fontFamily: FONT_TH, fontSize: 22, color: T.inkSoft, marginBottom: 14 }}>
        เปลือกทรงกลมรอบตัวเรา ทีละชั้น
      </div>
      <div style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
        <svg width={300} height={300} viewBox="0 0 300 300" style={{ flexShrink: 0 }}>
          {SHELLS.map((n, i) => {
            const k = interpolate(frame, [at + i * 14, at + i * 14 + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <circle key={n} cx={CX} cy={CY} r={STEP * n} fill="none"
                stroke={i === 0 ? T.yellow : T.teal} strokeWidth={2} opacity={k * (i === 0 ? 1 : 0.75)} />
            );
          })}
          <circle cx={CX} cy={CY} r={5} fill={T.ink} />
          <text x={CX + 12} y={CY + 5} fill={T.inkSoft} fontSize={16} fontFamily="var(--vox-body)">เรา</text>
        </svg>
        <div style={{ flex: 1 }}>
          {SHELLS.map((n, i) => {
            const k = interpolate(frame, [at + i * 14, at + i * 14 + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const b = showBars === undefined ? 0
              : interpolate(frame, [showBars + i * 8, showBars + i * 8 + 18], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div key={n} style={{ opacity: k, marginBottom: i === SHELLS.length - 1 ? 0 : 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontFamily: FONT_TH, fontSize: 20, color: T.inkSoft }}>
                  <span style={{ width: 76, color: T.ink }}>ชั้นที่ {n}</span>
                  <span>ดาว ×{n * n}</span>
                  <span style={{ color: T.inkSoft }}>· สว่าง ÷{n * n}</span>
                </div>
                {/* every bar is the same width because the two factors cancel — that is the argument */}
                <div style={{ height: 16, width: 220 * b, background: T.yellow, borderRadius: 3, marginTop: 5 }} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

/** finite age -> a sphere we can see inside of, and nothing but time at its edge. */
const TimeHorizon: React.FC<{ at: number; labelAt?: number }> = ({ at, labelAt }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const k = interpolate(frame, [at, at + 26], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const l = labelAt === undefined ? 0
    : interpolate(frame, [labelAt, labelAt + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <>
      <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 30, fontWeight: 700, color: T.yellow, marginBottom: 6 }}>สิ่งที่เรามองเห็นได้</div>
      <div style={{ fontFamily: FONT_TH, fontSize: 20, color: T.inkSoft, marginBottom: 16 }}>รัศมี = ระยะที่แสงเดินทางมาทันในเวลา 13,800 ล้านปี</div>
      <svg width={640} height={300} viewBox="0 0 640 300">
        <circle cx={320} cy={150} r={124 * k} fill="none" stroke={T.yellow} strokeWidth={3} />
        <circle cx={320} cy={150} r={5} fill={T.ink} opacity={k} />
        <text x={332} y={155} fill={T.inkSoft} fontSize={17} opacity={k} fontFamily="var(--vox-body)">เรา</text>
        {/* nothing is drawn beyond the circle except more of the same — there is no wall */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const a = (i / 8) * Math.PI * 2;
          return <circle key={i} cx={320 + Math.cos(a) * 190} cy={150 + Math.sin(a) * 118} r={2.4} fill={T.inkSoft} opacity={l * 0.85} />;
        })}
        <text x={320} y={286} fill={T.inkSoft} fontSize={19} textAnchor="middle" opacity={l} fontFamily="var(--vox-body)">
          เลยเส้นนี้ไปก็ยังมีอวกาศต่อ — แค่แสงยังมาไม่ถึง
        </text>
      </svg>
    </>
  );
};

/** 380,000 years at 3,000 K, stretched a thousandfold, arriving at 2.725 K. */
const CMBFlow: React.FC<{ ats: number[] }> = ({ ats }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const on = (i: number) => interpolate(frame, [ats[i], ats[i] + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const step = (i: number, big: string, small: string, colour: string) => (
    <div style={{ opacity: on(i), transform: `translateY(${(1 - on(i)) * 12}px)` }}>
      <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 40, fontWeight: 700, color: colour, lineHeight: 1.15 }}>{big}</div>
      <div style={{ fontFamily: FONT_TH, fontSize: 20, color: T.inkSoft, marginTop: 6 }}>{small}</div>
    </div>
  );
  return (
    <>
      <div style={{ fontFamily: FONT_TH, fontSize: 22, color: T.inkSoft, marginBottom: 20 }}>แสงก้อนเดียวกัน เดินทางมาถึงเรา</div>
      {step(0, '3,000 เคลวิน', 'ตอนจักรวาลอายุราว 380,000 ปี — ร้อนพอ ๆ กับผิวดาว', T.yellow)}
      <div style={{ opacity: on(1), fontFamily: FONT_TH, fontSize: 22, color: T.inkSoft, margin: '14px 0 14px 4px' }}>
        ↓ จักรวาลขยายตัว ยืดคลื่นออกราวพันเท่า
      </div>
      {step(2, '2.725 เคลวิน', 'ราวลบ 270 องศาเซลเซียส — ไมโครเวฟ ไม่ใช่แสงที่ตาเห็น', T.teal)}
    </>
  );
};

const Timeline: React.FC<{ ats: number[] }> = ({ ats }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const ROWS: [string, string, string][] = [
    ['1823', 'โอลเบอร์ส ตั้งคำถามจนได้ชื่อของเขา — และตอบว่าฝุ่นบัง', T.inkSoft],
    ['1848', 'เอ็ดการ์ อัลลัน โพ เขียนคำตอบที่ถูกต้องไว้ใน ยูเรกา', T.yellow],
    ['1901', 'ลอร์ดเคลวิน คำนวณออกมาเป็นตัวเลขได้เป็นคนแรก', T.teal],
  ];
  return (
    <>
      {ROWS.map(([y, t, c], i) => {
        const k = interpolate(frame, [ats[i], ats[i] + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={y} style={{ opacity: k, transform: `translateY(${(1 - k) * 14}px)`, display: 'flex', gap: 22, marginBottom: i === 2 ? 0 : 22 }}>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 34, fontWeight: 700, color: c, width: 100, flexShrink: 0 }}>{y}</div>
            <div style={{ fontFamily: FONT_TH, fontSize: 24, color: T.ink, lineHeight: 1.45 }}>{t}</div>
          </div>
        );
      })}
    </>
  );
};

/** The screenshot card the channel's rules require: question / answer / what to remember. */
const SummaryCard: React.FC<{ ats: number[] }> = ({ ats }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const rows: [string, string, string][] = [
    ['คำถาม', 'จักรวาลมีดาวนับไม่ถ้วน แล้วทำไมฟ้ากลางคืนถึงไม่สว่างทั้งผืน', T.inkSoft],
    ['คำตอบ', 'เพราะจักรวาลมีอายุจำกัด แสงจากที่ไกลกว่านั้นยังมาไม่ถึง', T.yellow],
    ['สิ่งที่ต้องจำ', 'ความมืดระหว่างดวงดาวไม่ใช่ความว่างเปล่า มันคือการวัดอายุของจักรวาล', T.teal],
  ];
  return (
    <>
      {rows.map(([k, v, c], i) => {
        const a = ats[i];
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
    <Layer x={MARGIN_L + 320} y={400} w={720} at={0} dur={1} enter="none" depth={0.04} drift={0}>
      <Rise at={at} dur={24} dy={42}>
        <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 66, lineHeight: 1.26, fontWeight: 700, color: T.ink, letterSpacing: '0.6px' }}>
          ทำไมกลางคืน
          <br />
          <span style={{ background: T.yellow, color: T.paper, padding: '2px 14px', borderRadius: 6 }}>ฟ้าถึงมืด</span>
        </div>
      </Rise>
    </Layer>
  );
};

const ASSUMPTIONS = [
  'จักรวาลกว้างใหญ่ไม่มีที่สิ้นสุด',
  'จักรวาลเก่าแก่ไม่มีจุดเริ่มต้น',
  'ดาวกระจายอยู่ทั่วอย่างสม่ำเสมอ',
];

// =============================================================================
const Vox13DarkSky: React.FC = () => (
  <AbsoluteFill style={{ background: COSMOS.paper }}>
    <CollageBoard cam={CAM} theme="cosmos" fontBody={FONT_TH} fontDisplay={FONT_TH_DISPLAY} tracking="0.6px">
      <Backdrop
        end={C.tail}
        shots={[
          { at: 0, src: A('p-looking-up-raw.png'), pos: '50% 45%', dim: 0.62, zoom: 0.07, pan: [-12, 0] },
          { at: C.s03_realq, src: A('p-night-field-raw.png'), pos: '50% 40%', dim: 0.66, zoom: 0.06, pan: [10, -6] },

          { at: C.s06_three, src: A('p-mountain-sky-raw.png'), pos: '50% 45%', dim: 0.66, zoom: 0.05, pan: [0, 8] },
          { at: C.s08_must, src: A('p-road-night-raw.png'), pos: '50% 50%', dim: 0.68, zoom: 0.07, pan: [0, -8] },

          { at: C.s10_counter, src: A('p-dark-pines-raw.png'), pos: '50% 40%', dim: 0.68, zoom: 0.06, pan: [12, 0] },
          { at: C.s12_shell, src: A('p-onion-table-raw.png'), pos: '50% 55%', dim: 0.90, zoom: 0.05, pan: [-8, 0] },

          { at: C.s15_result, src: A('p-filament-raw.png'), pos: '50% 50%', dim: 0.90, zoom: 0.07, pan: [0, 6] },
          { at: C.s17_but, src: A('p-star-trails-raw.png'), pos: '50% 45%', dim: 0.70, zoom: 0.06, pan: [8, 0] },

          { at: C.s18_olbers, src: A('p-dust-beam-raw.png'), pos: '50% 50%', dim: 0.82, zoom: 0.06, pan: [-10, 0] },

          { at: C.s21_toofar, src: A('p-lake-stars-raw.png'), pos: '50% 45%', dim: 0.68, zoom: 0.05, pan: [10, 4] },
          { at: C.s22_expand, src: A('p-desert-night-raw.png'), pos: '50% 45%', dim: 0.80, zoom: 0.07, pan: [0, -6] },

          { at: C.s25_which, src: A('p-observatory-raw.png'), pos: '50% 45%', dim: 0.82, zoom: 0.06, pan: [-10, 0] },
          { at: C.s28_horizon, src: A('p-clouds-night-raw.png'), pos: '50% 45%', dim: 0.68, zoom: 0.06, pan: [8, 0] },
          { at: C.s31_stars, src: A('p-window-night-raw.png'), pos: '50% 50%', dim: 0.70, zoom: 0.05, pan: [0, 6] },

          { at: C.s32_poe, src: A('p-desk-candle-raw.png'), pos: '50% 55%', dim: 0.80, zoom: 0.06, pan: [-8, -4] },
          { at: C.s34_quote, src: A('p-old-paper-raw.png'), pos: '50% 50%', dim: 0.84, zoom: 0.05, pan: [6, 0] },

          { at: C.s36_twist, src: A('p-radio-dish-raw.png'), pos: '50% 50%', dim: 0.80, zoom: 0.06, pan: [0, 8] },
          { at: C.s41_origin, src: A('p-embers-raw.png'), pos: '50% 50%', dim: 0.84, zoom: 0.07, pan: [-8, 0] },
          { at: C.s43_careful, src: A('p-frost-raw.png'), pos: '50% 50%', dim: 0.84, zoom: 0.06, pan: [8, 0] },

          { at: C.s44_q, src: A('p-city-glow-raw.png'), pos: '50% 45%', dim: 0.68, zoom: 0.07, pan: [0, -6] },
        ]}
      />

      {/* The sky the video is about, on every frame, drawn rather than photographed. */}
      <Starfield count={260} opacity={0.55} />

      {/* 1 — HOOK. Close the easy answer inside 30 seconds (channels/cosmos.json). */}
      <Chapter from={0} to={C.s06_three}>
        <Title at={C.s01_scene} />
        <Prop src={A('o-telescope.png')} x={360} y={800} w={230} at={R(C.s02_notsunset, 0)} rot={1} caption="กล้องดูดาวหักเหแสง" />
        <Figure at={R(C.s03_realq, 0)} x={1250} y={540} w={720}>
          <div style={{ fontFamily: FONT_TH, fontSize: 26, color: COSMOS.ink, lineHeight: 1.6 }}>
            ชี้นิ้วไปทางไหนก็ควรมี<b style={{ color: COSMOS.yellow }}>ดาวสักดวง</b>อยู่ปลายนิ้ว
            <br />แล้วทำไมฟ้าทั้งผืนถึงไม่สว่างจ้า
          </div>
          <Note at={R(C.s04_named, 0)} colour={COSMOS.inkSoft}>
            คำถามนี้ชื่อ ปฏิทรรศน์ของโอลเบอร์ส · ถูกถามมาตั้งแต่ปี 1823
          </Note>
        </Figure>
      </Chapter>

      {/* 2 — THE THREE ASSUMPTIONS. This card comes back in chapter 7 with one struck out. */}
      <Chapter from={C.s06_three} to={C.s10_counter}>
        <Head at={0} kicker="ตั้งโจทย์" head="สมมติฐานสามข้อ" sub="ทั้งสามข้อฟังดูไม่มีพิษภัยเลย" y={330} />
        <Figure at={R(C.s06_three, C.s06_three)} w={740}>
          <List at={0} title="ถ้าทั้งสามข้อนี้เป็นจริง" colour={COSMOS.teal} items={ASSUMPTIONS}
            ats={[C.s06_three + 30, C.s06_three + 110, C.s06_three + 200].map((f) => R(f, C.s06_three))} />
          <Note at={R(C.s08_must, C.s06_three)}>
            เส้นสายตาที่ลากออกไป ต้องไปจบที่ผิวดาวสักดวงเสมอ — และจริงกับทุกทิศ
          </Note>
        </Figure>
        <Prop src={A('o-lantern.png')} x={380} y={840} w={230} at={R(C.s09_every, C.s06_three)} rot={-2} />
      </Chapter>

      {/* 3 — THE MECHANISM. The shells, and the cancellation that makes the paradox bite. */}
      <Chapter from={C.s10_counter} to={C.s15_result}>
        <Head at={0} kicker="กลไกหลัก" head="ทุกเปลือกส่งแสงมาเท่ากัน" sub="ระยะทางไม่ช่วย เพราะจำนวนดาวโตทันพอดี" y={300} w={700} />
        <Figure at={R(C.s12_shell, C.s10_counter)} x={1250} y={560} w={760}>
          <ShellDiagram at={R(C.s12_shell, C.s10_counter)} showBars={R(C.s13_cancel, C.s10_counter)} />
          <Note at={R(C.s14_sum, C.s10_counter)}>
            เปลือกมีไม่สิ้นสุด แสงรวมก็ไม่สิ้นสุด
          </Note>
        </Figure>
        <Prop src={A('o-onion-half.png')} x={380} y={860} w={300} at={R(C.s12_shell, C.s10_counter)} rot={1.5} caption="หัวหอมผ่าครึ่ง" />
      </Chapter>

      {/* 4 — THE ABSURD RESULT */}
      <Chapter from={C.s15_result} to={C.s18_olbers}>
        <Head at={0} kicker="ผลที่ได้" head="ฟ้าควรสว่างเท่าผิวดาว" sub="ทั้งผืน ทั้งวัน ทั้งคืน ตลอดเวลา" y={330} accent={COSMOS.yellow} />
        <Figure at={R(C.s17_but, C.s15_result)} w={700}>
          <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 34, fontWeight: 700, color: COSMOS.red, lineHeight: 1.35 }}>
            แต่มันมืด
          </div>
          <div style={{ fontFamily: FONT_TH, fontSize: 25, color: COSMOS.ink, lineHeight: 1.5, marginTop: 14 }}>
            แปลว่าสมมติฐานสามข้อนั้น ต้องมีอย่างน้อยหนึ่งข้อที่ผิด
          </div>
        </Figure>
        <Prop src={A('o-lightbulb.png')} x={400} y={870} w={330} at={R(C.s15_result, C.s15_result) + 40} rot={-2} />
      </Chapter>

      {/* 5 — WRONG ANSWER 1: dust. It was Olbers' own answer, and it fails on thermodynamics. */}
      <Chapter from={C.s18_olbers} to={C.s21_toofar}>
        <Head at={0} kicker="คำตอบผิดข้อที่หนึ่ง" head="ฝุ่นในอวกาศบังไว้" sub="คำตอบของโอลเบอร์สเอง" y={320} accent={COSMOS.red} />
        <Figure at={R(C.s19_herschel, C.s18_olbers)} w={720}>
          <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 28, fontWeight: 700, color: COSMOS.red, marginBottom: 16 }}>
            จอห์น เฮอร์เชล ล้มด้วยเหตุผลข้อเดียว
          </div>
          <div style={{ fontFamily: FONT_TH, fontSize: 25, color: COSMOS.ink, lineHeight: 1.55 }}>
            ฝุ่นที่ดูดแสงเข้าไป จะร้อนขึ้น
          </div>
          <Note at={R(C.s20_reradiate, C.s18_olbers)}>
            และในจักรวาลที่เก่าแก่ไม่สิ้นสุด มันจะร้อนจนแผ่แสงออกมาเท่าที่ดูดเข้าไปพอดี
            <br />ฝุ่นเลื่อนปัญหา ไม่ได้แก้ปัญหา
          </Note>
        </Figure>
        <Prop src={A('o-candle.png')} x={390} y={840} w={200} at={R(C.s19_herschel, C.s18_olbers)} rot={1} />
      </Chapter>

      {/* 6 — WRONG ANSWERS 2 AND 3. The third is the one most science videos get wrong. */}
      <Chapter from={C.s21_toofar} to={C.s25_which}>
        <Head at={0} kicker="คำตอบผิดข้อที่สองและสาม" head="ไกลเกินไป · จักรวาลขยายตัว" y={310} accent={COSMOS.red} w={700} />
        <Figure at={R(C.s21_toofar, C.s21_toofar) + 30} w={740}>
          <List at={0} title="ทำไมสองข้อนี้ยังไม่ใช่คำตอบ" colour={COSMOS.red}
            items={[
              'ไกลเกินไป — ล้มไปแล้วด้วยเรื่องเปลือกทรงกลม',
              'จักรวาลขยายตัว แสงถูกยืดจนอ่อนกำลัง — ข้อนี้ช่วยจริง',
            ]}
            ats={[R(C.s21_toofar, C.s21_toofar) + 30, R(C.s22_expand, C.s21_toofar)]} />
          <Note at={R(C.s24_notmain, C.s21_toofar)}>
            แต่แหล่งกระแสหลักจัดให้การขยายตัวเป็น <b>ปัจจัยเสริม</b> ไม่ใช่ตัวหลัก
          </Note>
        </Figure>
        <Prop src={A('o-satellite-dish.png')} x={400} y={860} w={300} at={R(C.s22_expand, C.s21_toofar)} rot={-1.5} />
      </Chapter>

      {/* 7 — THE ANSWER. The assumption card returns and assumption two is struck out. */}
      <Chapter from={C.s25_which} to={C.s32_poe}>
        <Head at={0} kicker="คำตอบ" head="ข้อที่ผิดคือข้อสอง" sub="จักรวาลไม่ได้เก่าแก่ไม่มีจุดเริ่มต้น มันมีอายุ" y={300} accent={COSMOS.yellow} w={700} />
        <Figure at={R(C.s25_which, C.s25_which)} x={1250} y={330} w={720}>
          <List at={0} title="สมมติฐานสามข้อเมื่อกี้" colour={COSMOS.teal} items={ASSUMPTIONS}
            ats={[0, 0, 0]} strike={1} strikeAt={R(C.s26_age, C.s25_which)} />
        </Figure>
        <Figure at={R(C.s28_horizon, C.s25_which)} x={1250} y={760} w={720}>
          <TimeHorizon at={R(C.s28_horizon, C.s25_which)} labelAt={R(C.s30_nowall, C.s25_which)} />
        </Figure>
        <Prop src={A('o-hourglass.png')} x={380} y={800} w={220} at={R(C.s26_age, C.s25_which)} rot={1}
          caption="13,800 ล้านปี" />
      </Chapter>

      {/* 8 — WHO GOT THERE FIRST */}
      <Chapter from={C.s32_poe} to={C.s36_twist}>
        <Head at={0} kicker="ใครคิดออกก่อน" head="คนแรกที่ตอบถูก คือกวี" y={310} w={700} />
        <Figure at={R(C.s33_eureka, C.s32_poe)} w={760}>
          <Timeline ats={[C.s33_eureka - 30, C.s33_eureka, C.s35_kelvin].map((f) => R(f, C.s32_poe))} />
          <Note at={R(C.s34_quote, C.s32_poe)} colour={COSMOS.ink}>
            “ระยะของฉากหลังที่เรามองไม่เห็นนั้น ไกลมากเสียจนยังไม่มีรังสีใดจากมัน
            เดินทางมาถึงเราได้เลย” — ยูเรกา, 1848
          </Note>
        </Figure>
        <Prop src={A('o-quill-ink.png')} x={370} y={800} w={320} at={R(C.s33_eureka, C.s32_poe)} rot={-2} />
        <Prop src={A('o-old-book.png')} x={700} y={930} w={260} at={R(C.s34_quote, C.s32_poe)} rot={1.5} />
      </Chapter>

      {/* 9 — THE TWIST. The paradox's prediction was right; the light is just not visible. */}
      <Chapter from={C.s36_twist} to={C.s44_q}>
        <Head at={0} kicker="หมัดฮุก" head="ฟ้ามันสว่างทั้งผืนอยู่แล้ว" sub="เราแค่มองมันด้วยตาไม่เห็น" y={300} accent={COSMOS.teal} w={700} />
        <Figure at={R(C.s41_origin, C.s36_twist)} x={1250} y={560} w={740}>
          <CMBFlow ats={[C.s41_origin, C.s42_stretched, C.s42_stretched + 55].map((f) => R(f, C.s36_twist))} />
          <Note at={R(C.s43_careful, C.s36_twist)} colour={COSMOS.inkSoft}>
            แสงก้อนนี้ไม่ใช่แสงจากดวงดาว แต่เป็นแสงจากตัวจักรวาลเองตอนยังร้อน
            <br />คนละก้อนกัน — แต่เป็นหลักฐานว่าตรรกะของปฏิทรรศน์ไม่ผิด
          </Note>
        </Figure>
        <Prop src={A('o-thermometer.png')} x={400} y={870} w={340} at={R(C.s39_name, C.s36_twist)} rot={-1}
          caption="2.725 เคลวิน" />
      </Chapter>

      {/* 10 — SUMMARY. The screenshot frame: all three rows stay up together. */}
      <Chapter from={C.s44_q} to={C.tail} last>
        <Head at={0} kicker="สรุป" head="คำถาม · คำตอบ · สิ่งที่ต้องจำ" y={280} w={700} />
        <Figure at={0} x={1250} y={520} w={780}>
          <SummaryCard ats={[C.s44_q, C.s46_a, C.s47_remember].map((f) => R(f, C.s44_q))} />
        </Figure>
        <Prop src={A('o-pocket-watch.png')} x={390} y={900} w={260} at={R(C.s46_a, C.s44_q)} rot={-1.5} />
        <Layer x={MARGIN_L + 300} y={700} w={640} at={0} dur={1} enter="none" depth={0.04} drift={0}>
          <Rise at={R(C.s48_close, C.s44_q)} dy={30}>
            <div style={{
              fontFamily: FONT_TH_DISPLAY, fontSize: 32, fontWeight: 700, color: COSMOS.ink, lineHeight: 1.42,
              borderLeft: `5px solid ${COSMOS.yellow}`, paddingLeft: 20,
            }}>
              คืนนี้ถ้าคุณแหงนมองขึ้นไป
              <br />ความมืดรอบ ๆ กำลังบอกอะไรคุณอยู่
            </div>
          </Rise>
        </Layer>
      </Chapter>

      <Grain opacity={0.04} />
      <EndFade at={C.tail - 44} dur={40} />
    </CollageBoard>
  </AbsoluteFill>
);

export default Vox13DarkSky;
