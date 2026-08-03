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
		({ family, weight, src }) =>
			`@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:block;src:url(${src}) format("woff2");}`,
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
