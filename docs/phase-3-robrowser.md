# The PC client, take two: roBrowser Electron

**Status: built and packaged; not yet played.** Everything below has been run
end to end on Linux — staged, packaged, launched, module graph verified. What
has *not* happened is a human logging in from a Windows desktop with real GRFs.
That is the gate, and it is the first thing to do (§Run it).

`CLAUDE.md` §3b.4 was chosen on 2026-07-30, after two days on a Gravity binary
that would not start. This is the replacement PC client.

---

## What this is, in one paragraph

roBrowser is a Ragnarok client written in JavaScript and WebGL. It has an
Electron target, which means it packages into an ordinary Windows folder with
an `.exe` in it — a normal download, not a browser tab and not an install. It
reads **the GRF files you already have** off local disk and connects to rAthena
over **raw TCP**. No web server, no asset upload, no CDN, no proxy. From the
player's side it is the same deal as the ragexe: unzip, run, play.

---

## Two findings that changed the plan

Both were measured in the source, not assumed. Both are why this is a build
script and not a paragraph in a README.

### 1. Electron does not need the WebSocket bridge

The previous session's conclusion was that roBrowser needs a WebSocket↔TCP
proxy, because browsers cannot open TCP sockets. True in a browser. **False in
Electron.**

`applications/electron/preload.mjs` hands the page a real `net.Socket` over the
context bridge, and `src/Network/NetworkManager.js` picks it whenever it is
there:

```js
function defaultSocketFactory(host, port) {
    if (NodeSocket.isSupported()) {   // window.electronAPI?.isElectron
        return new NodeSocket(host, port, proxy);
    }
    return new WebSocket(host, port, proxy);
}
```

So `/proxy` stays dormant. I had said I would build the bridge out for this
path; that was wrong, and building it would have been work the path never
executes. It is still the right thing to have for a *browser* client, which is
the only reason `CLAUDE.md` §5 keeps the skeleton.

The corollary is the uncomfortable one: **this client speaks raw TCP, exactly
like the ragexe and (probably) like RoPlay.** It does not improve the DDoS
position in `CLAUDE.md` §3c one bit.

### 2. Upstream's packaged Electron build cannot reach its own login window

This one would have cost a morning.

A packaged Electron build serves raw ES modules over the `app://` protocol —
there is no bundler in that path. `applications/electron/main.js` rewrites
roBrowser's own aliases (`Core/`, `Loaders/`, …) and everything else has to be
covered by the page's import map. Upstream's map
(`applications/shared/importmap.js`) covers `bson` and `lodash`. It does not
cover these:

```
Engine/LoginEngine.js   -> Utils/Rijndael.js        -> rijndael-js
Renderer/MapRenderer.js -> GR2/GR2ModelRenderer.js  -> granny-ro-js/wasm
```

Both are **static** imports on the startup path. An unresolvable static import
does not fail the feature — it fails the whole module graph at load. The
symptom is a black window and silence. (Recognise it? That is the empty error
box from `docs/phase-1-client.md`, rebuilt in JavaScript.)

`rijndael-js` is additionally CommonJS. No import map can make a browser
understand `module.exports`, so pointing at it is not enough either.

It works under `npm run electron:dev` because Vite resolves bare specifiers
itself. That is why the gap survived upstream: the dev loop never sees it.

**What we do about it.** `client/build-client.mjs` flattens `rijndael-js` to a
single ESM file at build time, resolves `granny-ro-js/wasm` through its
`exports` map, emits an import map covering both, and adds both packages to the
packaged `files:` list. `tools/check-client-imports.mjs` then walks the graph
and fails if any specifier is unreachable — so the next submodule bump cannot
quietly reintroduce it.

---

### 3. The server was on the wrong packetver, and it would have been silent

Found after the build, by writing `tools/check-client-protocol.mjs`.

Official clients **shuffle their packet ids every release**. rAthena keeps that
in `src/map/clif_shuffle.hpp`, one block per client date; roBrowser keeps it in
`src/Network/PacketVersions.js`. They agree only on dates in **both** tables.

We built `PACKETVER=20180620`. roBrowser's newest table is `20180307`. So:

| roBrowser sends | to reach | what rAthena at 20180620 does with it |
|---|---|---|
| `0x07E4` | enter the map | parses it as `clif_parse_ItemListWindowSelected` |
| `0x0877` | walk | nothing — the id is bound to no handler |

No error, on either side. The account logs in, the character list appears, and
then the character never arrives on a map.

`PACKETVER` is now **20180307**, the newest value where both agree. Two ids moved
in `tools/smoke-play.py` with it (`CZ_ENTER`, `CZ_REQUEST_MOVE`) and
`tools/test-smoke-play.py` still passes. `server/import/src/custom/defines_pre.hpp`
zeroes the obfuscation keys, because every version roBrowser agrees with sits
inside the era where rAthena would otherwise scramble ids.

`node tools/check-client-protocol.mjs --sweep` is the tool to run before that
number is ever touched again. `CLAUDE.md` §12a carries the consequence, which is
uncomfortable: this caps the PC client at a 2018 client era, and §8b says the
server we want parity with runs 2025.

---

## How it is wired

```
client/robrowser/          the submodule, pinned. NEVER written to.
client/overlay/            our two templates
client/client.env          your settings (gitignored)
client/build-client.mjs    stage -> configure -> run or package
client/.build/robrowser/   the staged copy everything happens in (gitignored)
```

The submodule stays pristine (`CLAUDE.md` §2.5, §2.6). Each build copies it to
`client/.build/robrowser`, excluding `.git`, `node_modules` and `dist`, then
writes the generated files over the copy. `node_modules` survives between
builds, so the ~100 MB Electron download is paid once.

Two files are generated, both from templates in `client/overlay/`:

| Generated | From | Why it cannot be committed |
|---|---|---|
| `applications/electron/index.html` | `index.html.template` | Holds the server address and the import map. `CLAUDE.md` §2.1. |
| `applications/electron/electron-builder.local.yml` | `electron-builder.yml.template` | Holds the app name and the corrected `files:` list. |
| `applications/electron/vendor/rijndael-js.mjs` | the installed package | The CommonJS→ESM flattening described above. |

The path `applications/electron/index.html` is not a choice — upstream's
`main.js` loads it verbatim.

`preload.mjs` is **appended to**, not replaced: a few lines that expose the
app's own directory so a relative GRF path can be resolved at startup. Appending
means an upstream change to that file still reaches us rather than being
shadowed by a stale copy — the same reason nothing else here is a fork.

---

## Run it

You need **Node 22+** on the Windows machine. Nothing else — no Python, no
Visual Studio, no DirectX runtime, no WARP.

```
git clone <repo> C:\ro
cd C:\ro
git submodule update --init --recursive

copy client\client.env.example client\client.env
notepad client\client.env
```

Fill in at minimum:

```
RO_SERVER_ADDRESS=play.yourdomain.com
RO_CLIENT_GRF_LIST=C:\Games\Ep4Client2\data.grf
```

Then, **unpackaged first** — it starts in seconds and you can see everything:

```
node client\build-client.mjs --run
```

`Ctrl+Shift+I` opens DevTools. If anything fails, it lands on screen in red
rather than vanishing; set `RO_CLIENT_CONSOLE=1` in `client.env` for the full
log. Once it works:

```
node client\build-client.mjs --win
```

The result is `client\.build\robrowser\dist\Desktop\win-unpacked\`.

### Making it a download somebody else can use

An absolute `RO_CLIENT_GRF_LIST` is right for your own machine and wrong for
everybody else's. For the build you hand out, make the path **relative** —
it is resolved at startup against the folder the player unzipped into:

```
RO_CLIENT_GRF_LIST=game\data.grf
```

Then put the archive at `win-unpacked\game\data.grf` and package:

```
node client\build-client.mjs --win --zip
```

That writes the zip and a `.sha256` beside it. Publish the hash with the
download — players in this scene routinely disable antivirus to run our
binaries, and a published hash is the only way one of them can tell our file
from somebody else's (`CLAUDE.md` §11).

The client itself is about 120 MB. The GRF is the rest, and it is most of it.

### Before you wonder why nothing connects

**The game ports must be publicly reachable.** Our stack binds them to loopback
(`GAME_PORTS_BIND=127.0.0.1` in the server `.env`) which is correct while
nothing outside the box needs them. This client does.

```
GAME_PORTS_BIND=0.0.0.0
```

then `docker compose up -d` and open 6900/6121/5121 in the firewall. Read
`CLAUDE.md` §3c first: this is precisely the exposure the original design
existed to avoid, and doing it deliberately is fine — doing it without noticing
is not.

`tools/smoke-play.py` already proves the protocol path from *inside* the box. If
the client cannot connect but `smoke-play` passes, the problem is the port
binding or the firewall, not the server.

---

## What is verified, and what is not

Run on Linux, 2026-07-30, against submodule `e84bfdc`:

| Checked | How | Result |
|---|---|---|
| Config generation, GRF list parsing, feature flags | `node client/build-client.mjs --selftest` | 14/14 |
| `rijndael-js` flattens to working ESM | imported the generated shim in Node, CBC encrypt→decrypt round trip | byte-identical |
| Generated `index.html` is well formed | import map and `ROConfig` both parse as JSON | 19 import-map entries |
| Packaging | `--linux` through electron-builder 26.15.3, Electron 41.10.3 | `linux-unpacked` produced, all four required `node_modules` shipped |
| The packaged app starts | launched under Xvfb | ran to timeout, reached `Utils/ConsoleManager.js` |
| The whole module graph resolves | `tools/check-client-imports.mjs` | 1,444 modules, zero unresolved |
| That check actually catches the bug | same check against an import map with our two entries removed | fails, naming all 4 import sites |
| A relative GRF path follows the app | packaged with `game/data.grf`, launched, logged the resolved path | resolved to `<unpacked>/game/data.grf` |
| Zip and hash | `--linux --zip` | 116.5 MB zip plus a `.sha256` |

**Not verified, and these are the real risks:**

- **Nobody has logged in.** No account, no character, no map. That is the gate.
- **Windows.** Everything above ran on Linux. Electron is cross-platform and
  the build is the same, but `--win` has not been executed on Windows.
- **Our GRF.** roBrowser reads GRF 0x200 and 0x300. `tools/client-doctor.py`
  reported `Ep4Client2`'s archive clean and unencrypted, which is the good case,
  but roBrowser's reader is not the doctor's reader.
- **packetver 20180620 under pre-renewal.** roBrowser's packet tables are
  generated per version; this combination is less travelled than the 2013 and
  2025 demos upstream ships.

---

## Known limits, so they are not discovered as bugs

- **GRF only.** In Electron, roBrowser reads the archives named in
  `RO_CLIENT_GRF_LIST` and nothing else. Loose files in a `data\` folder are
  ignored — which also means `sclientinfo.xml`, `DATA.INI` overrides and any
  hand-edited `msgstringtable.txt` do not apply here.
- **BGM probably will not play.** Music ships as loose `.mp3` in `BGM\`, and
  that is a loose folder.
- **The address is compiled in.** Use a hostname, not an IP, so moving hosts
  stays a DNS change (`CLAUDE.md` §4). `asar: false` keeps the generated
  `index.html` readable inside the shipped folder, so an emergency correction
  does not need a re-release — but a rebuild is the intended route.
- **Feature panels default off.** Achievements, bank, cash shop, attendance,
  homunculus auto-feed, roulette. Each talks to the server; enabling one our
  build does not answer is a way to break a client that was working. Turn them
  on from `RO_CLIENT_FEATURES` one at a time, after a character walks.
- **It does not look like the ragexe.** It is a faithful reimplementation, not
  the same renderer. For a server that cannot otherwise be played on a PC, that
  is the correct trade.

---

## Where this leaves the phase plan

Phase 3's gate in `CLAUDE.md` is *"a clean Windows machine downloads the zip,
extracts, and connects."* This path can meet it without Gravity's binary, and
without spending anything.

It does **not** close §3b entirely. A real ragexe still looks better, still
supports Gepard, and is still what `docs/client-debug-plan.md` was working
toward — the trace stopped at `C:\_tmpskin_`, which is a live lead, not a dead
one. But the ragexe is no longer on the critical path, and that is the whole
point of §11.

And it changes nothing about mobile. RoPlay is still the answer there, and the
eight questions in `docs/vendor-roplay.md` are still unanswered.
