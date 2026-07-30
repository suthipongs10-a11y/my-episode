#!/usr/bin/env node
// =============================================================================
// check-client-protocol — do roBrowser and our rAthena agree on the wire?
// =============================================================================
//   node tools/check-client-protocol.mjs                 # PACKETVER from .env.example
//   node tools/check-client-protocol.mjs --packetver 20180307
//   node tools/check-client-protocol.mjs --sweep         # which versions agree at all
//
// WHY THIS HAD TO EXIST
//
// `tools/smoke-play.py` proves the server speaks the protocol. Nothing checked
// the client, and the client turns out to be the fragile half — for a reason
// that is invisible until you look:
//
// **From 2004 onward, official clients shuffle their packet ids every release.**
// rAthena tracks that in `src/map/clif_shuffle.hpp`, one block per client date.
// roBrowser tracks the same thing in `src/Network/PacketVersions.js`. The two
// only agree when `PACKETVER` is a date that appears in *both* tables — and
// there is no error when it isn't. rAthena parses the packet as whatever else
// that id happens to mean and the session quietly does nothing.
//
// Measured at PACKETVER=20180620, which is what we build today:
//
//   roBrowser sends 0x07E4 to enter the map. At 20180620 rAthena has that id
//   bound to clif_parse_ItemListWindowSelected. The client never enters.
//   roBrowser sends 0x0877 to walk. At 20180620 that id is bound to nothing.
//
// At 20180307 — a date both tables carry — rAthena binds 0x07E4 to
// clif_parse_WantToConnection and 0x0877 to clif_parse_WalkToXY. Same client,
// same server, one number different, and it works.
//
// HOW IT ANSWERS THAT
//
// The rAthena side is not hand-transcribed, because a hand-transcribed table is
// how this stayed hidden. `gcc -E` runs rAthena's own headers at the packetver
// in question with the macros redefined to print, so the answer comes from the
// same preprocessor the server is built with.
//
// Note that ids are compared case-insensitively: `clif_packetdb.hpp` writes
// 0x07e4 and `clif_shuffle.hpp` writes 0x07E4, and a case-sensitive match on
// those two reports the exact opposite of the truth. It did, once, here.
// =============================================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const REPO = path.resolve(path.dirname(SELF), '..');
const RATHENA = path.join(REPO, 'server', 'rathena');
const SRC = path.join(REPO, 'client', 'robrowser', 'src');

// -----------------------------------------------------------------------------
// the rAthena side: ask its own preprocessor
// -----------------------------------------------------------------------------

/**
 * Every map-server packet binding live at this PACKETVER.
 *
 * clif.cpp includes clif_packetdb.hpp then clif_shuffle.hpp, and
 * packetdb_addpacket overwrites by id, so later wins and the shuffle has the
 * final word. Reproduced here in that order for the same reason.
 */
export function deriveMapServerTable(packetver) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rathena-pdb-'));
	const cfile = path.join(dir, 'pdb.c');
	fs.writeFileSync(cfile, [
		`#define PACKETVER ${packetver}`,
		'#include "src/config/packets.hpp"',
		'#define packetdb_addpacket(cmd,length,func,...) EMIT cmd length func',
		'#include "src/map/clif_packetdb.hpp"',
		'#include "src/map/clif_shuffle.hpp"',
		'',
	].join('\n'));

	const res = spawnSync('gcc', ['-E', '-P', '-I', RATHENA, cfile], { encoding: 'utf8' });
	fs.rmSync(dir, { recursive: true, force: true });
	if (res.status !== 0 && !res.stdout) {
		throw new Error(`gcc could not preprocess rAthena's packet tables:\n${res.stderr}`);
	}

	const byId = new Map();      // id (lowercase hex) -> {len, handler}
	const byHandler = new Map(); // handler -> Map<id, len>
	for (const m of res.stdout.matchAll(/EMIT\s+(0x[0-9a-fA-F]+)\s+(-?\d+)\s+([A-Za-z_][A-Za-z0-9_]*)/g)) {
		const id = m[1].toLowerCase();
		const len = Number(m[2]);
		const handler = m[3];
		byId.set(id, { len, handler }); // last wins, as in clif.cpp
	}
	for (const [id, { len, handler }] of byId) {
		if (handler === 'nullptr') continue;
		if (!byHandler.has(handler)) byHandler.set(handler, new Map());
		byHandler.get(handler).set(id, len);
	}
	if (!byId.size) throw new Error('preprocessed rAthena but found no packet bindings');
	return { byId, byHandler };
}

/** Ids from smoke-play.py, which test-smoke-play.py pins against mock servers. */
export function readSmokePlayIds() {
	const text = fs.readFileSync(path.join(REPO, 'tools', 'smoke-play.py'), 'utf8');
	const ids = {};
	for (const m of text.matchAll(/^([A-Z][A-Z0-9_]*) = (0x[0-9A-Fa-f]+)\s*(?:#.*)?$/gm)) {
		ids[m[1]] = Number(m[2]);
	}
	return { ids, expectedPacketver: Number(text.match(/^EXPECTED_PACKETVER = (\d+)$/m)?.[1]) };
}

// -----------------------------------------------------------------------------
// the roBrowser side: import its real packet layer
// -----------------------------------------------------------------------------

// Client -> server, in the order smoke-play sends them. `handler` names the
// rAthena parser this packet has to reach; `login` marks the ones the
// login/char servers own, which are not in the map-server's table and are
// therefore compared against smoke-play instead.
const OUTGOING = [
	{ name: 'CA_LOGIN', pick: (P) => P.CA.LOGIN, login: 'CA_LOGIN' },
	{ name: 'CH_ENTER', pick: (P) => P.CH.ENTER, login: 'CH_ENTER' },
	{
		name: 'CH_MAKE_CHAR',
		// CharEngine.onCharCreationRequest picks by version; so must we, or the
		// check reports a failure that only exists in the check.
		pick: (P, pv) => (pv < 20120307 ? P.CH.MAKE_CHAR : pv < 20151001 ? P.CH.MAKE_CHAR2 : P.CH.MAKE_CHAR3),
		login: 'CH_MAKE_CHAR',
	},
	{ name: 'CH_SELECT_CHAR', pick: (P) => P.CH.SELECT_CHAR, login: 'CH_SELECT_CHAR' },
	{ name: 'CZ_ENTER', pick: (P) => P.CZ.ENTER, handler: 'clif_parse_WantToConnection' },
	{ name: 'CZ_NOTIFY_ACTORINIT', pick: (P) => P.CZ.NOTIFY_ACTORINIT, handler: 'clif_parse_LoadEndAck' },
	{ name: 'CZ_REQUEST_MOVE', pick: (P) => P.CZ.REQUEST_MOVE, handler: 'clif_parse_WalkToXY' },
	{ name: 'CZ_REQUEST_QUIT', pick: (P) => P.CZ.REQUEST_QUIT, handler: 'clif_parse_QuitGame', soft: true },
];

const INCOMING = [
	'AC_ACCEPT_LOGIN', 'AC_REFUSE_LOGIN', 'SC_NOTIFY_BAN',
	'HC_ACCEPT_ENTER', 'HC_ACCEPT_ENTER2', 'HC_REFUSE_ENTER',
	'HC_ACCEPT_MAKECHAR', 'HC_REFUSE_MAKECHAR', 'HC_CHARLIST_NOTIFY',
	'HC_BLOCK_CHARACTER', 'HC_NOTIFY_ZONESVR',
	'ZC_AID', 'ZC_ACCEPT_ENTER', 'ZC_REFUSE_ENTER', 'ZC_NOTIFY_PLAYERMOVE',
];

/**
 * What roBrowser would put on the wire at this packetver.
 *
 * Runs in a child process because PACKETVER.addSupport mutates the shared
 * packet prototypes and ESM caches modules — a second packetver in the same
 * process would read the first one's tables.
 */
function roBrowserIds(packetver) {
	const res = spawnSync(process.execPath, [SELF, '--emit-json', '--packetver', String(packetver)], {
		encoding: 'utf8',
	});
	if (res.status !== 0) {
		throw new Error(`could not read roBrowser's tables at ${packetver}:\n${res.stderr}`);
	}
	return JSON.parse(res.stdout.slice(res.stdout.indexOf('{')));
}

async function emitJson(packetver) {
	register(pathToFileURL(path.join(REPO, 'tools', 'robrowser-loader.mjs')).href, {
		parentURL: import.meta.url,
		data: { srcRoot: SRC },
	});
	// Core/Configs.js reads window.ROConfig at module scope. It is the only
	// browser API the packet layer touches.
	globalThis.window = { ROConfig: { packetver, servers: [{ packetver }] } };

	const PACKET = (await import('Network/PacketStructure.js')).default;
	const PacketVersions = (await import('Network/PacketVersions.js')).default;
	const PACKETVER = (await import('Network/PacketVerManager.js')).default;
	const PacketRegister = (await import('Network/PacketRegister.js')).default;

	// Exactly what Network/NetworkManager.js does at module load.
	for (const date of Object.keys(PacketVersions)) {
		PACKETVER.addSupport(date, PacketVersions[date]);
	}
	PACKETVER.value = packetver;

	const out = { packetver, outgoing: {}, registered: [] };
	for (const spec of OUTGOING) {
		let ctor;
		try {
			ctor = spec.pick(PACKET, packetver);
		} catch {
			ctor = null;
		}
		if (!ctor) {
			out.outgoing[spec.name] = null;
			continue;
		}
		try {
			const built = new ctor().build();
			const bytes = new Uint8Array(built.buffer ?? built);
			out.outgoing[spec.name] = { id: bytes[0] | (bytes[1] << 8), len: bytes.length };
		} catch (err) {
			out.outgoing[spec.name] = { error: err.message };
		}
	}
	out.registered = Object.keys(PacketRegister).map(Number);
	process.stdout.write(JSON.stringify(out));
	return 0;
}

// -----------------------------------------------------------------------------
// comparison
// -----------------------------------------------------------------------------

const hex = (n) => (n === undefined || n === null ? '?' : '0x' + n.toString(16).padStart(4, '0'));

function compare(packetver, { verbose = true } = {}) {
	const { ids, expectedPacketver } = readSmokePlayIds();
	const { byHandler } = deriveMapServerTable(packetver);
	const client = roBrowserIds(packetver);
	const registered = new Set(client.registered);

	const rows = [];
	const fatal = [];
	const soft = [];

	for (const spec of OUTGOING) {
		const got = client.outgoing[spec.name];
		if (!got || got.error) {
			rows.push([spec.name, got?.error ? 'threw' : 'absent', '-', '-', 'MISSING']);
			fatal.push(`roBrowser cannot build ${spec.name}`);
			continue;
		}
		if (spec.handler) {
			const accepted = byHandler.get(spec.handler) ?? new Map();
			const want = accepted.get(hex(got.id));
			const ok = want !== undefined && (want === got.len || want === -1);
			rows.push([
				spec.name, hex(got.id), String(got.len),
				[...accepted].map(([i, l]) => `${i}/${l}`).join(' ') || '(none)',
				ok ? 'ok' : 'MISMATCH',
			]);
			if (!ok) {
				const bound = byHandler.size
					? [...byHandler].find(([, m]) => m.has(hex(got.id)))?.[0]
					: null;
				(spec.soft ? soft : fatal).push(
					`${spec.name}: roBrowser sends ${hex(got.id)} (${got.len}B); rAthena at ${packetver} ` +
					`has that id bound to ${bound ?? 'nothing'}, and reaches ${spec.handler} via ` +
					`${[...accepted.keys()].join(', ') || 'no id at all'}`,
				);
			}
			continue;
		}
		const want = ids[spec.login];
		const ok = got.id === want;
		rows.push([spec.name, hex(got.id), String(got.len), `${hex(want)} (smoke-play)`, ok ? 'ok' : 'MISMATCH']);
		if (!ok) fatal.push(`${spec.name}: roBrowser sends ${hex(got.id)}, smoke-play expects ${hex(want)}`);
	}

	const missingParsers = INCOMING.filter((n) => ids[n] !== undefined && !registered.has(ids[n]));

	if (verbose) {
		console.log(`\npacketver ${packetver}`);
		console.log(`  rAthena bindings: preprocessed from server/rathena at this version`);
		console.log(`  login/char ids:   tools/smoke-play.py, verified for ${expectedPacketver}\n`);
		table(['client -> server', 'roBrowser', 'len', 'rAthena accepts (id/len)', ''], rows);
		console.log('\n  server -> client: roBrowser has a parser for every id we send:',
			missingParsers.length ? `NO — missing ${missingParsers.join(', ')}` : `yes, all ${INCOMING.length}`);
	}
	if (missingParsers.length) fatal.push(`no parser for: ${missingParsers.join(', ')}`);

	return { fatal, soft, rows };
}

function table(header, rows) {
	const all = [header, ...rows];
	const w = header.map((_, i) => Math.max(...all.map((r) => String(r[i] ?? '').length)));
	const line = (r) => '  ' + r.map((c, i) => String(c ?? '').padEnd(w[i])).join('  ');
	console.log(line(header));
	console.log('  ' + w.map((n) => '-'.repeat(n)).join('  '));
	for (const r of rows) console.log(line(r));
}

// Dates roBrowser's own PacketVersions.js carries an entry for, in the eras we
// would plausibly run. A packetver outside this set means roBrowser falls back
// to an older shuffle than the server uses, which is the whole failure mode.
const SWEEP = [20130618, 20151104, 20170830, 20180103, 20180307, 20180308, 20180620, 20190904, 20200902, 20211103];

function sweep() {
	console.log('Which PACKETVER lets roBrowser and our rAthena agree?\n');
	const rows = [];
	for (const pv of SWEEP) {
		let verdict, detail;
		try {
			const { fatal, soft } = compare(pv, { verbose: false });
			verdict = fatal.length ? `${fatal.length} fatal` : soft.length ? `ok (${soft.length} minor)` : 'ok';
			detail = fatal.length ? fatal[0].split(':')[0] : '';
		} catch (err) {
			verdict = 'error';
			detail = err.message.split('\n')[0];
		}
		rows.push([String(pv), verdict, detail]);
	}
	table(['packetver', 'verdict', 'first problem'], rows);
	console.log('\n"fatal" means a packet on the login-to-walking path does not reach its');
	console.log('handler. Minor means something off that path — quitting, usually.');
	return 0;
}

// -----------------------------------------------------------------------------

async function main() {
	const argv = process.argv.slice(2);
	if (!fs.existsSync(SRC)) {
		console.error(`no roBrowser source at ${SRC}\nrun:  git submodule update --init --recursive`);
		return 2;
	}
	const pvArg = argv.indexOf('--packetver');
	const packetver = pvArg !== -1
		? Number(argv[pvArg + 1])
		: Number(fs.readFileSync(path.join(REPO, '.env.example'), 'utf8').match(/^PACKETVER=(\d+)$/m)?.[1]);

	if (argv.includes('--emit-json')) return emitJson(packetver);
	if (argv.includes('--sweep')) return sweep();

	if (!Number.isInteger(packetver)) throw new Error('could not determine a packetver');
	const { fatal, soft } = compare(packetver);

	console.log();
	for (const s of soft) console.log(`  minor: ${s}`);
	if (!fatal.length) {
		console.log(`\nthe two agree on every packet from login to walking at ${packetver}`);
		return 0;
	}
	console.log(`\n${fatal.length} fatal mismatch(es) at ${packetver}:`);
	for (const f of fatal) console.log(`  - ${f}`);
	console.log('\nA mismatch here does not raise an error at runtime. rAthena parses the id');
	console.log('as whatever else it means and the client waits forever. Run --sweep to see');
	console.log('which versions agree.');
	return 1;
}

main().then(
	(code) => process.exit(code),
	(err) => {
		console.error(`check-client-protocol: ${err.stack ?? err.message}`);
		process.exit(1);
	},
);
