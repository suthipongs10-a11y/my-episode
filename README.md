# RO Ep4 Mobile Web Server

A pre-renewal Ragnarok Online server (Episode 4.0 content baseline) playable in
a mobile browser as an installable PWA — no app store, no client download.

Read [`CLAUDE.md`](CLAUDE.md) first. It is the project's contract: constraints,
scaling model, phase plan, and the legal boundary. This file only covers how to
run what exists today.

**Current status: Phase 0 complete, gate passed.** Foundation and deployment
machinery; rAthena compiles and is verified pre-renewal in CI.
The game servers build and start; the Ep4 content cut, browser client, assets,
mobile UI and PWA shell are Phases 2–6 and are not written yet.

## Layout

```
infra/          Compose, Dockerfiles, Caddy, MariaDB, backup
server/
  rathena/      upstream rAthena — git submodule, never edited
  import/       every change we make, overlaid at container start
  map-groups/   which maps each map-server owns
proxy/          WebSocket <-> TCP bridge (skeleton; Phase 3)
client/         roBrowser-Legacy + our plugins (Phase 3)
ui/             mobile overlay (Phase 5)
pwa/            manifest, service worker, icons (Phase 6)
assets-build/   GRF extraction and content-hashing (Phase 4)
tools/          ops and content scripts
docs/           per-phase audit reports and runbooks
```

## Running it

Bringing the whole stack up on a new host is three steps. That is deliberate —
CLAUDE.md §4 says the host is disposable, and it stays true only if moving is
this cheap.

```bash
git clone --recurse-submodules <repo-url> ro-ep4 && cd ro-ep4
cp .env.example .env && ./tools/gen-secrets.sh
$EDITOR .env                 # PUBLIC_HOST, RO_ADVERTISE_IP, ACME_EMAIL
./tools/deploy.sh
```

On a fresh VPS, run `sudo ./tools/vps-bootstrap.sh` first. Full walkthrough:
[`docs/vps-setup.md`](docs/vps-setup.md).

The first build compiles rAthena and takes 10–20 minutes on 2 vCPU. Later
builds are cached unless the submodule moves.

### Day to day

```bash
./tools/compose.sh ps                  # what is running
./tools/compose.sh logs -f map1        # follow a server
./tools/compose.sh restart map1        # restart one
./tools/deploy.sh                      # pull, rebuild, roll
```

Always go through `tools/compose.sh`. It pairs the compose file in `infra/`
with the `.env` at the repository root; running `docker compose` directly gets
that pairing wrong and half-starts the stack.

## Configuration

Everything is in `.env`, at the repository root, gitignored. Nothing in the
repository contains an address, a port or a credential — that is CLAUDE.md
§2.1, the rule the whole design hangs off, and
`tools/check-no-hardcoded-config.sh` enforces it in CI.

`.env` does not travel with the repository. It is created once per host and
stays there; `git pull` never touches it. `.env.example` is the committed
contract that documents every key.

```bash
./tools/check-env.sh          # is .env complete and filled in?
./tools/check-env.sh --fix    # append keys added by a later phase
```

`deploy.sh` runs that check after every pull, because a `.env` missing a newly
added key otherwise shows up as a mysteriously broken deploy.

**Keep a copy of `.env` off the VPS.** `BACKUP_GPG_PASSPHRASE` exists only
there, and it is what decrypts your backups. Losing the host and `.env`
together means the dumps in your bucket are useless.

Moving to a bigger VPS is: bootstrap the new host, clone, copy `.env`, change
`PUBLIC_HOST` and `RO_ADVERTISE_IP`, restore a backup, deploy.

## Scaling

rAthena's map-server is single-threaded. One process uses one core no matter
how big the box is, so you scale by running more of them, each owning a subset
of maps. The topology already supports that at N=1:

```ini
COMPOSE_PROFILES=map2,map3
MAP1_GROUP=towns
MAP2_GROUP=fields
MAP3_GROUP=dungeons
```

Redeploy. No rebuild, no code change. See
[`server/map-groups/README.md`](server/map-groups/README.md).

Expected bottleneck order as players grow — bandwidth, then map-server CPU,
then DB writes, then proxy connections — is in CLAUDE.md §3.

## Testing

Everything below runs without a Docker daemon and is what CI runs:

```bash
./tools/compose.sh config --quiet          # Compose is valid
./tools/check-no-hardcoded-config.sh       # no addresses or secrets committed
./tools/check-map-groups.sh                # map groups partition cleanly
./tools/test-entrypoint.sh                 # config rendering and map splitting
cd proxy && npm run check                  # proxy allowlist parser
```

## Backups

Off-host from Phase 1, no exceptions (CLAUDE.md §4 and §9). Dumps are
encrypted, uploaded to Cloudflare R2 or Backblaze B2 by rclone, and pruned on a
retention window. Enable with `backup` in `COMPOSE_PROFILES`.

A backup you have never restored is a hypothesis. `tools/restore-db.sh` is the
other half, and proving it works from a wiped host is the Phase 8 gate.

## Licence

rAthena and roBrowser are GPL-3.0, so this project is too. RO's assets, sprites,
maps and trademarks are Gravity's and are not in this repository — see
CLAUDE.md §9 for where that line sits.
