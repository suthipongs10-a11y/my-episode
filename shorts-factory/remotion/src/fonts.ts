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

export const FONT_DISPLAY = 'Space Grotesk';
export const FONT_BODY = 'Inter';
export const FONT_MONO = 'JetBrains Mono';
// serif for the Claude Code wordmark clone (close match to the app's serif)
export const FONT_SERIF = 'Spectral';
// heavy editorial serif for the vox collage engine's headlines (Publico-ish; Spectral maxes
// at 600 and reads too light/bookish over collage layers)
export const FONT_EDITORIAL = 'Source Serif Four';
