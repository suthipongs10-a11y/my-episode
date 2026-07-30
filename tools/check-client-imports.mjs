#!/usr/bin/env node
// =============================================================================
// check-client-imports — walk the client's module graph before a player does
// =============================================================================
//   node tools/check-client-imports.mjs                 # checks client/.build/robrowser
//   node tools/check-client-imports.mjs <staged-dir>
//   node tools/check-client-imports.mjs --selftest
//
// WHY
//
// roBrowser's packaged Electron target loads raw ES modules over the app://
// protocol. There is no bundler in that path — applications/electron/main.js
// rewrites roBrowser's own aliases and the page's import map has to cover every
// remaining bare specifier. Miss one and the *entire* module graph fails at
// load: black window, no message, nothing in any log the player can reach.
//
// That is not hypothetical. Upstream ships exactly that bug: `rijndael-js`
// (Engine/LoginEngine.js -> Utils/Rijndael.js) and `granny-ro-js/wasm`
// (Renderer/MapRenderer.js -> GR2/GR2ModelRenderer.js) are static imports in
// neither the import map nor electron-builder's files list. It works under
// `npm run electron:dev` because Vite resolves bare specifiers itself, so the
// dev loop never sees it. client/build-client.mjs fixes both; this proves the
// fix is still in place, and will say so the next time the submodule moves.
//
// The empty error box on the ragexe cost this project two days
// (docs/phase-1-client.md). This check exists so the JavaScript client cannot
// reproduce it silently.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// main.js rewrites `from 'Core/x.js'` to `from '/src/Core/x.js'` for exactly
// this list. Kept in step with applications/electron/main.js.
const ALIASES = [
	'Core', 'Loaders', 'Utils', 'Network', 'DB', 'Renderer',
	'UI', 'App', 'Audio', 'Controls', 'Plugins', 'Preferences', 'Engine', 'Vendors',
];

// `import x from 'y'`, `export * from 'y'`, `import 'y'`, `import('y')`.
// The clause before `from` excludes quotes and semicolons so a bare
// `import './x.js';` cannot be swallowed by the next statement's ` from `.
const STATIC_RE = /(?:^|[\s;}])(?:import|export)\s+(?:[^;'"]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
const DYNAMIC_RE = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Pull every literal module specifier out of one source file. */
export function findSpecifiers(source) {
	const found = new Set();
	for (const re of [STATIC_RE, DYNAMIC_RE]) {
		re.lastIndex = 0;
		let m;
		while ((m = re.exec(source))) found.add(m[1]);
	}
	return [...found];
}

/**
 * Resolve one specifier to a path relative to the project root.
 *
 * @returns {{kind: 'file', file: string} | {kind: 'bare', spec: string}}
 */
export function resolveSpecifier(spec, fromFile) {
	// Vite's ?raw and any other query: the file still has to exist.
	const clean = spec.split('?')[0];

	if (clean.startsWith('/')) return { kind: 'file', file: clean.replace(/^\/+/, '') };
	if (clean.startsWith('.')) {
		return { kind: 'file', file: path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), clean)) };
	}

	const alias = clean.split('/')[0];
	if (ALIASES.includes(alias)) return { kind: 'file', file: `src/${clean}` };
	if (clean.startsWith('src/')) return { kind: 'file', file: clean };

	return { kind: 'bare', spec: clean };
}

/** Read the import map out of the generated index.html. */
export function extractImportMap(html) {
	const m = html.match(/<script\s+type="importmap"\s*>([\s\S]*?)<\/script>/);
	if (!m) throw new Error('no <script type="importmap"> in the generated index.html');
	return JSON.parse(m[1]);
}

/** Does the import map cover this bare specifier? Exact key, then prefix keys. */
export function mapLookup(importMap, spec) {
	const imports = importMap.imports ?? {};
	if (imports[spec] !== undefined) return imports[spec];
	for (const [key, target] of Object.entries(imports)) {
		if (key.endsWith('/') && spec.startsWith(key)) return target + spec.slice(key.length);
	}
	return null;
}

function walk(root, entry, importMap) {
	const seen = new Set();
	const queue = [entry];
	const missingFiles = [];
	const unmappedBare = [];

	while (queue.length) {
		const file = queue.shift();
		if (seen.has(file)) continue;
		seen.add(file);

		const abs = path.join(root, file);
		if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
			missingFiles.push(file);
			continue;
		}
		if (!/\.(js|mjs)$/.test(file)) continue; // shaders, css and html are leaves

		for (const spec of findSpecifiers(fs.readFileSync(abs, 'utf8'))) {
			const resolved = resolveSpecifier(spec, file);
			if (resolved.kind === 'file') {
				queue.push(resolved.file);
				continue;
			}
			const target = mapLookup(importMap, resolved.spec);
			if (target === null) {
				unmappedBare.push({ spec: resolved.spec, from: file });
				continue;
			}
			queue.push(target.replace(/^\/+/, ''));
		}
	}

	return { seen, missingFiles, unmappedBare };
}

function selftest() {
	const results = [];
	const ok = (label, fn) => {
		try { fn(); console.log(`  ok   ${label}`); results.push(true); }
		catch (err) { console.error(`  FAIL ${label}: ${err.message}`); results.push(false); }
	};
	const assert = (c, m) => { if (!c) throw new Error(m); };

	console.log('check-client-imports selftest:');

	ok('finds static, side-effect, re-export and dynamic specifiers', () => {
		const specs = findSpecifiers([
			"import Configs from 'Core/Configs.js';",
			"import RijndaelJS from 'rijndael-js';",
			"export { a } from './a.js';",
			"import './side-effect.js';",
			"import _vs from './Model.vs?raw';",
			"const m = await import('Engine/MapEngine.js');",
		].join('\n'));
		for (const want of ['Core/Configs.js', 'rijndael-js', './a.js', './side-effect.js', './Model.vs?raw', 'Engine/MapEngine.js']) {
			assert(specs.includes(want), `missing ${want}`);
		}
	});

	ok('rewrites an alias the way main.js does', () => {
		assert(resolveSpecifier('Core/Configs.js', 'src/main.js').file === 'src/Core/Configs.js', 'alias');
	});
	ok('resolves a relative import against its importer', () => {
		assert(resolveSpecifier('./gr2Pack.js', 'src/Renderer/GR2/x.js').file === 'src/Renderer/GR2/gr2Pack.js', 'relative');
	});
	ok('strips a ?raw query but keeps the file', () => {
		assert(resolveSpecifier('./Model.vs?raw', 'src/a/b.js').file === 'src/a/Model.vs', 'raw');
	});
	ok('calls an unknown package bare', () => {
		assert(resolveSpecifier('rijndael-js', 'src/Utils/Rijndael.js').kind === 'bare', 'bare');
	});
	ok('matches exact and prefix import-map keys', () => {
		const map = { imports: { 'rijndael-js': '/v/r.mjs', 'src/': '/src/' } };
		assert(mapLookup(map, 'rijndael-js') === '/v/r.mjs', 'exact');
		assert(mapLookup(map, 'src/main.js') === '/src/main.js', 'prefix');
		assert(mapLookup(map, 'nope') === null, 'miss');
	});

	const passed = results.filter(Boolean).length;
	console.log(`${passed}/${results.length} passed`);
	return results.every(Boolean) ? 0 : 1;
}

const argv = process.argv.slice(2);
if (argv.includes('--selftest')) process.exit(selftest());

const root = path.resolve(argv[0] ?? 'client/.build/robrowser');
const indexHtml = path.join(root, 'applications', 'electron', 'index.html');

if (!fs.existsSync(indexHtml)) {
	console.error(`no generated client at ${indexHtml}`);
	console.error('run:  node client/build-client.mjs --stage-only');
	process.exit(2);
}

const importMap = extractImportMap(fs.readFileSync(indexHtml, 'utf8'));
const { seen, missingFiles, unmappedBare } = walk(root, 'src/main.js', importMap);

console.log(`walked ${seen.size} modules from src/main.js`);

// If the walker ever stops reaching these, the check has silently stopped
// testing the thing it was written for.
const CANARIES = ['src/Utils/Rijndael.js', 'src/Renderer/GR2/GR2ModelRenderer.js', 'src/Engine/LoginEngine.js'];
let failed = false;
for (const canary of CANARIES) {
	if (!seen.has(canary)) {
		console.error(`the graph no longer reaches ${canary} — this check is not testing what it claims`);
		failed = true;
	}
}

if (unmappedBare.length) {
	failed = true;
	console.error(`\n${unmappedBare.length} bare specifier(s) with no import-map entry:`);
	for (const { spec, from } of unmappedBare) console.error(`  ${spec}  (from ${from})`);
	console.error('\nThese fail the whole module graph at load: black window, no message.');
	console.error('Add them in buildImportMap() in client/build-client.mjs, and to the');
	console.error('files: list in client/overlay/electron-builder.yml.template.');
}

if (missingFiles.length) {
	failed = true;
	console.error(`\n${missingFiles.length} module(s) imported but not present:`);
	for (const file of missingFiles.slice(0, 40)) console.error(`  ${file}`);
	if (missingFiles.length > 40) console.error(`  ... and ${missingFiles.length - 40} more`);
}

if (!failed) console.log('every specifier resolves — the graph can load');
process.exit(failed ? 1 : 0);
