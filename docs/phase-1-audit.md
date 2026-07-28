# Phase 1 audit — rAthena baseline

**Status: gate PARTIALLY met. Do not start Phase 2 yet.**

The server half is proven end to end against the live VPS. The half that needs a
real PC client is not, and it is blocked on a download the operator has to make
from a computer. §*What is not proven* says exactly what that leaves open.

Commit at time of writing: `e9cd9aa`, branch
`claude/repo-hostinger-vps-setup-pka2xz`.

---

## What was built

### The stack, running

Four containers on the Hostinger KVM2 box, all healthy, all published to
loopback only:

```
ep4-db-1      healthy   127.0.0.1:3306->3306
ep4-login-1   healthy   127.0.0.1:6900->6900
ep4-char-1    healthy   127.0.0.1:6121->6121
ep4-map1-1    healthy   127.0.0.1:5121->5121
```

The pre-existing `hermes-agent` and `traefik` containers on the same host are
untouched, which was a constraint from the start.

### Schema

`tools/db-init.sh` imports `main.sql`, `logs.sql` and `web.sql`, then replaces
rAthena's shipped `s1`/`p1` inter-server account with generated credentials.
Result: 60 tables in the game schema, 10 in the log schema.

It is re-runnable. An existing schema skips the import (a full reimport stays
behind `--force`) while the account step always runs, so a run that dies between
the two is fixed by running it again.

### `tools/smoke-play.py` — the gate, over the protocol

Speaks the real RO wire protocol to the real servers: logs in, creates a
character, walks it, logs out. Standard library only, no GRF, no executable. It
dials `127.0.0.1` from the VPS itself, so the game ports stay shut while it
runs.

Available as **VPS ops → `smoke-play`**, so it can be run from a phone.

### `tools/test-smoke-play.py` — the test's test

Mock login/char/map servers that reproduce the 20180620 wire format, run against
the real client in CI on every push. This is not ceremony: three of the four
bugs below were byte-layout mistakes that do not throw. They read a plausible
number from the wrong place and report success.

---

## What was tested

Against the live VPS, not a fixture:

```
1. login-server
  ok   authenticated as 'smoketest' (account 2000000, sex M)
  ok   char-server advertised: <RO_ADVERTISE_IP>:6121 (0 online)
2. char-server
  ok   account-id echo matches
  ok   character list received (empty)
  ok   created 'SmokeTest' in slot 0 (Novice)
  ok   character 150000 selected, starting on new_1-1.gat
  ok   map-server advertised: <RO_ADVERTISE_IP>:5121
3. map-server
  ok   account-id echo matches
  ok   entered new_1-1.gat at (53, 111) facing 0
  ok   map data received (1406 bytes of world state)
  ok   walked (53, 111) -> (56, 111)
  ok   logged out
```

What each line is evidence for:

| Observation | What it proves |
|---|---|
| Authenticated, account auto-created | login-server, DB writes, `new_account` |
| A char-server was advertised at all | the inter-server account works — a wrong `RO_INTER_PASS` shows up here as an empty server list |
| Character created and persisted | char-server, schema, DB writes |
| **Spawned on `new_1-1`** | **the build really is pre-renewal.** Renewal spawns elsewhere. CI checks this at binary level; this checks it at runtime |
| 1406 bytes of world state | the map cache loaded and the map-server has the map |
| Walk acknowledged with matching from/to | movement, and the session is genuinely active |

The walk is verified by decoding the server's acknowledgement and comparing both
the from- and to-coordinates against what was requested, so it cannot pass on a
coincidental byte match.

Re-run on an existing account: reuses the character instead of creating a second
one. Confirmed on the live server.

---

## What failed on the way, and why it is worth recording

Four bugs. None of them would have thrown an exception; all four had to be found
by watching a real server react.

**1. The map-server wraps the account id, the char-server does not.**
The char-server's first reply is four raw bytes. The map-server sends the same
value inside packet `0x0283`. `src/map/clif.cpp` branches on
`PACKETVER < 20070521`; the char-server has no such branch. Assuming the two
behaved alike cost one round trip.

**2. A stale session is a retry signal, not a failure.**
After a run died mid-session, the next login got `SC_NOTIFY_BAN` code 8. rAthena
does not merely refuse: it broadcasts a kick to every char-server and arms a 30s
timer, so the correct client behaviour is to wait and ask again. The script now
does, at 8s/16s/24s.

**3. Packet ids come from two files, and the second one wins.** The big one.
`packetdb_readdb()` includes `clif_packetdb.hpp` *and then* `clif_shuffle.hpp`.
Deriving the table from the first file alone gave `0x0437` as the 5-byte walk;
the shuffle file overrides it to a 7-byte attack. The server said so exactly:

```
clif_parse: Received packet 0x0437 with expected packet length 7,
but only 5 bytes remaining, disconnecting session #9
```

**That line is now the oracle.** Any regenerated table must still produce
`0x0437` as a 7-byte `ActionRequest`, or the derivation is wrong again. It is
quoted in `smoke-play.py`'s header for that reason. The corrected ids are
`0x0436` to enter a map and `0x035F` to walk — and `0x0436` had been actively
skipped earlier *because* the incomplete table showed it as "add friend".

**4. SSH from Actions to the VPS is intermittently unreachable.**
Two of five dispatches failed with `Connection timed out` — never an auth error,
always fine minutes later from a different runner. The connect step now retries
five times with backoff, and reports "refused our credentials" separately from
"could not reach", because those point in opposite directions. Cause not
established; it affects only the ops channel, never player traffic, which
reaches 443 by a different path entirely.

---

## What is NOT proven — the open half of the gate

**The gate says a standard PC client connects, creates a character, and walks
around. That has not happened.** What is proven is the server side of those
three claims. Untested, and only a real client can test them:

- the GRF and sprites load
- the client's own item/map tables agree with the server's
- `clientinfo.xml` and the WARP diff are right
- the game is actually playable, which no automated check can answer

### Where the client stands

The operator supplied `2018-06-20eRagexeRE.exe`. It was inspected and **is
usable**: Themida stripped, imports rebuilt (620 descriptors, the full
`granny2`/`mss32`/`binkw32`/`ijl15`/`ddraw`/`ws2_32` set), main code section at
6.18 entropy — ordinary x86, not encrypted. WARP will diff it. `PACKETVER`
matches exactly; the letter revision (`e` vs `a`) is not part of the match, as
rAthena keys on the date alone.

What is missing is game data. The exe statically imports five DLLs and needs a
`data.grf` of its own era. An existing `Ragnarok EP5.0 Thai Edition` folder on
the operator's machine supplies all five DLLs, but its `data.grf` is from 2005
and predates the Lua data system a 2018 client requires.

**So the remaining blocker is a kRO client download, and it needs a computer.**
Method in `docs/phase-1-client.md`.

### Rejected clients, recorded so they are not retried

| Client | Why not |
|---|---|
| 2004 `Ragexe.exe` / `Sakexe.exe` (EP5 Thai folder) | below roBrowser-Legacy's floor of `20061023`. Lowering `PACKETVER` to match would make the browser client — the actual product — impossible |
| EternalRO client | packed, `v3hunt.dll` anti-cheat, not diffable |

---

## Deferred

- **Game logging is not yet verified.** CLAUDE.md Phase 1 requires pick/drop/
  zeny/chat/MVP/trade logging from day one, on the grounds that anti-bot work is
  retrospective and the data cannot be collected after the fact. The log schema
  is imported (10 tables) but no gameplay has generated rows, so this is
  configured-but-unproven. **Check this before Phase 2**, not after — it is the
  one item here that genuinely cannot be retrofitted.
- **Off-host backups**: the job exists; a restore drill is Phase 8's gate.
- **Pincode** is enabled (rAthena default). Harmless now — an account with no
  pincode set is not blocked — but roBrowser is unlikely to implement the packets,
  so Phase 3 should decide whether to turn it off.
- **The image tag does not change when the source does.** `20180620-prereyes`
  stays constant across rAthena submodule bumps, so a source change needs
  `rebuild = true` to take effect. Not a problem yet; it will be the first time
  someone bumps the submodule and wonders why nothing changed.

---

## What Phase 2 now assumes

- Four services healthy, loopback-bound, on the pinned commit
- Schema imported; inter-server account is the generated one, not `s1`/`p1`
- The build is pre-renewal — checked at binary level in CI, and at runtime by
  the spawn point
- `smoke-play` is available as a regression check: after the Ep4 content cut,
  running it again says whether the cut broke logging in and moving
- Packet ids for 20180620 are settled and recorded, with an oracle for
  re-deriving them

## Recommendation before Phase 2

Do the client download and close the gate properly. Phase 2 filters item, mob
and map data, and its failure mode is *wrong item names in the client* rather
than server errors — which is precisely the class of bug a protocol test cannot
see and a real client shows immediately. Going into the content cut without a
working client means finding out much later.
