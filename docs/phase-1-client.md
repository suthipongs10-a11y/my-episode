# Phase 1 — the client for the gate

**Gate (CLAUDE.md §6):** a standard PC client connects, creates a character, and
walks around. Not a browser. The browser layer is Phase 3, and chasing it before
this passes means debugging two unknowns at once.

> **The PC client is not only a test harness — it ships** (CLAUDE.md §1). What
> changes after Phase 1 is how it connects, not whether it exists. For this gate
> it dials the game ports directly, which is why they are opened temporarily.
> In production it goes through the launcher instead: `clientinfo.xml` points at
> `127.0.0.1`, a small tunnel in the client folder carries the stream to the same
> WSS endpoint the browser uses, and the game ports stay shut (§3a). So treat
> everything below about diffing and `clientinfo.xml` as work that carries
> forward — only the `<address>` changes.

This document is what to have ready. It is written against the build that is
already compiled and in CI, so the version numbers here are facts about our
binaries, not suggestions.

---

## The exact client

**`2018-06-20`, any letter revision, `RagexeRE`** — the `RE` suffix matters, see
below; the letter does not.

Our servers are compiled with `PACKETVER=20180620` (`.env`, consumed as a build
arg). The client's packet layout must match that number exactly. A mismatch is
not a graceful error: the client connects and is dropped, usually with no useful
message on either side.

**The letter after the date — `a`, `b`, … `e` — is not part of the match.**
rAthena's `PACKETVER` is a bare integer date, so `2018-06-20aRagexeRE` and
`2018-06-20eRagexeRE` are the same client as far as our build is concerned.
Whichever you have is the right one.

Changing it is a rebuild, not a config edit — `PACKETVER` is a compile-time
`-D` flag. If you must:

```
.env:  PACKETVER=<new date>
then:  Deploy to VPS  with  rebuild = true
```

### Why `RagexeRE` and not `Ragexe`

`src/config/packets.hpp`:

```c
#if ( PACKETVER > 20151104 && PACKETVER < 20180704 ) || ( PACKETVER >= 20200902 && PACKETVER <= 20211118 )
    #define PACKETVER_RE
#endif
```

`20180620` falls inside the first range, so our binaries are built expecting the
**RE** packet structures. A plain `2018-06-20aRagexe` speaks slightly different
ones for some packets and will misbehave in ways that look random.

This is purely about packet layout. It has nothing to do with Renewal game
mechanics — those are the separate `RENEWAL` define, which our build does **not**
set. CI checks that on every build by inspecting the compiled binary.

### The good news: no packet obfuscation to fight

This is normally where Phase 1 goes wrong for a day. It does not apply to us.
From `src/map/clif_obfuscation.hpp`:

```c
#elif PACKETVER > 20180307 // Clients after 2018-03-07bRagexeRE do not obfuscate packets anymore
    packet_keys(0x00000000,0x00000000,0x00000000);
```

`20180620` is past that cutoff, so the keys are zero and obfuscation is a no-op
on our side. You do **not** need to match encryption keys, and you do not need
the "Disable Packet Encryption" diff to line up with a server setting.

If you somehow do get a mismatch, rAthena says so in plain words rather than
leaving you guessing — watch `map1`'s log for either of:

```
It looks like you have enabled PACKET_OBFUSCATION on server side, but disabled it on client side.
It looks like you have disabled PACKET_OBFUSCATION on server side, but enabled it on client side.
```

---

## What you have to assemble

Three parts. Only the third comes from us.

| Part | What | Where it comes from |
|---|---|---|
| Executable | `2018-06-20aRagexeRE`, diffed | you |
| Game data | the GRF set, or an extracted `data/` folder | you |
| `clientinfo.xml` | points the client at our server | below |

**We cannot supply the first two and this repository never will.** They are
Gravity's, CLAUDE.md §2.3 keeps them out of the repo entirely, and §9 is honest
that running a server on them is the operator's risk to take. Source them from
your own installation.

### Checking an executable is diffable before you try

Gravity ships `ragexe` wrapped in Themida, and a packed executable cannot be
diffed — WARP finds none of its byte patterns. What circulates in this scene is
an *unpacked* copy: dumped from memory, imports rebuilt, then redistributed. So
the first question about any client file is which of the two you have.

Size is not the answer — an unpacked dump keeps the packer's dead sections and
stays large. Three things settle it, and all three can be read off the file:

| Check | Packed | Unpacked and diffable |
|---|---|---|
| `strings` for `clientinfo.xml`, `data.grf` | absent — encrypted | present in plain text |
| Import table | a handful of entries (`LoadLibraryA`, `GetProcAddress`) | the real set: `granny2.dll`, `mss32.dll`, `binkw32.dll`, `ijl15.dll`, `ddraw.dll`, `ws2_32.dll` |
| Entropy of the main code section | ~7.9, indistinguishable from random | ~6.2, ordinary x86 |

A file that passes all three has been unpacked and WARP will work on it. Leftover
`Themida` / `WinLicense` strings and a random-named high-entropy section are
expected in a dump and do not contradict this — they are the discarded original,
still sitting in the file.

One consequence of the import table being real: the executable **statically**
imports `granny2.dll`, `mss32.dll`, `binkw32.dll`, `ijl15.dll` and `cps.dll`.
Windows refuses to start it if any of them is missing from the folder, with a
"code execution cannot proceed" box and nothing in any log. They come from a full
kRO client — which is also where `data.grf` comes from, so in practice you need
that download regardless.

### Diffing

The client has to be patched before it will talk to anything other than
Gravity's servers. **WARP** is the current tool (NEMO, which older guides name,
is no longer maintained).

The patches that matter for this gate:

| Patch | Why |
|---|---|
| Read Data Folder First | so `data/clientinfo.xml` is used instead of the one inside the GRF |
| Always Call SelectKoreaClientInfo | makes the client read `clientinfo.xml` at all |
| Disable Ragexe Filename Check | the executable gets renamed when you diff it |
| Skip Service Select Screen | removes the kRO/Sakray chooser |
| Enable Title Bar Menu | convenience while testing |
| Use Custom Aura Sprites / Increase Zoom Out | optional, ignore for the gate |

You do **not** need "Disable Packet Encryption" for `20180620` — see above.

### `clientinfo.xml`

Goes in `data/clientinfo.xml` next to the executable.

```xml
<?xml version="1.0" encoding="euc-kr" ?>
<clientinfo>
    <servicetype>korea</servicetype>
    <servertype>primary</servertype>
    <connection>
        <display>Episode4</display>
        <address>YOUR.VPS.ADDRESS</address>
        <port>6900</port>
        <version>55</version>
        <langtype>1</langtype>
        <registrationweb></registrationweb>
        <yellow><admin></admin></yellow>
    </connection>
</clientinfo>
```

- `<address>` — the same value as `RO_ADVERTISE_IP` in `.env`. The deploy
  workflow sets that from the `VPS_HOST` secret, so they agree by construction.
- `<port>` — the **login** port only. The client learns the char and map
  addresses from the server, which is exactly what `RO_ADVERTISE_IP` supplies.
- `<display>` — cosmetic, the name in the server list.

---

## Server side, before you try

### 1. Make the game ports reachable

The default binds them to loopback so nothing is exposed by accident. For the
gate, flip that:

**Deploy to VPS** → set `game_ports_bind` to `0.0.0.0` → Run.

> You do **not** also need to open ufw. Docker publishes ports by writing
> iptables rules that are consulted before ufw's, so a published port is
> reachable whether ufw likes it or not. `GAME_PORTS_BIND` is the control that
> actually decides this — which is why it defaults to loopback.

**Set it back to `127.0.0.1` once the gate passes.** CLAUDE.md Phase 8 wants
only 80/443 public, and from Phase 3 the browser reaches the game through the
WebSocket bridge on 443 instead.

### 2. Import the schema

Once, ever: **VPS ops** → `db-init`, and type `db-init` in the confirm box.

That loads `main.sql`, `logs.sql` and `web.sql`, then replaces rAthena's shipped
`s1`/`p1` inter-server account with the generated credentials from `.env`.

### 3. Make an account

`new_account: yes` is set in our login config, so the account is created on
first login by appending `_M` (male) or `_F` (female) to the username:

| Field | Type |
|---|---|
| Username | `testuser_M` |
| Password | anything |

Log in once, get disconnected, then log in again as plain `testuser` with the
same password.

**Turn this off before the server is public** — `server/import/conf/local/login_conf.txt`
with `new_account: no`, which is read after the generated config.

To make it a GM, set the group in the database (**VPS ops** → `db-init` is the
wrong tool; use a one-off SQL through `logs`/`diagnostics` or a terminal):

```sql
UPDATE login SET group_id = 99 WHERE userid = 'testuser';
```

---

## What passing looks like

1. Client opens, server list shows `Episode4`
2. Log in → character select
3. Create a character → spawn on `new_1-1` (the pre-renewal novice ground —
   note this, it confirms the PRERE build is actually in effect)
4. Walk. `@die`, `@heal` and other commands work if you set `group_id = 99`

Then the Phase 1 audit goes in `/docs` and we stop for review.

---

## When it does not work

The failures are distinctive; the trick is knowing which layer to look at.

| Symptom | Cause |
|---|---|
| Client closes instantly at launch | diff problem or missing data, not the server — nothing reached us |
| "Failed to connect to server" | login port not reachable. `game_ports_bind` still `127.0.0.1`, or `<address>` wrong |
| Rejected at login, server list never appears | `PACKETVER` mismatch, or the account does not exist and `_M` was omitted |
| Server list appears, then disconnect on select | **`RO_ADVERTISE_IP` is wrong.** The classic one — see below |
| Character select works, map never loads | same cause, one hop later: the map-server's advertised address |
| "unsupported packet ... disconnecting session" in `map1` log | `PACKETVER` mismatch. Confirm you have the `RE` client |
| Character created but spawns somewhere unexpected | `start_point_pre` — but if you land on `new_1-1` that is correct |

### The `RO_ADVERTISE_IP` failure, specifically

Worth understanding once because it accounts for most lost time.

`RO_ADVERTISE_IP` is not where the servers listen. They listen on `0.0.0.0`
inside their containers. It is the address the login-server hands the client so
it knows where the char-server is, and the char-server hands over for the
map-server. If it is a private or wrong address, the client is told to connect
somewhere it cannot reach — and neither side logs an error, because as far as
each is concerned nothing went wrong.

Check what was actually written:

**VPS ops** → `diagnostics`. It runs `check-env.sh`, which reports whether
`RO_ADVERTISE_IP` is still a dev default.

---

## Prove the server first, without a client

A full client is several GB of download to discover the database was not
imported. Two checks come first, in order.

### 1. Everything is running

**VPS ops** → `status` should show four healthy services:

```
db      healthy
login   healthy
char    healthy
map1    healthy
```

`map1` takes a few minutes on first start — it loads the whole map cache and NPC
set on a single core. The healthcheck allows 180s before it counts as failed.

### 2. The protocol actually works

**VPS ops** → `smoke-play`.

This runs `tools/smoke-play.py` on the VPS: it speaks the real RO protocol to
the real servers and does exactly what the gate describes — logs in, creates a
character, walks it three cells, logs out. No GRF, no executable, no download.

It dials `127.0.0.1` from the box itself, so the game ports stay closed while it
runs. Output looks like:

```
1. login-server
  ok   authenticated as 'smoketest' (account 2000000, sex M)
  ok   char-server advertised: 'Episode4' at <RO_ADVERTISE_IP>:6121 (0 online)
2. char-server
  ok   character list received (empty)
  ok   created 'SmokeTest' in slot 0 (Novice)
  ok   character 150000 selected, starting on new_1-1.gat
3. map-server
  ok   entered new_1-1.gat at (53, 111) facing 4
  ok   walked (53, 111) -> (56, 111)
```

It is re-runnable: the account and character are created once and reused.

**What it proves:** authentication, the inter-server account, the
login → char → map handoff, character creation, map cache loading, and movement.
It also prints the addresses the servers advertise, which is the one setting a
real client depends on and cannot check for itself.

**What it does not prove:** anything client-side. The GRF, the sprites, the
client's own item and map tables, and whether the game is playable. That is why
the gate still wants a real client — this narrows what can be wrong with it to
the client itself.

If the smoke test passes and the real client then fails, the problem is in the
diff, the data folder or `clientinfo.xml`, and the table above says which.
