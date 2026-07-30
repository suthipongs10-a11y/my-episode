#!/usr/bin/env node
// =============================================================================
// build-client — turn the roBrowser submodule into our PC client
// =============================================================================
//   node client/build-client.mjs --selftest      no env needed; runs in CI
//   node client/build-client.mjs --run           stage + launch, no packaging
//   node client/build-client.mjs --win           stage + package for Windows
//   node client/build-client.mjs --linux
//   node client/build-client.mjs --stage-only
//
// WHY THIS EXISTS AT ALL
//
// CLAUDE.md §3b.4 was chosen on 2026-07-30: roBrowser's Electron target is the
// PC client. Three things then have to happen that upstream does not do for us,
// and all three are why this is a script and not a line in a README.
//
//   1. The server address cannot live in a tracked file (CLAUDE.md §2.1).
//      Upstream's applications/electron/index.html hardcodes 127.0.0.1 and two
//      demo servers. Ours is generated from client.env at build time.
//
//   2. The submodule must stay pristine (CLAUDE.md §2.5, §2.6). So nothing is
//      written into client/robrowser. Everything happens in a staged copy under
//      client/.build/, which is gitignored.
//
//   3. Upstream's packaged Electron build cannot reach its own login window.
//      `rijndael-js` and `granny-ro-js/wasm` are static imports on the startup
//      graph and are in neither the import map nor the packaged files list.
//      They resolve under `npm run electron:dev` because Vite resolves bare
//      specifiers itself, which is how the gap survived. We resolve both here.
//      rijndael-js is additionally CommonJS, which no browser import map can
//      load, so it gets bundled to ESM below.
//
// WHAT THIS DELIBERATELY DOES NOT DO
//
// It does not touch our /proxy service. In Electron, roBrowser connects with a
// raw TCP socket handed to it by applications/electron/preload.mjs — see
// src/Network/NetworkManager.js, which picks NodeSocket over WebSocket whenever
// window.electronAPI.isElectron is set. The WebSocket bridge is a *browser*
// requirement, not a desktop one, and building it for this path would be work
// the path never executes. /proxy stays dormant (CLAUDE.md §5).
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const SUBMODULE = path.join(HERE, 'robrowser');
const OVERLAY = path.join(HERE, 'overlay');
const STAGE = path.join(HERE, '.build', 'robrowser');

// Copied per build; everything else in the staged tree survives so npm install
// and the electron download are paid once.
const STAGE_SKIP = new Set(['.git', 'node_modules', 'dist']);

// -----------------------------------------------------------------------------
// env
// -----------------------------------------------------------------------------

/** Parse a KEY=VALUE file. Same shape as the repo's .env, no dependencies. */
export function parseEnvFile(text) {
	const out = {};
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;
		const eq = line.indexOf('=');
		if (eq === -1) continue;
		const key = line.slice(0, eq).trim();
		let value = line.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
			(value.startsWith("'") && value.endsWith("'") && value.length > 1)
		) {
			value = value.slice(1, -1);
		}
		if (key) out[key] = value;
	}
	return out;
}

function num(env, key, fallback) {
	const raw = env[key];
	if (raw === undefined || raw === '') return fallback;
	const n = Number(raw);
	if (!Number.isInteger(n)) throw new Error(`${key}="${raw}" is not an integer`);
	return n;
}

function bool(env, key, fallback) {
	const raw = env[key];
	if (raw === undefined || raw === '') return fallback;
	if (raw === '1' || raw.toLowerCase() === 'true') return true;
	if (raw === '0' || raw.toLowerCase() === 'false') return false;
	throw new Error(`${key}="${raw}" is not a boolean (use 1/0 or true/false)`);
}

function list(env, key) {
	const raw = env[key];
	if (!raw || !raw.trim()) return [];
	// Semicolon, not colon or comma: a Windows GRF path is C:\Games\... and a
	// colon separator would split the drive letter off every entry.
	return raw
		.split(';')
		.map((s) => s.trim())
		.filter(Boolean);
}

// roBrowser gates each of these on the server actually implementing it. Default
// off: a UI panel calling a packet our rAthena build does not answer is a
// startup risk for no gain on day one. Turn them on one at a time, from
// RO_CLIENT_FEATURES, once a character can walk.
const FEATURES = {
	achievements: 'enableAchievements',
	bank: 'enableBank',
	cashshop: 'enableCashShop',
	attendance: 'enableCheckAttendance',
	dmgsuffix: 'enableDmgSuffix',
	homunautofeed: 'enableHomunAutoFeed',
	mapname: 'enableMapName',
	roulette: 'enableRoulette',
};

/**
 * Build the ROConfig object the client is compiled with.
 *
 * Throws on anything missing rather than substituting a default, because every
 * default here would be a hostname or a game-version number silently wrong.
 */
export function buildRoConfig(env) {
	const address = (env.RO_SERVER_ADDRESS ?? '').trim();
	if (!address) {
		throw new Error(
			'RO_SERVER_ADDRESS is not set. Copy client/client.env.example to ' +
			'client/client.env and fill it in. Prefer a hostname over an IP: the ' +
			'address is baked into the build, so a DNS name is what keeps moving ' +
			'hosts a DNS change instead of a re-release (CLAUDE.md §2.1, §4).',
		);
	}

	const grfList = list(env, 'RO_CLIENT_GRF_LIST');
	const dataIni = (env.RO_CLIENT_DATA_INI ?? '').trim();
	if (!grfList.length && !dataIni) {
		throw new Error(
			'Set RO_CLIENT_GRF_LIST (semicolon-separated absolute paths to .grf ' +
			'files) or RO_CLIENT_DATA_INI (absolute path to a DATA.INI). In ' +
			'Electron, roBrowser reads GRFs straight off local disk — there is no ' +
			'remote client and no asset download.',
		);
	}

	const enabled = new Set(
		(env.RO_CLIENT_FEATURES ?? '')
			.split(',')
			.map((s) => s.trim().toLowerCase())
			.filter(Boolean),
	);
	for (const name of enabled) {
		if (!FEATURES[name]) {
			throw new Error(
				`RO_CLIENT_FEATURES contains "${name}"; known values are ${Object.keys(FEATURES).join(', ')}`,
			);
		}
	}

	const server = {
		display: env.RO_SERVER_DISPLAY || 'Episode4',
		desc: env.RO_SERVER_DESC || '',
		address,
		port: num(env, 'RO_SERVER_PORT', 6900),
		version: num(env, 'RO_SERVER_VERSION', 55),
		langtype: num(env, 'RO_SERVER_LANGTYPE', 1),
		packetver: num(env, 'RO_SERVER_PACKETVER', 20180620),
		renewal: bool(env, 'RO_SERVER_RENEWAL', false),
		worldMapSettings: { episode: num(env, 'RO_SERVER_EPISODE', 12) },

		// Our build defines PACKET_OBFUSCATION_KEY1/2/3 = 0, which makes
		// clif_obfuscation.hpp's decode the identity function. roBrowser must be
		// told not to obfuscate or every packet after login is garbage.
		packetKeys: false,

		// char-server and map-server hand the client the address they were
		// configured with. Ours run in Docker, so without this the client is sent
		// to a container IP it cannot route to. Upstream's own example flags this
		// for "any containerised or NAT deployment".
		forceUseAddress: true,

		registrationweb: env.RO_CLIENT_REGISTRATION_WEB || '',
		adminList: list(env, 'RO_CLIENT_ADMIN_LIST').map((s) => {
			const n = Number(s);
			if (!Number.isInteger(n)) throw new Error(`RO_CLIENT_ADMIN_LIST entry "${s}" is not an account id`);
			return n;
		}),
	};

	const config = {
		type: 2, // FRAME
		application: 1, // ONLINE
		development: false,
		servers: [server],

		// Local disk. No remoteClient key at all — GameEngine only demands one
		// when it is not running under Electron.
		grfList: grfList.length ? grfList : dataIni,

		skipServerList: true,
		skipIntro: bool(env, 'RO_CLIENT_SKIP_INTRO', false),
		packetDump: bool(env, 'RO_CLIENT_PACKET_DUMP', false),

		// Utils/ConsoleManager.js replaces `console` with a no-op unless one of
		// development/enableConsole is set. Left off, a startup failure produces a
		// black window and silence — the ragexe's empty message box, rebuilt in
		// JavaScript. RO_CLIENT_CONSOLE=1 is the first thing to try when something
		// does not start.
		enableConsole: bool(env, 'RO_CLIENT_CONSOLE', false),
		disableConsole: false,
		clientVersionMode: 'PacketVer',
		loadLua: bool(env, 'RO_CLIENT_LOAD_LUA', true),

		// false: do not write extracted files back out. The GRF is the source of
		// truth and CLAUDE.md §2.3 keeps extracted assets out of everything we
		// control.
		saveFiles: false,
		calculateHash: false,
		clientHash: null,
		hashFiles: [],

		aura: {},
		autoLogin: [],
		BGMFileExtension: ['mp3'],
		CameraMaxZoomOut: 5,
		charBlockSize: 0,
		customItemInfo: [],
		FirstPersonCamera: false,
		ThirdPersonCamera: false,
		onReady: null,
		plugins: {},
		registrationweb: env.RO_CLIENT_REGISTRATION_WEB || '',
		restoreChatFocus: false,
		transitionDuration: 500,
	};

	for (const [name, key] of Object.entries(FEATURES)) {
		config[key] = enabled.has(name);
	}

	if (env.RO_WEBSERVER_ADDRESS) {
		config.webserverAddress = env.RO_WEBSERVER_ADDRESS;
	}

	return config;
}

// -----------------------------------------------------------------------------
// module resolution
// -----------------------------------------------------------------------------

/**
 * Resolve one subpath of a package to a file inside it, honouring `exports`.
 *
 * Small on purpose. It covers what roBrowser's dependencies actually declare
 * and throws on anything else rather than guessing — a wrong guess here is a
 * blank window with a resolution error in a console nobody opens.
 *
 * @returns {string} path relative to the package root, e.g. "dist/x.esm.js"
 */
export function resolvePackageSubpath(pkgJson, subpath) {
	const key = subpath === '.' ? '.' : `./${subpath}`;
	const pick = (node, where) => {
		if (typeof node === 'string') return node;
		if (node && typeof node === 'object') {
			for (const cond of ['import', 'browser', 'module', 'default']) {
				if (node[cond] !== undefined) return pick(node[cond], where);
			}
		}
		throw new Error(`cannot resolve ${where}: no import/browser/module/default condition`);
	};

	if (pkgJson.exports !== undefined) {
		const exp = pkgJson.exports;
		if (typeof exp === 'string' || !Object.keys(exp).some((k) => k.startsWith('.'))) {
			// A bare conditions object is shorthand for the "." subpath only.
			if (key !== '.') throw new Error(`package has no "${key}" export`);
			return pick(exp, key).replace(/^\.\//, '');
		}
		if (exp[key] === undefined) throw new Error(`package has no "${key}" export`);
		return pick(exp[key], key).replace(/^\.\//, '');
	}

	if (key !== '.') throw new Error(`package has no exports map, cannot resolve "${key}"`);
	const legacy = pkgJson.browser ?? pkgJson.module ?? pkgJson.main;
	if (typeof legacy !== 'string') throw new Error('package has no browser/module/main entry');
	return legacy.replace(/^\.\//, '');
}

// -----------------------------------------------------------------------------
// CommonJS -> ESM
// -----------------------------------------------------------------------------

const REQUIRE_RE = /require\(\s*(['"])([^'"]+)\1\s*\)/g;

/**
 * Bundle a small relative-only CommonJS package into one ESM file.
 *
 * `rijndael-js` is four CommonJS files with nothing but relative requires, and
 * it is a static import from Engine/LoginEngine.js. An import map can point a
 * browser at a file; it cannot make a browser understand module.exports. So the
 * graph is flattened here, requires are rewritten to literal ids at build time,
 * and the runtime lookup is a plain object read.
 *
 * Deliberately narrow: a bare (non-relative) require throws rather than being
 * papered over. If a future dependency needs more than this, that is a signal
 * to reach for a real bundler, not to grow this function.
 *
 * @param {(id: string) => string} readFile  reads a package-relative path
 * @param {string} entry                     package-relative entry, e.g. "index.js"
 */
export function bundleCjsToEsm(readFile, entry) {
	const modules = new Map();

	const canonical = (id) => {
		for (const candidate of [id, `${id}.js`, `${id}/index.js`]) {
			try {
				readFile(candidate);
				return candidate;
			} catch {
				/* try the next shape */
			}
		}
		throw new Error(`cannot resolve "${id}" inside the package`);
	};

	const visit = (id) => {
		if (modules.has(id)) return;
		const source = readFile(id);
		modules.set(id, null); // reserve first: the graph may be cyclic
		const dir = path.posix.dirname(id);
		const deps = [];
		const rewritten = source.replace(REQUIRE_RE, (match, quote, spec) => {
			if (!spec.startsWith('.')) {
				throw new Error(
					`${id} requires "${spec}", which is not a relative path. ` +
					'bundleCjsToEsm only handles self-contained packages.',
				);
			}
			const target = canonical(path.posix.normalize(path.posix.join(dir, spec)));
			deps.push(target);
			return `require(${JSON.stringify(target)})`;
		});
		modules.set(id, rewritten);
		for (const dep of deps) visit(dep);
	};

	const entryId = canonical(entry);
	visit(entryId);

	const parts = [
		'// GENERATED by client/build-client.mjs — do not edit.',
		'// CommonJS package flattened to ESM so a browser import map can load it.',
		'const __modules = Object.create(null);',
		'const __cache = Object.create(null);',
		'function __require(id) {',
		'\tif (id in __cache) return __cache[id].exports;',
		'\tconst factory = __modules[id];',
		'\tif (!factory) throw new Error("module not bundled: " + id);',
		'\tconst mod = (__cache[id] = { exports: {} });',
		'\tfactory(mod, mod.exports, __require);',
		'\treturn mod.exports;',
		'}',
	];
	for (const [id, source] of modules) {
		parts.push(`__modules[${JSON.stringify(id)}] = function (module, exports, require) {`);
		parts.push(source);
		parts.push('};');
	}
	parts.push(`const __entry = __require(${JSON.stringify(entryId)});`);
	parts.push('export default __entry;');
	parts.push('export { __entry as Rijndael };');
	return parts.join('\n') + '\n';
}

// -----------------------------------------------------------------------------
// import map
// -----------------------------------------------------------------------------

const SRC_ALIASES = [
	'App', 'Audio', 'Controls', 'Core', 'DB', 'Engine', 'Loaders',
	'Network', 'Plugins', 'Preferences', 'Renderer', 'UI', 'Utils', 'Vendors',
];

/**
 * The import map served to the page.
 *
 * Paths are absolute from the document root, which is the project root in both
 * modes: `app://localhost/applications/electron/index.html` when packaged, and
 * `http://localhost:3000/applications/electron/index.html` under `--dev`.
 */
export function buildImportMap({ grannyWasm, rijndaelShim }) {
	const imports = {
		bson: '/node_modules/bson/lib/bson.mjs',
		lodash: '/node_modules/lodash-es/lodash.default.js',
		'rijndael-js': rijndaelShim,
		'granny-ro-js/wasm': grannyWasm,
		'src/': '/src/',
	};
	for (const alias of SRC_ALIASES) {
		imports[`${alias}/`] = `/src/${alias}/`;
	}
	return { imports };
}

// -----------------------------------------------------------------------------
// staging and build
// -----------------------------------------------------------------------------

function stage() {
	if (!fs.existsSync(path.join(SUBMODULE, 'package.json'))) {
		throw new Error(
			`${SUBMODULE} is empty. Run:  git submodule update --init --recursive`,
		);
	}
	fs.mkdirSync(STAGE, { recursive: true });
	fs.cpSync(SUBMODULE, STAGE, {
		recursive: true,
		filter: (src) => !STAGE_SKIP.has(path.basename(src)),
	});
}

function run(cmd, args, cwd) {
	console.log(`  $ ${cmd} ${args.join(' ')}`);
	// shell:true so npm/npx resolve as .cmd on Windows. Every argument here is
	// space-free and relative to cwd, which is what makes that safe.
	const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true });
	if (res.status !== 0) {
		throw new Error(`${cmd} ${args.join(' ')} exited with ${res.status}`);
	}
}

function render(templatePath, tokens) {
	let text = fs.readFileSync(templatePath, 'utf8');
	for (const [key, value] of Object.entries(tokens)) {
		text = text.replaceAll(`{{${key}}}`, value);
	}
	const leftover = text.match(/\{\{[A-Z_]+\}\}/);
	if (leftover) throw new Error(`${templatePath}: unreplaced token ${leftover[0]}`);
	return text;
}

function slugify(name) {
	const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	return slug || 'ro-client';
}

function main(argv) {
	const flags = new Set(argv);
	const envArgIndex = argv.indexOf('--env');
	const envPath = envArgIndex !== -1 ? argv[envArgIndex + 1] : path.join(HERE, 'client.env');

	let fileEnv = {};
	if (fs.existsSync(envPath)) {
		fileEnv = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
		console.log(`config from ${path.relative(REPO, envPath)}`);
	} else {
		console.log(`no ${path.relative(REPO, envPath)} — using the process environment only`);
	}
	// The process environment wins, so CI and one-off overrides do not need a file.
	const env = { ...fileEnv, ...process.env };

	const config = buildRoConfig(env);
	const productName = env.RO_CLIENT_PRODUCT_NAME || config.servers[0].display;
	const appSlug = slugify(productName);
	const appId = env.RO_CLIENT_APP_ID || `com.${appSlug.replace(/-/g, '')}.client`;

	console.log(`staging ${path.relative(REPO, SUBMODULE)} -> ${path.relative(REPO, STAGE)}`);
	stage();

	const hasModules = fs.existsSync(path.join(STAGE, 'node_modules'));
	if (!hasModules && !flags.has('--skip-install')) {
		console.log('installing dependencies (first run downloads Electron, ~100 MB)');
		run('npm', ['install', '--no-audit', '--no-fund'], STAGE);
	} else if (!hasModules) {
		throw new Error('--skip-install given but node_modules is absent in the staged copy');
	}

	// --- rijndael-js: CommonJS -> ESM ----------------------------------------
	const rijndaelDir = path.join(STAGE, 'node_modules', 'rijndael-js');
	const rijndaelPkg = JSON.parse(fs.readFileSync(path.join(rijndaelDir, 'package.json'), 'utf8'));
	const rijndaelEntry = resolvePackageSubpath(rijndaelPkg, '.');
	const shim = bundleCjsToEsm(
		(id) => fs.readFileSync(path.join(rijndaelDir, id), 'utf8'),
		rijndaelEntry,
	);
	const vendorDir = path.join(STAGE, 'applications', 'electron', 'vendor');
	fs.mkdirSync(vendorDir, { recursive: true });
	fs.writeFileSync(path.join(vendorDir, 'rijndael-js.mjs'), shim);
	console.log(`bundled rijndael-js (${rijndaelPkg.version}) to ESM`);

	// --- granny-ro-js/wasm ----------------------------------------------------
	const grannyDir = path.join(STAGE, 'node_modules', 'granny-ro-js');
	const grannyPkg = JSON.parse(fs.readFileSync(path.join(grannyDir, 'package.json'), 'utf8'));
	const grannyWasmRel = resolvePackageSubpath(grannyPkg, 'wasm');
	if (!fs.existsSync(path.join(grannyDir, grannyWasmRel))) {
		throw new Error(`granny-ro-js declares ./wasm as ${grannyWasmRel}, which is not present`);
	}
	console.log(`resolved granny-ro-js/wasm -> ${grannyWasmRel}`);

	const importMap = buildImportMap({
		grannyWasm: `/node_modules/granny-ro-js/${grannyWasmRel}`,
		rijndaelShim: '/applications/electron/vendor/rijndael-js.mjs',
	});

	for (const [spec, target] of Object.entries(importMap.imports)) {
		if (spec.endsWith('/')) continue;
		if (!fs.existsSync(path.join(STAGE, target.replace(/^\//, '')))) {
			throw new Error(`import map points "${spec}" at ${target}, which does not exist in the staged copy`);
		}
	}

	// --- generated index.html -------------------------------------------------
	const html = render(path.join(OVERLAY, 'index.html.template'), {
		TITLE: productName,
		IMPORTMAP: JSON.stringify(importMap, null, '\t'),
		CONFIG: JSON.stringify(config, null, '\t'),
	});
	fs.writeFileSync(path.join(STAGE, 'applications', 'electron', 'index.html'), html);

	const builderYml = render(path.join(OVERLAY, 'electron-builder.yml.template'), {
		APP_ID: appId,
		PRODUCT_NAME: productName,
		APP_SLUG: appSlug,
	});
	const builderRel = path.posix.join('applications', 'electron', 'electron-builder.local.yml');
	fs.writeFileSync(path.join(STAGE, builderRel), builderYml);

	console.log(
		`configured "${productName}" -> ${config.servers[0].address}:${config.servers[0].port} ` +
		`packetver=${config.servers[0].packetver} renewal=${config.servers[0].renewal}`,
	);

	const grfs = Array.isArray(config.grfList) ? config.grfList : [config.grfList];
	for (const grf of grfs) {
		// A warning, not an error: the machine that builds is usually the machine
		// that runs, but it does not have to be.
		if (!fs.existsSync(grf)) console.warn(`  WARNING: ${grf} does not exist on this machine`);
		else console.log(`  game data: ${grf}`);
	}

	if (flags.has('--stage-only')) {
		console.log(`\nstaged at ${STAGE}`);
		return 0;
	}

	if (flags.has('--run')) {
		console.log('\nlaunching (unpackaged). Ctrl+Shift+I opens DevTools.');
		run('npx', ['electron', 'applications/electron/main.js'], STAGE);
		return 0;
	}

	const targets = [];
	if (flags.has('--win')) targets.push('--win');
	if (flags.has('--linux')) targets.push('--linux');
	if (flags.has('--mac')) targets.push('--mac');
	if (!targets.length) {
		throw new Error('give one of --run, --stage-only, --win, --linux, --mac');
	}

	run('npx', ['electron-builder', '--config', builderRel, ...targets], STAGE);
	console.log(`\npackaged into ${path.join(STAGE, 'dist', 'Desktop')}`);
	return 0;
}

// -----------------------------------------------------------------------------
// selftest
// -----------------------------------------------------------------------------

function selftest() {
	const results = [];
	const ok = (label, fn) => {
		try {
			fn();
			console.log(`  ok   ${label}`);
			results.push(true);
		} catch (err) {
			console.error(`  FAIL ${label}: ${err.message}`);
			results.push(false);
		}
	};
	const throws = (label, fn) =>
		ok(label, () => {
			let threw = false;
			try {
				fn();
			} catch {
				threw = true;
			}
			if (!threw) throw new Error('expected a throw, got none');
		});
	const assert = (cond, msg) => {
		if (!cond) throw new Error(msg);
	};

	console.log('build-client selftest:');

	ok('parses a KEY=VALUE file', () => {
		const env = parseEnvFile('# comment\nA=1\nB = "two words" \n\nC=\n');
		assert(env.A === '1', 'A');
		assert(env.B === 'two words', 'B');
		assert(env.C === '', 'C');
	});

	const base = {
		RO_SERVER_ADDRESS: 'play.example.test',
		RO_CLIENT_GRF_LIST: 'C:\\Games\\Ep4\\data.grf;C:\\Games\\Ep4\\rdata.grf',
	};

	ok('builds a config from the minimum env', () => {
		const c = buildRoConfig(base);
		assert(c.servers[0].address === 'play.example.test', 'address');
		assert(c.servers[0].port === 6900, 'default port');
		assert(c.servers[0].packetKeys === false, 'packetKeys must be false for our build');
		assert(c.servers[0].forceUseAddress === true, 'forceUseAddress must be on behind Docker');
		assert(c.grfList.length === 2, 'grfList split on ";"');
		assert(c.grfList[0] === 'C:\\Games\\Ep4\\data.grf', 'windows path survived the split');
		assert(c.remoteClient === undefined, 'no remoteClient in Electron');
	});

	throws('refuses to build without an address', () => buildRoConfig({ RO_CLIENT_GRF_LIST: 'a.grf' }));
	throws('refuses to build without game data', () => buildRoConfig({ RO_SERVER_ADDRESS: 'h' }));
	throws('rejects a non-integer port', () => buildRoConfig({ ...base, RO_SERVER_PORT: 'x' }));
	throws('rejects an unknown feature name', () => buildRoConfig({ ...base, RO_CLIENT_FEATURES: 'wings' }));

	ok('features default off and turn on by name', () => {
		const off = buildRoConfig(base);
		assert(off.enableBank === false, 'bank should default off');
		const on = buildRoConfig({ ...base, RO_CLIENT_FEATURES: 'bank, mapname' });
		assert(on.enableBank === true, 'bank should be on');
		assert(on.enableMapName === true, 'mapname should be on');
		assert(on.enableCashShop === false, 'cashshop should stay off');
	});

	ok('accepts a DATA.INI instead of a GRF list', () => {
		const c = buildRoConfig({ RO_SERVER_ADDRESS: 'h', RO_CLIENT_DATA_INI: 'C:\\Games\\Ep4\\DATA.INI' });
		assert(typeof c.grfList === 'string', 'DATA.INI is passed as a string');
	});

	ok('resolves an exports subpath', () => {
		const pkg = { exports: { './wasm': { types: './x.d.ts', import: './dist/w.esm.js' } } };
		assert(resolvePackageSubpath(pkg, 'wasm') === 'dist/w.esm.js', 'subpath');
	});
	ok('resolves a legacy main', () => {
		assert(resolvePackageSubpath({ main: 'index.js' }, '.') === 'index.js', 'main');
	});
	throws('refuses an undeclared subpath', () => resolvePackageSubpath({ exports: { '.': './a.js' } }, 'wasm'));

	ok('bundles a relative-only CommonJS graph', () => {
		const files = {
			'index.js': "module.exports = require('./lib/thing');",
			'lib/thing.js': "const n = require('./n');\nmodule.exports = () => n * 2;",
			'lib/n.js': 'module.exports = 21;',
		};
		const out = bundleCjsToEsm((id) => {
			if (!(id in files)) throw new Error('nope');
			return files[id];
		}, 'index.js');
		assert(out.includes('export default __entry;'), 'has a default export');
		assert(out.includes('require("lib/thing.js")'), 'rewrote the entry require');
		assert(out.includes('require("lib/n.js")'), 'rewrote the nested require');
	});

	throws('refuses a bare require', () =>
		bundleCjsToEsm((id) => (id === 'index.js' ? "require('fs')" : (() => { throw new Error('nope'); })()), 'index.js'),
	);

	ok('import map covers both gaps upstream leaves open', () => {
		const map = buildImportMap({ grannyWasm: '/n/g.js', rijndaelShim: '/v/r.mjs' });
		assert(map.imports['rijndael-js'] === '/v/r.mjs', 'rijndael-js');
		assert(map.imports['granny-ro-js/wasm'] === '/n/g.js', 'granny wasm');
		assert(map.imports['Core/'] === '/src/Core/', 'src alias');
	});

	const passed = results.filter(Boolean).length;
	console.log(`${passed}/${results.length} passed`);
	return results.every(Boolean) ? 0 : 1;
}

const argv = process.argv.slice(2);
if (argv.includes('--selftest')) {
	process.exit(selftest());
} else if (argv.includes('--help') || argv.length === 0) {
	console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 12).join('\n').replace(/^\/\/ ?/gm, ''));
	process.exit(argv.length === 0 ? 1 : 0);
} else {
	try {
		process.exit(main(argv));
	} catch (err) {
		console.error(`\nbuild-client: ${err.message}`);
		process.exit(1);
	}
}
