import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { BLUEPRINT, CollageBoard, EASE_OUT, Grain, Layer, useTheme } from '../../lib/collage';
import { FONT_TH, FONT_TH_DISPLAY } from '../../fonts';

// =============================================================================
// vox-15 — REEV: รถไฟฟ้าที่มีเครื่องยนต์ แต่เครื่องยนต์ไม่เคยขับล้อ · The EV Insight
//
// THE OPERATOR ASKED FOR REAL DRIVING FOOTAGE AND THERE IS NONE. FAL_KEY is unset and the
// higgsfield balance is 5.35 credits against 32.5 for a single five-second clip, so not one
// clip was affordable. What replaced it is not a consolation prize: this video's subject is a
// POWER PATH, and the thing that had to move was the energy, not the car. <PowerFlow> animates
// it — packets travelling engine → generator → battery → motor → wheels, with the PHEV variant
// keeping the mechanical link to the wheels and the REEV variant simply not having one.
// channels/ev.json rules 1 and 4 ask for mechanism and for diagrams that reflect real layout;
// a stock shot of a car driving would have satisfied neither.
//
// No identifiable car model appears anywhere, badged or otherwise (rule 3).
// =============================================================================

export const compositionConfig = {
  id: 'Vox15Reev',
  durationInSeconds: 470,   // replaced from beats.json once the voice is measured
  fps: 30,
  width: 1920,
  height: 1080,
};

const W = 1920;
const H = 1080;
const MARGIN_L = 170;
const A = (f: string) => staticFile(`projects/vox-15-reev/layers/${f}`);

// ---- GENERATED CUES — rebuilt from beats.json by scripts/gen-cues.mjs. Do not hand-edit.
// Cue name === segment id in beats.json, so there is no map to keep in sync.
// !! 51 of 51 lines are NOT measured audio.
// Run the voice tool with --retime, then re-run this script, BEFORE the final render.
const C = {
  s01_arrive: 15,
  s02_wrong: 349,
  s03_onequestion: 553,
  s04_promise: 831,

  s05_axle: 1000,
  s05b_feel: 1253,
  s06_setup: 1525,

  s07_phev: 1718,
  s08_both: 1988,
  s09_modes: 2299,

  s10_reev: 2630,
  s11_nolink: 2927,
  s12_generator: 3136,
  s13_always: 3374,
  s14_feel: 3650,

  s15_sweet: 3887,
  s16_band: 4163,
  s17_forced: 4441,
  s18_cut: 4758,
  s19_hold: 4985,

  s20_but: 5272,
  s21_chain: 5506,
  s22_double: 5821,
  s23_loss: 6099,
  s24_scope: 6411,

  s25_city: 6758,
  s26_citywin: 7025,
  s27_highway: 7321,
  s28_shrink: 7601,

  s29_thai: 7937,
  s30_batt: 8207,
  s31_range: 8536,
  s32_standard: 8888,
  s33_engine: 9215,
  s33b_again: 9447,
  s34_motor: 9624,
  s34b_howq: 9926,
  s34c_buffer: 10190,
  s34d_peak: 10487,
  s34d2_avg: 10719,
  s34e_why: 10940,

  s35_epower: 11231,
  s36_same: 11518,
  s37_diff: 11726,
  s38_meaning: 11988,

  s39_sum: 12260,
  s40_q: 12350,
  s41_mech: 12582,
  s42_choose: 12911,
  s43_ev: 13141,
  s44_close: 13475,
  tail: 13813,
} as const;
// ---- END GENERATED CUES

const CAM = [
  { f: 0, x: 960, y: 540, z: 1 },
  { f: 7000, x: 986, y: 532, z: 1.012 },
  { f: 14200, x: 940, y: 548, z: 1.004 },
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
// THE POWER FLOW — the centre of the video, and the thing that moves in it.
//
// Six nodes on one rail. The PHEV layout keeps a MECHANICAL link from the engine down to the
// wheels; the REEV layout does not have one, and its absence is the entire subject. Energy is
// drawn as packets travelling the live edges, so the difference is something you watch rather
// than something you are told.
// =============================================================================
type NodeId = 'fuel' | 'engine' | 'gen' | 'batt' | 'motor' | 'wheels';
const NODES: { id: NodeId; label: string; x: number; y: number }[] = [
  { id: 'fuel', label: 'น้ำมัน', x: 60, y: 60 },
  { id: 'engine', label: 'เครื่องยนต์', x: 220, y: 60 },
  { id: 'gen', label: 'เครื่องปั่นไฟ', x: 400, y: 60 },
  { id: 'batt', label: 'แบตเตอรี่', x: 400, y: 190 },
  { id: 'motor', label: 'มอเตอร์', x: 580, y: 190 },
  { id: 'wheels', label: 'ล้อ', x: 740, y: 190 },
];
const NW = 132;  // node box width
const NH = 46;

/** edges as [from, to, kind] — 'mech' is a shaft, 'elec' is a cable */
type Edge = [NodeId, NodeId, 'mech' | 'elec'];
const CHAIN_REEV: Edge[] = [
  ['fuel', 'engine', 'mech'], ['engine', 'gen', 'mech'],
  ['gen', 'batt', 'elec'], ['batt', 'motor', 'elec'], ['motor', 'wheels', 'mech'],
];
const CHAIN_PHEV: Edge[] = [...CHAIN_REEV, ['engine', 'wheels', 'mech']];

const centreOf = (id: NodeId) => {
  const n = NODES.find((x) => x.id === id)!;
  return { x: n.x + NW / 2, y: n.y + NH / 2 };
};

const PowerFlow: React.FC<{ at: number; mode: 'phev' | 'reev'; tollAt?: number; flowFrom?: number }> =
  ({ at, mode, tollAt, flowFrom }) => {
    const T = useTheme();
    const frame = useCurrentFrame();
    const edges = mode === 'phev' ? CHAIN_PHEV : CHAIN_REEV;
    const appear = (i: number) => interpolate(frame, [at + i * 8, at + i * 8 + 18], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const toll = tollAt === undefined ? 0 : interpolate(frame, [tollAt, tollAt + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const flowOn = flowFrom === undefined ? 0 : interpolate(frame, [flowFrom, flowFrom + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    return (
      <svg width={900} height={280} viewBox="0 0 900 280">
        {edges.map(([a, b, kind], i) => {
          const p = centreOf(a), q = centreOf(b);
          const k = appear(NODES.findIndex((n) => n.id === a));
          const isDirect = a === 'engine' && b === 'wheels';
          // the engine→wheels shaft routes UNDER the row so it reads as a separate path
          const d = isDirect
            ? `M ${p.x} ${p.y + NH / 2} L ${p.x} 265 L ${q.x} 265 L ${q.x} ${q.y + NH / 2}`
            : `M ${p.x} ${p.y} L ${q.x} ${q.y}`;
          return (
            <g key={`${a}-${b}`} opacity={k}>
              <path d={d} fill="none"
                stroke={kind === 'mech' ? T.yellow : T.teal}
                strokeWidth={kind === 'mech' ? 5 : 3}
                strokeDasharray={kind === 'elec' ? '7 5' : undefined} />
              {/* energy packets — three per edge, evenly spaced, looping */}
              {flowOn > 0 && [0, 1, 2].map((j) => {
                const t = (((frame - (flowFrom ?? 0)) * 0.012) + j / 3) % 1;
                const cx = isDirect ? p.x + (q.x - p.x) * t : p.x + (q.x - p.x) * t;
                const cy = isDirect ? (t < 0.5 ? p.y + NH / 2 + (265 - p.y - NH / 2) * (t * 2) : 265) : p.y + (q.y - p.y) * t;
                return <circle key={j} cx={cx} cy={cy} r={4} fill={kind === 'mech' ? T.yellow : T.teal} opacity={flowOn * 0.9} />;
              })}
            </g>
          );
        })}

        {NODES.map((n, i) => {
          const k = appear(i);
          const isEngine = n.id === 'engine';
          return (
            <g key={n.id} opacity={k}>
              <rect x={n.x} y={n.y} width={NW} height={NH} rx={8}
                fill={T.cream} stroke={isEngine ? T.yellow : T.landHi} strokeWidth={2} />
              <text x={n.x + NW / 2} y={n.y + NH / 2 + 7} textAnchor="middle"
                fill={T.ink} fontSize={20} fontFamily="var(--vox-body)">{n.label}</text>
            </g>
          );
        })}

        {/* the two conversion nodes that charge the toll, marked only when the toll is named */}
        {toll > 0 ? (
          <g opacity={toll}>
            <circle cx={centreOf('gen').x} cy={centreOf('gen').y - 42} r={16} fill={T.red} />
            <text x={centreOf('gen').x} y={centreOf('gen').y - 36} textAnchor="middle" fill={T.paper} fontSize={17} fontFamily="var(--vox-display)">1</text>
            <circle cx={centreOf('motor').x} cy={centreOf('motor').y - 42} r={16} fill={T.red} />
            <text x={centreOf('motor').x} y={centreOf('motor').y - 36} textAnchor="middle" fill={T.paper} fontSize={17} fontFamily="var(--vox-display)">2</text>
            <text x={790} y={110} fill={T.red} fontSize={22} fontFamily="var(--vox-display)">−15–20%</text>
          </g>
        ) : null}

        {mode === 'reev' ? (
          <g opacity={appear(5)}>
            <text x={450} y={268} textAnchor="middle" fill={T.inkSoft} fontSize={19} fontFamily="var(--vox-body)">
              ไม่มีเส้นทางกลไกจากเครื่องยนต์ถึงล้อ
            </text>
          </g>
        ) : null}
      </svg>
    );
  };

/** Engine efficiency against rpm: a narrow sweet spot, and where each layout sits in it. */
const EffBand: React.FC<{ at: number; mode: 'tied' | 'held' }> = ({ at, mode }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const k = interpolate(frame, [at, at + 22], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // tied to road speed: the marker is dragged all over. decoupled: it sits still.
  const t = frame - at;
  const x = mode === 'tied' ? 320 + Math.sin(t * 0.06) * 190 + Math.sin(t * 0.017) * 90 : 372;
  return (
    <>
      <div style={{ fontFamily: FONT_TH, fontSize: 21, color: T.inkSoft, marginBottom: 10 }}>
        ประสิทธิภาพของเครื่องยนต์ เทียบกับรอบเครื่อง
      </div>
      <svg width={660} height={190} viewBox="0 0 660 190">
        <rect x={300} y={20} width={150} height={130} rx={6} fill={T.yellow} opacity={0.16 * k} />
        <text x={375} y={14} textAnchor="middle" fill={T.yellow} fontSize={17} opacity={k} fontFamily="var(--vox-body)">ช่วงประหยัดที่สุด</text>
        <path d="M 40 150 C 200 148, 290 40, 375 38 C 460 40, 550 130, 620 148"
          fill="none" stroke={T.teal} strokeWidth={3} opacity={k} />
        <line x1={40} y1={150} x2={620} y2={150} stroke={T.landHi} strokeWidth={2} opacity={k} />
        <text x={620} y={172} textAnchor="end" fill={T.inkSoft} fontSize={16} opacity={k} fontFamily="var(--vox-body)">รอบเครื่อง →</text>
        <circle cx={x} cy={150} r={8} fill={mode === 'tied' ? T.red : T.yellow} opacity={k} />
        <line x1={x} y1={150} x2={x} y2={44} stroke={mode === 'tied' ? T.red : T.yellow} strokeWidth={2} strokeDasharray="4 4" opacity={k * 0.8} />
      </svg>
      <div style={{ fontFamily: FONT_TH, fontSize: 22, color: mode === 'tied' ? T.red : T.yellow, marginTop: 6, opacity: k }}>
        {mode === 'tied' ? 'รถน้ำมันปกติ — รอบผูกกับความเร็วรถ ถูกลากออกจากช่วงตลอด' : 'REEV — รอบไม่ผูกกับความเร็วรถ ตั้งค้างไว้ตรงนี้ได้'}
      </div>
    </>
  );
};

const SpecRow: React.FC<{ at: number; label: string; value: string; colour: string; note?: string }> =
  ({ at, label, value, colour, note }) => {
    const T = useTheme();
    const frame = useCurrentFrame();
    const k = interpolate(frame, [at, at + 18], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return (
      <div style={{ opacity: k, transform: `translateY(${(1 - k) * 12}px)`, borderBottom: `1px solid ${T.landHi}`, paddingBottom: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <div style={{ fontFamily: FONT_TH, fontSize: 23, color: T.ink, flex: 1 }}>{label}</div>
          <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 29, fontWeight: 700, color: colour, whiteSpace: 'nowrap' }}>{value}</div>
        </div>
        {note ? <div style={{ fontFamily: FONT_TH, fontSize: 18, color: T.red, marginTop: 5 }}>{note}</div> : null}
      </div>
    );
  };

const SummaryCard: React.FC<{ ats: number[] }> = ({ ats }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const rows: [string, string, string][] = [
    ['คำถามที่แยกสองอย่างนี้', 'เครื่องยนต์ส่งกำลังถึงล้อได้โดยตรงไหม — PHEV ได้ · REEV ไม่ได้เลย', T.inkSoft],
    ['กลไก', 'เครื่องไม่ผูกกับล้อ จึงตั้งรอบประหยัดค้างได้ แต่จ่ายค่าแปลงสองต่อ 15–20% เฉพาะตอนใช้น้ำมัน', T.yellow],
    ['เลือกยังไง', 'ขับในเมืองเป็นหลัก REEV ได้เปรียบ · วิ่งทางไกลความเร็วคงที่บ่อย PHEV ได้เปรียบ', T.teal],
  ];
  return (
    <>
      {rows.map(([k, v, c], i) => {
        const on = interpolate(frame, [ats[i], ats[i] + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={k} style={{ opacity: on, transform: `translateY(${(1 - on) * 16}px)`, marginBottom: i === 2 ? 0 : 22 }}>
            <div style={{ fontFamily: FONT_TH, fontSize: 21, color: c, marginBottom: 6 }}>{k}</div>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 26, fontWeight: 700, color: T.ink, lineHeight: 1.4 }}>{v}</div>
          </div>
        );
      })}
    </>
  );
};

const Title: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  return (
    <Layer x={MARGIN_L + 330} y={420} w={760} at={0} dur={1} enter="none" depth={0.04} drift={0}>
      <Rise at={at} dur={24} dy={42}>
        <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 62, lineHeight: 1.26, fontWeight: 700, color: T.ink, letterSpacing: '0.6px' }}>
          รถไฟฟ้าที่มีเครื่องยนต์
          <br />
          <span style={{ background: T.yellow, color: T.paper, padding: '2px 14px', borderRadius: 6 }}>แต่ไม่เคยขับล้อ</span>
        </div>
      </Rise>
    </Layer>
  );
};

// =============================================================================
export default function Vox15Reev() {
  return (
    <AbsoluteFill style={{ background: BLUEPRINT.paper }}>
      <CollageBoard cam={CAM} theme="blueprint" fontBody={FONT_TH} fontDisplay={FONT_TH_DISPLAY} tracking="0.6px">
        <Backdrop
          end={C.tail}
          shots={[
            { at: 0, src: A('p-showroom-raw.png'), pos: '50% 50%', dim: 0.84, zoom: 0.06, pan: [-12, 0] },
            { at: C.s03_onequestion, src: A('p-dashboard-raw.png'), pos: '50% 55%', dim: 0.86, zoom: 0.05, pan: [10, 0] },

            { at: C.s05_axle, src: A('p-workshop-raw.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [0, 8] },

            { at: C.s07_phev, src: A('p-engine-bay-raw.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [12, 0] },
            { at: C.s09_modes, src: A('p-gears-raw.png'), pos: '50% 50%', dim: 0.84, zoom: 0.07, pan: [-10, 0] },

            { at: C.s10_reev, src: A('p-windings-raw.png'), pos: '50% 50%', dim: 0.84, zoom: 0.06, pan: [8, 0] },
            { at: C.s13_always, src: A('p-cable-coil-raw.png'), pos: '50% 50%', dim: 0.85, zoom: 0.05, pan: [0, 6] },

            { at: C.s15_sweet, src: A('p-tacho-plate-raw.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [10, 0] },
            { at: C.s17_forced, src: A('p-city-traffic-raw.png'), pos: '50% 50%', dim: 0.82, zoom: 0.07, pan: [0, -8] },
            { at: C.s19_hold, src: A('p-road-night-raw.png'), pos: '50% 50%', dim: 0.84, zoom: 0.06, pan: [8, 0] },

            { at: C.s20_but, src: A('p-toll-booth-raw.png'), pos: '50% 50%', dim: 0.83, zoom: 0.06, pan: [-10, 0] },
            { at: C.s23_loss, src: A('p-fuel-pump-raw.png'), pos: '50% 50%', dim: 0.85, zoom: 0.05, pan: [10, 4] },

            { at: C.s25_city, src: A('p-traffic-red-raw.png'), pos: '50% 50%', dim: 0.83, zoom: 0.06, pan: [0, 8] },
            { at: C.s27_highway, src: A('p-highway-dusk-raw.png'), pos: '50% 50%', dim: 0.82, zoom: 0.06, pan: [10, 0] },

            { at: C.s29_thai, src: A('p-parking-raw.png'), pos: '50% 50%', dim: 0.85, zoom: 0.05, pan: [-8, 0] },
            { at: C.s33_engine, src: A('p-cells-rack-raw.png'), pos: '50% 50%', dim: 0.86, zoom: 0.06, pan: [8, 0] },

            { at: C.s35_epower, src: A('p-charger-raw.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [0, 6] },

            { at: C.s39_sum, src: A('p-mountain-rd-raw.png'), pos: '50% 50%', dim: 0.82, zoom: 0.07, pan: [-8, -6] },
            { at: C.s43_ev, src: A('p-rain-road-raw.png'), pos: '50% 50%', dim: 0.84, zoom: 0.06, pan: [8, 0] },
          ]}
        />

        {/* 1 — HOOK */}
        <Chapter from={0} to={C.s05_axle}>
          <Title at={C.s01_arrive} />
          <Prop src={A('o-plug-type2.png')} x={370} y={830} w={300} at={R(C.s01_arrive, 0) + 20} rot={1} />
          <Figure at={R(C.s02_wrong, 0)} x={1250} y={540} w={720}>
            <div style={{ fontFamily: FONT_TH, fontSize: 26, color: BLUEPRINT.ink, lineHeight: 1.6 }}>
              เกือบทุกคนอธิบาย REEV ว่าเป็น <b style={{ color: BLUEPRINT.red }}>PHEV แบบใหม่</b>
              <br />ซึ่งผิดตรงจุดที่เป็นหัวใจของทั้งระบบ
            </div>
            <Note at={R(C.s04_promise, 0)}>
              คำถามเดียวที่แยกสองอย่างนี้ออกจากกัน — เครื่องยนต์ส่งกำลังถึงล้อได้โดยตรงไหม
            </Note>
          </Figure>
        </Chapter>

        {/* 2 — THE QUESTION */}
        <Chapter from={C.s05_axle} to={C.s07_phev}>
          <Head at={0} kicker="คำถามที่ตัดสินทุกอย่าง" head="เครื่องยนต์ต่อกับล้อได้ไหม" y={340} w={700} />
          <Prop src={A('o-driveshaft.png')} x={1240} y={620} w={620} at={R(C.s05b_feel, C.s05_axle)} rot={-2}
            caption="เพลาขับ — ทางกลไกจากเครื่องยนต์ลงไปที่ล้อ" />
        </Chapter>

        {/* 3 — PHEV: the mechanical link is present */}
        <Chapter from={C.s07_phev} to={C.s10_reev}>
          <Head at={0} kicker="แบบที่หนึ่ง" head="PHEV — ปลั๊กอินไฮบริด" sub="พื้นฐานเป็นรถน้ำมัน ที่เติมมอเตอร์กับแบตเข้าไป" y={300} w={700} />
          <Layer x={1170} y={640} w={900} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s08_both, C.s07_phev)} dy={26}>
              <Card w={900} pad={22}>
                <PowerFlow at={R(C.s08_both, C.s07_phev)} mode="phev" flowFrom={R(C.s09_modes, C.s07_phev)} />
                <div style={{ fontFamily: FONT_TH, fontSize: 22, color: BLUEPRINT.yellow, marginTop: 4 }}>
                  เส้นเหลืองล่างสุดคือเพลาที่ต่อเครื่องยนต์เข้ากับล้อโดยตรง
                </div>
              </Card>
            </Rise>
          </Layer>
          <Prop src={A('o-piston.png')} x={330} y={800} w={210} at={R(C.s07_phev, C.s07_phev) + 30} rot={1.5} />
        </Chapter>

        {/* 4 — REEV: the same diagram with that link simply absent */}
        <Chapter from={C.s10_reev} to={C.s15_sweet}>
          <Head at={0} kicker="แบบที่สอง" head="REEV — รถไฟฟ้าที่ติดเครื่องปั่นไฟ" sub="เครื่องยนต์ไม่มีเพลา ไม่มีคลัตช์ ไม่มีเกียร์ ที่ต่อถึงล้อ" y={300} w={740} />
          <Layer x={1170} y={640} w={900} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s11_nolink, C.s10_reev)} dy={26}>
              <Card w={900} pad={22}>
                <PowerFlow at={R(C.s11_nolink, C.s10_reev)} mode="reev" flowFrom={R(C.s12_generator, C.s10_reev)} />
                <div style={{ fontFamily: FONT_TH, fontSize: 22, color: BLUEPRINT.teal, marginTop: 4 }}>
                  ล้อหมุนด้วยมอเตอร์ 100% ตลอดเวลา ไม่มีข้อยกเว้น
                </div>
              </Card>
            </Rise>
          </Layer>
          <Prop src={A('o-motor.png')} x={330} y={820} w={280} at={R(C.s13_always, C.s10_reev)} rot={-1.5} />
        </Chapter>

        {/* 5 — THE ADVANTAGE: the engine comes off the leash */}
        <Chapter from={C.s15_sweet} to={C.s20_but}>
          <Head at={0} kicker="ข้อได้เปรียบ" head="เครื่องหลุดจากความเร็วรถ" y={300} w={700} />
          <Figure at={R(C.s16_band, C.s15_sweet)} x={1230} y={460} w={720}>
            <EffBand at={R(C.s17_forced, C.s15_sweet)} mode="tied" />
          </Figure>
          <Figure at={R(C.s18_cut, C.s15_sweet)} x={1230} y={840} w={720}>
            <EffBand at={R(C.s19_hold, C.s15_sweet)} mode="held" />
          </Figure>
          <Prop src={A('o-tacho.png')} x={340} y={800} w={260} at={R(C.s16_band, C.s15_sweet)} rot={1} />
        </Chapter>

        {/* 6 — THE PRICE: two conversions, and the scope of the number */}
        <Chapter from={C.s20_but} to={C.s25_city}>
          <Head at={0} kicker="ค่าผ่านทางที่ต้องจ่าย" head="แปลงพลังงานสองต่อ" y={300} accent={BLUEPRINT.red} w={700} />
          <Layer x={1170} y={620} w={900} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s22_double, C.s20_but)} dy={26}>
              <Card w={900} pad={22}>
                <PowerFlow at={R(C.s22_double, C.s20_but)} mode="reev"
                  tollAt={R(C.s23_loss, C.s20_but)} flowFrom={R(C.s22_double, C.s20_but) + 20} />
              </Card>
            </Rise>
          </Layer>
          <Figure at={R(C.s24_scope, C.s20_but)} x={470} y={860} w={640}>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 26, fontWeight: 700, color: BLUEPRINT.yellow, lineHeight: 1.35 }}>
              ตัวเลขนี้กินเฉพาะตอนใช้น้ำมันปั่นไฟ
            </div>
            <div style={{ fontFamily: FONT_TH, fontSize: 23, color: BLUEPRINT.ink, lineHeight: 1.5, marginTop: 12 }}>
              ตอนวิ่งด้วยไฟที่ชาร์จมาจากปลั๊ก ไม่มีการแปลงสองต่อนี้เลย
            </div>
          </Figure>
        </Chapter>

        {/* 7 — WHO WINS WHERE. The channel's rule 7: the condition sits in the same frame. */}
        <Chapter from={C.s25_city} to={C.s29_thai}>
          <Head at={0} kicker="แล้วแบบไหนดีกว่า" head="ขึ้นกับว่าคุณขับแบบไหน" y={300} w={700} />
          <Figure at={R(C.s26_citywin, C.s25_city)} x={1230} y={470} w={740}>
            <List at={0} title="ในเมือง — REEV ได้เปรียบ" colour={BLUEPRINT.teal}
              items={['รถหยุดแล้วออกตลอด เครื่องของรถปกติแทบไม่อยู่ในช่วงประหยัด',
                      'REEV ตั้งรอบไว้นิ่ง ๆ แล้วปั่นไฟได้']}
              ats={[0, 45].map((d) => R(C.s26_citywin, C.s25_city) + d)} />
          </Figure>
          <Figure at={R(C.s27_highway, C.s25_city)} x={1230} y={830} w={740}>
            <List at={0} title="ทางหลวงความเร็วคงที่ — PHEV ได้เปรียบ" colour={BLUEPRINT.yellow}
              items={['เครื่องของรถปกติได้อยู่ใกล้จุดประหยัดอยู่แล้ว',
                      'ข้อได้เปรียบของ REEV หด แต่ค่าผ่านทางยังต้องจ่าย']}
              ats={[0, 45].map((d) => R(C.s27_highway, C.s25_city) + d)} />
          </Figure>
          <Prop src={A('o-coins.png')} x={350} y={840} w={240} at={R(C.s28_shrink, C.s25_city)} rot={-2} />
        </Chapter>

        {/* 8 — THE CAR SOLD IN THAILAND, with the measurement caveat rule 2 demands */}
        <Chapter from={C.s29_thai} to={C.s35_epower}>
          <Head at={0} kicker="ตัวเลขจริงของรถที่ขายในไทย" head="Deepal S05 REEV" sub="ประกอบในไทย" y={300} w={700} />
          <Figure at={R(C.s30_batt, C.s29_thai)} x={1250} y={560} w={760}>
            <SpecRow at={R(C.s30_batt, C.s29_thai)} label="แบตเตอรี่ LFP จาก CATL" value="27 kWh" colour={BLUEPRINT.teal} />
            <SpecRow at={R(C.s31_range, C.s29_thai)} label="วิ่งไฟฟ้าล้วน" value="~170 กม." colour={BLUEPRINT.yellow}
              note="⚠ ไม่มีแหล่งไหนระบุมาตรฐานการวัด — NEDC / CLTC / WLTP ต่างกันได้ 20–30%" />
            <SpecRow at={R(C.s33_engine, C.s29_thai)} label="เครื่องยนต์ปั่นไฟ 1.5 ลิตร · ถัง 45 ลิตร" value="98 แรงม้า" colour={BLUEPRINT.inkSoft} />
            <SpecRow at={R(C.s34_motor, C.s29_thai)} label="มอเตอร์ขับล้อหลัง · 320 นิวตันเมตร" value="218 แรงม้า" colour={BLUEPRINT.yellow} />
            <Note at={R(C.s34c_buffer, C.s29_thai)}>
              98 แรงม้าเลี้ยง 218 แรงม้าได้ เพราะแบตเป็นถังพัก — เครื่องออกแบบให้พอกับ
              <b> ความต้องการเฉลี่ย</b> ไม่ใช่ความต้องการสูงสุด
            </Note>
          </Figure>
          <Prop src={A('o-cell.png')} x={340} y={790} w={220} at={R(C.s30_batt, C.s29_thai)} rot={1} />
          <Prop src={A('o-jerrycan.png')} x={640} y={930} w={230} at={R(C.s33_engine, C.s29_thai)} rot={-1.5} />
        </Chapter>

        {/* 9 — e-POWER: the same architecture, minus the plug */}
        <Chapter from={C.s35_epower} to={C.s39_sum}>
          <Head at={0} kicker="แล้ว e-Power ล่ะ" head="สถาปัตยกรรมเดียวกันเป๊ะ" y={320} w={700} />
          <Figure at={R(C.s36_same, C.s35_epower)} w={740}>
            <List at={0} title="เหมือนกันทุกอย่าง" colour={BLUEPRINT.teal}
              items={['เครื่องยนต์ปั่นไฟอย่างเดียว ไม่ต่อกับล้อ', 'มอเตอร์ขับล้อ 100%']}
              ats={[0, 40].map((d) => R(C.s36_same, C.s35_epower) + d)} />
            <Note at={R(C.s37_diff, C.s35_epower)} colour={BLUEPRINT.red}>
              ต่างกันสองอย่าง — แบตเล็กกว่ามาก และ<b>เสียบชาร์จจากข้างนอกไม่ได้</b>
              <br />จึงได้ข้อดีเรื่องรอบเครื่อง แต่ไม่ได้ข้อดีเรื่องไฟราคาถูกจากบ้าน
            </Note>
          </Figure>
          <Prop src={A('o-socket.png')} x={360} y={840} w={260} at={R(C.s37_diff, C.s35_epower)} rot={1} />
        </Chapter>

        {/* 10 — SUMMARY */}
        <Chapter from={C.s39_sum} to={C.tail} last>
          <Head at={0} kicker="สรุป" head="คำถาม · กลไก · เลือกยังไง" y={280} w={700} />
          <Figure at={0} x={1250} y={520} w={800}>
            <SummaryCard ats={[C.s40_q, C.s41_mech, C.s42_choose].map((f) => R(f, C.s39_sum))} />
          </Figure>
          <Prop src={A('o-fuel-nozzle.png')} x={360} y={900} w={280} at={R(C.s41_mech, C.s39_sum)} rot={-1.5} />
          <Layer x={MARGIN_L + 300} y={690} w={640} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s43_ev, C.s39_sum)} dy={30}>
              <div style={{
                fontFamily: FONT_TH_DISPLAY, fontSize: 29, fontWeight: 700, color: BLUEPRINT.ink, lineHeight: 1.42,
                borderLeft: `5px solid ${BLUEPRINT.teal}`, paddingLeft: 20,
              }}>
                ชาร์จบ้านได้ทุกคืน วิ่งไม่เกินระยะแบต
                <br />EV ล้วนยังถูกกว่าทั้งสองแบบ
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
