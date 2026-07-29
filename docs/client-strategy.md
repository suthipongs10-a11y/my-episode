# The client, reconsidered

*Written 2026-07-29, after a full day spent failing to make a diffed ragexe start.*

The operator asked a fair question: is there really nowhere in the world that
ships a matched server and client, same version, playable on both PC and phone?
And would dropping the Episode 4.0 target make the client problem easier?

The answers are **yes there is**, and **no — Ep4 was never what blocked us**.

This document records what we were actually stuck on, what exists upstream that
we did not know about, and what changes in the plan as a result. It contradicts
several decisions in `CLAUDE.md`; per §8 those are named here rather than worked
around silently.

---

## 1. What we were stuck on, stated precisely

We spent the day trying to produce a **Windows executable**: a 2018-06-20
RagexeRE, diffed with WARP, fed a data folder assembled from kRO plus
ROenglishRE plus hand-written Lua stubs. It got as far as satisfying
`CPetEvolutionMgr`, `CCheckAttendanceMgr`, `CAchievementMgr` and
`CPrivateAirplaneMgr`, then died on an empty message box.

That work was aimed at `CLAUDE.md` Phase 1's gate:

> **Gate:** a standard PC client connects, creates a character, walks around.
> Baseline must work *before* we touch the browser layer. Do not skip this.

**That gate is the mistake.** It puts the hardest, least-controllable artifact
in the project — a closed-source Gravity binary that we cannot debug, whose only
error channel is a message box with no text — in front of everything else. And
it does so for a reason that does not survive inspection: the assumption that
"PC client" means "ragexe".

The server itself was never in doubt. `tools/smoke-play.py` logs in, creates a
character and walks it over the real wire protocol, and has passed on the live
VPS since before this started. **We have a working server and no way in.** That
is exactly the position the operator objected to, and they were right to.

---

## 2. What we did not know: roBrowser is not only a browser client

We had roBrowser filed as "the mobile path" — Phase 3 onwards, after the PC
client works. A clone of `MrAntares/roBrowserLegacy` at master shows that
framing is wrong. The repo's own build targets:

```
$ ls applications/
api  browser-examples  electron  pwa  shared  tools

$ npm run          # abridged
  build:pwa            build -- --O --T --PWA
  electron:build:win   electron-builder --config .../electron-builder.yml --win
  electron:build:linux electron-builder --config .../electron-builder.yml --linux
  electron:build:mac   electron-builder --config .../electron-builder.yml --mac
```

`applications/electron/` contains `main.js`, `preload.mjs`, `index.html`,
`icon.png` and `electron-builder.yml`. It is a real, maintained desktop target.

**So the PC client does not have to be a ragexe.** It can be roBrowser packaged
as a desktop application — the same rendering engine, the same protocol code,
the same asset loader as the phone build, shipped as a downloadable folder.

That single fact removes, at once:

| Problem we had | Why it disappears |
|---|---|
| Empty `Error` box in `Ep4RO.exe` | no ragexe |
| WARP diffing, patch hunting | no ragexe |
| `CPetEvolutionMgr` &co. Lua stubs | roBrowser has `enableAchievements`, `enableCheckAttendance` as plain config booleans |
| Gepard / v3hunt / GameGuard lock-in | not a Gravity binary |
| Client-side hardcoded kRO addresses | roBrowser is configured in JavaScript |
| The `/launcher` TCP→WSS tunnel (`CLAUDE.md` §3a) | roBrowser speaks WebSocket natively — there is no raw TCP to tunnel |
| Unsigned-binary antivirus warnings, SHA-256 publishing, CI-signed releases | still applies to an Electron build, but it is an ordinary app, not a patched game binary |

The `/launcher` component in §3a exists solely to let an unmodified ragexe reach
a WSS endpoint. Remove the ragexe and the launcher has nothing to do. §3a's
*goal* — one ingress, everything over 443, `GAME_PORTS_BIND=127.0.0.1` true in
production — is not just preserved, it is reached more simply.

---

## 3. The mobile UI already exists upstream

`CLAUDE.md` Phase 5 specifies building a mobile UI layer in `/ui`: virtual
joystick, hotkey bar, skill buttons. `src/UI/Components/MobileUI/` is already
that, in-tree, ~1900 lines across `MobileUI.js`, `.css` and `.html`, plus
`src/Core/Mobile.js` ("Help to handle touch devices", gestures, pinch-zoom,
delayed-click detection).

From `MobileUI.html`: a joystick (`joystickContainer` / `joystickBase` /
`joystickThumb`), F1–F9, 1–9, QWERTYUIO, ASDFGHJKL, pickup, talk-to-NPC,
shortcut-switch, attack, sit, fullscreen, auto-follow and auto-target toggles.

Phase 6's PWA shell likewise exists: `applications/pwa/manifest.webmanifest`
declares `"display": "fullscreen"`, icons, screenshots and
`display_override: ["window-controls-overlay"]`.

Neither is proof of *quality* — reading markup is not playing a game on a phone.
But Phases 5 and 6 are no longer "build it"; they are "evaluate it, then extend
it through the plugin system". That is a much smaller and much later job, and it
is consistent with Phase 5's own rule of never forking roBrowser's UI.

---

## 4. The matched server + client, one command, does exist

`docker-compose.AIO.yaml` in the roBrowser repo brings up MariaDB, an rAthena
builder, login / char / map / web servers, the Vite dev server, `wsproxy.js`,
and a PHP remote client that serves GRF assets over HTTP — in one file, with the
packetver set in one place:

```yaml
BUILDER_CONFIGURE: '--enable-packetver=20250618'   # <- Configure your wanted packet version here
```

We should not adopt it: it publishes ports 3306/6900/6121/5121 to the host, runs
the servers as a `sh -c` chmod-and-poll loop, and bind-mounts a working copy of
rAthena rather than tracking upstream — all of which our `infra/` already does
properly and which `CLAUDE.md` §2 forbids. Its value is as **evidence**: this
combination is a solved problem that people run, not something we would be first
to attempt.

The same repo's README links a live demo and a `#robrowser-servers` Discord
channel of servers running it in production.

---

## 5. What the demo config tells us about version choice

`applications/pwa/Config.js`, the shipped default:

```js
servers: [{
    display:    'roBrowser Demo Server',
    address:    '127.0.0.1',
    port:       6900,
    packetver:  20130618,
    renewal:    false,
    packetKeys: false,
    socketProxy: 'wss://connect.robrowser.com',
    remoteClient: 'https://grf.robrowser.com/',
    worldMapSettings: { episode: 12 },
}],
enableAchievements:    false,
enableCheckAttendance: false,
enableCashShop:        false,
```

Four things worth extracting:

1. **Their own demo is `packetver: 20130618`, `renewal: false`.** Pre-renewal,
   2013. The upstream docs say plainly: *"all client/packet versions are
   supported, but the number of missing features increases with higher dates"*
   and recommend pre-2015.
2. **`packetKeys: false`.** The docs are explicit: *"Disable packet_obfuscation
   on the game server. (Not supported yet, causes invalid packets)"*.
3. **A public remote client and a public wsProxy exist**, so roBrowser can be
   tested with no assets and no proxy of our own.
4. **`worldMapSettings.episode` is cosmetic.** Grepping for it finds only
   `src/UI/Components/WorldMap/WorldMap.js` — it filters which maps are drawn on
   the world map screen. It is not a content cut and does not do Phase 2's job.

### Our packetver is already compatible — verified in our own tree

roBrowser's one hard server-side requirement is no packet obfuscation. From
`server/rathena/src/map/clif_obfuscation.hpp`:

```c
#elif PACKETVER == 20180307              // 2018-03-07bRagexeRE
    packet_keys(0x47DA10EB,0x4B922CCF,0x765C5055);
#elif PACKETVER > 20180307               // Clients after 2018-03-07bRagexeRE do not obfuscate packets anymore
    packet_keys(0x00000000,0x00000000,0x00000000);
```

and the decode in `clif.cpp`:

```c
cmd = (cmd ^ ((((clif_cryptKey[0] * clif_cryptKey[1]) + clif_cryptKey[2]) >> 16) & 0x7FFF));
```

With all three keys zero the mask is zero and the XOR is the identity. **Our
`PACKETVER=20180620` build already emits and accepts unobfuscated packet IDs.**
Nothing needs rebuilding to try roBrowser against the server we have.

`src/Network/Packets/packets2018_len_main.js:5630` references `20180620`
specifically, so roBrowser knows the version by name.

### If we later want to drop to 2013

Below 2018-03-07 the keys are real, and `packets.hpp` defines
`PACKET_OBFUSCATION` unconditionally — there is no `-D` flag that turns it off.
The supported route is `src/custom/defines_pre.hpp`, which rAthena ships for
exactly this and which `CLAUDE.md` §2.6 therefore permits:

```c
#define PACKET_OBFUSCATION_KEY1 0
#define PACKET_OBFUSCATION_KEY2 0
#define PACKET_OBFUSCATION_KEY3 0
```

This is a clean disable at any packetver, without patching an upstream file.

---

## 6. Does dropping Episode 4.0 make this easier?

**No, because Ep4 is not on the client's critical path.** The content cut is a
server-side filter over `item_db.yml`, `mob_db.yml`, mapcache and warps. It does
not decide whether anything can connect. Phase 1's server gate passed weeks
before the client work started.

There is, however, something worth dropping, and it is not Ep4:

- **Drop the ragexe.** §3 above.
- **Drop the phase ordering that put it first.** Phase 1's PC-client gate should
  be replaced by a roBrowser gate. Nothing downstream depended on the ragexe
  except the launcher, which also goes.

The one place Ep4 and the client genuinely interact is Phase 2's note that "both
clients must see the same content" — a ragexe ships its own item names and map
list, so a server-side cut shows up as wrong names rather than errors. With
roBrowser as the only client, **that entire class of mismatch disappears**: one
client, reading one set of assets we control, from our own remote client. Phase
2 gets easier, not harder.

So: keep Ep4 as the content target. Change the client, and change the order.

---

## 7. Proposed changes to `CLAUDE.md`

Stated for a deliberate decision, not applied yet.

| Section | Change |
|---|---|
| **§3a** | Delete the launcher/tunnel design. Replace with: both clients are roBrowser (PWA and Electron), both speak WSS/443 natively, one ingress by construction. Keep the release-integrity rules — CI-built from a tag, published SHA-256, HTTPS-only, our domain — they apply unchanged to an Electron build. |
| **§5** | `/launcher` goes. `/client` becomes a roBrowser submodule plus our config and plugins. |
| **Phase 1 gate** | Replace "a standard PC client connects" with the smoke-play gate, which already passes and tests the same protocol path more reliably than a human clicking through a client. |
| **Phase 3** | Becomes the real client gate: roBrowser reaches character-select and walks, against our server, in a desktop browser. |
| **Phase 4** | The PC download becomes an Electron build, not a zip of ragexe + GRF + launcher. |
| **Phase 5** | From "build a mobile UI" to "evaluate upstream's MobileUI, extend via plugins". |
| **Phase 6** | From "build a PWA shell" to "configure and verify upstream's". |
| **§8a** | EternalRO stays a reference for *feel*, but is no longer a client we need to unpack. |

The DDoS position in `docs/threat-model.md` is unaffected and slightly improved:
with no raw-TCP client, `GAME_PORTS_BIND=127.0.0.1` has no exception to carve
out.

---

## 8. Fastest path to "someone can play", in order

Each step is only started if the one before it worked. The first two cost
almost nothing and answer the two questions that actually matter.

1. **Does RO run on the operator's phone at all?**
   Open the public roBrowser demo on the phone. No repo, no server, no assets.
   If the answer is no, everything below is moot and we find out in two minutes
   instead of two weeks. *(Not verifiable from this dev environment — its
   network policy blocks the domain, same as `eternal-origin.com` in §8a.)*

2. **Does roBrowser talk to _our_ server?**
   Point a local roBrowser at the VPS with `packetver: 20130618`→`20180620`,
   `renewal: false`, `packetKeys: false`, using the public remote client for
   assets. Reaching the character-select screen proves protocol compatibility
   before we own any asset hosting.

3. **Stand up our own wsProxy and remote client** in `infra/`, behind Caddy, on
   443. This is Phase 3's real work and where `CLAUDE.md` §3's rules
   (stateless proxy, keepalive under 60s, per-connection rate limiting,
   connection metadata logging) get implemented.

4. **Decide the packetver on evidence.** Stay at 20180620 if coverage is good —
   it costs nothing and the server is already proven. Drop to ~20130618 if it is
   not, paying a rebuild, a `defines_pre.hpp` change and a regenerated
   `tools/smoke-play.py` packet table.

5. **Electron build** for PC players. `npm run electron:build:win`.

6. **Then Phase 2**, the Ep4 content cut, against a stack somebody can log into.

---

## 9. What is not yet verified

Honesty about the gap between "found in the source" and "seen working":

- Nobody has played roBrowser on a phone. The MobileUI was read, not used.
- iOS Safari WebGL performance is untested and is the stated constraint in
  `CLAUDE.md` §7, not an afterthought.
- roBrowser's feature coverage at packetver 20180620 is unmeasured. "More
  missing features at higher dates" is upstream's phrasing; we do not know
  which features, or whether any of them matter for Ep4 content.
- The demo URL and `grf.robrowser.com` could not be reached from this
  environment to confirm they are live.
- Whether the operator's `kRO_FullClient_20210406` GRFs load: roBrowser accepts
  GRF `0x200` and `0x300` and rejects encrypted entries
  (`src/Loaders/GameFile.js:140`, `:229`). Untested against those specific files.
- Electron's bundle size, and whether an unsigned Electron app draws the same
  antivirus warnings as a patched ragexe. Probably fewer; not confirmed.

None of these block step 1, which is the point of ordering it first.
