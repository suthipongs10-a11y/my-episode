import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { BLUEPRINT, CollageBoard, EASE_OUT, Grain, Layer, useTheme } from '../../lib/collage';
import { FONT_TH, FONT_TH_DISPLAY } from '../../fonts';

// =============================================================================
// vox-17 — แพ็กส่งของสดไม่ให้ช้ำ · เกษตรที่คนไทยควรรู้ · 1920x1080
//
// THE OPERATOR ASKED FOR REAL PHOTOGRAPHS IN THE FILM, and the honest reading of that request
// is that this kit did not have any. Every plate in every previous video is dimmed to 0.84 and
// put behind type — the photographs were doing ATMOSPHERE, never showing anything. <PhotoCard>
// is the answer: the same generated photograph at FULL brightness, in a pale mount with a
// caption, sitting on the dark board like a print pinned to it. It is the brightest thing in
// the frame, which is the point — when the film says "this is what a foam sleeve is", the
// viewer looks at a foam sleeve rather than at a dim suggestion of one.
//
// WHAT IT MAY NOT BE USED FOR — and this is agri rule 9, which bites harder here than anywhere.
// A bright, undimmed photograph is exactly the kind of image a viewer measures their own
// against. So: PhotoCards show MATERIALS and TECHNIQUE — a box, a mesh sleeve, a gel pack,
// ventilation holes. **There is no photograph of bruised fruit in this film and there must
// never be one**, because the degree of bruising is a test result, and a generated one would
// be reference data we invented. Every claim about damage is drawn, in <ThreeForces>,
// <VibeRub> and <HeatLoop>, where it is obviously a drawing.
//
// Motion is vox-12's, unchanged (brand.md §5).
// =============================================================================

export const compositionConfig = {
  id: 'Vox17Packing',
  durationInSeconds: 391, // beats.json: VO ends 385.50s (measured)
  fps: 30,
  width: 1920,
  height: 1080,
};

const W = 1920;
const H = 1080;
const MARGIN_L = 170;
const A = (f: string) => staticFile(`projects/vox-17-packing/layers/${f}`);

// ---- GENERATED CUES — rebuilt from beats.json by scripts/gen-cues.mjs. Do not hand-edit.
// Cue name === segment id in beats.json, so there is no map to keep in sync.
// All 57 windows are measured from the real audio.
const C = {
  s01_once: 15,
  s02_silent: 232,
  s03_where: 364,
  s04_promise: 622,

  s05_forces: 887,
  s06_press: 1048,
  s07_drop: 1181,
  s08_vibe: 1343,
  s09_gap: 1545,

  s10_why: 1784,
  s11_time: 1918,
  s12_rub: 2139,
  s13_reso: 2399,
  s14_reso2: 2525,
  s15_amp: 2777,

  s16_test: 3039,
  s17_result: 3181,
  s18_best: 3448,
  s19_lesson: 3602,
  s20_move: 3746,
  s21_rule: 3963,
  s22_caveat: 4160,

  s23_turn: 4479,
  s24_alive: 4664,
  s25_heat: 4819,
  s26_q10: 5035,
  s27_mean: 5326,
  s28_life: 5533,
  s29_loop: 5650,

  s30_when: 5979,
  s31_afternoon: 6104,
  s32_oven: 6341,
  s33_pre: 6593,
  s34_notcold: 6884,
  s35_chill: 7063,

  s36_box: 7310,
  s37_corr: 7425,
  s38_size: 7629,
  s39_liner: 7858,

  s40_layer: 8109,
  s41_bottom: 8186,
  s42_divider: 8363,
  s43_fill: 8615,
  s44_top: 8846,

  s45_air: 9043,
  s46_vent: 9205,
  s47_why: 9472,
  s48_gel: 9665,
  s49_gelwhy: 9873,
  s50_gelhow: 10100,

  s51_check: 10286,
  s52_shake: 10405,
  s53_sum: 10637,
  s54_mech: 10706,
  s55_fix: 10933,
  s56_start: 11141,
  s57_close: 11327,
  tail: 11565,
} as const;
// ---- END GENERATED CUES

const R = (abs: number, from: number) => Math.max(0, abs - from);

const CAM = [
  { f: 0, x: 960, y: 540, z: 1 },
  { f: 6000, x: 982, y: 533, z: 1.011 },
  { f: 11700, x: 942, y: 547, z: 1.004 },
];

const XFADE = 26;
const XOVER = 14;
const XOUT = 26;

const Rise: React.FC<{ at: number; dur?: number; dy?: number; out?: number; children: React.ReactNode }> =
  ({ at, dur = 16, dy = 26, out, children }) => {
    const frame = useCurrentFrame();
    const k = interpolate(frame, [at, at + dur], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const o = out === undefined ? 1
      : interpolate(frame, [out, out + 18], [1, 0], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return (
      <div style={{ opacity: k * o, transform: `translateY(${(1 - k) * dy + (1 - o) * -14}px) scale(${0.985 + k * 0.015})`, transformOrigin: 'left center' }}>
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
      const next = shots[i + 1]?.at ?? end;
      const len = next - s.at + XFADE;
      return (
        <Sequence key={i} from={Math.max(0, s.at - XFADE / 2)} durationInFrames={len + XFADE}>
          <KenBurns shot={s} len={len + XFADE} />
        </Sequence>
      );
    })}
  </>
);

const SceneBody: React.FC<{ dur: number; fadeOut: number; children: React.ReactNode }> = ({ dur, fadeOut, children }) => {
  const frame = useCurrentFrame();
  const o = fadeOut ? interpolate(frame, [dur - fadeOut, dur], [1, 0], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  return <div style={{ opacity: o, transform: `translateY(${(1 - o) * -14}px)` }}>{children}</div>;
};

const Scene: React.FC<{ from: number; dur: number; fadeOut?: number; children: React.ReactNode }> = ({ from, dur, fadeOut = 0, children }) => (
  <Sequence from={from} durationInFrames={dur}>
    <SceneBody dur={dur} fadeOut={fadeOut}>{children}</SceneBody>
  </Sequence>
);

const Chapter: React.FC<{ from: number; to: number; last?: boolean; children: React.ReactNode }> =
  ({ from, to, last = false, children }) => (
    <Scene from={from} dur={to - from + (last ? 0 : XOVER)} fadeOut={last ? 0 : XOUT}>{children}</Scene>
  );

const Head: React.FC<{ at: number; kicker?: string; head: string; sub?: string; y?: number; accent?: string; w?: number }> =
  ({ at, kicker, head, sub, y = 330, accent, w = 620 }) => {
    const T = useTheme();
    return (
      <Layer x={MARGIN_L - 10 + w / 2} y={y} w={w} at={0} dur={1} enter="none" depth={0.04} drift={0}>
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

// =============================================================================
// PHOTOCARD — the new element in this film.
//
// A print on a pale mount, undimmed, with the caption on the mount rather than floating on the
// board. Slight rotation and a real shadow so it reads as a physical object lying on the
// surface rather than a rectangle composited onto it. Deliberately the brightest thing in any
// frame it appears in: a plate is scenery, a PhotoCard is the subject.
// =============================================================================
const MOUNT = '#efe9dc';
const MOUNT_INK = '#2a2a26';

const PhotoCard: React.FC<{
  at: number; src: string; w: number; x: number; y: number;
  caption: string; note?: string; rot?: number; pos?: string;
}> = ({ at, src, w, x, y, caption, note, rot = -1.2, pos = '50% 50%' }) => (
  <Layer x={x} y={y} w={w} at={0} dur={1} enter="none" rotate={rot} depth={0.09} drift={0.4}>
    <Rise at={at} dy={34}>
      <div style={{
        width: w, background: MOUNT, padding: 14, paddingBottom: 12, borderRadius: 4,
        boxShadow: '0 22px 48px rgba(0,0,0,0.55), 0 3px 10px rgba(0,0,0,0.4)',
      }}>
        <Img src={src} style={{
          width: '100%', height: Math.round(w * 0.62), objectFit: 'cover',
          objectPosition: pos, display: 'block', borderRadius: 2,
        }} />
        <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 23, fontWeight: 700, color: MOUNT_INK, marginTop: 11, lineHeight: 1.35 }}>
          {caption}
        </div>
        {note ? (
          <div style={{ fontFamily: FONT_TH, fontSize: 19, color: '#6a6459', marginTop: 4, lineHeight: 1.4 }}>{note}</div>
        ) : null}
      </div>
    </Rise>
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

const List: React.FC<{ at: number; title?: string; colour?: string; items: string[]; ats?: number[] }> =
  ({ at, title, colour, items, ats }) => {
    const T = useTheme();
    const frame = useCurrentFrame();
    return (
      <>
        {title ? <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 27, fontWeight: 700, color: colour ?? T.teal, marginBottom: 16 }}>{title}</div> : null}
        {items.map((it, i) => {
          const a = ats ? ats[i] : at + i * 22;
          const k = interpolate(frame, [a, a + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={it} style={{ display: 'flex', gap: 12, marginBottom: i === items.length - 1 ? 0 : 14, opacity: k, transform: `translateY(${(1 - k) * 12}px)` }}>
              <div style={{ color: colour ?? T.teal, fontSize: 24, lineHeight: 1.45 }}>•</div>
              <div style={{ fontFamily: FONT_TH, fontSize: 24, color: T.ink, lineHeight: 1.45 }}>{it}</div>
            </div>
          );
        })}
      </>
    );
  };

// =============================================================================
// THE DRAWN FIGURES. Everything about DAMAGE is drawn — agri rule 9 — because the degree of
// bruising is a test result and a generated photograph of one would be invented reference data.
// =============================================================================

/** The three transport forces, and which one people forget. */
const ThreeForces: React.FC<{ ats: number[]; missAt: number }> = ({ ats, missAt }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const rows = [
    { name: 'แรงกด', why: 'กล่องวางซ้อนกันบนรถ', colour: T.inkSoft, guarded: true },
    { name: 'แรงกระแทก', why: 'การโยน การวาง การตก', colour: T.inkSoft, guarded: true },
    { name: 'แรงสั่น', why: 'ตลอดเวลาที่รถวิ่ง — ชั่วโมงต่อชั่วโมง', colour: T.red, guarded: false },
  ];
  const miss = interpolate(frame, [missAt, missAt + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <>
      {rows.map((r, i) => {
        const k = interpolate(frame, [ats[i], ats[i] + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={r.name} style={{ opacity: k, transform: `translateY(${(1 - k) * 14}px)`, display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: i === 2 ? 0 : 18 }}>
            <div style={{ width: 34, height: 34, borderRadius: 17, background: r.colour, color: T.paper, flexShrink: 0,
              fontFamily: FONT_TH_DISPLAY, fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 27, fontWeight: 700, color: r.colour }}>{r.name}</div>
              <div style={{ fontFamily: FONT_TH, fontSize: 22, color: T.ink, lineHeight: 1.45, marginTop: 3 }}>{r.why}</div>
            </div>
            {/* the tick / cross only appears once the film says which ones people design for */}
            <div style={{ opacity: miss, fontFamily: FONT_TH_DISPLAY, fontSize: 26, color: r.guarded ? T.teal : T.red, paddingTop: 4 }}>
              {r.guarded ? 'กันแล้ว' : 'ปล่อย'}
            </div>
          </div>
        );
      })}
    </>
  );
};

/** One drop against hours of rubbing — the comparison the film turns on. */
const VibeRub: React.FC<{ at: number; resoAt: number }> = ({ at, resoAt }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const k = interpolate(frame, [at, at + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const r = interpolate(frame, [resoAt, resoAt + 22], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const t = frame - at;
  // small steady shake for the "normal" trace, and a visibly bigger one once resonance lands
  const amp = 9 + r * 30;
  const wob = Math.sin(t * 0.55) * amp;
  return (
    <svg width={680} height={250} viewBox="0 0 680 250">
      {/* one impact: a single tall spike, over in an instant */}
      <g opacity={k}>
        <text x={0} y={18} fill={T.inkSoft} fontSize={19} fontFamily="var(--vox-body)">ตก 1 ครั้ง — จบใน 1 วินาที</text>
        <line x1={0} y1={70} x2={300} y2={70} stroke={T.landHi} strokeWidth={2} />
        <path d="M 120 70 L 132 26 L 144 70" fill="none" stroke={T.inkSoft} strokeWidth={3} />
      </g>
      {/* hours of vibration: a continuous trace that never stops */}
      <g opacity={k}>
        <text x={360} y={18} fill={T.red} fontSize={19} fontFamily="var(--vox-body)">สั่นต่อเนื่อง — เป็นชั่วโมง</text>
        <line x1={360} y1={70} x2={670} y2={70} stroke={T.landHi} strokeWidth={2} />
        <path d={Array.from({ length: 62 }, (_, i) => {
          const x = 360 + i * 5;
          const y = 70 - Math.sin(t * 0.5 + i * 0.9) * (amp * 0.5);
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ')} fill="none" stroke={T.red} strokeWidth={3} />
      </g>

      {/* two fruit rubbing against each other — the actual damage mechanism */}
      <g opacity={k}>
        <text x={0} y={130} fill={T.inkSoft} fontSize={19} fontFamily="var(--vox-body)">ผลถูกันเอง ซ้ำเป็นหมื่นครั้ง</text>
        <circle cx={240 + wob} cy={190} r={40} fill={T.landHi} />
        <circle cx={330 - wob} cy={190} r={40} fill={T.landHi} />
        <circle cx={420 + wob} cy={190} r={40} fill={T.landHi} />
        {/* the contact points, which is where abrasion happens */}
        <circle cx={285} cy={190} r={7} fill={T.red} opacity={0.55 + 0.45 * Math.abs(Math.sin(t * 0.5))} />
        <circle cx={375} cy={190} r={7} fill={T.red} opacity={0.55 + 0.45 * Math.abs(Math.sin(t * 0.5 + 1))} />
      </g>

      {/* resonance: named only when the narration reaches it */}
      <g opacity={r}>
        <text x={470} y={175} fill={T.yellow} fontSize={20} fontFamily="var(--vox-display)">เรโซแนนซ์</text>
        <text x={470} y={202} fill={T.yellow} fontSize={18} fontFamily="var(--vox-body)">ความถี่ตรงกัน</text>
        <text x={470} y={226} fill={T.yellow} fontSize={18} fontFamily="var(--vox-body)">แรงพุ่งขึ้นอีก</text>
      </g>
    </svg>
  );
};

/** Loose in a hard crate vs packed tight in a carton — the counter-intuitive test result. */
const TightVsLoose: React.FC<{ at: number; bestAt: number }> = ({ at, bestAt }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const t = frame - at;
  const k = interpolate(frame, [at, at + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const b = interpolate(frame, [bestAt, bestAt + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const jig = Math.sin(t * 0.6) * 7; // the loose box rattles; the packed one does not
  const Box = ({ x, label, verdict, colour, loose, o }: { x: number; label: string; verdict: string; colour: string; loose: boolean; o: number }) => (
    <g opacity={o}>
      <rect x={x} y={40} width={230} height={150} rx={6} fill="none" stroke={colour} strokeWidth={3} />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={x + 60 + i * 55 + (loose ? jig : 0)} cy={115} r={26} fill={T.landHi} />
      ))}
      {/* the packed variant has its gaps filled, drawn as hatching */}
      {!loose ? [0, 1, 2, 3].map((i) => (
        <rect key={i} x={x + 22 + i * 55} y={62} width={20} height={106} rx={4} fill={colour} opacity={0.28} />
      )) : null}
      <text x={x + 115} y={26} textAnchor="middle" fill={T.ink} fontSize={20} fontFamily="var(--vox-body)">{label}</text>
      <text x={x + 115} y={218} textAnchor="middle" fill={colour} fontSize={21} fontFamily="var(--vox-display)">{verdict}</text>
    </g>
  );
  return (
    <svg width={620} height={240} viewBox="0 0 620 240">
      <Box x={20} label="ลังแข็ง วางหลวม" verdict="ช้ำมากที่สุด" colour={T.red} loose o={k} />
      <Box x={330} label="กล่องลูกฟูก อัดเต็ม" verdict="ป้องกันดีที่สุด" colour={T.teal} loose={false} o={b} />
    </svg>
  );
};

/** Respiration makes heat, heat speeds respiration. In a sealed box the loop feeds itself. */
const HeatLoop: React.FC<{ at: number; loopAt: number }> = ({ at, loopAt }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const k = interpolate(frame, [at, at + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const l = interpolate(frame, [loopAt, loopAt + 22], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const spin = ((frame - loopAt) * 1.6) % 360;
  return (
    <svg width={640} height={230} viewBox="0 0 640 230">
      <g opacity={k}>
        <rect x={40} y={40} width={200} height={62} rx={8} fill={T.cream} stroke={T.landHi} strokeWidth={2} />
        <text x={140} y={78} textAnchor="middle" fill={T.ink} fontSize={21} fontFamily="var(--vox-body)">ผลไม้หายใจ</text>
        <rect x={390} y={40} width={200} height={62} rx={8} fill={T.cream} stroke={T.landHi} strokeWidth={2} />
        <text x={490} y={78} textAnchor="middle" fill={T.ink} fontSize={21} fontFamily="var(--vox-body)">ปล่อยความร้อน</text>
        <path d="M 240 71 L 384 71" stroke={T.yellow} strokeWidth={4} markerEnd="" />
        <path d="M 372 63 L 386 71 L 372 79 Z" fill={T.yellow} />
      </g>
      {/* the return arm closes the loop only when the narration says it does */}
      <g opacity={l}>
        <path d="M 490 108 Q 490 176 315 176 Q 140 176 140 108" fill="none" stroke={T.red} strokeWidth={4} />
        <path d="M 132 120 L 140 104 L 148 120 Z" fill={T.red} />
        <text x={315} y={202} textAnchor="middle" fill={T.red} fontSize={20} fontFamily="var(--vox-display)">
          ร้อนขึ้น 10°C = หายใจเร็วขึ้น 2–2.5 เท่า
        </text>
        {/* a small rotor to say "this keeps going", without a caption saying it */}
        <g transform={`translate(315 176) rotate(${spin})`}>
          <circle cx={0} cy={0} r={13} fill="none" stroke={T.red} strokeWidth={3} />
          <line x1={0} y1={-13} x2={0} y2={13} stroke={T.red} strokeWidth={3} />
        </g>
      </g>
    </svg>
  );
};

/** Where the vents go, and why not the lid. */
const VentPlacement: React.FC<{ at: number; whyAt: number }> = ({ at, whyAt }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const k = interpolate(frame, [at, at + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const w = interpolate(frame, [whyAt, whyAt + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <svg width={620} height={230} viewBox="0 0 620 230">
      {/* three stacked boxes: the lid and floor vents are covered by the box above and below */}
      {[0, 1, 2].map((i) => {
        const y = 24 + i * 62;
        return (
          <g key={i} opacity={k}>
            <rect x={120} y={y} width={280} height={54} rx={4} fill={T.cream} stroke={T.landHi} strokeWidth={2} />
            {[0, 1, 2, 3].map((j) => <circle key={j} cx={150 + j * 70} cy={y + 27} r={7} fill={T.teal} />)}
          </g>
        );
      })}
      <g opacity={k}>
        <text x={412} y={54} fill={T.teal} fontSize={20} fontFamily="var(--vox-display)">รูที่ด้านข้าง</text>
        <text x={412} y={80} fill={T.teal} fontSize={18} fontFamily="var(--vox-body)">อากาศผ่านได้</text>
      </g>
      <g opacity={w}>
        <line x1={120} y1={86} x2={400} y2={86} stroke={T.red} strokeWidth={4} />
        <line x1={120} y1={148} x2={400} y2={148} stroke={T.red} strokeWidth={4} />
        <text x={412} y={148} fill={T.red} fontSize={19} fontFamily="var(--vox-body)">รูบนฝาและก้นกล่อง</text>
        <text x={412} y={174} fill={T.red} fontSize={19} fontFamily="var(--vox-body)">ถูกกล่องอื่นทับปิด</text>
      </g>
      <text x={0} y={216} fill={T.inkSoft} fontSize={18} opacity={k} fontFamily="var(--vox-body)">กล่องถูกวางซ้อนกันเสมอ</text>
    </svg>
  );
};

const SummaryCard: React.FC<{ ats: number[] }> = ({ ats }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const rows: [string, string, string][] = [
    ['ศัตรูตัวจริง', 'แรงสั่นที่ทำให้ผลถูกันเป็นชั่วโมง และความร้อนที่ผลไม้สร้างเองหลังปิดกล่อง', T.red],
    ['ทางแก้', 'ทำให้ขยับไม่ได้ · เอาความร้อนจากแปลงออกก่อนบรรจุ · ให้อากาศไหลผ่านด้านข้าง', T.teal],
    ['เริ่มยังไง', 'กล่องหน้าถัดไปที่จะส่ง แพ็กเสร็จแล้วเขย่าฟังก่อนปิดเทป', T.yellow],
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

const EndFade: React.FC<{ at: number; dur: number }> = ({ at, dur }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const k = interpolate(frame, [at, at + dur], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ background: T.paper, opacity: k, pointerEvents: 'none' }} />;
};

// =============================================================================
export default function Vox17Packing() {
  return (
    <AbsoluteFill style={{ background: BLUEPRINT.paper }}>
      <CollageBoard cam={CAM} theme="blueprint" fontBody={FONT_TH} fontDisplay={FONT_TH_DISPLAY} tracking="0.6px">
        <Backdrop
          end={C.tail}
          shots={[
            { at: 0, src: A('p-doorstep-parcel.png'), pos: '50% 55%', dim: 0.85, zoom: 0.06, pan: [-10, 0] },
            { at: C.s03_where, src: A('p-market-crates.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [10, 0] },

            { at: C.s05_forces, src: A('p-pickup-load.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [0, 8] },
            { at: C.s10_why, src: A('p-road-blur.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [8, 0] },
            { at: C.s13_reso, src: A('p-loading-dock.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [-8, 0] },

            { at: C.s16_test, src: A('p-plastic-crate.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [10, 0] },
            { at: C.s20_move, src: A('p-corrugated-stack.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [0, 6] },

            { at: C.s23_turn, src: A('p-sealed-box-sun.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [-10, 0] },
            { at: C.s26_q10, src: A('p-thermometer-shade.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [8, 0] },

            { at: C.s30_when, src: A('p-orchard-morning.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [0, 8] },
            { at: C.s33_pre, src: A('p-airflow-shed.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [10, 0] },

            { at: C.s36_box, src: A('p-shade-rack.png'), pos: '50% 50%', dim: 0.87, zoom: 0.05, pan: [-8, 0] },
            { at: C.s40_layer, src: A('p-mango-crate.png'), pos: '50% 50%', dim: 0.87, zoom: 0.05, pan: [0, 6] },
            { at: C.s45_air, src: A('p-vent-holes.png'), pos: '50% 50%', dim: 0.87, zoom: 0.05, pan: [8, 0] },

            { at: C.s51_check, src: A('p-tape-gun.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [-8, 0] },
            { at: C.s53_sum, src: A('p-scale-weigh.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [0, 6] },
          ]}
        />

        {/* 1 — HOOK. The customer who never says why. */}
        <Chapter from={0} to={C.s05_forces}>
          <Layer x={MARGIN_L + 330} y={420} w={800} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s02_silent, 0)} dur={24} dy={42}>
              <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 58, lineHeight: 1.26, fontWeight: 700, color: BLUEPRINT.ink, letterSpacing: '0.6px' }}>
                ลูกค้าส่วนใหญ่ไม่บ่นครับ
                <br />
                <span style={{ background: BLUEPRINT.yellow, color: BLUEPRINT.paper, padding: '2px 14px', borderRadius: 6 }}>เขาแค่ไม่สั่งอีก</span>
              </div>
            </Rise>
          </Layer>
          <Figure at={R(C.s03_where, 0)} x={1330} y={760} w={640}>
            <div style={{ fontFamily: FONT_TH, fontSize: 24, color: BLUEPRINT.ink, lineHeight: 1.5 }}>
              จุดที่เสียลูกค้าไปมักไม่ได้อยู่ที่ราคา หรือคุณภาพของที่เราปลูก
              <br /><b style={{ color: BLUEPRINT.yellow }}>แต่อยู่ในช่วงระหว่างสวนกับมือลูกค้า</b>
            </div>
          </Figure>
        </Chapter>

        {/* 2 — THREE FORCES, and the one nobody designs for */}
        <Chapter from={C.s05_forces} to={C.s10_why}>
          <Head at={0} kicker="กล่องหนึ่งใบเจอแรงสามอย่าง" head="ไม่ใช่อย่างเดียว" y={300} w={700} />
          <Figure at={R(C.s06_press, C.s05_forces)} x={1250} y={580} w={760}>
            <ThreeForces
              ats={[C.s06_press, C.s07_drop, C.s08_vibe].map((f) => R(f, C.s05_forces))}
              missAt={R(C.s09_gap, C.s05_forces)} />
          </Figure>
          <Prop src={A('o-box-open.png')} x={350} y={830} w={300} at={R(C.s06_press, C.s05_forces)} rot={-2} />
        </Chapter>

        {/* 3 — VIBRATION IS THE REAL ONE */}
        <Chapter from={C.s10_why} to={C.s16_test}>
          <Head at={0} kicker="ทำไมแรงสั่นถึงร้ายที่สุด" head="เพราะมันไม่หยุด" y={300} accent={BLUEPRINT.red} w={700} />
          <Layer x={1230} y={600} w={740} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s11_time, C.s10_why)} dy={26}>
              <Card w={740} pad={24}>
                <VibeRub at={R(C.s11_time, C.s10_why)} resoAt={R(C.s13_reso, C.s10_why)} />
              </Card>
            </Rise>
          </Layer>
          <Figure at={R(C.s15_amp, C.s10_why)} x={1230} y={935} w={740}>
            <div style={{ fontFamily: FONT_TH, fontSize: 22, color: BLUEPRINT.ink, lineHeight: 1.5 }}>
              ถ้าความถี่ที่รถสั่นตรงกับความถี่ธรรมชาติของกองผลไม้
              <b style={{ color: BLUEPRINT.yellow }}> ความเร่งที่ผลไม้ได้รับจะพุ่งขึ้นกว่าที่รถสั่นจริง</b>
            </div>
          </Figure>
        </Chapter>

        {/* 4 — TIGHT BEATS SOFT. The counter-intuitive test result. */}
        <Chapter from={C.s16_test} to={C.s23_turn}>
          <Head at={0} kicker="ผลทดสอบที่สวนความรู้สึก" head="แน่น ชนะ นุ่ม" y={300} w={700} />
          <Layer x={1250} y={560} w={680} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s17_result, C.s16_test)} dy={26}>
              <Card w={680} pad={24}>
                <TightVsLoose at={R(C.s17_result, C.s16_test)} bestAt={R(C.s18_best, C.s16_test)} />
              </Card>
            </Rise>
          </Layer>
          <Layer x={MARGIN_L + 310} y={640} w={620} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s21_rule, C.s16_test)} dy={30}>
              <div style={{
                fontFamily: FONT_TH_DISPLAY, fontSize: 30, fontWeight: 700, color: BLUEPRINT.ink, lineHeight: 1.45,
                borderLeft: `5px solid ${BLUEPRINT.teal}`, paddingLeft: 20,
              }}>
                เป้าหมายไม่ใช่ทำให้รอบตัวผลไม้นุ่ม
                <br />แต่คือทำให้ผลไม้ขยับไม่ได้เลย
              </div>
            </Rise>
          </Layer>
          <Figure at={R(C.s22_caveat, C.s16_test)} x={1250} y={880} w={680}>
            <div style={{ fontFamily: FONT_TH, fontSize: 21, color: BLUEPRINT.red, lineHeight: 1.45 }}>
              ⚠ งานทดสอบพวกนี้ส่วนใหญ่ทำกับแอปเปิล สาลี่ พลับ — กลไกใช้ได้ทั่วไป
              แต่ความทนของผลไม้แต่ละชนิดไม่เท่ากัน
            </div>
          </Figure>
        </Chapter>

        {/* 5 — THE HEAT THE FRUIT MAKES ITSELF */}
        <Chapter from={C.s23_turn} to={C.s30_when}>
          <Head at={0} kicker="ศัตรูที่มองไม่เห็น" head="ผลไม้ยังหายใจอยู่" sub="และเราเป็นคนขังมันไว้ในกล่องเอง" y={300} w={720} />
          <Layer x={1240} y={580} w={700} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s25_heat, C.s23_turn)} dy={26}>
              <Card w={700} pad={24}>
                <HeatLoop at={R(C.s25_heat, C.s23_turn)} loopAt={R(C.s29_loop, C.s23_turn)} />
              </Card>
            </Rise>
          </Layer>
          <Figure at={R(C.s28_life, C.s23_turn)} x={1240} y={900} w={700}>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 27, fontWeight: 700, color: BLUEPRINT.red, lineHeight: 1.4 }}>
              อายุการเก็บสั้นลง 50–60%
            </div>
            <div style={{ fontFamily: FONT_TH, fontSize: 22, color: BLUEPRINT.ink, lineHeight: 1.5, marginTop: 8 }}>
              ต่อการเพิ่มอุณหภูมิทุก 10 องศาเซลเซียส
            </div>
          </Figure>
          <Prop src={A('o-thermometer.png')} x={340} y={840} w={230} at={R(C.s26_q10, C.s23_turn)} rot={1.5} />
        </Chapter>

        {/* 6 — GET THE FIELD HEAT OUT. Not "make it as cold as possible". */}
        <Chapter from={C.s30_when} to={C.s36_box}>
          <Head at={0} kicker="เก็บตอนไหนสำคัญ" head="เอาความร้อนจากแปลงออกก่อน" y={250} w={800} />
          <PhotoCard at={R(C.s31_afternoon, C.s30_when)} src={A('p-sealed-box-sun.png')}
            x={640} y={650} w={540} rot={-1.4}
            caption="เก็บตอนบ่ายแล้วปิดกล่องทันที"
            note="ส่งเตาอบเล็ก ๆ ที่ผลไม้เป็นทั้งเชื้อเพลิงและอาหาร" />
          <PhotoCard at={R(C.s33_pre, C.s30_when)} src={A('p-shade-rack.png')}
            x={1290} y={650} w={540} rot={1.1}
            caption="ผึ่งในที่ร่มที่อากาศถ่ายเทก่อนบรรจุ"
            note="เก็บตอนเช้ามืด ให้ผลคายความร้อนออกก่อน" />
          <Figure at={R(C.s35_chill, C.s30_when)} x={965} y={975} w={1120}>
            <div style={{ fontFamily: FONT_TH, fontSize: 22, color: BLUEPRINT.red, lineHeight: 1.5 }}>
              ⚠ <b>ไม่ใช่ทำให้เย็นที่สุด</b> — กล้วยกับมะม่วงเจออุณหภูมิต่ำเกินแล้วผิวคล้ำและสุกไม่สม่ำเสมอ
            </div>
          </Figure>
        </Chapter>

        {/* 7 — HANDS ON: the box and the materials. This is what PhotoCard exists for. */}
        <Chapter from={C.s36_box} to={C.s40_layer}>
          <Head at={0} kicker="ลงมือ ขั้นที่ 1" head="กล่องและวัสดุ" y={290} w={620} />
          <PhotoCard at={R(C.s37_corr, C.s36_box)} src={A('p-corrugated-stack.png')}
            x={860} y={620} w={560} rot={-1.6}
            caption="กล่องลูกฟูกที่แข็งพอรับน้ำหนักกล่องที่วางทับ"
            note="เลือกขนาดพอดีกับของ ไม่ใช่เผื่อไว้เยอะ" />
          <PhotoCard at={R(C.s39_liner, C.s36_box)} src={A('p-foam-net.png')}
            x={1500} y={620} w={560} rot={1.3}
            caption="วัสดุกันกระแทกใช้อะไรก็ได้ที่หาได้"
            note="กระดาษยับ ฟองน้ำ ตาข่ายโฟม — ทำงานเหมือนกันหมด" />
          <Layer x={MARGIN_L + 320} y={930} w={640} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s38_size, C.s36_box)} dy={30}>
              <div style={{
                fontFamily: FONT_TH_DISPLAY, fontSize: 27, fontWeight: 700, color: BLUEPRINT.ink, lineHeight: 1.45,
                borderLeft: `5px solid ${BLUEPRINT.red}`, paddingLeft: 20,
              }}>
                กล่องที่ใหญ่เกิน คือกล่องที่เหลือที่ว่างให้ของขยับ
              </div>
            </Rise>
          </Layer>
        </Chapter>

        {/* 8 — HANDS ON: layering until nothing can move */}
        <Chapter from={C.s40_layer} to={C.s45_air}>
          <Head at={0} kicker="ลงมือ ขั้นที่ 2" head="จัดชั้นจนขยับไม่ได้" y={290} w={620} />
          <PhotoCard at={R(C.s41_bottom, C.s40_layer)} src={A('p-mango-crate.png')}
            x={640} y={640} w={540} rot={-1.2}
            caption="เรียงชั้นแรก ไม่วางทับกันมั่ว"
            note="ปูวัสดุกันกระแทกที่ก้นกล่องก่อนหนึ่งชั้น" />
          <PhotoCard at={R(C.s43_fill, C.s40_layer)} src={A('p-paper-cushion.png')}
            x={1290} y={640} w={540} rot={1.4}
            caption="ทุกช่องว่างต้องถูกอัดจนเต็ม"
            note="มุมกล่องกับด้านบน — ขั้นที่คนข้ามบ่อยที่สุด" />
          <Figure at={R(C.s44_top, C.s40_layer)} x={965} y={965} w={1120}>
            <div style={{ fontFamily: FONT_TH, fontSize: 23, color: BLUEPRINT.ink, lineHeight: 1.5 }}>
              ก่อนปิดฝา ต้องรู้สึกว่า<b style={{ color: BLUEPRINT.teal }}>กดฝาลงต้องออกแรงนิดหนึ่ง</b> ไม่ใช่ปิดได้สบาย ๆ
            </div>
          </Figure>
        </Chapter>

        {/* 9 — HANDS ON: air and cold, which fight the tightness rule */}
        <Chapter from={C.s45_air} to={C.s51_check}>
          <Head at={0} kicker="ลงมือ ขั้นที่ 3" head="อากาศ และความเย็น" y={290} w={620} />
          <Layer x={1420} y={520} w={660} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s46_vent, C.s45_air)} dy={26}>
              <Card w={660} pad={24}>
                <VentPlacement at={R(C.s46_vent, C.s45_air)} whyAt={R(C.s47_why, C.s45_air)} />
              </Card>
            </Rise>
          </Layer>
          <PhotoCard at={R(C.s48_gel, C.s45_air)} src={A('p-ice-gel.png')}
            x={560} y={730} w={540} rot={1.2}
            caption="ห่อเจลอีกชั้นเสมอ วางไว้ด้านบนของกอง"
            note="ห้ามให้สัมผัสผลโดยตรง — จุดสัมผัสจะเย็นเกินจนเป็นแผล" />
          <Figure at={R(C.s49_gelwhy, C.s45_air)} x={1420} y={880} w={660}>
            <div style={{ fontFamily: FONT_TH, fontSize: 22, color: BLUEPRINT.red, lineHeight: 1.5 }}>
              และน้ำที่ควบแน่นเป็นหยดในกล่อง คือจุดเริ่มของเชื้อรา
            </div>
          </Figure>
        </Chapter>

        {/* 10 — THE CHECK, and the summary */}
        <Chapter from={C.s51_check} to={C.tail} last>
          <Head at={0} kicker="ก่อนปิดเทป" head="เขย่าฟังก่อนทุกครั้ง" y={280} accent={BLUEPRINT.teal} w={700} />
          <Figure at={R(C.s52_shake, C.s51_check)} x={1280} y={520} w={720}>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 28, fontWeight: 700, color: BLUEPRINT.teal, lineHeight: 1.4 }}>
              ยกกล่องขึ้นเขย่าเบา ๆ ข้างหู
            </div>
            <div style={{ fontFamily: FONT_TH, fontSize: 23, color: BLUEPRINT.ink, lineHeight: 1.5, marginTop: 10 }}>
              ถ้าได้ยินเสียงอะไรขยับข้างใน แปลว่ายังแพ็กไม่เสร็จ กลับไปอัดช่องว่างเพิ่ม
            </div>
          </Figure>
          <Figure at={R(C.s53_sum, C.s51_check)} x={1280} y={840} w={720}>
            <SummaryCard ats={[C.s54_mech, C.s55_fix, C.s56_start].map((f) => R(f, C.s51_check))} />
          </Figure>
          <Prop src={A('o-tape-roll.png')} x={350} y={800} w={230} at={R(C.s52_shake, C.s51_check)} rot={-1.5} />
        </Chapter>

        <Grain opacity={0.04} />
        <EndFade at={C.tail - 44} dur={40} />
      </CollageBoard>
    </AbsoluteFill>
  );
}
