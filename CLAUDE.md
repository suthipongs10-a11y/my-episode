# CLAUDE.md — RO Server, PC + Mobile

> Project context file for Claude Code. Read this fully before any task.
> Written in English for token efficiency; the human operator works in Thai —
> respond to him in Thai, keep code/comments/commits in English.
>
> **Revised 2026-07-29.** The original spec targeted Episode 4.0 with a
> browser-first client and a launcher that tunnelled a stock PC client over
> WebSocket. That spec cost a full day against a client executable that would
> not start, and its Phase 1 gate is why. §11 records what changed and why, so
> the reasoning is not lost. Do not restore the old plan without reading it.

---

## 1. What we are building

A Ragnarok Online private server **in the same class as `eternal-origin.com`**,
playable on **PC and mobile**, with our own rates, content and identity.

EternalRO is the reference. Not to clone — to match in capability, then differ
in gameplay. When a question is "how good does this have to be", the answer is
"as good as EternalRO", and §8a records what we know about how they built it.

| Layer | What it is | Status |
|---|---|---|
| Game server | rAthena, containerised, N map-servers | **working** — §6 Phase 1 passed |
| Mobile client | **RoPlay** (`roplay-app.com`), a paid native app for iOS+Android | to buy — §3a |
| PC client | diffed ragexe + GRF, distributed as a zip | **unsolved** — §3b |
| Anti-cheat | Gepard Shield, if RoPlay requires it | to confirm — §3a |
| Website | registration, downloads, control panel | later |

**The operator has decided to pay for the mobile client rather than build it**
(2026-07-29). That decision is settled; do not reopen it. What is *not* settled
is everything in §3a's checklist, which must be answered by the vendor before
money moves.

**Target: real multiplayer, many concurrent players.** Every decision below
assumes we will need to scale and to move hosts.

**And to stay up while someone tries to take it down.** Attacks on competing
servers are routine in this scene. The full analysis is in
`docs/threat-model.md`. Read §3c before designing anything network-facing —
the client decision above **reopened** an exposure the original plan closed,
and that is now the largest unresolved risk in the project.

---

## 2. Hard constraints — do not violate

1. **Never hardcode an IP, hostname, port, or credential.** Everything comes
   from environment variables. Moving VPS must be a config change, not a
   code change. This is the single most important rule in this file.
2. **Never commit secrets.** `.env` is gitignored. `.env.example` is committed
   with dummy values and every key documented. **Vendor licence keys (RoPlay,
   Gepard) are secrets and are covered by this rule.**
3. **Never commit GRF files or extracted game assets.** They are large and they
   are Gravity's copyright. Assets live outside the repo; the repo contains
   only the *pipeline* that processes them.
4. **Never develop directly against the production database.** Local/staging
   only, then deploy.
5. **rAthena source is a git submodule or a tracked upstream remote** — never
   a vendored copy with unknown modifications. We must be able to pull
   upstream security fixes.
6. All modifications to rAthena live in `conf/import/`, `db/import/`, and
   `npc/custom/` — never edit upstream files in place. This keeps merges
   possible forever. `src/custom/defines_pre.hpp` and `defines_post.hpp` are
   also legitimate: rAthena ships them for this purpose.

---

## 3. Scaling model — read before designing anything

**The fundamental constraint: rAthena's map-server is single-threaded.** One
map-server process uses one CPU core, no matter how many cores the box has.
You do not scale it vertically past one core. You scale it by running
**multiple map-servers, each owning a subset of maps**, all coordinated by a
single char-server.

Design implications, from day one:

- **Process split:** `login-server`, `char-server`, and **N × `map-server`**
  are separate containers from the start. Even if we run N=1 today, the
  topology must already support N>1 by config alone. *(Implemented: the
  entrypoint turns a map-group name into `delmap:` lines.)*
- **Map grouping is a config file**, not code. Splitting Prontera onto its own
  map-server later must be a one-line change.
- **Assets never come from the VPS in production.** Content-hashed filenames →
  CDN → immutable cache headers. First-load per player is GB-scale; serving
  that from origin will exhaust bandwidth long before CPU becomes the problem.
  This is the first thing that breaks.
- **Database is the second bottleneck.** MariaDB on its own volume, tuned
  `innodb_buffer_pool_size`, slow query log on from day one.

**Expected bottleneck order as players grow:**
1. Bandwidth (asset delivery) — solved by CDN
2. map-server single-core CPU — solved by splitting maps
3. DB write throughput — solved by tuning, then by separating the DB host
4. Ingress connection count

---

## 3a. Mobile client: RoPlay

`eternal-origin.com`'s mobile client is **RoPlay** — the string
`Roplay [v.3.6.48]` is visible on their login screen. It is a commercial
product, not something they built: a native iOS+Android app that speaks the RO
protocol to an rAthena server, sold on subscription (published tiers were around
**$190 / 3 months** and **$250 / 6 months** as of July 2026).

**We are buying it.** The reasoning is in §11; briefly, every alternative that
avoids an app install is either unproven (roBrowser) or does not exist, and the
operator's goal is parity with EternalRO, which requires the thing EternalRO
actually uses.

### Answer these before paying — every one changes our architecture

Do not treat the purchase as settled work until this table is filled in. Each
row is something that, answered badly, costs more than the subscription.

| # | Question | Why it matters |
|---|---|---|
| 1 | **Which `packetver`s are supported?** | Decides our rAthena build, our client data, and therefore our whole content baseline. We currently build `PACKETVER=20180620`. |
| 2 | **Is Gepard Shield required or optional? What does it cost?** | A second subscription. It is also the thing that makes a client un-unpackable, which cuts both ways. |
| 3 | **How does the app reach the server — raw TCP to 6900/6121/5121, or a proxy/WSS endpoint?** | **This decides §3c entirely.** Raw TCP means the origin address is public and Cloudflare cannot protect it. |
| 4 | **iOS distribution: App Store, TestFlight, or sideload?** | Android sideloading is routine; iOS is not. If this needs an Apple developer account or a TestFlight slot, that is a hard external dependency with its own review process. |
| 5 | **What do we supply, and where is it hosted?** GRF? a client build? assets on their CDN or ours? | Decides whether Phase 4's asset pipeline is ours or theirs, and who pays the bandwidth. |
| 6 | **How much can we rebrand?** Logo, login art, UI colours, app name. | The operator's stated goal is to *differ* from EternalRO, not to look like a second instance of it. |
| 7 | **Is the server address configurable by us at runtime?** | §2.1. If the address is baked into their build, moving hosts becomes a vendor ticket instead of a DNS change. |
| 8 | **What happens the day the subscription lapses?** | If the app hard-fails, our entire mobile playerbase is one missed invoice away from gone. This is the biggest business risk in the project and it must be written down, not assumed. |

Ask these on their Discord (`roplayapp`) before money moves. Record the answers
in `docs/vendor-roplay.md` and update this file where they change a decision.

### What buying RoPlay does *not* buy

**It does not solve the PC client.** RoPlay is mobile-only. The PC path is
still a diffed ragexe, which is exactly what §3b says is unsolved. Budgeting
for RoPlay and assuming "the client problem is handled" would be the expensive
version of the mistake we already made once.

---

## 3b. PC client: still unsolved, and honestly so

The PC client is a **diffed ragexe + GRF + `clientinfo.xml`**, distributed as a
zip. A full day was spent on this and it does not start: an empty `Error`
message box, after satisfying `CPetEvolutionMgr`, `CCheckAttendanceMgr`,
`CAchievementMgr` and `CPrivateAirplaneMgr`. The full record, including the
technique that got that far — extracting required file paths straight out of
the binary — is in `docs/phase-1-client.md`.

Options, in the order worth trying:

1. **Ask whether Gepard Shield ships a working client build.** Gepard patches
   clients as part of what it does. If buying it (which §3a Q2 may force
   anyway) also produces a client that starts, one purchase closes two gaps.
2. **Buy a client build from the RO dev scene.** People sell this service. It
   is a known, priced commodity, and given the operator is already investing,
   it is a proportionate spend.
3. **WARP's `Disable MessageBoxes`.** The one untried patch. Cheap, and it may
   turn the empty box into a readable message.
4. **roBrowser Electron as a fallback PC client.** Free, cross-platform, and
   `npm run electron:build:win` already exists upstream. Worse-looking than a
   real client, but it means PC players are never fully blocked.

**Do not let the PC client block mobile again.** That ordering is the mistake
§11 records. Mobile and PC proceed independently from here.

---

## 3c. The DDoS position has changed — this is the open risk

The original design routed every player over WebSocket on 443 so the whole
server could sit behind Cloudflare's free tier, and `GAME_PORTS_BIND=127.0.0.1`
could stay true in production. A launcher tunnelled the PC client's raw TCP into
the same endpoint so there was exactly one door.

**Both clients we are now shipping speak raw TCP** (RoPlay almost certainly;
ragexe definitely). Raw TCP cannot go behind Cloudflare free. So:

- Game ports must be publicly reachable.
- The origin address is therefore public.
- Everything in `docs/threat-model.md` that depends on Cloudflare fronting the
  game traffic no longer applies to it.

**This is the exposure the original plan existed to avoid, and we have taken it
back on deliberately.** It is not a reason to reverse the client decision; it is
a reason to change how the origin is protected. The honest options:

1. **Move to a host with included L3/L4 DDoS protection** — OVH, and similar.
   The original spec listed this as "viable and worth revisiting"; it is now the
   primary answer, not the alternative. Recheck §3a Q3 first — if RoPlay does
   offer a proxy endpoint, some of this comes back.
2. **Keep Cloudflare for the website, registration and downloads.** Those are
   HTTP and still benefit. Do not let that create the illusion the game ports
   are covered.
3. **rAthena's own limits still apply** — `ipban_dynamic_pass_failure_ban_*`,
   connection limits per IP. Inner layer, not outer.

Decide the host before launch, not after the first attack. Until then, treat
"we are protected" as false.

---

## 4. Environment

- **Current host:** Hostinger KVM2 (2 vCPU / 8GB / 100GB NVMe). Test box only.
- **Host is disposable.** We will move. Nothing may assume this machine.
  **§3c may force that move sooner and for a different reason than size.**
- **Everything runs in Docker Compose.** Bringing the whole stack up on a new
  host must be: clone repo → set `.env` → `docker compose up -d`.
- **Backups leave the VPS.** DB dumps to off-host storage (Cloudflare R2 or
  Backblaze B2 free tier) on a schedule. A takedown or a provider suspension
  must not lose player data.
- **Remote ops go through `.github/workflows/ops.yml`**, a fixed menu of named
  operations over SSH. See `docs/remote-ops.md`.

---

## 5. Repository layout

```
/infra          docker-compose, Dockerfiles, Caddy/nginx config
/server         rAthena (upstream tracked) + our import/ overrides
  /import       conf/import, db/import, npc/custom  ← all our changes live here
  /map-groups   which maps each map-server owns
/client         PC client build recipe: WARP patch list, data/ layout, stubs
                (no GRF, no exe — the recipe, not the artifact)
/proxy          WebSocket <-> TCP bridge. DORMANT — see below.
/assets-build   GRF extraction + content-hashing pipeline (no assets committed)
/tools          ops scripts, smoke tests, content scripts
/docs           audit reports, per-phase and per-decision
```

**Removed 2026-07-29:** `/launcher`, `/ui`, `/pwa` — placeholders for the
browser-client plan (§11), never implemented. Git has them if needed.

**`/proxy` stays, dormant.** It is a Phase-0 skeleton — config validation,
`/healthz`, and a 501 on WebSocket upgrade — and it is wired into
`infra/docker-compose.yml`, the Caddyfile and CI. It costs nothing to keep, it
would cost a working deployment to remove, and §3b.4 keeps roBrowser as the PC
fallback, which is the one thing that would still need it. **Do not build the
bridge out unless §3b.4 is actually chosen.**

---

## 6. Phase plan

Milestone-gated. **Do not start a phase before the previous phase's gate passes
and its audit report is written to `/docs`.** Each audit states: what was built,
what was tested, what failed, what is deferred, what the next phase assumes.

Phases 0 and 1 are done. The rest were re-ordered on 2026-07-29 so that nothing
blocks on the PC client.

### Phase 0 — Foundation ✅
Repo, `.env.example`, gitignore, Compose skeleton, pinned base images, CI.
**Gate passed.** `docs/phase-0-audit.md`.

### Phase 1 — rAthena baseline ✅
rAthena tracked upstream, `PRERE=yes`, `PACKETVER=20180620`. MariaDB with the
schema imported. login / char / N×map as separate services. Off-host backups.
Game logging on — pick, drop, zeny, chat, MVP, trade — into the log schema.

> Logging is the one requirement that cannot be retrofitted. Anti-bot work is
> retrospective: on the day you want to ban an account you need the month of
> behaviour behind it. rAthena ships zeny, chat and MVP logging **off**; ours
> are on and verified (`tools/check-logging.sh`). `docs/anti-bot.md`.

**Gate passed** by `tools/smoke-play.py`, which logs in, creates a character and
walks it over the real wire protocol, run on the VPS against `127.0.0.1`.

> **The original gate here was "a standard PC client connects".** It was
> replaced. A scripted protocol client tests the same path, runs on every
> deploy, and does not depend on an artifact we cannot debug. §11.

### Phase 2 — Vendor decisions and the mobile client ← **next**
- Answer every question in §3a and write `docs/vendor-roplay.md`
- Decide `packetver` from the answer to Q1 — this may mean rebuilding, and
  regenerating `tools/smoke-play.py`'s packet table
- Decide Gepard from Q2
- Decide the host from Q3 + §3c
- Purchase, integrate, and get one real device connected
- **Gate:** a phone logs in to *our* server through RoPlay, creates a
  character, and walks. The same thing `smoke-play` proves, proven by a human
  on a real device.

### Phase 3 — PC client
- §3b, in the order listed there
- **Gate:** a clean Windows machine downloads the zip, extracts, and connects.
  **This gate blocks nothing else.** If it stays open, we launch mobile-first
  and say so publicly.

### Phase 4 — Content and identity
This is where the server stops being a default rAthena and becomes ours.
- Rates, drop tables, starting items, custom NPCs — `server/import/` and
  `npc/custom/`, never upstream files
- Whatever content baseline the §3a Q1 packetver supports
- **Episode 4.0 is no longer a gate.** It was the original target and it is now
  an optional flavour decision, deferred until there is a working client to see
  it in. The tooling idea survives — a re-runnable filter script in `/tools` —
  if we ever want it. §11.
- **Gate:** a player can tell this server apart from stock rAthena

### Phase 5 — Assets and CDN
- GRF extraction → content-hashed static files
- Published into R2 (egress free, same account as backups) or wherever §3a Q5
  says the vendor expects them
- Measure first-load and repeat-load size per player
- **Gate:** origin bandwidth per player measured and documented

### Phase 6 — Website
Registration, downloads, control panel. Cloudflare in front — this part is HTTP
and genuinely benefits (§3c.2). Turnstile on registration: mass account creation
is what feeds bot farms.
- **Gate:** a stranger can register and reach a download without us

### Phase 7 — Scale-out readiness
- Split maps across map-servers by config
- Metrics: concurrent players, per-map-server CPU, DB slow queries, bandwidth
- Load test with simulated clients
- **Gate:** documented concurrent-player ceiling, and the next bottleneck named

### Phase 8 — Hardening
- Host with L3/L4 protection in place (§3c) — **decide before launch**
- Firewall: only what must be public is public
- Origin-IP leak audit. Historical DNS records are the usual leak and are
  permanently archived by third parties
- Fail2ban; `ipban_dynamic_pass_failure_ban_*` on login
- `macro_detection_*` — rAthena's bot deterrent, off by default. It streams a
  BMP captcha over packets `0x0a52`-`0x0a57`; confirm RoPlay implements them
  before relying on it (`docs/anti-bot.md`)
- Restore drill: prove a backup actually restores from a wiped host
- **Gate:** restore drill passes; origin exposure is understood and accepted in
  writing, not by default

---

## 7. Mobile gotchas (do not rediscover these)

Most of these were written for a browser client. With RoPlay the vendor owns
them — but they are the questions to *ask* about, and they come straight back
if roBrowser ever returns as a fallback.

- iOS is the constraint, not the afterthought. Test it explicitly and first.
- Phones with 4GB RAM can be killed by the OS on map changes in crowded areas.
  A "low graphics" preset — reduced render distance, effects off, sprite cap —
  is not optional at scale. Ask whether RoPlay has one.
- Landscape handling and safe areas (notch) are per-platform and iOS is the
  awkward one.
- Audio needs a user gesture before it will play on iOS.
- Asset storage on iOS can be evicted. Re-downloading GB of assets on a phone
  data plan is a player-losing event; find out how RoPlay handles it.

---

## 8. Working agreements

- Work phase by phase. **But a blocked phase does not block an unrelated one** —
  that rule is what cost us a day (§11). If something is stuck, say so, finish
  what does not depend on it, and move.
- After each phase: run tests, write the audit report to `/docs`, then stop and
  wait for review.
- Polish is a **separate track** after core functionality — never interleaved.
- When a decision has a cost/benefit tradeoff, state the recommendation
  directly with the reasoning, not a list of options.
- **Money is now on the table.** Before recommending a purchase, say what it
  buys, what it does not buy, and what it costs to reverse. Vendor lock-in is a
  cost like any other.
- If something in this file turns out to be wrong, say so and propose the fix
  rather than working around it silently. **This file has been wrong before and
  saying so was the most useful thing done that day.**
- **The client cannot be trusted.** Every limit must be enforced server-side. A
  cooldown or range check that exists only in the client does not exist. This is
  true of a native client too — Gepard raises the cost of cheating, it does not
  remove it.

## 8a. Reference server: `eternal-origin.com`

The target. What we know, captured 2026-07-29 from the operator's own
screenshots and from public sources:

| Aspect | What they do | What it means for us |
|---|---|---|
| Mobile client | **RoPlay**, `[v.3.6.48]` — bought, not built | §3a |
| PC client | ragexe protected by **Gepard Shield** | why we could not unpack it; §3b.1 |
| Content era | modern — cash shop, homunculus auto-feed, 30 char slots, achievement UI | **not Episode 4.0**; §6 Phase 4 |
| Localisation | Thai UI, language switcher on login | ours should match |
| Registration | in-client `สมัครไอดี` button → their website | §6 Phase 6 |
| Asset delivery | streamed with a progress bar; client has a "clear cache" button | §6 Phase 5 |

Their in-game UI (radial touch skill wheel, scaled RO panels) is RoPlay's, so
matching it is a purchase, not a build. **Where we differ should be rates,
content and custom NPCs — the things RoPlay does not own.**

---

## 9. Legal boundary — state of play

- rAthena is **GPL-3.0**. Commercial use is allowed, but distributing a modified
  version obliges us to provide source to recipients under the same terms.
- **RO's GRF assets, sprites, maps, and trademarks are Gravity's.**
  **Decided (2026-07-28): the operator accepts this risk. Do not raise it again
  as a blocker.** What survives the decision is the engineering consequence:
  **the host is disposable and the data is not.** Off-host backups, no
  exceptions.
- Long-term de-risking path: replace assets with owned/licensed art. Keep the
  asset pipeline format-agnostic where it is cheap to do so.

---

## 10. Immediate next action

**Phase 2, step one: ask RoPlay the eight questions in §3a.** Nothing else in
this file can be planned accurately until Q1 (packetver) and Q3 (transport) are
answered, and Q8 (what happens when the subscription lapses) is the one that
should be answered before any money moves.

Write the answers to `docs/vendor-roplay.md` and update this file where they
change a decision.

---

## 11. What changed on 2026-07-29, and why

Kept so the reasoning is not lost and the same mistake is not made twice. The
full analysis is `docs/client-strategy.md`.

**What went wrong.** Phase 1's gate read *"a standard PC client connects...
Baseline must work before we touch the browser layer. Do not skip this."* That
put a closed-source Gravity binary — one we cannot debug, whose only error
channel is a message box with no text — in front of every other piece of work.
A full day went into it and it still does not start. Meanwhile the server had
been passing a scripted protocol test the whole time.

**Three things were wrong at once:**

1. **The gate was on the wrong artifact.** `tools/smoke-play.py` tests the same
   protocol path, runs unattended on every deploy, and is debuggable. It is the
   better gate and it already existed.
2. **A blocked phase was allowed to block unrelated phases.** Nothing about the
   Ep4 content cut, the asset pipeline or the website needed a working exe.
3. **"PC client" was assumed to mean "ragexe".** It does not have to.

**What we learned about the target.** EternalRO's mobile client is RoPlay, a
paid product. They did not solve mobile RO; they bought it. Almost nobody ships
browser-based RO — the norm is a native app, either rented (RoPlay) or built as
an APK (RevivalRO, GemstoneRO). The original spec's "installable PWA, no app
store, no download" was therefore **more ambitious than the reference server**,
not a simplification of it.

**What was dropped:**

- *The launcher and the one-ingress design (old §3a).* It existed to tunnel a
  raw-TCP client over WSS. With a native mobile client that also speaks TCP,
  it protects nothing. Its consequence — renewed origin exposure — is now §3c
  and is the largest open risk in the project.
- *Episode 4.0 as a gate.* The reference server is not pre-renewal, the
  operator's goal is parity with it, and the content cut never blocked
  anything. Demoted to §6 Phase 4, optional.
- *`/proxy`, `/ui`, `/pwa`, `/launcher`.* All four served the browser plan.

**What was kept, deliberately:** the release-integrity rules from the old §3a —
CI-built from a tagged commit, published SHA-256, HTTPS and our domain only.
They were written because players in this scene routinely disable antivirus to
run our binaries, and that is still true of anything we ship.
