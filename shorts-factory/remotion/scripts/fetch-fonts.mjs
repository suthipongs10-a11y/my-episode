// Download the brand fonts to media/library/fonts/ so renders never touch the network.
//   node scripts/fetch-fonts.mjs
//
// WHY THIS EXISTS: @remotion/google-fonts resolves to fonts.gstatic.com URLs that the
// headless browser fetches DURING the render. That makes every render depend on the
// network, and it fails outright behind a TLS-terminating egress proxy — Chrome Headless
// Shell reads neither the system CA store, the NSS db, nor enterprise policy, so the
// proxy's CA cannot be trusted and every font 404s with ERR_CERT_AUTHORITY_INVALID.
//
// Downloading once with a normal HTTP client (which does trust the CA) removes that
// dependency. Serving them through staticFile() was the first attempt and it does not
// survive renderMedia: every concurrency slot opens its own tab, all of them call
// FontFace.load() against Remotion's dev server at once, and some of those requests never
// come back — the delayRender hangs for the full timeout and kills the render. renderStill
// never shows it because it opens one tab.
//
// So the bytes are inlined instead. This writes src/fonts.gen.ts with one base64 data URI
// per face (~720 KB of module), and a font that is already in the bundle cannot stall.
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '..', 'media', 'library', 'fonts');
mkdirSync(outDir, { recursive: true });

// Must stay in sync with src/fonts.ts — same families, same weights, same subsets.
//
// The Thai pair is not decoration. None of the five latin families has a single Thai glyph,
// and the only Thai-covering fonts on a headless Chromium are Loma/FreeSerif/Unifont — so
// Thai narration with English-only fonts does not fail loudly, it silently falls back to a
// system face and the brand look dies. These are declared SECOND in each stack in
// src/fonts.ts, so CSS resolves per glyph: latin from the brand face, Thai from Noto.
//
// Kanit is the exception in this list: it is the only family here loaded in TWO subsets, and
// that needs unicode-range to work. CSS picks exactly ONE @font-face per family+weight+style
// — with two rules and no ranges the later one wins for every glyph and the other file is
// simply never used. So a multi-subset entry emits one rule per subset, each carrying the
// subset's unicode-range, which is how Google serves them too.
//
// It is loaded in latin as well as thai on purpose. A Thai script still contains arabic
// numerals (105, 1945, 11.68) and the odd latin token; without the latin subset those glyphs
// fall out of Kanit into whatever is next in the stack, and a card reads half geometric-sans,
// half serif. That looks like a bug because it is one.
const WANTED = [
	{ mod: 'SpaceGrotesk', slug: 'space-grotesk', weights: ['500', '600', '700'] },
	{ mod: 'Inter', slug: 'inter', weights: ['400', '500', '600'] },
	{ mod: 'JetBrainsMono', slug: 'jetbrains-mono', weights: ['400', '500', '700'] },
	{ mod: 'Spectral', slug: 'spectral', weights: ['500', '600'] },
	{ mod: 'SourceSerif4', slug: 'source-serif-4', weights: ['600', '700', '900'] },
	{ mod: 'NotoSansThai', slug: 'noto-sans-thai', weights: ['400', '500', '600', '700'], subset: 'thai' },
	{ mod: 'NotoSerifThai', slug: 'noto-serif-thai', weights: ['600', '700', '900'], subset: 'thai' },
	{ mod: 'Kanit', slug: 'kanit', weights: ['400', '500', '600', '700'], subsets: ['latin', 'thai'] },
];

const manifest = [];

for (const { mod, slug, weights, subset, subsets } of WANTED) {
	const { getInfo } = await import(`@remotion/google-fonts/${mod}`);
	const info = getInfo();
	const list = subsets ?? [subset ?? 'latin'];
	for (const sub of list) {
		for (const weight of weights) {
			const url = info.fonts?.normal?.[weight]?.[sub];
			if (!url) throw new Error(`${mod} has no normal/${weight}/${sub} — check the weight list`);
			// Only suffix the filename when a family spans subsets, so existing files keep their names.
			const file = list.length > 1 ? `${slug}-${sub}-${weight}.woff2` : `${slug}-${weight}.woff2`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
			writeFileSync(path.join(outDir, file), Buffer.from(await res.arrayBuffer()));
			const range = list.length > 1 ? info.unicodeRanges?.[sub] : undefined;
			if (list.length > 1 && !range) throw new Error(`${mod}/${sub} has no unicodeRange — two subsets without ranges would silently shadow each other`);
			manifest.push({ family: info.fontFamily, weight, file, ...(range ? { range } : {}) });
			console.log(`  ${info.fontFamily} ${weight} ${list.length > 1 ? `(${sub}) ` : ''}-> library/fonts/${file}`);
		}
	}
}

writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, '\t') + '\n');

// The generated module src/fonts.ts actually consumes. Regenerate by re-running this script;
// never hand-edit it.
const lines = manifest.map(({ family, weight, file, range }) => {
	const b64 = readFileSync(path.join(outDir, file)).toString('base64');
	const r = range ? `, range: ${JSON.stringify(range)}` : '';
	return `\t{ family: ${JSON.stringify(family)}, weight: '${weight}'${r}, src: 'data:font/woff2;base64,${b64}' },`;
});
writeFileSync(
	path.join(root, 'src', 'fonts.gen.ts'),
	[
		'// AUTO-GENERATED by scripts/fetch-fonts.mjs — do not edit.',
		'// The woff2 bytes are inlined so a render never makes a network request for a font.',
		'export type GenFace = { family: string; weight: string; src: string; range?: string };',
		'export const FACES: GenFace[] = [',
		...lines,
		'];',
		'',
	].join('\n'),
);
console.log(`done: ${manifest.length} files + manifest.json + src/fonts.gen.ts`);
