#!/usr/bin/env bash
# =============================================================================
# The one way to talk to the stack
# =============================================================================
#   ./tools/compose.sh up -d
#   ./tools/compose.sh logs -f map1
#   ./tools/compose.sh ps
#
# Exists so nobody has to remember `--env-file`. The compose file lives in
# infra/ but the environment lives at the repository root, and getting that
# pairing wrong produces a confusing wall of "variable is not set" warnings
# followed by containers that half-start.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT}/.env"
COMPOSE_FILE="${ROOT}/infra/docker-compose.yml"

if [[ ! -f "${ENV_FILE}" ]]; then
    cat >&2 <<EOF
No .env found at ${ENV_FILE}

    cp .env.example .env
    ./tools/gen-secrets.sh

then edit PUBLIC_HOST, RO_ADVERTISE_IP and ACME_EMAIL for this host.
EOF
    exit 1
fi

exec docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
