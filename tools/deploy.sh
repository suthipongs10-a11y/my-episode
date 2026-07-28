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

[[ -f .env ]] || die ".env not found. cp .env.example .env && ./tools/gen-secrets.sh"

if grep -qE '^[A-Za-z_][A-Za-z0-9_]*=CHANGE_ME' .env; then
    die ".env still contains placeholders:
$(grep -nE '^[A-Za-z_][A-Za-z0-9_]*=CHANGE_ME' .env | sed 's/^/    /')
Run ./tools/gen-secrets.sh, then fill in the rest by hand."
fi

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

log "Verifying the Compose configuration"
./tools/compose.sh config --quiet

log "Checking map groups"
./tools/check-map-groups.sh || die "map group validation failed"

log "Building images"
# rAthena is a long compile on 2 vCPU. Expect 10-20 minutes the first time;
# afterwards the layer cache makes it near-instant unless the submodule moved.
./tools/compose.sh build --pull

log "Starting"
./tools/compose.sh up -d --remove-orphans

log "Waiting for health"
deadline=$(( SECONDS + 600 ))
while (( SECONDS < deadline )); do
    unhealthy="$(./tools/compose.sh ps --format json 2>/dev/null \
        | jq -r 'select(.Health == "starting" or .Health == "unhealthy") | .Service' \
        | tr '\n' ' ' || true)"
    [[ -z "${unhealthy// /}" ]] && break
    printf '\r  waiting on: %-60s' "${unhealthy}"
    sleep 5
done
printf '\r%-70s\r' ''

log "Status"
./tools/compose.sh ps

failed="$(./tools/compose.sh ps --format json 2>/dev/null \
    | jq -r 'select(.Health == "unhealthy") | .Service' | tr '\n' ' ' || true)"
if [[ -n "${failed// /}" ]]; then
    echo
    die "unhealthy after deploy: ${failed}
    ./tools/compose.sh logs --tail 100 ${failed}"
fi

log "Deployed"
