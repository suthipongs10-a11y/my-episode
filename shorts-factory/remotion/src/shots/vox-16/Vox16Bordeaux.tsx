import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { BLUEPRINT, CollageBoard, EASE_OUT, Grain, Layer, useTheme } from '../../lib/collage';
import { FONT_TH, FONT_TH_DISPLAY } from '../../fonts';

// =============================================================================
// vox-16 — บอร์โดมิกซ์เจอร์ · เกษตรที่คนไทยควรรู้ · 1920x1080
//
// A HISTORY, AND THEREFORE A TEMPTATION. `paper` is the skin that means "old", and this film
// is about an 1882 accident, so the pun is right there. It is not taken: vox-8, vox-11 and
// vox-14 are all `blueprint`, and a channel that changes its material for one episode reads as
// a different channel, not as a clever one. Consistency of identity beats a one-off gag.
//
// WHAT AGRI RULE 9 FORBIDS HERE. The subject is a plant disease, so the obvious imagery is a
// diseased leaf — and that is exactly the image the rule bans, because a viewer holds it up
// against a real leaf in a real orchard and diagnoses from it. There is no generated photograph
// of a symptom anywhere in this film. Every plate is a healthy orchard, a landscape, a material
// or a tool; every claim about what a pathogen DOES is drawn in code as a diagram, where it is
// obviously a diagram.
//
// The six drawn figures are the argument:
//   SporeGerm    — copper stops germination, it does not cure an infection
//   LimeThree    — what insolubility buys, which is the mechanism nobody explains
//   ProtectClock — spray before vs spray after, the most common misuse
//   MultiSite    — why 140 years produced no resistance
//   CopperAccum  — the bill: accumulation against the earthworm-avoidance band
//   StrainBars   — the hypothesis this film had to abandon (script.md, trap 3)
//
// Motion is vox-12's, unchanged (brand.md §5).
// =============================================================================

export const compositionConfig = {
  id: 'Vox16Bordeaux',
  durationInSeconds: 466, // beats.json: VO ends 460.54s (measured)
  fps: 30,
  width: 1920,
  height: 1080,
};

const W = 1920;
const H = 1080;
const MARGIN_L = 170;
const A = (f: string) => staticFile(`projects/vox-16-bordeaux/layers/${f}`);

// ---- GENERATED CUES — rebuilt from beats.json by scripts/gen-cues.mjs. Do not hand-edit.
// Cue name === segment id in beats.json, so there is no map to keep in sync.
// All 61 windows are measured from the real audio.
const C = {
  s01_list: 15,
  s02_name: 266,
  s03_age: 365,
  s04_twist: 590,
  s05_theft: 749,
  s06_promise: 908,

  s07_america: 1270,
  s08_name: 1474,
  s09_bite: 1643,
  s10_stake: 1937,
  s11_nothing: 2145,

  s12_medoc: 2295,
  s13_ugly: 2554,
  s14_why: 2812,
  s15_millardet: 3010,
  s16_row: 3261,
  s17_link: 3472,
  s18_publish: 3591,

  s19_what: 3874,
  s20_copper: 4095,
  s21_enzyme: 4275,
  s22_before: 4595,

  s23_q: 4810,
  s24_none: 4909,
  s25_role: 5012,
  s26_three: 5234,
  s27_burn: 5342,
  s28_stick: 5601,
  s29_slow: 5804,
  s30_ratio: 5966,

  s31_turn: 6323,
  s32_protect: 6435,
  s33_mean: 6547,
  s34_nosystemic: 6854,
  s35_newleaf: 7024,

  s36_why: 7239,
  s37_multisite: 7383,
  s38_modern: 7655,
  s39_organic: 7969,

  s40_but: 8206,
  s41_element: 8372,
  s42_forever: 8527,
  s43_eu: 8741,
  s44_worm: 9027,
  s45_years: 9346,
  s46_zero: 9469,
  s47_scope: 9719,

  s48_home: 10084,
  s49_durian: 10154,
  s50_q14: 10462,
  s51_iwas: 10771,
  s52_strain: 11009,
  s53_answer: 11380,
  s54_real: 11523,
  s55_caveat: 11823,

  s56_sum: 12154,
  s57_mech: 12239,
  s58_use: 12531,
  s59_cost: 12832,
  s60_start: 13192,
  s61_close: 13508,
  tail: 13816,
} as const;
// ---- END GENERATED CUES

/** chapter-relative frame for an absolute cue */
const R = (abs: number, from: number) => Math.max(0, abs - from);

const CAM = [
  { f: 0, x: 960, y: 540, z: 1 },
  { f: 7000, x: 984, y: 532, z: 1.011 },
  { f: 14000, x: 940, y: 548, z: 1.004 },
];
const XFADE = 26; // plate dissolve
const XOVER = 14; // how far a chapter's content lingers past the next chapter's first cue
const XOUT = 26; // and how long its fade takes

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

/** one photograph under every frame of the film — brand.md §4a */
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
    // anchored by its LEFT edge, so a wider w never walks the column off the margin (vox-15)
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
            <div key={it} style={{
              display: 'flex', gap: 12, marginBottom: i === items.length - 1 ? 0 : 14,
              opacity: k, transform: `translateY(${(1 - k) * 12}px)`,
            }}>
              <div style={{ color: colour ?? T.teal, fontSize: 24, lineHeight: 1.45 }}>•</div>
              <div style={{ fontFamily: FONT_TH, fontSize: 24, color: T.ink, lineHeight: 1.45 }}>{it}</div>
            </div>
          );
        })}
      </>
    );
  };

// =============================================================================
// THE SIX DRAWN FIGURES. Everything a pathogen or a chemical DOES is drawn, never photographed
// — agri rule 9. A drawing cannot be mistaken for reference data the way a rendered leaf can.
// =============================================================================

/** A spore in a water droplet on a leaf: it germinates, unless the copper film is already there.
 *  The two states must differ at a glance, so the DIFFERENCE is what is animated — one tube goes
 *  through the surface and one stops dead on the film — and colour carries the verdict the way
 *  it does everywhere else in the film: red is the failure, teal is the thing working. */
const SporeGerm: React.FC<{ at: number; blocked: boolean }> = ({ at, blocked }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const k = interpolate(frame, [at, at + 22], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const SURFACE = 128;      // y of the leaf surface
  const SPORE = 74;         // y of the spore
  const cyc = (frame - at) % 190;
  // unblocked: the tube grows past the surface and stays there. blocked: it stalls on the film.
  const reach = blocked ? 30 : 74;
  const g = interpolate(cyc, [0, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tip = SPORE + 14 + g * reach;
  const arrived = g > 0.98;
  const accent = T.red; // the spore is the same organism in both cards — only the outcome differs
  return (
    <svg width={640} height={186} viewBox="0 0 640 186">
      {/* leaf: a thick band with a lit top edge, so it reads as a surface and not as a bar */}
      <rect x={16} y={SURFACE} width={608} height={44} rx={6} fill={T.land} opacity={k} />
      <line x1={16} y1={SURFACE} x2={624} y2={SURFACE} stroke={T.landHi} strokeWidth={3} opacity={k} />
      <text x={28} y={SURFACE + 30} fill={T.inkSoft} fontSize={17} opacity={k} fontFamily="var(--vox-body)">เนื้อใบ</text>

      {/* the water droplet the spore needs in order to germinate at all */}
      <ellipse cx={250} cy={SURFACE - 20} rx={92} ry={30} fill={T.landHi} opacity={k * 0.5} />
      <text x={250} y={SPORE - 32} textAnchor="middle" fill={T.inkSoft} fontSize={16} opacity={k} fontFamily="var(--vox-body)">หยดน้ำบนใบ</text>

      {/* the copper film sits ON the surface, which is the whole point of where it stops the tube */}
      {blocked ? (
        <>
          <path d={`M 16 ${SURFACE - 5} Q 320 ${SURFACE - 12} 624 ${SURFACE - 5}`} fill="none" stroke={T.teal} strokeWidth={8} opacity={k} strokeLinecap="round" />
          <text x={624} y={SURFACE - 22} textAnchor="end" fill={T.teal} fontSize={17} opacity={k} fontFamily="var(--vox-body)">ฟิล์มทองแดง</text>
        </>
      ) : null}

      {/* spore + germ tube — the one thing that differs between the two cards */}
      <g opacity={k}>
        <path d={`M 250 ${SPORE + 14} L 250 ${tip}`} stroke={accent} strokeWidth={6} strokeLinecap="round" />
        <circle cx={250} cy={SPORE} r={15} fill={accent} />
        {arrived ? (
          blocked
            ? <>
                <line x1={230} y1={SURFACE - 5} x2={270} y2={SURFACE - 5} stroke={T.teal} strokeWidth={6} strokeLinecap="round" />
                <text x={300} y={SURFACE - 28} fill={T.teal} fontSize={19} fontFamily="var(--vox-display)">งอกไม่ผ่าน</text>
              </>
            : <text x={300} y={SURFACE + 46} fill={T.red} fontSize={19} fontFamily="var(--vox-display)">ทะลุเข้าเนื้อใบ</text>
        ) : null}
      </g>
    </svg>
  );
};

/** What insolubility buys — three consequences of one chemical fact. */
const LimeThree: React.FC<{ ats: number[] }> = ({ ats }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const rows: [string, string, string][] = [
    ['ไม่ไหม้ใบ', 'ทองแดงที่ละลายอิสระกัดใบ · เมื่อไม่ละลาย ใบก็ปลอดภัย', T.teal],
    ['เกาะใบทนฝน', 'อนุภาคจับผิวใบเป็นฟิล์ม ฝนชะออกยากกว่าคอปเปอร์สำเร็จรูป', T.yellow],
    ['ปล่อยทีละน้อย', 'ทองแดงค่อย ๆ ออกมา ยาจึงอยู่ได้นานหลังฉีด', T.inkSoft],
  ];
  return (
    <>
      <div style={{ fontFamily: FONT_TH, fontSize: 21, color: T.inkSoft, marginBottom: 16 }}>
        ปูนขาวทำให้ทองแดง <b style={{ color: T.ink }}>ไม่ละลายน้ำ</b> — ผลที่ตามมาสามอย่าง
      </div>
      {rows.map(([k, v, c], i) => {
        const on = interpolate(frame, [ats[i], ats[i] + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={k} style={{ opacity: on, transform: `translateY(${(1 - on) * 14}px)`, display: 'flex', gap: 16, marginBottom: i === 2 ? 0 : 18 }}>
            <div style={{ width: 34, height: 34, borderRadius: 17, background: c, color: T.paper, flexShrink: 0,
              fontFamily: FONT_TH_DISPLAY, fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
            <div>
              <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 26, fontWeight: 700, color: c }}>{k}</div>
              <div style={{ fontFamily: FONT_TH, fontSize: 22, color: T.ink, lineHeight: 1.45, marginTop: 4 }}>{v}</div>
            </div>
          </div>
        );
      })}
    </>
  );
};

/** Spray before the spore lands, or after. Same chemical, opposite result. */
const ProtectClock: React.FC<{ at: number; lateAt: number }> = ({ at, lateAt }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const k = interpolate(frame, [at, at + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const l = interpolate(frame, [lateAt, lateAt + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const Row = ({ y, label, sprayX, ok, o }: { y: number; label: string; sprayX: number; ok: boolean; o: number }) => (
    <g opacity={o}>
      <text x={0} y={y - 26} fill={ok ? T.teal : T.red} fontSize={20} fontFamily="var(--vox-display)">{label}</text>
      <line x1={0} y1={y} x2={600} y2={y} stroke={T.landHi} strokeWidth={2} />
      {/* spore arrival is fixed at the middle of both timelines */}
      <circle cx={300} cy={y} r={9} fill={T.yellow} />
      <text x={300} y={y + 30} textAnchor="middle" fill={T.inkSoft} fontSize={15} fontFamily="var(--vox-body)">สปอร์มาถึง</text>
      {/* the spray moves; that is the only difference between the rows */}
      <rect x={sprayX - 5} y={y - 24} width={10} height={48} rx={4} fill={ok ? T.teal : T.red} />
      <text x={sprayX} y={y - 34} textAnchor="middle" fill={ok ? T.teal : T.red} fontSize={15} fontFamily="var(--vox-body)">ฉีด</text>
      <text x={620} y={y + 6} fill={ok ? T.teal : T.red} fontSize={19} fontFamily="var(--vox-display)">{ok ? 'กันได้' : 'สาย'}</text>
    </g>
  );
  return (
    <svg width={760} height={210} viewBox="0 0 760 210">
      <Row y={54} label="ฉีดก่อนสปอร์มาถึง" sprayX={120} ok o={k} />
      <Row y={158} label="ฉีดหลังใบเป็นโรคแล้ว" sprayX={470} ok={false} o={l} />
    </svg>
  );
};

/** Why nothing has evolved around it: one mutation is not enough when there are many targets. */
const MultiSite: React.FC<{ at: number; singleAt: number }> = ({ at, singleAt }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const k = interpolate(frame, [at, at + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const s = interpolate(frame, [singleAt, singleAt + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dots = [0, 1, 2, 3, 4, 5];
  return (
    <svg width={720} height={240} viewBox="0 0 720 240">
      {/* multi-site: six targets, all hit */}
      <g opacity={k}>
        <text x={0} y={20} fill={T.teal} fontSize={20} fontFamily="var(--vox-display)">ทองแดง — โจมตีหลายจุด</text>
        {dots.map((i) => (
          <g key={i}>
            <circle cx={40 + i * 56} cy={64} r={15} fill={T.teal} />
            <path d={`M ${29 + i * 56} 53 L ${51 + i * 56} 75 M ${51 + i * 56} 53 L ${29 + i * 56} 75`} stroke={T.paper} strokeWidth={3} />
          </g>
        ))}
        <text x={378} y={70} fill={T.inkSoft} fontSize={19} fontFamily="var(--vox-body)">ต้องกลายพันธุ์ทุกจุดพร้อมกัน จึงแทบไม่เกิด</text>
      </g>
      {/* single-site: one target, one mutation, escape */}
      <g opacity={s}>
        <text x={0} y={150} fill={T.red} fontSize={20} fontFamily="var(--vox-display)">ยาสมัยใหม่ — โจมตีจุดเดียว</text>
        <circle cx={40} cy={194} r={15} fill={T.red} />
        <path d="M 29 183 L 51 205 M 51 183 L 29 205" stroke={T.paper} strokeWidth={3} />
        {dots.slice(1).map((i) => <circle key={i} cx={40 + i * 56} cy={194} r={15} fill="none" stroke={T.landHi} strokeWidth={2} />)}
        <text x={378} y={200} fill={T.red} fontSize={19} fontFamily="var(--vox-body)">กลายพันธุ์จุดเดียวก็หนีรอด</text>
      </g>
    </svg>
  );
};

/** The bill. Copper is an element: the bars only ever go up. */
const CopperAccum: React.FC<{ at: number; bandAt: number; zeroAt: number }> = ({ at, bandAt, zeroAt }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const YEARS = 10;
  const PER_YEAR = 11; // mg/kg — illustrative slope, the LABELLED numbers are the sourced ones
  const MAX = 300;
  const h = (v: number) => (v / MAX) * 190;
  const band = interpolate(frame, [bandAt, bandAt + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const zero = interpolate(frame, [zeroAt, zeroAt + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <svg width={700} height={280} viewBox="0 0 700 280">
      {/* the 25–50 mg/kg band earthworms avoid */}
      <g opacity={band}>
        <rect x={40} y={230 - h(50)} width={520} height={h(50) - h(25)} fill={T.red} opacity={0.18} />
        <text x={566} y={230 - h(38) + 5} fill={T.red} fontSize={16} fontFamily="var(--vox-body)">25–50 ไส้เดือนหลบ</text>
      </g>
      {/* 270 mg/kg — the orchard with no earthworms at all */}
      <g opacity={zero}>
        <line x1={40} y1={230 - h(270)} x2={560} y2={230 - h(270)} stroke={T.red} strokeWidth={2} strokeDasharray="6 5" />
        <text x={566} y={230 - h(270) + 5} fill={T.red} fontSize={16} fontFamily="var(--vox-body)">270 · ไม่พบเลย</text>
      </g>
      {Array.from({ length: YEARS }, (_, i) => {
        const v = (i + 1) * PER_YEAR;
        const a = at + i * 9;
        const g = interpolate(frame, [a, a + 16], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const over = v >= 25;
        return (
          <rect key={i} x={46 + i * 52} y={230 - h(v) * g} width={38} height={h(v) * g} rx={3}
            fill={over ? T.red : T.teal} opacity={over ? 0.85 : 0.9} />
        );
      })}
      <line x1={40} y1={230} x2={560} y2={230} stroke={T.landHi} strokeWidth={2} />
      <text x={40} y={258} fill={T.inkSoft} fontSize={16} fontFamily="var(--vox-body)">ปีที่ 1</text>
      <text x={520} y={258} fill={T.inkSoft} fontSize={16} fontFamily="var(--vox-body)">ปีที่ 10</text>
      <text x={40} y={20} fill={T.inkSoft} fontSize={16} fontFamily="var(--vox-body)">ทองแดงสะสมในดิน (มก./กก.)</text>
    </svg>
  );
};

/** The hypothesis this film abandoned. Copper is a range; the systemics are a single number. */
const StrainBars: React.FC<{ ats: number[] }> = ({ ats }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const rows: { label: string; lo: number; hi: number; colour: string; note: string }[] = [
    { label: 'คอปเปอร์ออกซีคลอไรด์', lo: 0, hi: 65, colour: T.yellow, note: 'ขึ้นกับสายพันธุ์' },
    { label: 'คาร์เบนดาซิม', lo: 100, hi: 100, colour: T.red, note: 'ทุกครั้ง' },
    { label: 'เฮกซาโคนาโซล', lo: 100, hi: 100, colour: T.red, note: 'ทุกครั้ง' },
  ];
  return (
    <>
      <div style={{ fontFamily: FONT_TH, fontSize: 21, color: T.inkSoft, marginBottom: 14 }}>
        การยับยั้งไตรโคเดอร์มา <b style={{ color: T.ink }}>ในจานเพาะเชื้อ</b> ไม่ใช่ในดินจริง
      </div>
      <svg width={660} height={190} viewBox="0 0 660 190">
        {rows.map((r, i) => {
          const y = 34 + i * 52;
          const k = interpolate(frame, [ats[i], ats[i] + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const x = (p: number) => 250 + (p / 100) * 300;
          return (
            <g key={r.label} opacity={k}>
              <text x={0} y={y + 6} fill={T.ink} fontSize={20} fontFamily="var(--vox-body)">{r.label}</text>
              <line x1={250} y1={y} x2={550} y2={y} stroke={T.landHi} strokeWidth={2} />
              {r.lo === r.hi
                ? <circle cx={x(r.hi) * 1} cy={y} r={9} fill={r.colour} />
                : <>
                    <rect x={x(r.lo)} y={y - 9} width={x(r.hi) - x(r.lo)} height={18} rx={9} fill={r.colour} opacity={0.85} />
                    <text x={x(r.lo)} y={y - 17} fill={r.colour} fontSize={15} fontFamily="var(--vox-body)">0%</text>
                    <text x={x(r.hi)} y={y - 17} textAnchor="end" fill={r.colour} fontSize={15} fontFamily="var(--vox-body)">65%</text>
                  </>}
              <text x={560} y={y + 6} fill={r.colour} fontSize={18} fontFamily="var(--vox-display)">{r.note}</text>
            </g>
          );
        })}
        <text x={250} y={182} fill={T.inkSoft} fontSize={15} fontFamily="var(--vox-body)">0%</text>
        <text x={550} y={182} textAnchor="end" fill={T.inkSoft} fontSize={15} fontFamily="var(--vox-body)">100% = ตายเรียบ</text>
      </svg>
    </>
  );
};

/** Problem / mechanism / fix / where to start — agri rule 5. */
const SummaryCard: React.FC<{ ats: number[] }> = ({ ats }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const rows: [string, string, string][] = [
    ['กลไก', 'ทองแดงฆ่าสปอร์ก่อนงอก · ปูนขาวไม่ได้ฆ่าอะไร แต่ทำให้ทองแดงไม่ละลาย จึงไม่ไหม้ใบและทนฝน', T.inkSoft],
    ['ใช้ให้ถูก', 'เป็นยาป้องกัน ไม่ใช่ยารักษา · ไม่ดูดซึม ใบที่แตกใหม่หลังฉีดไม่มียาเคลือบ', T.yellow],
    ['ราคาที่จ่าย', 'ทองแดงเป็นธาตุ ไม่สลาย สะสมทุกปี — การหมุนสลับวิธีจึงเป็นเรื่องของดิน ไม่ใช่แค่การดื้อยา', T.red],
    ['เริ่มยังไง', 'รู้ว่าสวนตัวเองฉีดทองแดงมากี่ปี แล้วขออัตราสำหรับพืชของคุณจากกรมวิชาการเกษตร', T.teal],
  ];
  return (
    <>
      {rows.map(([k, v, c], i) => {
        const on = interpolate(frame, [ats[i], ats[i] + 20], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={k} style={{ opacity: on, transform: `translateY(${(1 - on) * 16}px)`, marginBottom: i === 3 ? 0 : 20 }}>
            <div style={{ fontFamily: FONT_TH, fontSize: 20, color: c, marginBottom: 5 }}>{k}</div>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 25, fontWeight: 700, color: T.ink, lineHeight: 1.4 }}>{v}</div>
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
export default function Vox16Bordeaux() {
  return (
    <AbsoluteFill style={{ background: BLUEPRINT.paper }}>
      <CollageBoard cam={CAM} theme="blueprint" fontBody={FONT_TH} fontDisplay={FONT_TH_DISPLAY} tracking="0.6px">
        <Backdrop
          end={C.tail}
          shots={[
            { at: 0, src: A('p-durian-orchard.png'), pos: '50% 55%', dim: 0.85, zoom: 0.06, pan: [-10, 0] },
            { at: C.s04_twist, src: A('p-grape-bunch.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [10, 0] },

            { at: C.s07_america, src: A('p-vineyard-rows.png'), pos: '50% 50%', dim: 0.84, zoom: 0.06, pan: [0, 8] },
            { at: C.s10_stake, src: A('p-wine-cellar.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [8, 0] },

            { at: C.s12_medoc, src: A('p-medoc-landscape.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [-10, 0] },
            { at: C.s15_millardet, src: A('p-roadside-vines.png'), pos: '50% 50%', dim: 0.84, zoom: 0.06, pan: [10, 0] },
            { at: C.s18_publish, src: A('p-old-laboratory.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [0, 6] },

            { at: C.s19_what, src: A('p-copper-crystals.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [8, 0] },
            { at: C.s21_enzyme, src: A('p-leaf-droplet.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [-8, 0] },

            { at: C.s23_q, src: A('p-lime-powder.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [10, 0] },
            { at: C.s28_stick, src: A('p-rain-orchard.png'), pos: '50% 50%', dim: 0.85, zoom: 0.05, pan: [0, 8] },

            { at: C.s31_turn, src: A('p-sprayer-mist.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [-10, 0] },
            { at: C.s35_newleaf, src: A('p-new-shoot.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [8, 0] },

            { at: C.s36_why, src: A('p-mixing-barrel.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [0, 6] },
            { at: C.s39_organic, src: A('p-orchard-floor.png'), pos: '50% 50%', dim: 0.85, zoom: 0.05, pan: [10, 0] },

            { at: C.s40_but, src: A('p-soil-profile.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [-8, 0] },
            { at: C.s44_worm, src: A('p-earthworms-soil.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [8, 0] },
            { at: C.s47_scope, src: A('p-spray-tank.png'), pos: '50% 50%', dim: 0.85, zoom: 0.05, pan: [0, 8] },

            { at: C.s48_home, src: A('p-durian-trunk.png'), pos: '50% 50%', dim: 0.85, zoom: 0.06, pan: [10, 0] },
            { at: C.s52_strain, src: A('p-soil-hands.png'), pos: '50% 50%', dim: 0.86, zoom: 0.05, pan: [-8, 0] },

            { at: C.s56_sum, src: A('p-durian-orchard.png'), pos: '55% 50%', dim: 0.86, zoom: 0.05, pan: [0, 6] },
          ]}
        />

        {/* 1 — HOOK. The Thai list first, so the history has somewhere to land. */}
        <Chapter from={0} to={C.s07_america}>
          <Layer x={MARGIN_L + 330} y={430} w={780} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s03_age, 0)} dur={24} dy={42}>
              <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 60, lineHeight: 1.26, fontWeight: 700, color: BLUEPRINT.ink, letterSpacing: '0.6px' }}>
                ยากันเชื้อราตัวแรกของโลก
                <br />
                <span style={{ background: BLUEPRINT.yellow, color: BLUEPRINT.paper, padding: '2px 14px', borderRadius: 6 }}>เกิดจากการกันขโมย</span>
              </div>
            </Rise>
          </Layer>
          <Figure at={R(C.s05_theft, 0)} x={1330} y={700} w={640}>
            <div style={{ fontFamily: FONT_TH, fontSize: 24, color: BLUEPRINT.ink, lineHeight: 1.5 }}>
              มันถูกทาบนองุ่นเพื่อให้ <b style={{ color: BLUEPRINT.yellow }}>ดูน่าเกลียดจนไม่มีใครขโมยกิน</b>
              <br />แล้วมีคนสังเกตว่าองุ่นแถวนั้นไม่เป็นโรค
            </div>
          </Figure>
          <Prop src={A('o-grape-bunch.png')} x={340} y={840} w={280} at={R(C.s05_theft, 0)} rot={-2} />
        </Chapter>

        {/* 2 — THE CRISIS the accident walked into */}
        <Chapter from={C.s07_america} to={C.s12_medoc}>
          <Head at={0} kicker="ปลายทศวรรษ 1870" head="โรคที่ข้ามมหาสมุทรมา" sub="ราน้ำค้างองุ่น — พลาสโมพารา วิติโคลา" y={300} w={760} />
          <Figure at={R(C.s09_bite, C.s07_america)} x={1250} y={560} w={720}>
            <List at={0} title="องุ่นยุโรปไม่เคยเจอมันมาก่อน" colour={BLUEPRINT.red}
              items={['ใบเป็นจุดเหลือง ใต้ใบมีขนขาวเหมือนน้ำค้าง', 'ใบร่วง ผลไม่สุก']}
              ats={[0, 40].map((d) => R(C.s09_bite, C.s07_america) + d)} />
            <Note at={R(C.s11_nothing, C.s07_america)} colour={BLUEPRINT.yellow}>
              และตอนนั้นโลกยังไม่มียากันเชื้อราอยู่เลย เพราะยังไม่มีใครประดิษฐ์มันขึ้นมา
            </Note>
          </Figure>
          <Prop src={A('o-notebook.png')} x={360} y={800} w={260} at={R(C.s10_stake, C.s07_america)} rot={1.5} />
        </Chapter>

        {/* 3 — THE ACCIDENT */}
        <Chapter from={C.s12_medoc} to={C.s19_what}>
          <Head at={0} kicker="เมด็อก ใกล้เมืองบอร์โด" head="แถวเดียวที่ยังเขียว" y={300} w={700} />
          <Figure at={R(C.s13_ugly, C.s12_medoc)} x={1250} y={520} w={720}>
            <List at={0} colour={BLUEPRINT.teal}
              items={['ปัญหาคือคนเดินผ่านเด็ดองุ่นริมถนนกิน',
                      'ชาวไร่พ่นจุนสีผสมปูนขาว ให้องุ่นดูน่าเกลียดและขม',
                      'ปี 1882 มิลลาร์เดต์เห็นว่าทั้งไร่ใบร่วง ยกเว้นแถวติดถนน']}
              ats={[0, 45, 90].map((d) => R(C.s13_ugly, C.s12_medoc) + d)} />
            <Note at={R(C.s17_link, C.s12_medoc)} colour={BLUEPRINT.yellow}>
              แถวติดถนนคือแถวเดียวที่โดนพ่นของฟ้า ๆ นั้นไว้
            </Note>
          </Figure>
          <Figure at={R(C.s18_publish, C.s12_medoc)} x={1250} y={880} w={720}>
            <div style={{ fontFamily: FONT_TH, fontSize: 23, color: BLUEPRINT.ink, lineHeight: 1.5 }}>
              ทดลองซ้ำในไร่จริงสามปี ประกาศผลปี <b style={{ color: BLUEPRINT.yellow }}>1885</b>
              <br />ตั้งชื่อตามเมืองที่ค้นพบ — บอร์โดมิกซ์เจอร์
            </div>
          </Figure>
          <Prop src={A('o-copper-crystal.png')} x={340} y={800} w={250} at={R(C.s14_why, C.s12_medoc)} rot={-2} />
        </Chapter>

        {/* 4 — MECHANISM: it kills the spore, not the infection */}
        <Chapter from={C.s19_what} to={C.s23_q}>
          <Head at={0} kicker="มันทำงานยังไง" head="ฆ่าสปอร์ก่อนที่มันจะงอก" y={300} w={700} />
          <Layer x={1230} y={520} w={700} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s21_enzyme, C.s19_what)} dy={26}>
              <Card w={700} pad={24}>
                <SporeGerm at={R(C.s21_enzyme, C.s19_what)} blocked={false} />
                <div style={{ fontFamily: FONT_TH, fontSize: 22, color: BLUEPRINT.red, marginTop: 2 }}>
                  ไม่มียา — สปอร์งอกแล้วเข้าไปในเนื้อใบ
                </div>
              </Card>
            </Rise>
          </Layer>
          <Layer x={1230} y={860} w={700} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s22_before, C.s19_what)} dy={26}>
              <Card w={700} pad={24}>
                <SporeGerm at={R(C.s22_before, C.s19_what)} blocked />
                <div style={{ fontFamily: FONT_TH, fontSize: 22, color: BLUEPRINT.teal, marginTop: 2 }}>
                  มีฟิล์มทองแดงอยู่ก่อน — เอนไซม์เสียสภาพ สปอร์งอกไม่ได้
                </div>
              </Card>
            </Rise>
          </Layer>
          <Prop src={A('o-beaker.png')} x={330} y={790} w={230} at={R(C.s20_copper, C.s19_what)} rot={1} />
        </Chapter>

        {/* 5 — WHAT THE LIME IS FOR. The mechanism nobody explains. */}
        <Chapter from={C.s23_q} to={C.s31_turn}>
          <Head at={0} kicker="แล้วปูนขาวใส่ไปทำไม" head="ปูนขาวไม่ได้ฆ่าอะไรเลย" y={300} accent={BLUEPRINT.yellow} w={780} />
          <Figure at={R(C.s26_three, C.s23_q)} x={1250} y={580} w={740}>
            <LimeThree ats={[C.s27_burn, C.s28_stick, C.s29_slow].map((f) => R(f, C.s23_q))} />
          </Figure>
          <Figure at={R(C.s30_ratio, C.s23_q)} x={1250} y={930} w={740}>
            <div style={{ fontFamily: FONT_TH, fontSize: 23, color: BLUEPRINT.ink, lineHeight: 1.5 }}>
              สูตรคลาสสิกที่บันทึกไว้คือ <b style={{ color: BLUEPRINT.yellow }}>จุนสี 1 : ปูนขาว 1 : น้ำ 100</b> โดยน้ำหนัก
              <br /><span style={{ color: BLUEPRINT.red }}>แต่อัตราจริงของพืชแต่ละชนิดไม่เท่ากัน — ขอจากกรมวิชาการเกษตร ไม่ใช่จากคลิปนี้</span>
            </div>
          </Figure>
          <Prop src={A('o-lime-scoop.png')} x={340} y={820} w={270} at={R(C.s25_role, C.s23_q)} rot={-1.5} />
        </Chapter>

        {/* 6 — THE MISUSE. Protectant, not curative. */}
        <Chapter from={C.s31_turn} to={C.s36_why}>
          <Head at={0} kicker="ข้อที่คนใช้ผิดมากที่สุด" head="ยาป้องกัน ไม่ใช่ยารักษา" y={300} accent={BLUEPRINT.red} w={700} />
          <Layer x={1240} y={560} w={800} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s32_protect, C.s31_turn)} dy={26}>
              <Card w={800} pad={24}>
                <ProtectClock at={R(C.s32_protect, C.s31_turn)} lateAt={R(C.s33_mean, C.s31_turn)} />
              </Card>
            </Rise>
          </Layer>
          <Figure at={R(C.s35_newleaf, C.s31_turn)} x={1240} y={890} w={800}>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 27, fontWeight: 700, color: BLUEPRINT.yellow, lineHeight: 1.4 }}>
              มันไม่ดูดซึมเข้าต้น
            </div>
            <div style={{ fontFamily: FONT_TH, fontSize: 23, color: BLUEPRINT.ink, lineHeight: 1.5, marginTop: 10 }}>
              ใบที่แตกใหม่หลังวันที่ฉีด ไม่มียาเคลือบอยู่เลยสักนิดเดียว
            </div>
          </Figure>
          <Prop src={A('o-sprayer-nozzle.png')} x={350} y={820} w={280} at={R(C.s34_nosystemic, C.s31_turn)} rot={2} />
        </Chapter>

        {/* 7 — WHY 140 YEARS PRODUCED NO RESISTANCE */}
        <Chapter from={C.s36_why} to={C.s40_but}>
          <Head at={0} kicker="ยาอายุ 140 ปี" head="ทำไมเชื้อยังไม่ดื้อ" y={300} w={700} />
          <Layer x={1230} y={560} w={760} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s37_multisite, C.s36_why)} dy={26}>
              <Card w={760} pad={24}>
                <MultiSite at={R(C.s37_multisite, C.s36_why)} singleAt={R(C.s38_modern, C.s36_why)} />
              </Card>
            </Rise>
          </Layer>
          <Figure at={R(C.s39_organic, C.s36_why)} x={1230} y={900} w={760}>
            <div style={{ fontFamily: FONT_TH, fontSize: 23, color: BLUEPRINT.ink, lineHeight: 1.5 }}>
              เกษตรอินทรีย์ในยุโรปยังอนุญาตให้ใช้ทองแดง
              <br /><b style={{ color: BLUEPRINT.yellow }}>ไม่ใช่เพราะมันอ่อนโยน แต่เพราะยังไม่มีอะไรมาแทนได้จริง</b>
            </div>
          </Figure>
          <Prop src={A('o-trowel.png')} x={340} y={810} w={270} at={R(C.s38_modern, C.s36_why)} rot={-2} />
        </Chapter>

        {/* 8 — THE BILL. An element does not decay. */}
        <Chapter from={C.s40_but} to={C.s48_home}>
          <Head at={0} kicker="ราคาที่ต้องจ่าย" head="ทองแดงไม่หายไปไหน" y={300} accent={BLUEPRINT.red} w={700} />
          <Layer x={1220} y={560} w={760} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s42_forever, C.s40_but)} dy={26}>
              <Card w={760} pad={24}>
                <CopperAccum at={R(C.s42_forever, C.s40_but)}
                  bandAt={R(C.s44_worm, C.s40_but)} zeroAt={R(C.s46_zero, C.s40_but)} />
              </Card>
            </Rise>
          </Layer>
          <Figure at={R(C.s43_eu, C.s40_but)} x={1220} y={905} w={760}>
            <div style={{ fontFamily: FONT_TH, fontSize: 23, color: BLUEPRINT.ink, lineHeight: 1.5 }}>
              เพดานสหภาพยุโรป <b style={{ color: BLUEPRINT.yellow }}>4 กก./เฮกตาร์/ปี</b> เฉลี่ยตลอด 7 ปี
            </div>
            <Note at={R(C.s47_scope, C.s40_but)} colour={BLUEPRINT.red}>
              ⚠ นี่คือสิ่งที่ยุโรปตัดสินใจ สำหรับไร่องุ่นเขตหนาวที่ฉีดถี่ทั้งฤดู ไม่ใช่เกณฑ์สากล และไทยไม่มีเพดานแบบนี้
            </Note>
          </Figure>
          <Prop src={A('o-durian.png')} x={340} y={830} w={250} at={R(C.s45_years, C.s40_but)} rot={1.5} />
        </Chapter>

        {/* 9 — THAILAND, and the question the previous film created */}
        <Chapter from={C.s48_home} to={C.s56_sum}>
          <Head at={0} kicker="กลับมาที่บ้านเรา" head="แล้วไตรโคเดอร์มาที่เพิ่งขยายล่ะ" y={300} w={840} />
          <Figure at={R(C.s49_durian, C.s48_home)} x={1250} y={520} w={720}>
            <div style={{ fontFamily: FONT_TH, fontSize: 23, color: BLUEPRINT.ink, lineHeight: 1.5 }}>
              โรครากเน่าโคนเน่าในทุเรียนเกิดจาก <b style={{ color: BLUEPRINT.yellow }}>ไฟทอปธอรา</b>
              ซึ่งเป็นญาติใกล้ชิดกับราน้ำค้างองุ่น และคอปเปอร์อยู่ในรายการที่แนะนำให้ใช้
            </div>
          </Figure>
          <Figure at={R(C.s51_iwas, C.s48_home)} x={1250} y={780} w={720}>
            <StrainBars ats={[C.s52_strain, C.s54_real, C.s54_real].map((f) => R(f, C.s48_home))} />
            <Note at={R(C.s55_caveat, C.s48_home)} colour={BLUEPRINT.red}>
              ⚠ ตัวเลขจากจานเพาะเชื้อ ไม่ใช่จากดินจริง — ดินมีอินทรียวัตถุที่จับทองแดงไว้ได้
            </Note>
          </Figure>
          <Layer x={MARGIN_L + 310} y={700} w={620} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s53_answer, C.s48_home)} dy={30}>
              <div style={{
                fontFamily: FONT_TH_DISPLAY, fontSize: 28, fontWeight: 700, color: BLUEPRINT.ink, lineHeight: 1.45,
                borderLeft: `5px solid ${BLUEPRINT.yellow}`, paddingLeft: 20,
              }}>
                ทองแดงไม่แน่ ขึ้นกับสายพันธุ์
                <br />แต่คาร์เบนดาซิมกับเฮกซาโคนาโซล แน่นอน
              </div>
            </Rise>
          </Layer>
        </Chapter>

        {/* 10 — SUMMARY (agri rule 5) */}
        <Chapter from={C.s56_sum} to={C.tail} last>
          <Head at={0} kicker="สรุป" head="กลไก · ใช้ให้ถูก · ราคาที่จ่าย" y={280} w={760} />
          <Figure at={0} x={1250} y={540} w={800}>
            <SummaryCard ats={[C.s57_mech, C.s58_use, C.s59_cost, C.s60_start].map((f) => R(f, C.s56_sum))} />
          </Figure>
          <Prop src={A('o-copper-crystal.png')} x={350} y={880} w={240} at={R(C.s59_cost, C.s56_sum)} rot={-1.5} />
          <Layer x={MARGIN_L + 310} y={660} w={620} at={0} dur={1} enter="none" depth={0.04} drift={0}>
            <Rise at={R(C.s61_close, C.s56_sum)} dy={30}>
              <div style={{
                fontFamily: FONT_TH_DISPLAY, fontSize: 28, fontWeight: 700, color: BLUEPRINT.ink, lineHeight: 1.45,
                borderLeft: `5px solid ${BLUEPRINT.teal}`, paddingLeft: 20,
              }}>
                ยาที่ดีที่สุดตัวหนึ่งที่มนุษย์เคยมี
                <br />เกิดขึ้นเพราะมีคนถามว่า ทำไมแถวนั้นยังเขียว
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
