// Brand 3-font system (+2 serifs), inlined into the bundle as plain CSS.
//
// Three things were tried here and the history matters, because each failure only shows up
// one step further into the pipeline than the last:
//
// 1. @remotion/google-fonts — resolves to fonts.gstatic.com and fetches DURING the render.
//    Behind a TLS-terminating egress proxy every fetch dies ERR_CERT_AUTHORITY_INVALID and
//    the render aborts. Chrome Headless Shell trusts neither the system CA store, the NSS
//    db, nor enterprise policy, so there is no supported way to make it trust the proxy.
// 2. Local woff2 via staticFile() + FontFace.load() — renderStill fine, renderMedia hangs.
// 3. The same bytes as base64 data: URIs, still via FontFace.load() — STILL hangs, which is
//    what ruled the network out entirely. renderMedia opens one tab per concurrency slot and
//    all but one are backgrounded; Chromium does not settle FontFace.load() promises in a
//    background tab, so the delayRender waits out its whole timeout and kills the render.
//
// So: no font promise, no delayRender, nothing that can stall. A <style> element with
// @font-face rules over data: URIs, injected synchronously at module scope, before React
// renders anything. The bytes are already in the bundle, so the faces are usable at first
// paint and there is no fallback flash to wait out.
//
// `node scripts/fetch-fonts.mjs` downloads the faces and regenerates fonts.gen.ts.
import { FACES } from './fonts.gen';

if (typeof document !== 'undefined' && !document.getElementById('brand-fonts')) {
	const style = document.createElement('style');
	style.id = 'brand-fonts';
	style.textContent = FACES.map(
		({ family, weight, src, range }) =>
			`@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:block;` +
			`src:url(${src}) format("woff2");${range ? `unicode-range:${range};` : ''}}`,
	).join('\n');
	document.head.appendChild(style);
}

// Each export is a STACK, not one family. CSS resolves font-family per glyph, so latin
// comes from the brand face and Thai from the Noto face behind it — one string covers a
// bilingual channel with no per-language branching in any shot.
//
// Without the Thai member, Thai text does not fail visibly: it silently falls through to
// whatever the machine has (on a headless Chromium, Loma or Unifont) and the brand look
// quietly dies. That is worse than a missing-glyph box, so the fallback is explicit.
export const FONT_DISPLAY = "'Space Grotesk', 'Noto Sans Thai', sans-serif";
export const FONT_BODY = "'Inter', 'Noto Sans Thai', sans-serif";
// there is no Thai monospace worth the name; Noto Sans Thai keeps the weight consistent
export const FONT_MONO = "'JetBrains Mono', 'Noto Sans Thai', monospace";
// serif for the Claude Code wordmark clone (close match to the app's serif)
export const FONT_SERIF = "'Spectral', 'Noto Serif Thai', serif";
// heavy editorial serif for the vox collage engine's headlines (Publico-ish; Spectral maxes
// at 600 and reads too light/bookish over collage layers)
export const FONT_EDITORIAL = "'Source Serif Four', 'Noto Serif Thai', serif";

// --- Thai-first -------------------------------------------------------------------------
// For a shot whose ON-SCREEN text is Thai, not just its narration. The stacks above put a
// latin face first and let Thai fall through to Noto, which is right for a latin video with
// the odd Thai word and wrong for a Thai video: Noto Sans/Serif Thai are reference faces,
// deliberately neutral, and they carry no editorial voice at display size.
//
// Kanit does. It is a Thai geometric sans with a matching latin, drawn as one family, so a
// line like "ข้าวขาวดอกมะลิ 105" is one typeface end to end rather than two glued together —
// which is the usual tell of a translated video.
//
// ONE face, not a display/body pair, and that is a choice rather than an omission. Thai has
// no serif tradition to pair against a sans the way latin editorial design does; the Noto
// "Serif Thai" here is a latin-serif-flavoured Thai, not a Thai serif. Contrast comes from
// weight and size instead. Do not reach for a second Thai family to fake a display/body
// split — it reads as inconsistency, not hierarchy.
//
// Shots opt in by passing these to <CollageBoard fontBody= fontDisplay=>. Nothing global
// changes, so the latin shots keep their own type.
export const FONT_TH = "'Kanit', 'Noto Sans Thai', sans-serif";
export const FONT_TH_DISPLAY = "'Kanit', 'Noto Sans Thai', sans-serif";
