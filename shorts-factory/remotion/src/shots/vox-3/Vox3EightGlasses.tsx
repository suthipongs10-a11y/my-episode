import React from 'react';
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import {
  CollageBoard,
  Cutout,
  EASE_INOUT,
  EASE_OUT,
  Grain,
  Layer,
  LabelChip,
  PaperBG,
  RubberStamp,
  SerifStatement,
  VOX,
} from '../../lib/collage';
import { PaperMap, SitePin, makeMapScale } from '../../lib/map';
import { WORLD } from '../../lib/geo/world';
import { FONT_TH, FONT_TH_DISPLAY } from '../../fonts';

// =============================================================================
// "ประโยคที่ไม่มีใครอ่าน" — vox-3, health channel
// Beats + VO + sources: vox-shorts/vox-3-eight-glasses/beats.json and script.md
//
// The spine: the 1945 document says 2.5 L/day in one sentence and "most of this quantity is
// contained in prepared foods" in the NEXT one. The world read the first and skipped the
// second for eighty years. The ending is not a debunk — the same body's 2004 report is titled
// "Let Thirst Be Your Guide" and says hot climates need more, and a 2022 isotope study of
// 5,604 people found real turnover spanning under 2 to over 6 L/day.
//
// THE DOCUMENT IS TYPESET, NOT GENERATED. A video teaching people to check evidence cannot
// paste an AI painting of old paper and caption it 1945. `DocCard` renders the actual quoted
// words with their citation — a quotation, not a prop. script.md states this as a hard rule.
// =============================================================================
export const compositionConfig = {
  id: 'Vox3EightGlasses',
  durationInSeconds: 50,
  fps: 30,
  width: 1080,
  height: 1920,
};

const W = 1080;
const H = 1920;
const PAPER = staticFile('projects/vox-1-coffee/layers/paper.png');
const asset = (f: string) => staticFile(`projects/vox-3-eight-glasses/layers/${f}`);

// The world, for the closing beat. Thailand is the only country picked out — the study covered
// 23 countries and we do not know which, so highlighting 23 of them would be inventing data.
const GLOBE = makeMapScale([-25, 150], [-38, 62], { x: 40, y: 520, w: 1000 });
const THAILAND = WORLD.find((c) => c.name === 'Thailand')!;
const [TH_X, TH_Y] = GLOBE.px(101, 15);

// =============================================================================
// CUES (GLOBAL frames @30) — anchored to the MEASURED Algieba VO (beats.json carries the
// real per-line lengths). Retimed from the estimates by pushing every cue and camera keyframe
// through a piecewise-linear map built from the estimated vs measured line boundaries, so a
// cue that sat on a phrase still does (PIPELINE §7). Largest move -81 frames.
//
// The first pass of the VO ran to 49.70s against a 50s composition, leaving no tail for the
// loop. Three lines were TRIMMED rather than the read being sped up — the words cut are ones
// the picture already says (the 2002 card's kicker reads AM J PHYSIOL · 2002, so the narration
// saying "then published it in a journal" was the same fact twice). Ends at 45.86s now.
// =============================================================================
const CUE = {
  // Hook: negative so the page is FULLY composed at frame 0 — frame 0 is the thumbnail.
  hookTitle: -46,
  // -62, not -34: the row staggers 5f per glass over 13f, so the eighth
  // glass only finished filling at f18 and frame 0 showed 6 of 8. Frame 0 is the thumbnail
  // AND the loop point — it has to be the finished page, not the page mid-animation.
  hookGlasses: -62,
  hookChip: -14,

  // s02 1945  f147-339
  docIn: 169,
  sent1: 206, //        "ผู้ใหญ่ควรได้น้ำวันละสองลิตรครึ่ง"
  dateChip: 241,

  // s03 the skipped sentence  f357-603
  sent2: 421, //        "อยู่ในอาหารที่คุณกินอยู่แล้ว" — the payoff of the whole video
  produce: 466,
  skipMark: 509, //     the chip that says: nobody read this one

  // s04 2002  f621-879
  card2002: 625,
  stamp2002: 712, //    "ไม่เจอเลยสักชิ้น"

  // s05 2004  f897-1155
  card2004: 838,
  tropicLine: 950, //   "คนในเขตร้อนอาจต้องการมากกว่านั้น"

  // s06 2022  f1173-1437
  mapIn: 1097,
  rangeBar: 1177,
  thaiPin: 1261,
  titleBack: 1345,
} as const;

// Camera: push on the title, settle onto the document, push INTO the second sentence (the
// whole video is that move), pull back for the two later cards, then out to the world and
// home for the loop.
const CAM = [
  { f: 0, x: 540, y: 960, z: 1 },
  { f: 179, x: 540, y: 960, z: 1.06 },
  { f: 325, x: 540, y: 990, z: 1.16 },
  { f: 447, x: 540, y: 1030, z: 1.28 },
  { f: 599, x: 544, y: 1034, z: 1.3 },
  { f: 680, x: 540, y: 950, z: 1.1 },
  { f: 816, x: 542, y: 952, z: 1.12 },
  { f: 911, x: 540, y: 940, z: 1.14 },
  { f: 1069, x: 540, y: 944, z: 1.16 },
  { f: 1185, x: 540, y: 1000, z: 1.04 },
  { f: 1314, x: 540, y: 985, z: 1.02 },
  { f: 1382, x: 540, y: 960, z: 1 },
  { f: 1499, x: 540, y: 960, z: 1 },
];

const TITLE_WORDS = [{ t: 'ประโยค' }, { t: 'ที่ไม่มีใครอ่าน', hl: true }];

// =============================================================================
// SHOT-LOCAL PIECES
// =============================================================================

// An ink-drawn tumbler that fills with water. The eight of them are DRAWN rather than
// photographed on purpose: a real glass is transparent, so a photo of one cut out with rembg
// keeps the white studio background as its "water" and lands on the cream board as a pale
// blob. (layers/glass.png is that attempt, kept and unused.) Ink also lets the row fill in
// one glass at a time, which is the beat.
const InkGlass: React.FC<{ x: number; y: number; w: number; fill: number }> = ({ x, y, w, fill }) => {
  const h = w * 1.42;
  const topHalf = w / 2;
  const botHalf = w * 0.4;
  const body = `M ${x - topHalf} ${y - h / 2} L ${x - botHalf} ${y + h / 2 - 6} Q ${x} ${y + h / 2 + 5} ${x + botHalf} ${y + h / 2 - 6} L ${x + topHalf} ${y - h / 2} Z`;
  const waterTop = y + h / 2 - 6 - (h - 16) * fill;
  const clipId = `g${Math.round(x)}${Math.round(y)}`;
  return (
    <g>
      <clipPath id={clipId}>
        <path d={body} />
      </clipPath>
      {fill > 0.01 ? (
        <rect x={x - topHalf} y={waterTop} width={w} height={h} fill={VOX.teal} opacity={0.5} clipPath={`url(#${clipId})`} />
      ) : null}
      <path d={body} fill="none" stroke={VOX.ink} strokeWidth={3.2} strokeLinejoin="round" />
    </g>
  );
};

const GlassRow: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const gw = 96;
  const gap = 16;
  const total = 8 * gw + 7 * gap;
  const x0 = (W - total) / 2 + gw / 2;
  return (
    <svg viewBox={`0 0 ${W} 260`} style={{ display: 'block', width: W, height: 260, overflow: 'visible' }}>
      {Array.from({ length: 8 }, (_, i) => (
        <InkGlass
          key={i}
          x={x0 + i * (gw + gap)}
          y={130}
          w={gw}
          fill={interpolate(frame, [at + i * 5, at + i * 5 + 13], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
      ))}
    </svg>
  );
};

// A quoted sentence: the original English above, the Thai under it. Both, because the whole
// video is about what these exact words say — translating and discarding the source would ask
// the audience to take our word for the very thing being examined.
//
// `dim` 0..1 fades a sentence back. Sentence two is dimmed from the start and brightens on
// its cue rather than appearing then: it was always on that page, in plain sight, and nobody
// read it. Animating it IN would tell the opposite story.
const Quoted: React.FC<{ en: string; th: string; hl: number; dim: number }> = ({ en, th, hl, dim }) => (
  <div style={{ opacity: interpolate(dim, [0, 1], [1, 0.3]), marginBottom: 26 }}>
    <div
      style={{
        fontFamily: FONT_TH,
        fontSize: 27,
        fontWeight: 400,
        color: VOX.inkSoft,
        lineHeight: 1.42,
        background: `linear-gradient(to right, ${VOX.yellow} ${hl * 100}%, transparent ${hl * 100}%)`,
        display: 'inline',
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
        padding: '2px 0',
      }}
    >
      {en}
    </div>
    <div style={{ fontFamily: FONT_TH, fontSize: 33, fontWeight: 600, color: VOX.ink, lineHeight: 1.5, marginTop: 8 }}>{th}</div>
  </div>
);

// The 1945 document, typeset. Not an image of a document — the words, with their citation.
const DocCard: React.FC<{ at: number; s1: number; s2: number; dim1: number }> = ({ at, s1, s2, dim1 }) => {
  const frame = useCurrentFrame();
  const sweep = (from: number) => interpolate(frame, [from, from + 22], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    // 760, not 880. At the beat's z=1.30 the visible board is only 831px wide, so an 880 card
  // ran off both edges — the same defect vox-2's QA caught at its z=2.36 framing. Card width
  // and peak zoom are one decision, not two.
  <Layer x={540} y={1000} w={760} at={at} dur={16} enter="place" rotate={-0.7} depth={0.02} drift={0.4}>
      <div style={{ background: VOX.cream, padding: '40px 46px 44px', boxShadow: '0 12px 30px rgba(40,28,12,0.28)' }}>
        <div style={{ fontFamily: FONT_TH, fontSize: 21, fontWeight: 600, letterSpacing: 0.6, color: VOX.red, marginBottom: 6 }}>
          RECOMMENDED DIETARY ALLOWANCES
        </div>
        <div style={{ fontFamily: FONT_TH, fontSize: 19, fontWeight: 400, color: VOX.inkSoft, marginBottom: 26 }}>
          Food and Nutrition Board, National Research Council · 1945
        </div>
        <Quoted
          en="“A suitable allowance of water for adults is 2.5 liters daily in most instances.”"
          th="ผู้ใหญ่ควรได้น้ำวันละ 2.5 ลิตร ในกรณีทั่วไป"
          hl={sweep(s1)}
          dim={interpolate(frame, [dim1, dim1 + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
        <Quoted
          en="“Most of this quantity is contained in prepared foods.”"
          th="น้ำส่วนใหญ่นั้น อยู่ในอาหารที่กินอยู่แล้ว"
          hl={sweep(s2)}
          dim={interpolate(frame, [s2 - 14, s2 + 6], [0.62, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
      </div>
    </Layer>
  );
};

// A plain typeset card for the 2002 paper and the 2004 headline.
const PaperCard: React.FC<{
  at: number;
  kicker: string;
  head: string;
  sub?: string;
  headSize?: number;
  y: number;
  accent?: string;
}> = ({ at, kicker, head, sub, headSize = 46, y, accent = VOX.red }) => (
  <Layer x={540} y={y} w={880} at={at} dur={14} enter="place" rotate={0.6} depth={0.03} drift={0.5}>
    <div style={{ background: VOX.cream, padding: '38px 46px 42px', boxShadow: '0 12px 30px rgba(40,28,12,0.28)', borderLeft: `10px solid ${accent}` }}>
      <div style={{ fontFamily: FONT_TH, fontSize: 22, fontWeight: 600, letterSpacing: 0.6, color: accent, marginBottom: 12 }}>{kicker}</div>
      <div style={{ fontFamily: FONT_TH_DISPLAY, fontSize: headSize, fontWeight: 700, color: VOX.ink, lineHeight: 1.32 }}>{head}</div>
      {sub ? (
        <div style={{ fontFamily: FONT_TH, fontSize: 28, fontWeight: 400, color: VOX.inkSoft, lineHeight: 1.45, marginTop: 18 }}>{sub}</div>
      ) : null}
    </div>
  </Layer>
);

// The measured spread, 2022. Axis is WATER TURNOVER, which is not the same quantity as
// "how much you should drink" — so the 8-glasses figure is deliberately NOT marked on it.
// Putting them on one axis would be the exact sleight of hand this video is about.
const RangeBar: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const grow = interpolate(frame, [at + 12, at + 46], [0, 1], { easing: EASE_INOUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const BW = 820;
  return (
    <Layer x={540} y={1470} w={900} at={at} dur={14} enter="rise" depth={0.05} drift={0.5}>
      <div style={{ background: VOX.cream, padding: '34px 40px 38px', boxShadow: '0 10px 26px rgba(40,28,12,0.28)' }}>
        <div style={{ fontFamily: FONT_TH, fontSize: 25, fontWeight: 600, color: VOX.red, marginBottom: 22 }}>
          น้ำที่ร่างกายหมุนเวียนต่อวัน · วัดจริง
        </div>
        <svg viewBox={`0 0 ${BW} 96`} style={{ display: 'block', width: BW, height: 96, overflow: 'visible' }}>
          <line x1={0} y1={44} x2={BW} y2={44} stroke={VOX.inkSoft} strokeWidth={3} opacity={0.35} />
          <rect x={0} y={30} width={BW * grow} height={28} fill={VOX.teal} opacity={0.75} />
          {[0, 0.5, 1].map((t) => (
            <line key={t} x1={BW * t} y1={22} x2={BW * t} y2={66} stroke={VOX.ink} strokeWidth={3} />
          ))}
          <text x={0} y={92} fontFamily={FONT_TH} fontSize={26} fontWeight={600} fill={VOX.ink}>
            ต่ำกว่า 2 ลิตร
          </text>
          <text x={BW} y={92} textAnchor="end" fontFamily={FONT_TH} fontSize={26} fontWeight={600} fill={VOX.ink}>
            มากกว่า 6 ลิตร
          </text>
        </svg>
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

const Hook: React.FC<{ titleAt: number; glassAt: number; chipAt: number }> = ({ titleAt, glassAt, chipAt }) => (
  <>
    <SerifStatement x={540} y={620} w={940} at={titleAt} size={76} words={TITLE_WORDS} />
    <Layer x={540} y={1030} w={W} at={glassAt} dur={1} enter="none" depth={0.06} drift={0.4}>
      <GlassRow at={glassAt + 4} />
    </Layer>
    <LabelChip x={614} y={1330} at={chipAt} text="วันละ 8 แก้ว" kicker="สิ่งที่ทุกคนรู้" accent={VOX.red} size={38} rotate={-1.4} z={6} />
  </>
);

const Vox3EightGlasses: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: VOX.paper }}>
      <CollageBoard cam={CAM} fontBody={FONT_TH} fontDisplay={FONT_TH_DISPLAY} tracking="0.6px">
        <PaperBG src={PAPER} w={W} h={H} />

        {/* ---- HOOK: composed at FRAME 0, eight glasses fill in ---- */}
        <Sequence from={0} durationInFrames={200} layout="none">
          <SceneFade out={178}>
            <Hook titleAt={CUE.hookTitle} glassAt={CUE.hookGlasses} chipAt={CUE.hookChip} />
          </SceneFade>
        </Sequence>

        {/* ---- 1945 + THE SKIPPED SENTENCE: one card, two beats ---- */}
        <Sequence from={CUE.docIn} durationInFrames={452} layout="none">
          <SceneFade out={448} dur={22}>
            <DocCard
              at={0}
              s1={CUE.sent1 - CUE.docIn}
              s2={CUE.sent2 - CUE.docIn}
              dim1={CUE.sent2 - CUE.docIn + 10}
            />
            <Sequence from={CUE.dateChip - CUE.docIn} layout="none">
              <LabelChip x={330} y={700} at={0} text="ค.ศ. 1945" kicker="เอกสารต้นทาง" accent={VOX.teal} size={30} rotate={-2.2} z={6} />
            </Sequence>
            <Sequence from={CUE.produce - CUE.docIn} layout="none">
              <Cutout src={asset('produce.png')} x={726} y={1440} w={400} at={0} enter="slide-r" rotate={3} depth={0.1} sticker={5} shadow={2} />
            </Sequence>
            <Sequence from={CUE.skipMark - CUE.docIn} layout="none">
              <LabelChip x={372} y={1352} at={0} text="ไม่มีใครอ่านประโยคนี้" kicker="80 ปี" accent={VOX.red} size={30} rotate={1.6} z={7} />
            </Sequence>
          </SceneFade>
        </Sequence>

        {/* ---- 2002: someone went looking for the evidence ---- */}
        <Sequence from={CUE.card2002} durationInFrames={201} layout="none">
          <SceneFade out={197}>
            <PaperCard
              at={0}
              y={980}
              kicker="AM J PHYSIOL · 2002"
              head="“Drink at least eight glasses of water a day.” Really?"
              sub="นักสรีรวิทยาไล่หาหลักฐานของตัวเลขนี้ แล้วตีพิมพ์สิ่งที่เขาเจอ"
              headSize={42}
            />
            <Sequence from={CUE.stamp2002 - CUE.card2002} layout="none">
              <RubberStamp text="ไม่เจอเลยสักชิ้น" x={560} y={1330} at={0} size={46} rotate={-8} z={7} />
            </Sequence>
          </SceneFade>
        </Sequence>

        {/* ---- 2004: the same body answers ---- */}
        <Sequence from={CUE.card2004} durationInFrames={244} layout="none">
          <SceneFade out={240}>
            <PaperCard
              at={0}
              y={950}
              kicker="หน่วยงานเดิม · ค.ศ. 2004"
              head="ให้ความกระหาย เป็นตัวบอก"
              headSize={62}
              accent={VOX.teal}
            />
            <Sequence from={CUE.tropicLine - CUE.card2004} layout="none">
              <SerifStatement
                x={540}
                y={1360}
                w={900}
                at={0}
                size={44}
                backing
                words={[{ t: 'คนในเขตร้อน' }, { t: 'อาจต้องการมากกว่านั้น', hl: true }]}
              />
            </Sequence>
          </SceneFade>
        </Sequence>

        {/* ---- 2022: measured, and the spread is the answer ---- */}
        <Sequence from={CUE.mapIn} durationInFrames={271} layout="none">
          <SceneFade out={267} dur={24}>
            <Layer x={540} y={960} w={W} at={0} dur={20} enter="place" rotate={0.5} depth={0} drift={0.3}>
              <PaperMap scale={GLOBE} highlight={THAILAND} highlightName="Thailand" world>
                <SitePin x={TH_X} y={TH_Y} at={CUE.thaiPin - CUE.mapIn} />
              </PaperMap>
            </Layer>
            <LabelChip x={378} y={470} at={8} text="5,604 คน · 23 ประเทศ" kicker="Science · 2022" accent={VOX.red} size={30} rotate={-1.5} z={6} />
            <Sequence from={CUE.rangeBar - CUE.mapIn} layout="none">
              <RangeBar at={0} />
            </Sequence>
          </SceneFade>
        </Sequence>

        {/* ---- LOOP: back to page one ---- */}
        <Sequence from={CUE.titleBack} layout="none">
          <Hook titleAt={4} glassAt={10} chipAt={30} />
        </Sequence>
      </CollageBoard>
      <Grain opacity={0.055} />
    </AbsoluteFill>
  );
};

export default Vox3EightGlasses;
