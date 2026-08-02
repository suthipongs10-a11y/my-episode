// Brand 3-font system (+2 serifs), served from media/library/fonts/ — NOT from the network.
//
// This used to be five @remotion/google-fonts loaders. Those resolve to fonts.gstatic.com
// URLs that the headless browser fetches mid-render, which makes every render depend on a
// live network and fails completely behind a TLS-terminating proxy (Chrome Headless Shell
// trusts neither the system CA store, the NSS db, nor enterprise policy). The files are now
// downloaded once by `node scripts/fetch-fonts.mjs` and loaded from disk, so renders are
// offline and byte-identical run to run.
//
// Adding a weight = add it to WANTED in scripts/fetch-fonts.mjs, re-run it, add it here.
import { continueRender, delayRender, staticFile } from 'remotion';

type Face = { family: string; weight: string; file: string };

const FACES: Face[] = [
	{ family: 'Space Grotesk', weight: '500', file: 'space-grotesk-500.woff2' },
	{ family: 'Space Grotesk', weight: '600', file: 'space-grotesk-600.woff2' },
	{ family: 'Space Grotesk', weight: '700', file: 'space-grotesk-700.woff2' },
	{ family: 'Inter', weight: '400', file: 'inter-400.woff2' },
	{ family: 'Inter', weight: '500', file: 'inter-500.woff2' },
	{ family: 'Inter', weight: '600', file: 'inter-600.woff2' },
	{ family: 'JetBrains Mono', weight: '400', file: 'jetbrains-mono-400.woff2' },
	{ family: 'JetBrains Mono', weight: '500', file: 'jetbrains-mono-500.woff2' },
	{ family: 'JetBrains Mono', weight: '700', file: 'jetbrains-mono-700.woff2' },
	{ family: 'Spectral', weight: '500', file: 'spectral-500.woff2' },
	{ family: 'Spectral', weight: '600', file: 'spectral-600.woff2' },
	{ family: 'Source Serif Four', weight: '600', file: 'source-serif-4-600.woff2' },
	{ family: 'Source Serif Four', weight: '700', file: 'source-serif-4-700.woff2' },
	{ family: 'Source Serif Four', weight: '900', file: 'source-serif-4-900.woff2' },
];

// One delayRender for the whole set: Remotion must not sample a frame until every face is
// ready, or the first frames render in a fallback font and the layout shifts under them.
if (typeof document !== 'undefined') {
	const handle = delayRender('Loading brand fonts from media/library/fonts');
	Promise.all(
		FACES.map(async ({ family, weight, file }) => {
			const face = new FontFace(family, `url(${staticFile(`library/fonts/${file}`)}) format('woff2')`, {
				weight,
				style: 'normal',
			});
			await face.load();
			document.fonts.add(face);
		}),
	)
		.then(() => continueRender(handle))
		// Never hang the render on a missing file — fail loudly instead, with the name.
		.catch((err) => {
			console.error('brand font load failed — run `node scripts/fetch-fonts.mjs`', err);
			continueRender(handle);
		});
}

export const FONT_DISPLAY = 'Space Grotesk';
export const FONT_BODY = 'Inter';
export const FONT_MONO = 'JetBrains Mono';
// serif for the Claude Code wordmark clone (close match to the app's serif)
export const FONT_SERIF = 'Spectral';
// heavy editorial serif for the vox collage engine's headlines (Publico-ish; Spectral maxes
// at 600 and reads too light/bookish over collage layers)
export const FONT_EDITORIAL = 'Source Serif Four';
