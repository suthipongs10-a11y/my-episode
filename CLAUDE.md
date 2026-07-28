# CLAUDE.md — RO Ep4 Mobile Web Server

> Project context file for Claude Code. Read this fully before any task.
> Written in English for token efficiency; the human operator works in Thai —
> respond to him in Thai, keep code/comments/commits in English.

---

## 1. What we are building

A pre-renewal Ragnarok Online server (Episode 4.0 / War of Emperium content
baseline) that is playable **in a mobile browser** as an installable PWA — no
app store, no client download, works on iOS and Android.

Three layers:

| Layer | What it is | Status |
|---|---|---|
| Game server | rAthena, pre-renewal build, Ep4 content cut | to build |
| Bridge | WebSocket ↔ TCP proxy (browser can't open raw TCP) | to build |
| Client | roBrowser-Legacy + custom mobile UI overlay + PWA shell | to build |

**Target: real multiplayer, many concurrent players.** Not a single-player
hobby setup. Every decision below assumes we will need to scale and to move
hosts.

**And to stay up while someone tries to take it down.** Attacks on competing
servers are routine in this scene, so surviving them is a design goal, not a
Phase 8 afterthought. The full analysis is in `docs/threat-model.md`; the part
that changes early decisions is that a browser client speaking WebSocket over
443 can sit behind Cloudflare's free tier, which raw TCP game ports cannot.
That is a second reason for the browser architecture, independent of mobile.

---

## 2. Hard constraints — do not violate

1. **Never hardcode an IP, hostname, port, or credential.** Everything comes
   from environment variables. Moving VPS must be a config change, not a
   code change. This is the single most important rule in this file.
2. **Never commit secrets.** `.env` is gitignored. `.env.example` is committed
   with dummy values and every key documented.
3. **Never commit GRF files or extracted game assets.** They are large and
   they are Gravity's copyright. Assets live outside the repo; the repo
   contains only the *pipeline* that processes them.
4. **Never develop directly against the production database.** Local/staging
   only, then deploy.
5. **rAthena source is a git submodule or a tracked upstream remote** — never
   a vendored copy with unknown modifications. We must be able to pull
   upstream security fixes.
6. All modifications to rAthena live in `conf/import/`, `db/import/`, and
   `npc/custom/` — never edit upstream files in place. This keeps merges
   possible forever.

---

## 3. Scaling model — read before designing anything

**The fundamental constraint: rAthena's map-server is single-threaded.** One
map-server process uses one CPU core, no matter how many cores the box has.
You do not scale it vertically past one core. You scale it by running
**multiple map-servers, each owning a subset of maps**, all coordinated by a
single char-server.

Design implications, from day one:

- **Process split:** `login-server`, `char-server`, and **N × `map-server`**
  are separate containers from the start. Even if we run N=1 on KVM2 today,
  the topology must already support N>1 by config alone.
- **Map grouping is a config file**, not code. Splitting Prontera onto its
  own map-server later must be a one-line change.
- **wsProxy is stateless and horizontally scalable.** N instances behind
  nginx. Never store session state in the proxy.
- **Assets never come from the VPS in production.** Content-hashed filenames
  → Cloudflare (free tier) → immutable cache headers. First-load per player
  is GB-scale; serving that from origin will exhaust bandwidth long before
  CPU becomes the problem. This is the first thing that breaks. Build the
  asset pipeline CDN-ready from Phase 4, not later.
- **Database is the second bottleneck.** MariaDB on its own volume, tuned
  `innodb_buffer_pool_size`, slow query log on from day one.

**Expected bottleneck order as players grow:**
1. Bandwidth (asset delivery) — solved by CDN
2. map-server single-core CPU — solved by splitting maps
3. DB write throughput — solved by tuning, then by separating the DB host
4. wsProxy connection count — solved by adding instances

---

## 4. Environment

- **Current host:** Hostinger KVM2 (2 vCPU / 8GB / 100GB NVMe). Test box only.
- **Host is disposable.** We will move to a bigger VPS. Nothing may assume
  this specific machine.
- **Everything runs in Docker Compose.** Bringing the whole stack up on a new
  host must be: clone repo → set `.env` → `docker compose up -d`.
- **Backups leave the VPS.** DB dumps to off-host storage (Cloudflare R2 or
  Backblaze B2 free tier) on a schedule, from Phase 1. A DMCA takedown or a
  provider suspension must not lose player data.

---

## 5. Repository layout

```
/infra          docker-compose, Dockerfiles, Caddy/nginx config
/server         rAthena (upstream tracked) + our import/ overrides
  /import       conf/import, db/import, npc/custom  ← all our changes live here
/proxy          WebSocket ↔ TCP bridge (Node)
/client         roBrowser-Legacy fork/submodule + our plugins
/ui             mobile overlay (own layer, talks to client via event bus)
/pwa            manifest, service worker, icons
/assets-build   GRF extraction + content-hashing pipeline (no assets committed)
/tools          content-cut scripts (Ep4 filtering), migration, ops scripts
/docs           per-phase audit reports
```

---

## 6. Phase plan

Milestone-gated. **Do not start a phase before the previous phase's gate
passes and its audit report is written to `/docs`.** Each audit report states:
what was built, what was tested, what failed, what is deferred, and what the
next phase now assumes.

### Phase 0 — Foundation
- Repo, `.env.example`, gitignore, Docker Compose skeleton
- Ubuntu base images pinned by digest
- CI that at minimum lints and builds containers
- **Gate:** `docker compose config` valid; clean clone → build succeeds

### Phase 1 — rAthena baseline
- rAthena as tracked upstream, compiled `PRERE=yes`
- MariaDB container, schema imported, tuned config
- login / char / map as three separate services, bound to internal network only
- Off-host backup job running
- **Game logging on from day one** — pick, drop, zeny, chat, MVP, trade — into
  the separate log schema. Anti-bot detection is retrospective: on the day you
  want to ban one you need its last month of behaviour, and you cannot go back
  and collect it. An afternoon of config now, impossible to retrofit
  (`docs/anti-bot.md`)
- **Gate:** a standard PC client connects, creates a character, walks around.
  Baseline must work *before* we touch the browser layer. Do not skip this.

### Phase 2 — Ep4 content cut
- Script in `/tools` that filters `item_db.yml`, `mob_db.yml`, mapcache and
  warps down to Ep4 (2003.05.02) state
- Remove: Yuno (Ep5), Amatsu/Kunlun (Ep6), Umbala (Ep7), Niflheim/Louyang/
  Ayothaya (Ep8), **all transcendent/rebirth classes (Ep9)**, Einbroch/
  Lighthalzen/Hugel (Ep10), Rachel/Veins (Ep11), and everything later
- Keep: Prontera, Geffen, Payon, Morroc, Alberta, Izlude, Al De Baran, Lutie,
  Comodo + their dungeons; 1st and 2nd jobs; WoE and guild system
- Level cap 99/50
- Script must be **idempotent and re-runnable** against a fresh upstream pull
- **Gate:** cut is reproducible from clean upstream; audit lists exactly what
  was removed and what was kept

### Phase 3 — Browser client (desktop first)
- wsProxy: WebSocket ↔ TCP, stateless, env-configured
- roBrowser-Legacy configured, `packetver` matched to server
- **WebSocket keepalive under 60s.** Cloudflare Free closes an idle WebSocket
  after 100 seconds, and an idle player sends nothing. Without this, players
  disconnect after standing still and nothing logs an error.
- Per-connection packet rate limiting — the proxy is the only chokepoint every
  player passes through
- **Record connection metadata** (source IP, connection id, open/close, packet
  counts). Once Cloudflare is in front, nothing else sees per-IP behaviour
- **Gate:** log in and play in a desktop browser. Mobile comes later — do not
  chase mobile until desktop browser play is solid.

### Phase 4 — Asset pipeline + CDN
- GRF extraction → content-hashed static files
- **Published into Cloudflare R2**, not cached from our origin. Cloudflare's
  ToS still restricts serving large files hosted *outside* Cloudflare through
  the CDN; files hosted *on* R2 are explicitly fine, and R2 egress is free.
  Same account we already use for backups.
- Immutable cache headers, IndexedDB caching client-side
- Put Cloudflare in front of the game traffic too, so the origin stops being
  directly reachable (see `docs/threat-model.md`)
- Measure: first-load size, repeat-load size
- **Gate:** second load is served from cache; origin bandwidth per player
  measured and documented

### Phase 5 — Mobile UI layer
- Own UI layer in `/ui`, communicating with roBrowser via an event bus
- **Never fork roBrowser's own UI components** — use its plugin system, or we
  will fight merge conflicts forever
- Virtual joystick, hotkey bar, skill buttons, inventory, quest tracker
- Touch → engine input mapping
- **Gate:** playable on a real Android device and a real iOS device

### Phase 6 — PWA shell
- manifest, service worker, `apple-touch-icon`, `apple-mobile-web-app-capable`
- HTTPS required (Caddy, auto-TLS) — iOS will not register a service worker
  without it
- Landscape handling: iOS ignores `orientation` in the manifest — CSS fallback
- Audio unlock on first user gesture
- **Gate:** installs to home screen on both platforms and launches offline-shell

### Phase 7 — Scale-out readiness
- Split maps across multiple map-servers by config
- wsProxy horizontal scaling behind nginx
- Metrics: concurrent players, per-map-server CPU, DB slow queries, bandwidth
- Load test with simulated clients
- **Gate:** documented concurrent-player ceiling on current hardware, and the
  specific next bottleneck

### Phase 8 — Hardening
- Firewall: only 80/443 public; game ports internal only
- **80/443 accepted only from Cloudflare's published IP ranges** — otherwise
  the protection is a front door with the back door open
- **Origin-IP leak audit.** Historical DNS records are the usual leak and are
  permanently archived by third parties. One leak makes everything above moot
- Fail2ban, rate limiting on login (Cloudflare rules as the outer layer,
  rAthena's `ipban_dynamic_pass_failure_ban_*` as the inner one)
- Tune `macro_detection_*` — rAthena's bot deterrent, off by default. Note it
  streams a BMP captcha over packets `0x0a52`-`0x0a57`; roBrowser likely does
  not implement them, so confirm before relying on it (`docs/anti-bot.md`)
- Cloudflare Turnstile on registration — stops mass account creation, which is
  what feeds bot farms
- Restore drill: prove a backup actually restores
- **Gate:** restore drill passes from a wiped host, and the origin address is
  not reachable directly

---

## 7. Mobile gotchas (do not rediscover these)

- iOS Safari can evict IndexedDB — players may need to re-download assets.
  Handle this gracefully, don't crash.
- Audio requires a user gesture before it will play.
- iOS ignores manifest `orientation: landscape`. Use a CSS rotate fallback.
- Handle safe areas (notch) with `env(safe-area-inset-*)`.
- Phones with 4GB RAM can have the browser kill the tab on map changes in
  crowded areas. Keep a "low graphics" preset: reduced render distance,
  effects off, shadows off, sprite cap.
- Chrome/Android outperforms Safari/iOS on WebGL. Test iOS explicitly; it is
  the constraint, not the afterthought.

---

## 8. Working agreements

- Work strictly phase by phase. No jumping ahead.
- After each phase: run tests, write the audit report to `/docs`, then stop
  and wait for review.
- Polish (visual detail, animation, nice-to-haves) is a **separate track**
  after core functionality — never interleaved.
- When a decision has a cost/benefit tradeoff, state the recommendation
  directly with the reasoning, not a list of options.
- Prefer cost-effective solutions. Free tier first (Cloudflare, R2/B2). Don't
  reach for managed services we can run ourselves on one box.
- If something in this file turns out to be wrong, say so and propose the fix
  rather than working around it silently.
- **The client cannot be trusted, and ours less than most.** It is JavaScript
  built on open-source roBrowser — readable and editable by any player. Every
  limit must be enforced server-side. A cooldown or range check that only
  exists in `/ui` does not exist.

## 8a. Reference servers

Not to copy, and nothing here changes our plan. Kept so that "how does anyone
else do this" has an answer when a question comes up.

| Server | Why noted | Captured? |
|---|---|---|
| `eternal-origin.com` | operator's reference for feel and feature set | not yet — the dev environment's network policy blocks the domain |

When one is captured, split the findings in two: settings that are a config
change under `server/import/conf/local/`, and anything that contradicts the Ep4
pre-renewal baseline in §6 Phase 2 — third jobs, transcendent classes, renewal
mechanics, level caps above 99/50. The second kind is a change to this file,
made deliberately, not absorbed quietly.

---

## 9. Legal boundary — state of play

- rAthena and roBrowser are **GPL-3.0**. Commercial use is allowed, but
  distributing a modified version obliges us to provide source to recipients
  under the same terms. We cannot ship this closed-source.
- **RO's GRF assets, sprites, maps, and trademarks are Gravity's.** Running a
  public server on them is copyright exposure, and it is the kind that gets
  pursued. That risk is the operator's decision, but it is real and it grows
  with player count and visibility.
  **Decided (2026-07-28): the operator accepts this risk. Do not raise it
  again as a blocker.** What survives the decision is the engineering
  consequence below, which is a good idea regardless of the reason.
- Practical consequence for engineering: **the host is disposable and the data
  is not.** Off-host backups from Phase 1, no exceptions.
- Long-term de-risking path: replace assets with owned/licensed art. The
  architecture should not assume RO assets forever — keep the asset pipeline
  format-agnostic where it's cheap to do so.

---

## 10. Immediate next action

Phase 0. Do not write game code yet. Set up the repo, Compose skeleton,
`.env.example`, and CI. Confirm the gate, write the audit, then proceed.
