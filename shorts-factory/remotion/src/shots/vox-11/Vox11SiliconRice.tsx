import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import {
  BLUEPRINT,
  CollageBoard,
  EASE_OUT,
  Grain,
  LabelChip,
  Layer,
  PaperBG,
  SerifStatement,
  useTheme,
} from '../../lib/collage';
import { FONT_TH, FONT_TH_DISPLAY } from '../../fonts';

// =============================================================================
// "ธาตุที่ข้าวกินมากที่สุด ไม่ได้อยู่บนถุงปุ๋ยสักถุง" — vox-11, เกษตรที่คนไทยควรรู้
// LANDSCAPE 1920x1080. Facts, source grades and deliberate omissions:
//   vox-shorts/vox-11-silicon-rice/script.md
//
// THREE EDITORIAL RULES THIS FILE ENFORCES, not just follows:
//
// 1. NO APPLICATION RATE APPEARS ANYWHERE ON SCREEN. channels/agri.json rule 4 forbids
//    per-field instructions, and the only Thai yield numbers we have are from a POT trial.
//    `UptakeBars` shows what the crop TAKES UP, which is a measurement, not a dose.
//
// 2. THE BURN BEAT MUST NEVER READ AS "BURNING IS FINE". Silica genuinely does not
//    volatilise, and saying so without the rest is a licence to burn (agri.json rule 7).
//    `BurnLedger` therefore draws BOTH columns in one figure — what fire takes and what it
//    leaves — and the scene does not end before `s49_notprofire` puts the cost back.
//
// 3. THE CAVEAT SHARES THE FRAME WITH THE ADVICE. `FourSteps` keeps the methane box inside
//    the same figure as the four steps, because that frame is the screenshot frame. vox-10
//    shipped its LFP exception drawn ON TOP of rule 3 and QA caught it late; the fix there
//    was to reserve the box's height in the layout, and this file reserves it from the start.
//
// Every number-bearing diagram below is drawn, never generated (PIPELINE §4). The generated
// images carry no figures at all: ten are objects photographed on white and cut out, and two
// are atmosphere plates. Added in a second pass on the operator's note that the video was too
// thin visually — the VOICE AND CUES WERE NOT TOUCHED, so this file is the only thing that
// changed and the mux target is still 490.000s.
//
// Placement rule for the props: every one sits in the BOTTOM-LEFT quadrant (x 250-600,
// y 740-1000), which is empty in every scene because the headline column stops around y 600
// and the diagram cards start at x 820. That is why they could be added without re-checking
// each scene's layout from scratch — one reserved band, not twelve decisions.
//
// The two plates are the places, and both are deliberately anonymous: a flat horizon with no
// hills, buildings, poles, vehicles or people, so neither asserts a country. PIPELINE §4
// records what happened to vox-7 when a place looked like somewhere.
// =============================================================================

export const compositionConfig = {
  id: 'Vox11SiliconRice',
  durationInSeconds: 490,
  fps: 30,
  width: 1920,
  height: 1080,
};

const W = 1920;
const H = 1080;

// Same landscape geometry as vox-8w / vox-9 / vox-10. Margin and peak zoom are ONE decision
// (PIPELINE §6), so the margin lives next to the CAM table.
const MARGIN_L = 170;
const A = (f: string) => staticFile(`projects/vox-11-silicon-rice/layers/${f}`);

// ---- GENERATED CUES — rebuilt from beats.json by scripts/gen-cues.mjs. Do not hand-edit.
// Cue name === segment id in beats.json, so there is no map to keep in sync.
// All 70 windows are measured from the real audio.
const C = {
  s01_bags: 15,
  s02_npk: 320,
  s03_missing: 543,
  s04_name: 772,

  s05_start: 1046,
  s06_nitrogen: 1199,
  s07_silicon: 1395,
  s08_ratio: 1573,
  s09_whopays: 1695,

  s10_accident: 1943,
  s11_two: 2120,
  s12_how: 2323,
  s13_energy: 2581,
  s14_knockout: 2775,

  s15_becomes: 3031,
  s16_acid: 3137,
  s17_evaporate: 3273,
  s18_silica: 3466,
  s19_makesglass: 3665,

  s20_four: 3790,
  s21_blast: 3893,
  s22_insect: 4142,
  s23_erect: 4315,
  s24_lodging: 4527,

  s25_question: 4730,
  s26_notfield: 4929,
  s27_1939: 5041,
  s28_criterion: 5277,
  s29_ricesurvives: 5437,
  s30_dropped: 5660,

  s31_notwait: 5905,
  s32_postwar: 6008,
  s33_1952: 6220,
  s34_slag: 6448,
  s35_1955: 6599,
  s36_stillshort: 6922,

  s37_wherefrom: 7199,
  s38_guessrock: 7286,
  s39_tooslow: 7444,
  s40_previous: 7587,
  s41_bank: 7775,
  s42_thainumbers: 7929,

  s43_burnthought: 8181,
  s44_wrong: 8423,
  s45_ash: 8524,
  s46_whatislost: 8771,
  s47_realcause: 8961,
  s48_rightquestion: 9121,
  s49_notprofire: 9333,

  s50_advice: 9683,
  s51_sounds: 9945,
  s52_mustdissolve: 10156,
  s53_crystal: 10377,
  s54_study: 10576,
  s55_practical: 10785,
  s56_rawbetter: 11014,

  s57_bothsides: 11203,
  s58_meta: 11342,
  s59_toopretty: 11607,
  s60_thaipot: 11875,
  s61_saturates: 12165,

  s62_problem: 12459,
  s63_step1: 12680,
  s64_recovery: 12879,
  s65_step2: 13077,
  s66_step3: 13353,
  s67_step4: 13529,
  s68_methane: 13887,
  s69_timing: 14125,
  s70_close: 14455,
  tail: 14666,
} as const;
// ---- END GENERATED CUES

const CAM = [
  { f: 0, x: 960, y: 540, z: 1 },
  { f: 600, x: 960, y: 545, z: 1.05 },
  { f: 2400, x: 962, y: 548, z: 1.1 },
  { f: 4800, x: 960, y: 540, z: 1.04 },
  { f: 7200, x: 958, y: 546, z: 1.12 },
  { f: 9600, x: 960, y: 542, z: 1.06 },
  { f: 11800, x: 960, y: 548, z: 1.13 },
  { f: 13400, x: 960, y: 540, z: 1.05 },
  { f: 14700, x: 960, y: 540, z: 1 },
];

// -----------------------------------------------------------------------------
// SHARED HELPERS — same contract as vox-9's and vox-10's, kept identical so the files
// read alike and a fix in one is obviously portable to the others.
// -----------------------------------------------------------------------------
const Scene: React.FC<{ from: number; dur: number; children: React.ReactNode }> = ({ from, dur, children }) => (
  <Sequence from={from} durationInFrames={Math.max(1, dur)} layout="none">
    {children}
  </Sequence>
);

const FadeOut: React.FC<{ at: number; dur?: number; children: React.ReactNode }> = ({ at, dur = 18, children }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + dur], [1, 0], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <div style={{ opacity: o }}>{children}</div>;
};

const grow = (frame: number, at: number, d = 24) =>
  interpolate(frame, [at, at + d], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const Plate: React.FC<{ src: string; at: number; pos?: string; dim?: number }> = ({ src, at, pos = '50% 50%', dim = 0.72 }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const o = grow(frame, at, 28);
  return (
    <Layer x={960} y={540} w={W * 1.1} at={0} dur={1} enter="none" depth={-0.05} drift={0.2}>
      <div style={{ position: 'relative', opacity: o }}>
        <Img src={src} style={{ width: '100%', height: H * 1.1, objectFit: 'cover', objectPosition: pos, display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: T.paper, opacity: dim }} />
      </div>
    </Layer>
  );
};

const Prop: React.FC<{ src: string; x: number; y: number; w: number; at: number; rot?: number; caption?: string }> =
  ({ src, x, y, w, at, rot = -1.5, caption }) => {
    const T = useTheme();
    return (
      <Layer x={x} y={y} w={w} at={at} dur={1} enter="pop" rotate={rot} depth={0.08} drift={0.8}>
        <div>
          <Img src={src} style={{ width: '100%', display: 'block' }} />
          {caption ? (
            <div style={{ fontFamily: FONT_TH, fontSize: 21, color: T.inkSoft, marginTop: 10, textAlign: 'center' }}>{caption}</div>
          ) : null}
        </div>
      </Layer>
    );
  };

const Head: React.FC<{ at: number; kicker?: string; head: string; sub?: string; y?: number; accent?: string }> =
  ({ at, kicker, head, sub, y = 300, accent }) => {
    const T = useTheme();
    return (
      <Layer x={MARGIN_L + 300} y={y} w={620} at={at} dur={1} enter="rise" depth={0.05} drift={0.4}>
        <div>
          {kicker ? (
            <div style={{ fontFamily: FONT_TH, fontSize: 24, color: accent ?? T.inkSoft, letterSpacing: '0.6px', marginBottom: 12 }}>{kicker}</div>
          ) : null}
          <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 54, lineHeight: 1.28, fontWeight: 700, color: T.ink, letterSpacing: '0.6px' }}>{head}</div>
          {sub ? (
            <div style={{ fontFamily: FONT_TH, fontSize: 27, lineHeight: 1.5, color: T.inkSoft, marginTop: 18, letterSpacing: '0.6px' }}>{sub}</div>
          ) : null}
        </div>
      </Layer>
    );
  };

// A framed panel used by most diagrams, so every figure sits on the same card.
const Card: React.FC<{ w: number; children: React.ReactNode; pad?: number }> = ({ w, children, pad = 30 }) => {
  const T = useTheme();
  return (
    <div style={{ width: w, background: T.cream, border: `2px solid ${T.landHi}`, borderRadius: 10, padding: pad }}>
      {children}
    </div>
  );
};

// =============================================================================
// 1. THE BAGS — the hook is an absence, so the figure has to draw the absence.
// Three real Thai fertiliser grades, then a fourth slot that is empty on purpose.
// =============================================================================
const BagsNoSilicon: React.FC<{ at: number; showGap?: boolean }> = ({ at, showGap = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const bags = ['46-0-0', '16-20-0', '15-15-15'];
  return (
    <Layer x={1250} y={540} w={900} at={at} dur={1} enter="rise" depth={0.05} drift={0.4}>
      <div style={{ display: 'flex', gap: 22, alignItems: 'flex-end' }}>
        {bags.map((b, i) => {
          const o = grow(frame, at + i * 10, 20);
          return (
            <div key={b} style={{ opacity: o, width: 190 }}>
              <div style={{
                height: 250, background: T.land, border: `2px solid ${T.landHi}`, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 40, fontWeight: 700, color: T.ink, letterSpacing: '1px' }}>{b}</div>
              </div>
              <div style={{ fontFamily: FONT_TH, fontSize: 20, color: T.inkSoft, marginTop: 10, textAlign: 'center' }}>N–P–K</div>
            </div>
          );
        })}
        <div style={{ opacity: showGap ? grow(frame, at + 40, 24) : 0, width: 190 }}>
          <div style={{
            height: 250, background: 'transparent', border: `3px dashed ${T.yellow}`, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 64, fontWeight: 700, color: T.yellow }}>?</div>
          </div>
          <div style={{ fontFamily: FONT_TH, fontSize: 20, color: T.yellow, marginTop: 10, textAlign: 'center' }}>ซิลิกอน</div>
        </div>
      </div>
      {/* ACCURACY, found in keyword research and worth a restarted render.
          Silicate IS sold in Thailand — TPI Polene's SILICA + กรดซิลิคอน sits on Thai Watsadu's
          shelves as a สารปรับสภาพดิน, and step 4 of the summary says so. The narration's
          "not on any bag" is about the N-P-K GRADE, so the row now names what it is talking
          about. A hook a viewer can disprove at a hardware store is not a hook. */}
      <div style={{
        fontFamily: FONT_TH, fontSize: 21, color: T.inkSoft, marginTop: 22, letterSpacing: '0.6px',
        opacity: grow(frame, at + (showGap ? 50 : 0), 24),
      }}>
        สูตรปุ๋ยที่ขายทั่วไปในไทย — ตัวเลขสามตัวคือ N–P–K และไม่มีช่องของซิลิกอน
      </div>
    </Layer>
  );
};

// =============================================================================
// 2. UPTAKE, TO SCALE — the only quantitative claim in the first third, and the one
// the whole video rests on. Bars are drawn from the numbers, not eyeballed: the pixel
// length is (kg/rai) * PX. A range is drawn as a range, because the source gives one.
// =============================================================================
const PX = 13; // px per kg/rai — 48 kg/rai is 624px, which fits the 700px column
const UptakeBars: React.FC<{ at: number; showSi?: boolean; showRatio?: boolean }> = ({ at, showSi = false, showRatio = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const nW = 16 * PX;
  const siLo = 24 * PX;
  const siHi = 48 * PX;
  const gn = grow(frame, at, 26);
  const gs = showSi ? grow(frame, at + 30, 30) : 0;
  return (
    <Layer x={1220} y={520} w={760} at={at} dur={1} enter="rise" depth={0.05} drift={0.3}>
      <Card w={760}>
        <div style={{ fontFamily: FONT_TH, fontSize: 22, color: T.inkSoft, marginBottom: 24 }}>ข้าวดูดขึ้นมาจากดิน · กิโลกรัมต่อไร่</div>

        <div style={{ marginBottom: 30 }}>
          <div style={{ fontFamily: FONT_TH, fontSize: 24, color: T.ink, marginBottom: 8 }}>ไนโตรเจน</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: nW * gn, height: 40, background: T.inkSoft, borderRadius: 4 }} />
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 34, fontWeight: 700, color: T.inkSoft, opacity: gn }}>16</div>
          </div>
        </div>

        <div>
          <div style={{ fontFamily: FONT_TH, fontSize: 24, color: T.yellow, marginBottom: 8 }}>ซิลิกอน</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative', width: siHi * gs, height: 40 }}>
              <div style={{ position: 'absolute', inset: 0, background: T.yellow, opacity: 0.32, borderRadius: 4 }} />
              <div style={{ position: 'absolute', left: 0, top: 0, width: Math.min(siLo, siHi * gs), height: 40, background: T.yellow, borderRadius: 4 }} />
            </div>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 34, fontWeight: 700, color: T.yellow, opacity: gs, whiteSpace: 'nowrap' }}>24–48</div>
          </div>
        </div>

        <div style={{ opacity: showRatio ? grow(frame, at + 66, 22) : 0, marginTop: 30, paddingTop: 22, borderTop: `1px solid ${T.landHi}` }}>
          <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 40, fontWeight: 700, color: T.ink }}>
            มากกว่า <span style={{ color: T.yellow }}>1.5–3 เท่า</span>
          </div>
        </div>
      </Card>
    </Layer>
  );
};

// =============================================================================
// 3. THE TWO PUMPS — the point of the figure is that the second one costs energy.
// Drawn as two membranes in series, not as a cell diagram: what matters is in / push.
// =============================================================================
const RootPumps: React.FC<{ at: number; showPush?: boolean }> = ({ at, showPush = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = grow(frame, at, 26);
  const gp = showPush ? grow(frame, at + 26, 24) : 0;
  const Membrane: React.FC<{ x: number; label: string; kind: string; color: string; o: number }> = ({ x, label, kind, color, o }) => (
    <g opacity={o}>
      <rect x={x} y={40} width={26} height={300} fill={T.land} stroke={T.landHi} strokeWidth={2} />
      <circle cx={x + 13} cy={190} r={22} fill={T.paper} stroke={color} strokeWidth={4} />
      <text x={x + 13} y={378} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={26} fontWeight={700} fill={color}>{label}</text>
      <text x={x + 13} y={408} textAnchor="middle" fontFamily={FONT_TH} fontSize={20} fill={T.inkSoft}>{kind}</text>
    </g>
  );
  return (
    <Layer x={1240} y={520} w={800} at={at} dur={1} enter="rise" depth={0.05} drift={0.3}>
      <Card w={800}>
        <svg width={740} height={430} viewBox="0 0 740 430">
          <text x={20} y={26} fontFamily={FONT_TH} fontSize={21} fill={T.inkSoft}>น้ำในดิน</text>
          <text x={630} y={26} fontFamily={FONT_TH} fontSize={21} fill={T.inkSoft}>ท่อลำเลียง</text>

          <line x1={20} y1={190} x2={200} y2={190} stroke={T.inkSoft} strokeWidth={3} opacity={g} />
          <Membrane x={210} label="ตัวที่ 1" kind="เปิดทางให้เข้า" color={T.teal} o={g} />
          <line x1={236} y1={190} x2={430} y2={190} stroke={T.teal} strokeWidth={3} opacity={g} />
          <Membrane x={440} label="ตัวที่ 2" kind="ออกแรงดันต่อ" color={T.yellow} o={gp} />
          <line x1={466} y1={190} x2={700} y2={190} stroke={T.yellow} strokeWidth={3} opacity={gp} />
          <polygon points="700,190 684,182 684,198" fill={T.yellow} opacity={gp} />

          {/* the energy cost is the whole point of the beat, so it is a mark, not a caption */}
          <g opacity={gp}>
            <line x1={453} y1={40} x2={453} y2={10} stroke={T.yellow} strokeWidth={3} />
            <text x={465} y={22} fontFamily={FONT_TH} fontSize={22} fill={T.yellow}>ใช้พลังงาน</text>
          </g>
        </svg>
      </Card>
    </Layer>
  );
};

// =============================================================================
// 4. WATER LEAVES, SILICON CANNOT — the mechanism in one figure.
// =============================================================================
const SilicaDeposit: React.FC<{ at: number; showVapour?: boolean; showGlass?: boolean }> =
  ({ at, showVapour = false, showGlass = false }) => {
    const T = useTheme();
    const frame = useCurrentFrame();
    const g = grow(frame, at, 26);
    const gv = showVapour ? grow(frame, at + 24, 24) : 0;
    const gg = showGlass ? grow(frame, at + 24, 26) : 0;
    return (
      <Layer x={1220} y={520} w={760} at={at} dur={1} enter="rise" depth={0.05} drift={0.3}>
        <Card w={760}>
          <svg width={700} height={430} viewBox="0 0 700 430">
            {/* the cell wall, in section */}
            <rect x={40} y={40} width={300} height={350} fill="none" stroke={T.landHi} strokeWidth={3} opacity={g} />
            <text x={40} y={28} fontFamily={FONT_TH} fontSize={21} fill={T.inkSoft} opacity={g}>ผนังเซลล์ของใบ</text>

            {/* silicic acid arriving with the water */}
            {[0, 1, 2, 3, 4].map((i) => (
              <circle key={i} cx={80 + i * 60} cy={330} r={11} fill={T.teal} opacity={g} />
            ))}
            <text x={40} y={372} fontFamily={FONT_TH} fontSize={21} fill={T.teal} opacity={g}>กรดซิลิสิกมากับน้ำ</text>

            {/* water leaves as vapour */}
            <g opacity={gv}>
              {[0, 1, 2].map((i) => (
                <g key={i}>
                  <line x1={110 + i * 95} y1={300} x2={110 + i * 95} y2={80} stroke={T.inkSoft} strokeWidth={2} strokeDasharray="7 9" />
                  <polygon points={`${110 + i * 95},70 ${102 + i * 95},88 ${118 + i * 95},88`} fill={T.inkSoft} />
                </g>
              ))}
              <text x={370} y={70} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>น้ำระเหยออกไป</text>
            </g>

            {/* silicon cannot follow it, so it stays */}
            <g opacity={gg}>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <rect key={i} x={56 + i * 40} y={150} width={26} height={26} fill={T.yellow} transform={`rotate(${i % 2 ? 10 : -8} ${69 + i * 40} 163)`} />
              ))}
              <text x={370} y={168} fontFamily={FONT_TH_DISPLAY} fontSize={30} fontWeight={700} fill={T.yellow}>ซิลิกาแข็ง</text>
              <text x={370} y={202} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>ระเหยตามไปไม่ได้ จึงค้างอยู่</text>
              <text x={370} y={234} fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>สะสมทีละชั้น ตลอดฤดู</text>
            </g>
          </svg>
        </Card>
      </Layer>
    );
  };

// =============================================================================
// 5. WHAT THE ARMOUR DOES — four consequences, revealed one per line so the frame
// never holds four things the narrator has not reached yet.
// =============================================================================
const ARMOUR = [
  { t: 'โรคไหม้เจาะยากขึ้น', s: 'เชื้อราต้องเจาะผนังใบก่อน' },
  { t: 'หนอนกัดได้ช้าลง', s: 'เจอของแข็ง ปากกัดสึก' },
  { t: 'ใบตั้งชันขึ้น', s: 'บังแสงกันเองน้อยลง' },
  { t: 'ต้นล้มยากขึ้น', s: 'ลำต้นแข็งขึ้น' },
];
const ArmourFour: React.FC<{ at: number; upto?: number }> = ({ at, upto = 4 }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  return (
    <Layer x={1220} y={520} w={760} at={at} dur={1} enter="rise" depth={0.05} drift={0.3}>
      <Card w={760}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {ARMOUR.map((a, i) => (
            <div key={a.t} style={{
              opacity: i < upto ? grow(frame, at + i * 8, 20) : 0,
              background: T.land, border: `2px solid ${T.landHi}`, borderRadius: 8, padding: '22px 20px', minHeight: 128,
            }}>
              <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 27, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>{a.t}</div>
              <div style={{ fontFamily: FONT_TH, fontSize: 20, color: T.inkSoft, marginTop: 10, lineHeight: 1.4 }}>{a.s}</div>
            </div>
          ))}
        </div>
      </Card>
    </Layer>
  );
};

// =============================================================================
// 6. THE 1939 RULE — the turn of the video. The criterion is quoted, then applied,
// and silicon fails it in front of the viewer rather than being said to have failed.
// =============================================================================
const Rule1939: React.FC<{ at: number; showTest?: boolean; showVerdict?: boolean }> =
  ({ at, showTest = false, showVerdict = false }) => {
    const T = useTheme();
    const frame = useCurrentFrame();
    const g = grow(frame, at, 26);
    const gt = showTest ? grow(frame, at + 24, 24) : 0;
    const gv = showVerdict ? grow(frame, at + 24, 24) : 0;
    return (
      <Layer x={1240} y={520} w={800} at={at} dur={1} enter="rise" depth={0.05} drift={0.3}>
        <Card w={800}>
          <div style={{ opacity: g }}>
            <div style={{ fontFamily: FONT_TH, fontSize: 22, color: T.inkSoft, marginBottom: 10 }}>เกณฑ์ "ธาตุอาหารจำเป็น" · ค.ศ. 1939</div>
            <div style={{
              fontFamily: FONT_TH_DISPLAY, fontSize: 33, fontWeight: 700, color: T.ink, lineHeight: 1.4,
              borderLeft: `5px solid ${T.inkSoft}`, paddingLeft: 20,
            }}>
              ถ้าไม่มีธาตุนั้น<br />พืชต้องจบวงจรชีวิตไม่ได้
            </div>
          </div>

          <div style={{ opacity: gt, marginTop: 30, paddingTop: 24, borderTop: `1px solid ${T.landHi}` }}>
            <div style={{ fontFamily: FONT_TH, fontSize: 24, color: T.ink, lineHeight: 1.55 }}>
              ข้าวที่ไม่ได้ซิลิกอน — ล้มง่าย เป็นโรคง่าย ให้เมล็ดน้อยลง
              <br />
              <span style={{ color: T.ink }}>แต่ยัง</span> <span style={{ color: T.teal, fontWeight: 700 }}>ออกรวงได้</span>
            </div>
          </div>

          <div style={{ opacity: gv, marginTop: 26 }}>
            <div style={{
              display: 'inline-block', background: T.paper, border: `2px solid ${T.red}`, borderRadius: 8, padding: '16px 24px',
            }}>
              <span style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 34, fontWeight: 700, color: T.red, textDecoration: 'line-through' }}>ซิลิกอน</span>
              <span style={{ fontFamily: FONT_TH, fontSize: 26, color: T.inkSoft, marginLeft: 18 }}>ตกเกณฑ์ · หลุดจากตำรา</span>
            </div>
          </div>
        </Card>
      </Layer>
    );
  };

// =============================================================================
// 7. JAPAN — three dates. The last one is the honest one: they still fall short.
// =============================================================================
const JAPAN = [
  { y: '1952', t: 'เริ่มทดลอง', s: 'เอาตะกรันเตาถลุงเหล็กลงนา' },
  { y: '1955', t: 'เข้ากฎหมายปุ๋ย', s: 'ปุ๋ยซิลิเกตเป็นปุ๋ยประเภทหนึ่ง' },
  { y: 'วันนี้', t: 'ยังไม่พอ', s: 'ราวครึ่งหนึ่งของนา ต่ำกว่าเกณฑ์ตัวเอง' },
];
const JapanTimeline: React.FC<{ at: number; upto?: number }> = ({ at, upto = 3 }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  return (
    <Layer x={1240} y={520} w={800} at={at} dur={1} enter="rise" depth={0.05} drift={0.3}>
      <Card w={800}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 13, top: 16, bottom: 16, width: 3, background: T.landHi }} />
          {JAPAN.map((j, i) => {
            const o = i < upto ? grow(frame, at + i * 10, 22) : 0;
            const last = i === JAPAN.length - 1;
            return (
              <div key={j.y} style={{ opacity: o, display: 'flex', gap: 26, marginBottom: last ? 0 : 34, position: 'relative' }}>
                <div style={{
                  width: 29, height: 29, borderRadius: 15, flexShrink: 0, marginTop: 6,
                  background: last ? T.paper : T.yellow, border: `3px solid ${last ? T.red : T.yellow}`,
                }} />
                <div>
                  <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 36, fontWeight: 700, color: last ? T.red : T.yellow }}>{j.y}</div>
                  <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 27, fontWeight: 700, color: T.ink, marginTop: 4 }}>{j.t}</div>
                  <div style={{ fontFamily: FONT_TH, fontSize: 21, color: T.inkSoft, marginTop: 4 }}>{j.s}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </Layer>
  );
};

// =============================================================================
// 8. THE CYCLE, AND THE CUT — soil to rice to straw to soil, with the return arrow
// severed. The scissors mark is on the arrow that leaves, not on the field.
// =============================================================================
const SiCycleBroken: React.FC<{ at: number; showCut?: boolean }> = ({ at, showCut = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const g = grow(frame, at, 26);
  const gc = showCut ? grow(frame, at + 24, 24) : 0;
  const node = (x: number, y: number, label: string, hl = false) => (
    <g opacity={g}>
      <circle cx={x} cy={y} r={62} fill={T.land} stroke={hl ? T.yellow : T.landHi} strokeWidth={3} />
      <text x={x} y={y + 9} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={26} fontWeight={700} fill={hl ? T.yellow : T.ink}>{label}</text>
    </g>
  );
  return (
    <Layer x={1220} y={520} w={760} at={at} dur={1} enter="rise" depth={0.05} drift={0.3}>
      <Card w={760}>
        <svg width={700} height={430} viewBox="0 0 700 430">
          {node(180, 110, 'ดิน')}
          {node(520, 110, 'ต้นข้าว')}
          {node(520, 320, 'ฟาง', true)}
          {node(180, 320, 'ดิน')}

          <line x1={244} y1={110} x2={452} y2={110} stroke={T.teal} strokeWidth={3} opacity={g} />
          <polygon points="452,110 436,102 436,118" fill={T.teal} opacity={g} />
          <line x1={520} y1={174} x2={520} y2={254} stroke={T.teal} strokeWidth={3} opacity={g} />
          <polygon points="520,254 512,238 528,238" fill={T.teal} opacity={g} />

          {/* the return leg — this is the one that gets cut */}
          <line x1={452} y1={320} x2={248} y2={320} stroke={gc ? T.red : T.teal} strokeWidth={3} opacity={g} strokeDasharray={gc ? '10 10' : undefined} />
          <polygon points="248,320 264,312 264,328" fill={gc ? T.red : T.teal} opacity={g} />

          <g opacity={gc}>
            <line x1={330} y1={288} x2={370} y2={352} stroke={T.red} strokeWidth={5} />
            <line x1={370} y1={288} x2={330} y2={352} stroke={T.red} strokeWidth={5} />
            <text x={350} y={396} textAnchor="middle" fontFamily={FONT_TH} fontSize={23} fill={T.red}>ขนฟางออกจากแปลง</text>
          </g>
        </svg>
      </Card>
    </Layer>
  );
};

// =============================================================================
// 9. THE BURN LEDGER — trap 1, and the figure that carries editorial rule 2.
// BOTH columns are drawn together and neither can be screenshotted alone.
// =============================================================================
const BurnLedger: React.FC<{ at: number; showStays?: boolean; showRealDrain?: boolean }> =
  ({ at, showStays = false, showRealDrain = false }) => {
    const T = useTheme();
    const frame = useCurrentFrame();
    const g = grow(frame, at, 26);
    const gs = showStays ? grow(frame, at + 24, 24) : 0;
    const gd = showRealDrain ? grow(frame, at + 24, 24) : 0;
    const Col: React.FC<{ title: string; color: string; items: string[]; o: number }> = ({ title, color, items, o }) => (
      <div style={{ opacity: o, flex: 1, background: T.land, border: `2px solid ${color}`, borderRadius: 8, padding: '22px 20px' }}>
        <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 27, fontWeight: 700, color, marginBottom: 14 }}>{title}</div>
        {items.map((s) => (
          <div key={s} style={{ fontFamily: FONT_TH, fontSize: 23, color: T.ink, lineHeight: 1.7 }}>{s}</div>
        ))}
      </div>
    );
    return (
      <Layer x={1240} y={500} w={800} at={at} dur={1} enter="rise" depth={0.05} drift={0.3}>
        <Card w={800}>
          <div style={{ fontFamily: FONT_TH, fontSize: 22, color: T.inkSoft, marginBottom: 18 }}>เผาฟางในนา — บัญชีที่ถูกต้อง</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <Col title="ไฟเอาไป" color={T.red} items={['ไนโตรเจน', 'กำมะถัน', 'อินทรียวัตถุ', 'และเป็นฝุ่น']} o={g} />
            <Col title="ไฟไม่ได้เอาไป" color={T.teal} items={['ซิลิกา', 'อยู่ในขี้เถ้า', '15–82% ของขี้เถ้า', 'ระเหยไม่ได้']} o={gs} />
          </div>
          <div style={{
            opacity: gd, marginTop: 22, background: T.paper, border: `2px solid ${T.yellow}`, borderRadius: 8, padding: '20px 22px',
          }}>
            <div style={{ fontFamily: FONT_TH, fontSize: 21, color: T.yellow, marginBottom: 6 }}>สิ่งที่ทำให้ซิลิกอนออกจากนาจริง ๆ</div>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 33, fontWeight: 700, color: T.ink }}>ไม่ใช่ไฟ — คือการขนฟางออกไป</div>
          </div>
        </Card>
      </Layer>
    );
  };

// =============================================================================
// 10. AMORPHOUS OR CRYSTAL — trap 2, and the most useful thing in the video.
// The axis is temperature, and the boundary is where the advice stops working.
// =============================================================================
const AshCrystal: React.FC<{ at: number; showCrystal?: boolean; showAdvice?: boolean }> =
  ({ at, showCrystal = false, showAdvice = false }) => {
    const T = useTheme();
    const frame = useCurrentFrame();
    const g = grow(frame, at, 26);
    const gc = showCrystal ? grow(frame, at + 24, 24) : 0;
    const ga = showAdvice ? grow(frame, at + 22, 22) : 0;
    return (
      <Layer x={1240} y={500} w={800} at={at} dur={1} enter="rise" depth={0.05} drift={0.3}>
        <Card w={800}>
          <svg width={740} height={250} viewBox="0 0 740 250">
            <line x1={30} y1={190} x2={710} y2={190} stroke={T.inkSoft} strokeWidth={2} opacity={g} />
            <text x={30} y={222} fontFamily={FONT_TH} fontSize={20} fill={T.inkSoft} opacity={g}>อุณหภูมิที่เผา</text>
            <text x={648} y={222} fontFamily={FONT_TH} fontSize={20} fill={T.inkSoft} opacity={g}>ร้อนขึ้น</text>

            <rect x={30} y={70} width={430} height={100} fill={T.teal} opacity={0.22 * g} rx={6} />
            <text x={245} y={112} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={30} fontWeight={700} fill={T.teal} opacity={g}>อสัณฐาน</text>
            <text x={245} y={146} textAnchor="middle" fontFamily={FONT_TH} fontSize={22} fill={T.ink} opacity={g}>ละลายกลับได้ · รากดูดขึ้น</text>

            <g opacity={gc}>
              <line x1={470} y1={40} x2={470} y2={200} stroke={T.red} strokeWidth={3} strokeDasharray="8 8" />
              <text x={470} y={30} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={26} fontWeight={700} fill={T.red}>~850°C</text>
              <rect x={480} y={70} width={230} height={100} fill={T.red} opacity={0.22} rx={6} />
              <text x={595} y={112} textAnchor="middle" fontFamily={FONT_TH_DISPLAY} fontSize={30} fontWeight={700} fill={T.red}>ผลึกควอตซ์</text>
              <text x={595} y={146} textAnchor="middle" fontFamily={FONT_TH} fontSize={22} fill={T.ink}>ไม่ละลาย · ใช้ไม่ได้</text>
            </g>
          </svg>

          <div style={{ opacity: ga, marginTop: 6, display: 'flex', gap: 18 }}>
            <div style={{ flex: 1, background: T.land, border: `2px solid ${T.teal}`, borderRadius: 8, padding: '18px 20px' }}>
              <div style={{ fontFamily: FONT_TH, fontSize: 20, color: T.teal, marginBottom: 4 }}>ใช้ได้</div>
              <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 26, fontWeight: 700, color: T.ink }}>แกลบดิบ · ถ่านแกลบ</div>
            </div>
            <div style={{ flex: 1, background: T.land, border: `2px solid ${T.red}`, borderRadius: 8, padding: '18px 20px' }}>
              <div style={{ fontFamily: FONT_TH, fontSize: 20, color: T.red, marginBottom: 4 }}>อาจใช้ไม่ได้เลย</div>
              <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 26, fontWeight: 700, color: T.ink }}>ขี้เถ้าจากหม้อไอน้ำ</div>
            </div>
          </div>
        </Card>
      </Layer>
    );
  };

// =============================================================================
// 11. THE EVIDENCE LADDER — every row carries its own condition, on the row.
// A number without its condition is the thing channels/agri.json rule 6 forbids.
// =============================================================================
const EVIDENCE = [
  { n: '+36%', t: 'รวม 87 งานวิจัย · 3,500+ จุดข้อมูล', c: 'แต่ทดสอบในดินที่ขาดซิลิกอนเป็นหลัก', color: 'teal' as const },
  { n: '+69%', t: 'ข้าวหอมมะลิ กข.105 (งานในไทย)', c: 'ทดลองในกระถาง ไม่ใช่แปลงจริง', color: 'yellow' as const },
  { n: '=', t: 'ระดับสูงสุด เทียบระดับรองลงมา', c: 'ไม่ต่างกันอย่างมีนัยสำคัญ', color: 'red' as const },
];
const EvidenceLadder: React.FC<{ at: number; upto?: number }> = ({ at, upto = 3 }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const col = { teal: T.teal, yellow: T.yellow, red: T.red };
  return (
    <Layer x={1240} y={520} w={800} at={at} dur={1} enter="rise" depth={0.05} drift={0.3}>
      <Card w={800}>
        {EVIDENCE.map((e, i) => (
          <div key={e.t} style={{
            opacity: i < upto ? grow(frame, at + i * 10, 22) : 0,
            display: 'flex', gap: 24, alignItems: 'flex-start',
            marginBottom: i === EVIDENCE.length - 1 ? 0 : 20,
            background: T.land, border: `2px solid ${T.landHi}`, borderRadius: 8, padding: '20px 22px',
          }}>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 40, fontWeight: 700, color: col[e.color], width: 128, flexShrink: 0 }}>{e.n}</div>
            <div>
              <div style={{ fontFamily: FONT_TH, fontSize: 24, color: T.ink, lineHeight: 1.35 }}>{e.t}</div>
              <div style={{ fontFamily: FONT_TH, fontSize: 21, color: col[e.color], marginTop: 6, lineHeight: 1.35 }}>{e.c}</div>
            </div>
          </div>
        ))}
      </Card>
    </Layer>
  );
};

// =============================================================================
// 12. THE FOUR STEPS — editorial rule 3 lives here.
// The methane caveat's height is reserved in the layout from the first frame, so the
// steps can never be laid out as if the box were not coming. vox-10 learned this the
// hard way: its LFP exception was drawn on top of rule 3 and QA caught it late.
// =============================================================================
const STEPS = [
  { n: '1', t: 'คืนฟางลงนา', s: 'ฟรี และเป็นซิลิกาที่ละลายกลับได้ · กู้คืนได้ราว 43–60%' },
  { n: '2', t: 'ถ้าต้องขายฟาง อย่าขายทุกแปลงทุกปี', s: 'สลับแปลง หรืออย่างน้อยคืนตอซังไว้' },
  { n: '3', t: 'ใช้แกลบดิบหรือถ่านแกลบ', s: 'ไม่ใช่ขี้เถ้าที่ผ่านการเผาร้อนมาแล้ว' },
  { n: '4', t: 'ปุ๋ยซิลิเกตเป็นข้อสุดท้าย', s: 'และต้องตรวจดินก่อนเสมอ' },
];
const CAVEAT_H = 168; // reserved from frame 0 — see the comment above
const FourSteps: React.FC<{ at: number; upto?: number; showCaveat?: boolean }> = ({ at, upto = 4, showCaveat = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  return (
    <Layer x={1265} y={520} w={820} at={at} dur={1} enter="rise" depth={0.05} drift={0.3}>
      <Card w={820} pad={26}>
        <div style={{ minHeight: 470 }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{
              opacity: i < upto ? grow(frame, at + i * 8, 20) : 0,
              display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: i === STEPS.length - 1 ? 0 : 16,
            }}>
              <div style={{
                width: 44, height: 44, flexShrink: 0, borderRadius: 22, background: T.yellow,
                fontFamily: FONT_TH_DISPLAY, fontSize: 26, fontWeight: 700, color: T.paper,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{s.n}</div>
              <div>
                <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 30, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>{s.t}</div>
                <div style={{ fontFamily: FONT_TH, fontSize: 22, color: T.inkSoft, marginTop: 5, lineHeight: 1.4 }}>{s.s}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: CAVEAT_H, marginTop: 20 }}>
          <div style={{
            opacity: showCaveat ? grow(frame, at + 20, 22) : 0,
            height: '100%', background: T.paper, border: `2px solid ${T.red}`, borderRadius: 8, padding: '18px 22px', boxSizing: 'border-box',
          }}>
            <div style={{ fontFamily: FONT_TH, fontSize: 21, color: T.red, marginBottom: 6 }}>ข้อควรระวัง — อยู่ในเฟรมเดียวกันโดยตั้งใจ</div>
            <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: 27, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>
              ไถกลบฟางในนาที่ขังน้ำอยู่ ทำให้มีเทนเพิ่ม
            </div>
            <div style={{ fontFamily: FONT_TH, fontSize: 21, color: T.inkSoft, marginTop: 6 }}>
              ไถกลบตั้งแต่หลังเกี่ยวตอนดินยังแห้ง ต่างกันได้ถึง 32%
            </div>
          </div>
        </div>
      </Card>
    </Layer>
  );
};

const Title: React.FC<{ at: number }> = ({ at }) => (
  <SerifStatement
    words={[{ t: 'ธาตุที่ข้าว' }, { t: 'กินมากที่สุด', hl: true }, { t: 'ไม่ได้อยู่บน' }, { t: 'ถุงปุ๋ยสักถุง', hl: true }]}
    x={MARGIN_L + 300}
    y={520}
    w={660}
    at={at}
    size={70}
  />
);

// =============================================================================
const Vox11SiliconRice: React.FC = () => (
  <AbsoluteFill style={{ background: BLUEPRINT.paper }}>
    <CollageBoard cam={CAM} theme="blueprint" fontBody={FONT_TH} fontDisplay={FONT_TH_DISPLAY} tracking="0.6px">
      <PaperBG w={W} h={H} />

      {/* 1 — HOOK: three bags, then the gap where silicon is not */}
      <Scene from={0} dur={C.s05_start - 12}>
        <Plate src={A('paddy-sunrise-raw.png')} at={0} pos="50% 50%" dim={0.82} />
        <Title at={C.s01_bags} />
        <Prop src={A('fert-sack.png')} x={1600} y={870} w={190} at={C.s02_npk - C.s01_bags} rot={-2} caption="ถุงปุ๋ยที่ซื้อกันทุกฤดู" />
        <BagsNoSilicon at={C.s02_npk - C.s01_bags} showGap={false} />
        <Scene from={C.s03_missing - C.s01_bags} dur={C.s05_start - C.s03_missing - 12}>
          <Prop src={A('fert-sack.png')} x={1600} y={870} w={190} at={0} rot={-2} caption="ถุงปุ๋ยที่ซื้อกันทุกฤดู" />
          <BagsNoSilicon at={0} showGap />
        </Scene>
      </Scene>

      {/* 2 — HOW MUCH: the one quantitative claim the video rests on */}
      <Scene from={C.s05_start} dur={C.s10_accident - C.s05_start - 12}>
        <Plate src={A('seedlings-raw.png')} at={0} pos="50% 55%" dim={0.87} />
        <Head at={0} kicker="ปริมาณที่ข้าวดูดขึ้นมา" head="ไนโตรเจนคือสิ่งที่เราซื้อ" sub="ซิลิกอนคือสิ่งที่เราไม่เคยซื้อ" y={330} />
        <Prop src={A('fert-granules.png')} x={450} y={880} w={380} at={C.s06_nitrogen - C.s05_start} rot={1.5} caption="เม็ดปุ๋ยไนโตรเจน" />
        <UptakeBars at={C.s06_nitrogen - C.s05_start} showSi={false} />
        <Scene from={C.s07_silicon - C.s05_start} dur={C.s10_accident - C.s07_silicon - 12}>
          <Plate src={A('farmer-transplant-raw.png')} at={0} pos="50% 50%" dim={0.85} />
          <Prop src={A('fert-granules.png')} x={450} y={880} w={380} at={0} rot={1.5} caption="เม็ดปุ๋ยไนโตรเจน" />
          <UptakeBars at={0} showSi showRatio />
        </Scene>
      </Scene>

      {/* 3 — TWO PUMPS: rice pays energy for this, so it is not an accident */}
      <Scene from={C.s10_accident} dur={C.s15_becomes - C.s10_accident - 12}>
        <Plate src={A('tillering-raw.png')} at={0} pos="50% 55%" dim={0.87} />
        <Head at={0} kicker="กลไก 1" head="ข้าวไม่ได้ดูดมันขึ้นมาโดยบังเอิญ" sub="รากมีตัวขนส่งสองตัว ทำงานต่อกันเป็นทอด" y={330} />
        <Prop src={A('rice-roots.png')} x={470} y={827} w={620} at={C.s11_two - C.s10_accident} rot={-1} caption="รากข้าว — จุดที่ตัวขนส่งทั้งสองอยู่" />
        <RootPumps at={C.s11_two - C.s10_accident} />
        <Scene from={C.s13_energy - C.s10_accident} dur={C.s15_becomes - C.s13_energy - 12}>
          <Prop src={A('rice-roots.png')} x={470} y={827} w={620} at={0} rot={-1} caption="รากข้าว — จุดที่ตัวขนส่งทั้งสองอยู่" />
          <RootPumps at={0} showPush />
        </Scene>
      </Scene>

      {/* 4 — THE GLASS: water leaves, silicon cannot */}
      <Scene from={C.s15_becomes} dur={C.s20_four - C.s15_becomes - 12}>
        <Plate src={A('sun-through-rice-raw.png')} at={0} pos="50% 50%" dim={0.83} />
        <Head at={0} kicker="กลไก 2" head="ต้นข้าวสร้างแก้วขึ้นมาในตัวเอง" sub="กรดซิลิสิกขึ้นมากับน้ำ แล้วน้ำก็ทิ้งมันไว้" y={330} />
        <Prop src={A('rice-clump.png')} x={400} y={805} w={200} at={C.s16_acid - C.s15_becomes} rot={1} caption="กอข้าว" />
        <SilicaDeposit at={C.s16_acid - C.s15_becomes} />
        <Scene from={C.s17_evaporate - C.s15_becomes} dur={C.s18_silica - C.s17_evaporate - 6}>
          <Prop src={A('rice-clump.png')} x={400} y={805} w={200} at={0} rot={1} caption="กอข้าว" />
          <SilicaDeposit at={0} showVapour />
        </Scene>
        <Scene from={C.s18_silica - C.s15_becomes} dur={C.s20_four - C.s18_silica - 12}>
          <Prop src={A('rice-clump.png')} x={400} y={805} w={200} at={0} rot={1} caption="กอข้าว" />
          <SilicaDeposit at={0} showVapour showGlass />
        </Scene>
      </Scene>

      {/* 5 — THE ARMOUR: four consequences, one per line */}
      <Scene from={C.s20_four} dur={C.s25_question - C.s20_four - 12}>
        <Plate src={A('heading-raw.png')} at={0} pos="50% 50%" dim={0.85} />
        <Prop src={A('leaf-blade.png')} x={560} y={760} w={720} at={C.s21_blast - C.s20_four} rot={-2} caption="ขอบใบข้าวที่คมเหมือนเลื่อย คือซิลิกา" />
        <Head at={0} kicker="กลไก 3" head="แก้วนั้นทำอะไรได้บ้าง" y={300} />
        <ArmourFour at={C.s21_blast - C.s20_four} upto={1} />
        <Scene from={C.s22_insect - C.s20_four} dur={C.s23_erect - C.s22_insect - 4}><ArmourFour at={0} upto={2} /></Scene>
        <Scene from={C.s23_erect - C.s20_four} dur={C.s24_lodging - C.s23_erect - 4}><ArmourFour at={0} upto={3} /></Scene>
        <Scene from={C.s24_lodging - C.s20_four} dur={C.s25_question - C.s24_lodging - 12}><ArmourFour at={0} upto={4} /></Scene>
      </Scene>

      {/* 6 — THE TURN: a rule written in 1939 */}
      <Scene from={C.s25_question} dur={C.s31_notwait - C.s25_question - 12}>
        <Plate src={A('golden-field-raw.png')} at={0} pos="50% 55%" dim={0.85} />
        <Head at={0} kicker="แล้วทำไมไม่มีใครพูดถึง" head="คำตอบไม่ได้อยู่ในนา" sub="มันอยู่ในหนังสือเรียน" y={330} accent={BLUEPRINT.yellow} />
        <Rule1939 at={C.s27_1939 - C.s25_question} />
        <Scene from={C.s29_ricesurvives - C.s25_question} dur={C.s30_dropped - C.s29_ricesurvives - 4}>
          <Prop src={A('panicle.png')} x={470} y={794} w={560} at={0} rot={-2} caption="ยังออกรวงได้ — และนั่นคือเหตุผลที่มันตกเกณฑ์" />
          <Rule1939 at={0} showTest />
        </Scene>
        <Scene from={C.s30_dropped - C.s25_question} dur={C.s31_notwait - C.s30_dropped - 12}>
          <Prop src={A('panicle.png')} x={470} y={794} w={560} at={0} rot={-2} caption="ยังออกรวงได้ — และนั่นคือเหตุผลที่มันตกเกณฑ์" />
          <Rule1939 at={0} showTest showVerdict />
        </Scene>
      </Scene>

      {/* 7 — JAPAN: did not wait for the textbook */}
      <Scene from={C.s31_notwait} dur={C.s37_wherefrom - C.s31_notwait - 12}>
        <Plate src={A('paddy-dusk-raw.png')} at={0} pos="50% 45%" dim={0.80} />
        <Prop src={A('slag-lump.png')} x={520} y={740} w={420} at={C.s34_slag - C.s31_notwait} rot={2} caption="ตะกรันจากเตาถลุงเหล็ก" />
        <Head at={0} kicker="ญี่ปุ่น" head="ไม่ได้รอให้ตำราเปลี่ยน" y={280} />
        <JapanTimeline at={C.s33_1952 - C.s31_notwait} upto={1} />
        <Scene from={C.s35_1955 - C.s31_notwait} dur={C.s36_stillshort - C.s35_1955 - 4}><JapanTimeline at={0} upto={2} /></Scene>
        <Scene from={C.s36_stillshort - C.s31_notwait} dur={C.s37_wherefrom - C.s36_stillshort - 12}><JapanTimeline at={0} upto={3} /></Scene>
      </Scene>

      {/* 8 — THE CYCLE, AND THE CUT */}
      <Scene from={C.s37_wherefrom} dur={C.s43_burnthought - C.s37_wherefrom - 12}>
        <Plate src={A('stubble-raw.png')} at={0} pos="50% 60%" dim={0.84} />
        <Head at={0} kicker="ซิลิกอนในนาไทยมาจากไหน" head="ไม่ได้มาจากหิน" sub="มาจากซากของข้าวรุ่นก่อนหน้า ที่ยังอยู่ในดินแปลงนั้น" y={330} />
        <SiCycleBroken at={C.s40_previous - C.s37_wherefrom} />
        <Scene from={C.s41_bank - C.s37_wherefrom} dur={C.s43_burnthought - C.s41_bank - 12}>
          <Prop src={A('straw-bale.png')} x={400} y={916} w={340} at={14} rot={-2} />
          <SiCycleBroken at={0} showCut />
          <LabelChip text="ฟางคือธนาคารซิลิกอนของนาแปลงนั้น" x={MARGIN_L + 300} y={760} at={16} size={30} accent={BLUEPRINT.yellow} />
        </Scene>
      </Scene>

      {/* 9 — TRAP 1: the ledger. Both columns, always together. */}
      <Scene from={C.s43_burnthought} dur={C.s50_advice - C.s43_burnthought - 12}>
        <Plate src={A('field-burning-raw.png')} at={0} pos="50% 45%" dim={0.82} />
        <Head at={0} kicker="กับดักที่ 1" head="ไฟไม่ได้ทำให้ซิลิกอนหาย" sub="ซิลิกาไม่ระเหย — มันอยู่ในขี้เถ้า" y={320} accent={BLUEPRINT.red} />
        <BurnLedger at={C.s45_ash - C.s43_burnthought} />
        <Scene from={C.s46_whatislost - C.s43_burnthought} dur={C.s47_realcause - C.s46_whatislost - 4}>
          <BurnLedger at={0} showStays />
        </Scene>
        <Scene from={C.s47_realcause - C.s43_burnthought} dur={C.s50_advice - C.s47_realcause - 12}>
          <BurnLedger at={0} showStays showRealDrain />
        </Scene>
      </Scene>

      {/* 10 — TRAP 2: the most useful minute in the video */}
      <Scene from={C.s50_advice} dur={C.s57_bothsides - C.s50_advice - 12}>
        <Plate src={A('farmer-harvest-raw.png')} at={0} pos="50% 50%" dim={0.84} />
        <Prop src={A('husk-pile.png')} x={560} y={882} w={440} at={C.s51_sounds - C.s50_advice} rot={-1} caption="แกลบ · ซิลิกา 2–10%" />
        <Head at={0} kicker="กับดักที่ 2" head="ขี้เถ้าแกลบอาจใช้ไม่ได้" sub="ถ้ามันผ่านการเผาที่ร้อนเกินไปมาแล้ว" y={300} accent={BLUEPRINT.red} />
        <AshCrystal at={C.s52_mustdissolve - C.s50_advice} />
        <Scene from={C.s53_crystal - C.s50_advice} dur={C.s55_practical - C.s53_crystal - 4}>
          <Prop src={A('ash-heap.png')} x={310} y={935} w={260} at={10} rot={2} caption="ขี้เถ้า" />
          <AshCrystal at={0} showCrystal />
        </Scene>
        <Scene from={C.s55_practical - C.s50_advice} dur={C.s57_bothsides - C.s55_practical - 12}>
          <Prop src={A('ash-heap.png')} x={310} y={935} w={260} at={0} rot={2} caption="ขี้เถ้า" />
          <AshCrystal at={0} showCrystal showAdvice />
        </Scene>
      </Scene>

      {/* 11 — EVIDENCE: every number wears its condition */}
      <Scene from={C.s57_bothsides} dur={C.s62_problem - C.s57_bothsides - 12}>
        <Plate src={A('paddy-clouds-raw.png')} at={0} pos="50% 60%" dim={0.87} />
        <Head at={0} kicker="หลักฐาน" head="ต้องพูดให้ครบทั้งสองด้าน" y={300} />
        <Prop src={A('panicle.png')} x={470} y={828} w={520} at={C.s58_meta - C.s57_bothsides} rot={2} />
        <EvidenceLadder at={C.s58_meta - C.s57_bothsides} upto={1} />
        <Scene from={C.s60_thaipot - C.s57_bothsides} dur={C.s61_saturates - C.s60_thaipot - 4}>
          <Plate src={A('rice-in-hands-raw.png')} at={0} pos="50% 50%" dim={0.85} />
          <EvidenceLadder at={0} upto={2} />
        </Scene>
        <Scene from={C.s61_saturates - C.s57_bothsides} dur={C.s62_problem - C.s61_saturates - 12}>
          <Plate src={A('rice-in-hands-raw.png')} at={0} pos="50% 50%" dim={0.85} />
          <EvidenceLadder at={0} upto={3} />
        </Scene>
      </Scene>

      {/* 12 — THE ANSWER: four steps, caveat in the same frame */}
      <Scene from={C.s62_problem} dur={C.tail - C.s62_problem}>
        <Plate src={A('farmer-walking-raw.png')} at={0} pos="50% 50%" dim={0.83} />
        <Head at={0} kicker="สรุป — ปัญหา · ทางแก้ · เริ่มยังไง" head="เริ่มยังไง" y={280} />
        <FourSteps at={C.s63_step1 - C.s62_problem} upto={1} />
        <Scene from={C.s65_step2 - C.s62_problem} dur={C.s66_step3 - C.s65_step2 - 4}><FourSteps at={0} upto={2} /></Scene>
        <Scene from={C.s66_step3 - C.s62_problem} dur={C.s67_step4 - C.s66_step3 - 4}><FourSteps at={0} upto={3} /></Scene>
        <Scene from={C.s67_step4 - C.s62_problem} dur={C.s68_methane - C.s67_step4 - 4}><FourSteps at={0} upto={4} /></Scene>
        <Scene from={C.s68_methane - C.s62_problem} dur={C.s70_close - C.s68_methane - 4}>
          <FourSteps at={0} upto={4} showCaveat />
        </Scene>
        <Scene from={C.s70_close - C.s62_problem} dur={C.tail - C.s70_close}>
          <FadeOut at={C.tail - C.s70_close - 40} dur={36}>
            <FourSteps at={0} upto={4} showCaveat />
            <SerifStatement
              words={[{ t: 'มันกองอยู่' }, { t: 'กลางนาของคุณ', hl: true }, { t: 'ทุกปี' }]}
              x={MARGIN_L + 300}
              y={620}
              w={620}
              at={10}
              size={54}
            />
          </FadeOut>
        </Scene>
      </Scene>

      <Grain opacity={0.05} />
    </CollageBoard>
  </AbsoluteFill>
);

export default Vox11SiliconRice;
