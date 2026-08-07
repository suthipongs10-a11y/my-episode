import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion';
import {
  BLUEPRINT,
  CollageBoard,
  EASE_OUT,
  Grain,
  LabelChip,
  Layer,
  PaperBG,
  RubberStamp,
  SerifStatement,
  SketchArrow,
  useTheme,
} from '../../lib/collage';
import { FONT_TH, FONT_TH_DISPLAY } from '../../fonts';

// =============================================================================
// PROOF, NOT A VIDEO — "does the collage kit survive a technology channel?"
//
// The question was whether The EV Insight needs a different visual engine. It does not. This
// renders with the SAME CollageBoard camera, the SAME Layer choreography, the SAME chips,
// stamps and leader lines as the rice and water films — only `theme="blueprint"` is different,
// plus a grid instead of paper fibre.
//
// What the swap changes: material and palette. What it keeps: everything that makes the kit
// worth having. That is the whole argument, and it is cheaper to look at than to read.
//
// Lives in shots/_proof/ and is NOT numbered vox-N on purpose: it is an argument, not an
// episode, and burning a video number on it would make the series index lie.
//
// Keep it. When a fourth channel asks the same question, re-skin THIS rather than arguing
// from memory.
// =============================================================================
export const compositionConfig = {
  id: 'SkinProofBlueprint',
  durationInSeconds: 6,
  fps: 30,
  width: 1080,
  height: 1920,
};

const W = 1080;
const H = 1920;

// The blueprint's "paper fibre" equivalent: an engineering grid. Drawn, not an image — it has
// to stay crisp under the camera's zoom, and a texture PNG would soften.
const Grid: React.FC = () => {
  const T = useTheme();
  const minor = 40;
  const lines = [];
  for (let x = 0; x <= W * 1.2; x += minor)
    lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={H * 1.2} stroke={T.inkSoft} strokeWidth={x % 200 === 0 ? 1.1 : 0.5} opacity={x % 200 === 0 ? 0.34 : 0.16} />);
  for (let y = 0; y <= H * 1.2; y += minor)
    lines.push(<line key={`h${y}`} x1={0} y1={y} x2={W * 1.2} y2={y} stroke={T.inkSoft} strokeWidth={y % 200 === 0 ? 1.1 : 0.5} opacity={y % 200 === 0 ? 0.34 : 0.16} />);
  return (
    <div style={{ position: 'absolute', left: -W * 0.1, top: -H * 0.1 }}>
      <svg viewBox={`0 0 ${W * 1.2} ${H * 1.2}`} style={{ display: 'block', width: W * 1.2, height: H * 1.2 }}>{lines}</svg>
    </div>
  );
};

// A battery pack, drawn as a technical plan: modules, cells, and the busbar down the spine.
// Prismatic-cell packs really are laid out as a row of modules under a common bar — this is a
// simplified plan, not a decoration, which is the same rule the maps follow.
const PackPlan: React.FC<{ at: number }> = ({ at }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const MOD = 6;
  const CELLS = 4;
  const mw = 132;
  const mh = 300;
  const gap = 14;
  const x0 = (W - (MOD * mw + (MOD - 1) * gap)) / 2;
  const y0 = 300;
  return (
    <svg viewBox={`0 0 ${W} 640`} style={{ display: 'block', width: W, height: 640, overflow: 'visible' }}>
      {Array.from({ length: MOD }, (_, m) => {
        const p = interpolate(frame, [at + m * 4, at + m * 4 + 12], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const mx = x0 + m * (mw + gap);
        return (
          <g key={m} opacity={p}>
            <rect x={mx} y={y0 - 300} width={mw} height={mh} fill="none" stroke={T.ink} strokeWidth={2.4} />
            {Array.from({ length: CELLS }, (_, c) => (
              <rect key={c} x={mx + 10} y={y0 - 300 + 12 + c * ((mh - 24) / CELLS)} width={mw - 20}
                height={(mh - 24) / CELLS - 8} fill={T.teal} opacity={0.24} stroke={T.teal} strokeWidth={1.4} />
            ))}
            <text x={mx + mw / 2} y={y0 + 34} textAnchor="middle" fontFamily={FONT_TH} fontSize={22} fill={T.inkSoft}>
              M{m + 1}
            </text>
          </g>
        );
      })}
      {/* busbar */}
      <line x1={x0 - 30} y1={y0 - 322} x2={x0 + MOD * mw + (MOD - 1) * gap + 30} y2={y0 - 322}
        stroke={T.yellow} strokeWidth={6} strokeLinecap="round"
        opacity={interpolate(frame, [at + 26, at + 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
    </svg>
  );
};

const SkinProofBlueprint: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: BLUEPRINT.paper }}>
    <CollageBoard
      cam={[{ f: 0, x: 540, y: 960, z: 1 }, { f: 179, x: 540, y: 960, z: 1.05 }]}
      fontBody={FONT_TH}
      fontDisplay={FONT_TH_DISPLAY}
      tracking="0.6px"
      theme="blueprint"
    >
      {/* PaperBG still paints the board colour from the theme; the grid replaces the fibre */}
      <PaperBG w={W} h={H} />
      <Grid />

      <SerifStatement x={540} y={470} w={960} at={-40} size={72}
        words={[{ t: 'ทำไม 800 โวลต์' }, { t: 'ถึงชาร์จเร็วกว่า', hl: true }]} />

      <Layer x={540} y={1020} w={W} at={-30} dur={1} enter="none" depth={0.05} drift={0.3}>
        <PackPlan at={-26} />
      </Layer>

      <LabelChip x={340} y={760} at={-16} text="6 โมดูล · 4 เซลล์" kicker="แพ็กแบตเตอรี่" accent={BLUEPRINT.teal} size={30} rotate={-1.4} z={6} />
      <SketchArrow id="busbar-lead" d={`M 392 812 Q 440 848 470 872`} vb={{ w: W, h: H }} at={-6} dur={14} head color={BLUEPRINT.yellow} width={3} />
      <RubberStamp text="800V" x={790} y={1420} at={-8} size={54} rotate={-9} z={7} />
      <LabelChip x={360} y={1520} at={0} text="ครึ่งหนึ่งของ 400V" kicker="กระแสที่สายต้องรับ" accent={BLUEPRINT.red} size={28} rotate={1.3} z={6} />
      <Sequence from={0} layout="none">
        <LabelChip x={330} y={1690} at={10} text="P = I²R" kicker="ความร้อนที่หายไป" accent={BLUEPRINT.yellow} kickerColor={BLUEPRINT.inkSoft} size={30} rotate={-0.8} z={6} />
      </Sequence>
    </CollageBoard>
    <Grain opacity={0.04} />
  </AbsoluteFill>
);

export default SkinProofBlueprint;
