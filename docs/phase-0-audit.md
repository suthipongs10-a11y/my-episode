# Phase 0 audit — Foundation

**Date:** 2026-07-28
**Gate (CLAUDE.md §6):** `docker compose config` valid; clean clone → build succeeds
**Result:** first half verified here; second half not verifiable in this environment — see *What was not tested*.

---

## What was built

### Repository and contract

- Layout per CLAUDE.md §5. `client/`, `ui/`, `pwa/`, `assets-build/` exist as
  placeholders and are untouched until their phases.
- `.env.example` documents every key with the reasoning, not just the name.
- `.gitignore` covers secrets, GRF/asset files, runtime state and build output.
- `CLAUDE.md` committed at the repository root.

### Docker Compose stack — `infra/docker-compose.yml`

Ten services. `login`, `char` and `map1` are separate from day one, not because
N=1 needs it but because the topology has to already support N>1 (CLAUDE.md §3).

| Service | Purpose | Default |
|---|---|---|
| `db` | MariaDB 11.4, tuned | on |
| `login` / `char` / `map1` | rAthena, three processes | on |
| `map2` / `map3` | additional map-servers | profile-gated |
| `web` | rAthena web-server (emblems, auth token) | profile-gated |
| `proxy` | WebSocket ↔ TCP bridge | on (skeleton) |
| `caddy` | TLS, static hosting | on |
| `backup` | scheduled off-host dump | profile-gated |

- Base images pinned by digest: ubuntu 24.04, mariadb 11.4, node 22, caddy 2.10,
  alpine 3.22. CI fails on any `FROM` without one.
- Only Caddy publishes publicly. Game ports bind to `${GAME_PORTS_BIND}`, which
  defaults to loopback.
- Three networks: `game`, `edge`, `egress` — the edge cannot see the database.
- Per-service log rotation, because 100GB fills faster than it sounds.

### rAthena — `infra/rathena/`

- Submodule at `server/rathena`, pinned to `0c3ca757` (upstream master,
  2026-07-24). A tracked upstream, not a vendored copy (CLAUDE.md §2.5).
- Two-stage build, compiled `--enable-prere=yes --enable-epoll`, `PACKETVER` and
  `MAXCONN` as build args. Runs as uid 10001, not root.
- `--enable-epoll` is not optional at our target concurrency; the default
  `select()` backend caps out well below it.

### Configuration strategy

This is the part worth reviewing closely, because CLAUDE.md §2.1 is the rule
everything else depends on.

Every upstream rAthena config ends with `import: conf/import/<name>.txt`. That
directory is both the last word in the import chain and the only place §2.6
allows us to write, so the entrypoint renders those five files from the
environment at container start via `envsubst`:

```
conf/import/inter_conf.txt   DB credentials      (all roles)
conf/import/login_conf.txt   bind, port
conf/import/char_conf.txt    inter-server auth, advertised address
conf/import/map_conf.txt     ditto + the map-group delmap block
conf/import/web_conf.txt     web-server
```

Consequences:

- No address, port or credential exists in any tracked file. The rendered files
  live only inside a running container, at mode 0600.
- Upstream is never patched, so the submodule can always fast-forward.
- Static overrides go in `server/import/conf/local/`, imported after the
  generated files so they can win deliberately.

An earlier design passed `--login-config` / `--map-config` and friends instead.
It was dropped: the web-server's CLI has no `--web-config`, so that approach
would have left one role configured differently from the other three.

### Map grouping

A group file lists the maps a map-server **keeps**. At start the entrypoint
diffs it against rAthena's full list and appends `delmap:` for the rest — a
diff rather than a hand-written exclusion list, so a split stays correct when
upstream adds maps, and a typo is reported instead of silently costing a map.

Going from one map-server to three is `.env` only:

```ini
COMPOSE_PROFILES=map2,map3
MAP1_GROUP=towns
MAP2_GROUP=fields
MAP3_GROUP=dungeons
```

`tools/check-map-groups.sh` checks a set of groups partitions the map list
exactly — no map in two groups, none in none.

### Backups

Built now, though CLAUDE.md only requires them from Phase 1, because the
machinery is Phase 0's job and Phase 1 should only have to switch it on.
`mariadb-dump --single-transaction` → gzip → GPG AES256 → rclone to R2/B2 →
prune on a retention window. `tools/restore-db.sh` is the other half.

The container takes one backup at startup rather than waiting for the first
scheduled slot: a backup system whose first run is six hours away has not
protected anything yet, and a bad bucket should fail the deploy.

### CI — `.github/workflows/ci.yml`

Four jobs: `lint`, `proxy`, `compose`, `build`. Beyond the usual shellcheck /
yamllint / hadolint, three checks encode project rules rather than style:

- **digest pinning** — any `FROM` without `@sha256:` fails.
- **`tools/check-no-hardcoded-config.sh`** — IPv4 literals outside
  `0.0.0.0`/`127.0.0.1`, `.env` tracked, real values in `.env.example`,
  hardcoded `s1`/`p1`, template variables missing from `SUBST_VARS`, Compose
  variables missing from `.env.example`.
- **pre-renewal verification** — `--version` does not report renewal mode, so
  the build job greps the compiled `map-server` for `npc/pre-re/scripts_main.conf`
  and asserts `npc/re/scripts_main.conf` is absent. A renewal build would
  otherwise pass every other check and quietly run the wrong mechanics.

### Operator tooling — `tools/`

`compose.sh` (wrapper), `vps-bootstrap.sh`, `deploy.sh`, `gen-secrets.sh`,
`db-init.sh`, `backup-db.sh`, `restore-db.sh`, `check-map-groups.sh`,
`check-no-hardcoded-config.sh`, `test-entrypoint.sh`.

---

## What was tested

Run in this environment. No Docker daemon was available, so everything here is
daemon-free.

| Check | Result |
|---|---|
| `docker compose config` — default profiles | pass |
| `docker compose config` — `web,backup,map2,map3` | pass, all 10 services resolve |
| Port publishing | only Caddy public; game ports on 127.0.0.1 |
| `shellcheck --severity=warning` — 14 scripts | pass |
| `yamllint --strict` | pass |
| `tools/check-no-hardcoded-config.sh` — 38 files | pass |
| `tools/check-map-groups.sh` | pass — 42/42 example map names valid against 1265 upstream |
| `tools/test-entrypoint.sh` | 20/20 pass |
| `proxy npm run check` | 8/8 pass |

**Fault injection.** The hygiene checker was verified to fail, not just pass:
a hardcoded `203.0.113.45` in a template, a real password in `.env.example`, an
undocumented Compose variable, and a template variable missing from
`SUBST_VARS` were each injected and each caught.

**Entrypoint harness.** `tools/test-entrypoint.sh` builds a throwaway rAthena
tree from the submodule, stubs the DB probe and server binaries, and asserts:
missing environment is fatal with a usable message; the DB password, advertised
IP, internal service names and ports substitute correctly; no `${...}`
placeholder survives; `inter_conf.txt` is 0600; `MAP_GROUP=all` removes nothing;
`example-towns` produces exactly 1223 delmap lines (1265 − 42), keeps Prontera
and drops Yuno; an unknown group is fatal; and login/char render their own
addressing correctly.

---

## What was not tested

**The image builds.** No Docker daemon in this environment. `docker compose
config` is valid and the Dockerfiles are written against a verified rAthena
tree — the configure flags, `make server` targets, CLI options and config
import chain were all read from the pinned commit rather than recalled — but
**nobody has run `docker compose build` yet.** The Phase 0 gate is only half
verified until CI's `build` job goes green or you run `./tools/deploy.sh`.

Most likely failure if it does break: an Ubuntu 24.04 package name. `libpcre3`
and `libmariadb3` are the two worth checking first.

**Everything runtime.** No server has started, no schema has been imported, no
client has connected. That is Phase 1 and is correctly out of scope.

**Backups end to end.** No bucket exists. The scripts are written and linted;
they have never moved a byte.

---

## Deferred

| Item | Phase |
|---|---|
| WebSocket bridge (skeleton only — `/healthz`, 501 on upgrade) | 3 |
| Schema import verified against a live DB | 1 |
| Ep4 content cut | 2 |
| `client/`, `ui/`, `pwa/`, `assets-build/` | 3–6 |
| Resource limits per service | 7, with real numbers |
| Metrics and load testing | 7 |

---

## What Phase 1 now assumes

1. `./tools/deploy.sh` brings the stack up on a bootstrapped host.
2. Configuration is `.env` only. New settings go through `.env.example` →
   Compose → `SUBST_VARS` → template. CI enforces all four.
3. Upstream rAthena is never edited. Overrides go in `server/import/`.
4. `./tools/db-init.sh` imports the schema and sets the inter-server account.
   Written, not yet run.
5. Backups are a profile switch, not a build.
6. `map1` owning every map is a configuration choice, not an assumption.
   Splitting is `.env`.

---

## Recommendations before Phase 1

1. **Run the build.** Push and let CI's `build` job settle the untested half of
   the gate before touching the VPS.
2. **Set `PACKETVER` to match your test client.** It defaults to `20180620`,
   which works with a standard PC client and is supported by roBrowser-Legacy in
   Phase 3. It is compile-time — changing it later is a full rebuild.
3. **Open the game ports only for the gate, then close them.** Procedure in
   `docs/vps-setup.md` §7.
4. **Configure backups before creating characters,** not after.

---

## One correction to CLAUDE.md

§6 Phase 0 lists "CI that at minimum lints and builds containers" but does not
mention the submodule. Constraint §2.5 requires rAthena to be tracked upstream,
and the Phase 0 gate — "clean clone → build succeeds" — cannot be met without
the source present. The submodule was therefore added in Phase 0 rather than
Phase 1. Phase 1's remaining scope is unchanged: compile verification against a
running DB, schema import, and the PC client gate.
