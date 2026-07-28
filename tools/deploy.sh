#!/usr/bin/env bash
# =============================================================================
# Deploy the current checkout
# =============================================================================
#   ./tools/deploy.sh              pull, build, restart what changed
#   ./tools/deploy.sh --no-pull    build and restart the working tree as-is
#
# Safe to re-run. Does not touch the database.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

PULL=1
[[ "${1:-}" == "--no-pull" ]] && PULL=0

log() { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[fatal]\033[0m %s\n' "$*" >&2; exit 1; }

# Fail before spending minutes on a pull if there is no .env at all.
[[ -f .env ]] || die ".env not found. cp .env.example .env && ./tools/gen-secrets.sh"

if (( PULL )); then
    log "Pulling"
    branch="$(git rev-parse --abbrev-ref HEAD)"
    for attempt in 1 2 3 4; do
        if git pull --ff-only origin "${branch}"; then
            break
        fi
        (( attempt < 4 )) || die "git pull failed after 4 attempts"
        delay=$(( 2 ** attempt ))
        echo "  pull failed, retrying in ${delay}s"
        sleep "${delay}"
    done

    log "Syncing the rAthena submodule"
    # Pinned to a commit by the superproject — this checks out that exact
    # commit, it does not follow upstream master (CLAUDE.md §2.5).
    git submodule update --init --recursive
fi

log "Checking .env"
# After the pull, not before: the pull is what can introduce a key that .env
# does not have yet. A stale .env is the failure mode that looks like a broken
# deploy but is really one missing line.
./tools/check-env.sh || die "fix .env, then deploy again"

log "Verifying the Compose configuration"
./tools/compose.sh config --quiet

log "Checking map groups"
./tools/check-map-groups.sh || die "map group validation failed"

log "Building images"
# rAthena is a long compile on 2 vCPU. Expect 10-20 minutes the first time;
# afterwards the layer cache makes it near-instant unless the submodule moved.
build_args=(--pull)
if [[ "${RO_REBUILD:-}" == "true" ]]; then
    log "  --no-cache requested: rAthena will recompile from scratch"
    build_args+=(--no-cache)
fi
./tools/compose.sh build "${build_args[@]}"

log "Starting"
# RO_SERVICES lets a caller bring up a subset — Phase 1 needs only the game
# servers and the database, and starting Caddy before Phase 3 would just fight
# whatever already owns port 80 on the host.
if [[ -n "${RO_SERVICES:-}" ]]; then
    read -r -a wanted <<< "${RO_SERVICES}"
    log "  services: ${wanted[*]}"
    # No --remove-orphans with a subset: it would stop everything not named.
    ./tools/compose.sh up -d "${wanted[@]}"
else
    ./tools/compose.sh up -d --remove-orphans
fi

log "Waiting for health"

# `compose ps --format json` emits a JSON array on some versions and one
# object per line on others. `[.] | flatten` normalises both to a stream of
# objects, so this does not silently report everything healthy after an
# upgrade changes the shape.
services_matching() {
    ./tools/compose.sh ps --format json 2>/dev/null \
        | jq -r "[.] | flatten | .[] | select(${1}) | .Service" \
        | tr '\n' ' ' || true
}

deadline=$(( SECONDS + 600 ))
while (( SECONDS < deadline )); do
    pending="$(services_matching '.Health == "starting"')"
    [[ -z "${pending// /}" ]] && break
    printf '\r  waiting on: %-60s' "${pending}"
    sleep 5
done
printf '\r%-70s\r' ''

log "Status"
./tools/compose.sh ps

failed="$(services_matching '.Health == "unhealthy"')"
if [[ -n "${failed// /}" ]]; then
    echo
    die "unhealthy after deploy: ${failed}
    ./tools/compose.sh logs --tail 100 ${failed}"
fi

log "Deployed"
