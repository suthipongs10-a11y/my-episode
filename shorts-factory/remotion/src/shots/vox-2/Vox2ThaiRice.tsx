import React from 'react';
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import {
  ArchivalPhoto,
  CollageBoard,
  Cutout,
  Grain,
  LabelChip,
  Layer,
  PaperBG,
  RubberStamp,
  SerifStatement,
  SketchArrow,
  VOX,
} from '../../lib/collage';
import { CountryShape, WorldLayer, makeMapScale } from '../../lib/map';
import { WORLD } from '../../lib/geo/world';
import { FONT_BODY, FONT_EDITORIAL } from '../../fonts';

// =============================================================================
// COMPOSITION CONFIG — "Same District. Four Thousand Years Apart."
// Beats + VO contract: vox-shorts/vox-2-thai-rice/beats.json.
// Facts verified 2026-08-02 — the sources are in that folder's script.md.
//
// The spine: Khok Phanom Di (oldest confirmed rice in Thailand, ~2000 BC) and the 1945
// discovery of the fragrant plant that became Khao Dawk Mali 105 are in the SAME district
// — Phanat Nikhom, Chonburi. Both chips land on ONE pin; that is the whole video.
//
// NO GENERATED IMAGES. Both maps are Natural Earth 110m outlines projected by lib/map.tsx,
// so the pin sits on the real Chonburi rather than on an AI painting of a coastline.
// =============================================================================
export const compositionConfig = {
  id: 'Vox2ThaiRice',
  durationInSeconds: 44,
  fps: 30,
  width: 1080,
  height: 1920,
};

const W = 1080;
const H = 1920;
// Reused from vox-1: a generic paper texture, not coffee-specific. It graduates to
// media/library/ the moment a third video wants it.
const PAPER = staticFile('projects/vox-1-coffee/layers/paper.png');
// Generated layers. EVERY ONE IS AI-MADE and none of them is presented as a document: the
// 1945 figure is drawn as an illustration and captioned nowhere, because a synthetic image
// under an archival border with a factual caption is a fabricated record. The maps stay
// real; the imagery is texture. script.md carries the same note.
const asset = (f: string) => staticFile(`projects/vox-2-thai-rice/layers/${f}`);

// =============================================================================
// GEOGRAPHY — real coordinates, projected. Mercator keeps one k for x and y, so the box
// height falls out of the projection instead of being chosen (lib/map.tsx).
// =============================================================================
const THAI = makeMapScale([96, 106.5], [5.5, 21], { x: 200, y: 470, w: 680 });
const GLOBE = makeMapScale([-25, 150], [-38, 62], { x: 40, y: 690, w: 1000 });

const country = (name: string) => WORLD.find((c) => c.name === name)!;
const NEIGHBOURS = ['Myanmar', 'Laos', 'Cambodia', 'Vietnam', 'Malaysia'].map(country);
const THAILAND = country('Thailand');

// Phanat Nikhom, Chonburi — Khok Phanom Di AND the 1945 field. One pin, two dates.
const [PIN_X, PIN_Y] = THAI.px(101.18, 13.45);
// Bang Khla, Chachoengsao (13.73N) is where the seed went in 1951, and it is deliberately
// NOT drawn as a second point: it is 0.28 degrees away, ~20 board px, which renders as a
// scribble on top of the pin. The label carries it instead.

// Thailand's real export markets, drawn as routes off the world map.
const MARKETS: { name: string; lon: number; lat: number }[] = [
  { name: 'Iraq', lon: 44, lat: 33 },
  { name: 'China', lon: 104, lat: 35 },
  { name: 'Nigeria', lon: 8, lat: 9 },
  { name: 'South Africa', lon: 25, lat: -29 },
  { name: 'Indonesia', lon: 117, lat: -2 },
];
const [TH_X, TH_Y] = GLOBE.px(101, 15);
const routeTo = (lon: number, lat: number) => {
  const [x, y] = GLOBE.px(lon, lat);
  // bow every route the same way so the fan reads as one gesture
  return `M ${TH_X} ${TH_Y} Q ${(TH_X + x) / 2} ${Math.min(TH_Y, y) - 90} ${x} ${y}`;
};

// =============================================================================
// CUES (GLOBAL frames @30) — anchored to the MEASURED Thai VO. Every line's real length
// came back in the voice server's timing.json (see beats.json), and each cue below sits on
// the phrase it illustrates. The VO runs 37.92s of speech; with 0.6s between lines the last
// word lands at 41.42s, which is why the composition is 44s and not the 41s it was drafted
// at — the visuals follow the voice, not the other way round.
// =============================================================================
const CUE = {
  // Hook: negative so the page is FULLY composed at frame 0 — frame 0 is the thumbnail.
  // (vox-1 starts its title at f4 and its frame 0 is bare paper. Don't copy that.)
  hookPhoto: -60,
  hookTitle: -46,
  hookGrains: -30,
  hookChip: -16,

  // s02 origin  f136-321
  mapIn: 126, //         the map places as the camera starts its dive
  pinIn: 166,
  originChip: 196, //    "คนที่นี่ปลูกข้าวเป็นแล้ว"

  // s03 accident  f339-599
  accidentChip: 345, //  "ค.ศ. 1945" opens the line
  sameStatement: 500, // after "เขาเก็บเมล็ดนั้นไว้"

  // s04 selection  f617-898
  routeBK: 625,
  panicleChip: 640, //   "จากรวงข้าว 199 รวง"
  stamp: 707, //         "แถวที่ 105 คือผู้ชนะ"
  nameChip: 842, //      "ข้าวขาวดอกมะลิ 105" closes the line

  // s05 crown  f916-1101
  globeIn: 900,
  routesOut: 991, //     "ผู้ส่งออกข้าวอันดับหนึ่งของโลก"
  crownLine: 1041, //    "และครองไว้ได้ 31 ปี"

  // s06 twist  f1119-1243
  ranking: 1155, //      "ไทยอยู่อันดับสาม"
  titleBack: 1255,
} as const;

// Camera: one journey — push on the title page, dive onto Chonburi and STAY there through
// both dates, ease back over the central plain, pull out to the world, come home for the loop.
const CAM = [
  { f: 0, x: 540, y: 960, z: 1 },
  { f: 130, x: 540, y: 960, z: 1.06 },
  { f: 230, x: PIN_X, y: PIN_Y - 40, z: 2.3 },
  { f: 600, x: PIN_X + 6, y: PIN_Y - 46, z: 2.36 },
  { f: 700, x: 552, y: 940, z: 1.72 },
  { f: 880, x: 556, y: 936, z: 1.76 },
  { f: 960, x: 540, y: 1040, z: 1.12 },
  { f: 1140, x: 540, y: 1044, z: 1.14 },
  { f: 1220, x: 540, y: 985, z: 1.04 },
  { f: 1275, x: 540, y: 960, z: 1 },
  { f: 1319, x: 540, y: 960, z: 1 },
];

const TITLE_WORDS = [
  { t: 'Same' },
  { t: 'district.' },
  { t: 'Four' },
  { t: 'thousand' },
  { t: 'years' },
  { t: 'apart.', hl: true },
];

// =============================================================================
// SHOT-LOCAL PIECES
// Generic enough to graduate to lib/collage.tsx, but not until a second vox short wants
// them — the skill's rule. Keep them prop-driven so that move is a cut-and-paste.
// =============================================================================

// A map drawn on the paper: sepia landmasses, one country picked out, ink coastlines.
const PaperMap: React.FC<{
  scale: ReturnType<typeof makeMapScale>;
  context: typeof NEIGHBOURS;
  highlight?: typeof THAILAND;
  world?: boolean;
  children?: React.ReactNode;
}> = ({ scale, context, highlight, world = false, children }) => (
  <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: W, height: H, overflow: 'visible' }}>
    {world ? (
      <WorldLayer scale={scale} except={['Thailand']} fill="#dcccab" stroke={VOX.inkSoft} opacity={0.95} />
    ) : (
      context.map((c) => (
        <CountryShape key={c.name} scale={scale} country={c} fill={VOX.paperDeep} stroke={VOX.inkSoft} strokeWidth={1.6} opacity={0.72} />
      ))
    )}
    {highlight ? (
      <CountryShape scale={scale} country={highlight} fill="#cbb489" stroke={VOX.ink} strokeWidth={2.4} opacity={0.95} />
    ) : null}
    {children}
  </svg>
);

// The one pin both dates land on. Rings pulse out of it so the eye cannot miss it.
const SitePin: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (frame < at) return null;
  const pulse = ((frame - at) % 46) / 46;
  return (
    <g opacity={p}>
      <circle cx={x} cy={y} r={5 + pulse * 26} fill="none" stroke={VOX.red} strokeWidth={2} opacity={(1 - pulse) * 0.7} />
      <circle cx={x} cy={y} r={7} fill={VOX.red} />
      <circle cx={x} cy={y} r={13} fill="none" stroke={VOX.red} strokeWidth={2.5} />
    </g>
  );
};

// 2025 H1 exports, first half. The bars are the numbers — nothing is asserted by width alone.
const RANK = [
  { name: 'India', mt: 11.68, color: VOX.inkSoft },
  { name: 'Vietnam', mt: 4.72, color: VOX.inkSoft },
  { name: 'Thailand', mt: 3.73, color: VOX.red },
];
const MAX_MT = 11.68;
const RankBars: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const frame = useCurrentFrame();
  return (
    <Layer x={x} y={y} w={980} at={at} dur={12} enter="rise" depth={0.05} drift={0.5}>
      <div style={{ background: VOX.cream, padding: '44px 52px 52px', boxShadow: '0 10px 26px rgba(40,28,12,0.28)' }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 30, fontWeight: 600, letterSpacing: 2.4, textTransform: 'uppercase', color: VOX.red, marginBottom: 30 }}>
          Rice exports · first half 2025
        </div>
        {RANK.map((r, i) => {
          const p = interpolate(frame, [at + 10 + i * 9, at + 34 + i * 9], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: i ? 26 : 0 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 40, fontWeight: 600, color: VOX.ink, width: 230, textAlign: 'right' }}>{r.name}</div>
              <div style={{ flex: 1, height: 54, background: 'rgba(40,34,23,0.09)' }}>
                <div style={{ width: `${(r.mt / MAX_MT) * 100 * p}%`, height: '100%', background: r.color }} />
              </div>
              <div style={{ fontFamily: FONT_EDITORIAL, fontSize: 40, fontWeight: 700, color: r.color, width: 180, opacity: p }}>
                {r.mt.toFixed(2)} Mt
              </div>
            </div>
          );
        })}
      </div>
    </Layer>
  );
};

// Fades a whole scene's layers out over its last `dur` local frames.
const SceneFade: React.FC<{ out: number; dur?: number; children: React.ReactNode }> = ({ out, dur = 16, children }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [out - dur, out], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <div style={{ opacity: op }}>{children}</div>;
};

const Vox2ThaiRice: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: VOX.paper }}>
      <CollageBoard cam={CAM}>
        <PaperBG src={PAPER} w={W} h={H} />

        {/* ---- HOOK (0–5s): composed at FRAME 0, slow push ---- */}
        <Sequence from={0} durationInFrames={140} layout="none">
          <SceneFade out={137}>
            <ArchivalPhoto src={asset('paddy-raw.png')} x={540} y={330} w={820} at={CUE.hookPhoto} enter="place" rotate={-1.6} depth={0.04} treatment="sepia" />
            <SerifStatement x={540} y={720} w={940} at={CUE.hookTitle} size={78} words={TITLE_WORDS} />
            <Cutout src={asset('rice-stalk.png')} x={540} y={1135} w={420} at={CUE.hookGrains} enter="place" rotate={3} depth={0.1} sticker={0} shadow={2} />
            <LabelChip x={632} y={1420} at={CUE.hookChip} text="Phanat Nikhom, Chonburi" kicker="One district" accent={VOX.red} size={34} rotate={-1.3} z={6} />
          </SceneFade>
        </Sequence>

        {/* ---- THAILAND MAP: scenery under origin + accident + selection ---- */}
        <Sequence from={CUE.mapIn} durationInFrames={790} layout="none">
          <SceneFade out={784} dur={26}>
            <Layer x={540} y={960} w={W} at={0} dur={20} enter="place" rotate={-0.8} depth={0} drift={0.35}>
              <PaperMap scale={THAI} context={NEIGHBOURS} highlight={THAILAND}>
                <SitePin x={PIN_X} y={PIN_Y} at={CUE.pinIn - CUE.mapIn} />
              </PaperMap>
            </Layer>
          </SceneFade>
        </Sequence>

        {/* ---- ORIGIN + ACCIDENT: two dates, ONE pin ---- */}
        <Sequence from={CUE.originChip} durationInFrames={409} layout="none">
          <SceneFade out={403}>
            <LabelChip
              x={PIN_X - 20}
              y={PIN_Y - 150}
              at={0}
              text="Khok Phanom Di"
              kicker="~ 2000 BC"
              accent={VOX.teal}
              size={22}
              rotate={-2}
              depth={0.03}
            />
            <SketchArrow
              id="lead-origin"
              d={`M ${PIN_X + 10} ${PIN_Y - 116} Q ${PIN_X + 12} ${PIN_Y - 70} ${PIN_X + 2} ${PIN_Y - 22}`}
              vb={{ w: W, h: H }}
              at={12}
              dur={14}
              head={false}
              color={VOX.teal}
              width={2.6}
            />
            <Cutout src={asset('pot.png')} x={PIN_X - 150} y={PIN_Y - 26} w={126} at={6} enter="place" rotate={-4} depth={0.07} sticker={4} shadow={2} />
            <Sequence from={CUE.accidentChip - CUE.originChip} layout="none">
              <LabelChip
                x={PIN_X - 10}
                y={PIN_Y + 118}
                at={0}
                text="One fragrant plant"
                kicker="1945"
                accent={VOX.red}
                size={22}
                rotate={1.8}
                depth={0.03}
              />
              <Cutout src={asset('farmer.png')} x={PIN_X + 145} y={PIN_Y + 85} w={155} at={4} enter="slide-r" rotate={2.5} depth={0.09} sticker={5} shadow={2} />
              <SketchArrow
                id="lead-accident"
                d={`M ${PIN_X + 10} ${PIN_Y + 70} Q ${PIN_X + 12} ${PIN_Y + 44} ${PIN_X + 2} ${PIN_Y + 20}`}
                vb={{ w: W, h: H }}
                at={12}
                dur={12}
                head={false}
                color={VOX.red}
                width={2.6}
              />
            </Sequence>
            <Sequence from={CUE.sameStatement - CUE.originChip} layout="none">
              <SerifStatement
                x={PIN_X}
                y={PIN_Y + 235}
                w={420}
                at={0}
                size={40}
                backing
                words={[{ t: 'The' }, { t: 'same' }, { t: 'district.', hl: true }]}
              />
            </Sequence>
          </SceneFade>
        </Sequence>

        {/* ---- SELECTION (20–28.5s): the seed travels, 105 wins ---- */}
        <Sequence from={CUE.routeBK} durationInFrames={275} layout="none">
          <SceneFade out={269}>
            <SketchArrow
              id="seed-to-bangkhla"
              d={`M ${PIN_X + 16} ${PIN_Y - 22} Q ${PIN_X + 74} ${PIN_Y - 96} ${PIN_X + 96} ${PIN_Y - 168}`}
              vb={{ w: W, h: H }}
              at={0}
              dur={26}
              dashed
              color={VOX.red}
              width={4}
            />
            <LabelChip
              x={PIN_X + 120}
              y={PIN_Y - 212}
              at={CUE.panicleChip - CUE.routeBK}
              text="199 panicles"
              kicker="Bang Khla, 1951"
              accent={VOX.teal}
              size={24}
              rotate={-1.6}
              depth={0.03}
            />
            <RubberStamp text="105" x={PIN_X + 10} y={PIN_Y + 150} at={CUE.stamp - CUE.routeBK} size={66} rotate={-10} z={6} />
            <LabelChip
              x={PIN_X + 62}
              y={PIN_Y + 300}
              at={CUE.nameChip - CUE.routeBK}
              text="Khao Dawk Mali 105"
              kicker="Named 1959"
              accent={VOX.yellow}
              kickerColor={VOX.inkSoft}
              size={26}
              rotate={1.2}
              depth={0.03}
            />
          </SceneFade>
        </Sequence>

        {/* ---- CROWN (28.5–35s): the world, and the routes out of it ---- */}
        <Sequence from={CUE.globeIn} durationInFrames={385} layout="none">
          <SceneFade out={379} dur={26}>
            <Layer x={540} y={960} w={W} at={0} dur={20} enter="place" rotate={0.6} depth={0} drift={0.3}>
              <PaperMap scale={GLOBE} context={[]} highlight={THAILAND} world />
            </Layer>
            {MARKETS.map((m, i) => (
              <SketchArrow
                key={m.name}
                id={`route-${m.name}`}
                d={routeTo(m.lon, m.lat)}
                vb={{ w: W, h: H }}
                at={CUE.routesOut - CUE.globeIn + i * 7}
                dur={34}
                dashed
                color={VOX.red}
                width={3.5}
              />
            ))}
            <Sequence from={CUE.crownLine - CUE.globeIn} durationInFrames={CUE.ranking - CUE.crownLine} layout="none">
              <SceneFade out={CUE.ranking - CUE.crownLine - 4} dur={18}>
              <SerifStatement
                x={540}
                y={1500}
                w={940}
                at={0}
                size={60}
                backing
                words={[{ t: 'Number' }, { t: 'one.' }, { t: 'Thirty-one' }, { t: 'years.', hl: true }]}
              />
              </SceneFade>
            </Sequence>
          </SceneFade>
        </Sequence>

        {/* ---- TWIST + LOOP (35–41s): the ranking, then back to frame 0 ---- */}
        <Sequence from={CUE.ranking} durationInFrames={118} layout="none">
          <SceneFade out={112}>
            <RankBars x={540} y={1040} at={0} />
          </SceneFade>
        </Sequence>

        <Sequence from={CUE.titleBack} layout="none">
          <ArchivalPhoto src={asset('paddy-raw.png')} x={540} y={330} w={820} at={0} enter="place" rotate={-1.6} depth={0.04} treatment="sepia" />
          <SerifStatement x={540} y={720} w={940} at={4} size={78} words={TITLE_WORDS} />
          <Cutout src={asset('rice-stalk.png')} x={540} y={1135} w={420} at={10} enter="place" rotate={3} depth={0.1} sticker={0} shadow={2} />
          <LabelChip x={632} y={1420} at={26} text="Phanat Nikhom, Chonburi" kicker="One district" accent={VOX.red} size={34} rotate={-1.3} z={6} />
        </Sequence>
      </CollageBoard>
      <Grain opacity={0.055} />
    </AbsoluteFill>
  );
};

export default Vox2ThaiRice;
