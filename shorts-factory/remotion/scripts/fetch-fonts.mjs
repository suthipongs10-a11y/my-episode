// Download the brand fonts to media/library/fonts/ so renders never touch the network.
//   node scripts/fetch-fonts.mjs
//
// WHY THIS EXISTS: @remotion/google-fonts resolves to fonts.gstatic.com URLs that the
// headless browser fetches DURING the render. That makes every render depend on the
// network, and it fails outright behind a TLS-terminating egress proxy — Chrome Headless
// Shell reads neither the system CA store, the NSS db, nor enterprise policy, so the
// proxy's CA cannot be trusted and every font 404s with ERR_CERT_AUTHORITY_INVALID.
//
// Downloading once with a normal HTTP client (which does trust the CA) and serving the
// files through staticFile() removes the dependency entirely. src/fonts.ts reads the
// manifest this writes.
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '..', 'media', 'library', 'fonts');
mkdirSync(outDir, { recursive: true });

// Must stay in sync with src/fonts.ts — same families, same weights.
const WANTED = [
	{ mod: 'SpaceGrotesk', slug: 'space-grotesk', weights: ['500', '600', '700'] },
	{ mod: 'Inter', slug: 'inter', weights: ['400', '500', '600'] },
	{ mod: 'JetBrainsMono', slug: 'jetbrains-mono', weights: ['400', '500', '700'] },
	{ mod: 'Spectral', slug: 'spectral', weights: ['500', '600'] },
	{ mod: 'SourceSerif4', slug: 'source-serif-4', weights: ['600', '700', '900'] },
];

const SUBSET = 'latin';
const manifest = [];

for (const { mod, slug, weights } of WANTED) {
	const { getInfo } = await import(`@remotion/google-fonts/${mod}`);
	const info = getInfo();
	for (const weight of weights) {
		const url = info.fonts?.normal?.[weight]?.[SUBSET];
		if (!url) throw new Error(`${mod} has no normal/${weight}/${SUBSET} — check the weight list`);
		const file = `${slug}-${weight}.woff2`;
		const res = await fetch(url);
		if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
		writeFileSync(path.join(outDir, file), Buffer.from(await res.arrayBuffer()));
		manifest.push({ family: info.fontFamily, weight, file });
		console.log(`  ${info.fontFamily} ${weight} -> library/fonts/${file}`);
	}
}

writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, '\t') + '\n');
console.log(`done: ${manifest.length} files + manifest.json`);
