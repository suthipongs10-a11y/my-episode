#!/usr/bin/env bash
# =============================================================================
# Import the rAthena schema  (Phase 1)
# =============================================================================
#   ./tools/db-init.sh              import into an empty database
#   ./tools/db-init.sh --force      re-import over an existing one (DESTRUCTIVE)
#
# Runs the upstream .sql files from the submodule against the running db
# container, then rewrites the default s1/p1 inter-server account to the
# credentials in .env.
#
# That last step is not cosmetic: rAthena ships with a well-known server
# account, and anyone who can reach the login port with it can register their
# own map-server against your char-server.
#
# Item and mob tables are deliberately not imported — rAthena reads those from
# YAML in db/, which is what Phase 2's Ep4 content cut will filter.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

log() { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[fatal]\033[0m %s\n' "$*" >&2; exit 1; }

[[ -f .env ]] || die ".env not found"

# Read .env rather than sourcing it.
#
# `source` *executes* the file, so a perfectly valid Compose line whose value
# contains spaces — BACKUP_CRON=0 */6 * * * — is parsed as an assignment
# followed by a command, and the script dies on "*/6: No such file or
# directory". Sourcing also means anything in .env runs with this script's
# privileges, which is not a property we want from a credentials file.
#
# Compose takes everything after the first '=' verbatim and strips one layer of
# surrounding quotes. Match that.
env_get() {
    local key="$1" line value
    line="$(grep -m1 -E "^[[:space:]]*${key}=" .env)" || return 1
    value="${line#*=}"
    if (( ${#value} >= 2 )) && [[ ( "${value}" == \"*\" ) || ( "${value}" == \'*\' ) ]]; then
        value="${value:1:${#value}-2}"
    fi
    [[ -n "${value}" ]] || return 1
    printf '%s' "${value}"
}

# `set -e` aborts on the failing command substitution, after die's message.
need_env() {
    local key="$1" value
    value="$(env_get "${key}")" || die "${key} is missing or empty in .env"
    printf '%s' "${value}"
}

DB_NAME="$(need_env DB_NAME)"
DB_LOG_NAME="$(need_env DB_LOG_NAME)"
DB_USER="$(need_env DB_USER)"
DB_PASSWORD="$(need_env DB_PASSWORD)"
RO_INTER_USER="$(need_env RO_INTER_USER)"
RO_INTER_PASS="$(need_env RO_INTER_PASS)"

# --- inter-server password constraints ---------------------------------------
# rAthena's char-server keeps this in a char[24] buffer (23 usable) and the
# login-server compares it as plaintext, so a longer value is truncated on one
# side and rejected by the varchar column on the other. An early gen-secrets.sh
# produced 40-character values; repair those here by rotating to a valid one,
# writing it back to .env so the servers and the database agree.
if ! [[ "${RO_INTER_PASS}" =~ ^[A-Za-z0-9]{1,23}$ ]]; then
    echo "  RO_INTER_PASS is invalid for rAthena (must be 1-23 alphanumeric chars)"
    new_pass=""
    while (( ${#new_pass} < 23 )); do
        new_pass+="$(head -c 256 /dev/urandom | LC_ALL=C tr -dc 'A-Za-z0-9')"
    done
    new_pass="${new_pass:0:23}"
    sed -i "s|^RO_INTER_PASS=.*|RO_INTER_PASS=${new_pass}|" .env
    RO_INTER_PASS="${new_pass}"
    echo "  rotated RO_INTER_PASS in .env (23 chars)"
    echo "  NOTE: running game servers still hold the old value — redeploy"
    echo "        (docker compose up -d) after this script so they agree."
fi

# Belt and braces: this value goes into a SQL statement, and MariaDB's client
# echoes failing statements into logs. The regex above makes the INSERT unable
# to fail on length or quoting, so the secret can never be echoed.
[[ "${RO_INTER_PASS}" =~ ^[A-Za-z0-9]{1,23}$ ]] || die "RO_INTER_PASS failed validation"
[[ "${RO_INTER_USER}" =~ ^[A-Za-z0-9]{1,23}$ ]] || die "RO_INTER_USER must be 1-23 alphanumeric chars"

SQL_DIR="server/rathena/sql-files"
[[ -d "${SQL_DIR}" ]] || die "no ${SQL_DIR} — run: git submodule update --init --recursive"

FORCE=0
ASSUME_YES=0
for arg in "$@"; do
    case "${arg}" in
        --force) FORCE=1 ;;
        # For CI, which has no terminal to answer a prompt on. Deliberately a
        # separate flag from --force: skipping the question is not the same
        # decision as choosing to destroy an existing database.
        --yes|-y) ASSUME_YES=1 ;;
        *) die "unknown argument '${arg}' (expected --force and/or --yes)" ;;
    esac
done

# Everything goes through the db container so this works identically whether
# or not a mariadb client is installed on the host.
db() {
    ./tools/compose.sh exec -T db \
        mariadb --user="${DB_USER}" --password="${DB_PASSWORD}" \
                --default-character-set=utf8mb3 "$@"
}

log "Checking the database is up"
./tools/compose.sh ps db --format json | grep -q '"Health":"healthy"' \
    || die "db container is not healthy. ./tools/compose.sh up -d db"

existing="$(db --skip-column-names --batch -e \
    "SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema='${DB_NAME}' AND table_name='login';" 2>/dev/null || echo 0)"

IMPORT=1
if [[ "${existing}" == "1" && "${FORCE}" -eq 0 ]]; then
    # Schema already there. Not an error: skip the import but still (re)set the
    # inter-server account below, so a run that failed between the two steps —
    # or a deliberate account reset — is fixed by simply running this again.
    log "'${DB_NAME}' already has its schema — skipping the import"
    echo "  (a full DROP-and-reimport, which deletes every account and"
    echo "   character, is: ./tools/db-init.sh --force)"
    IMPORT=0
fi

if [[ "${existing}" == "1" && "${FORCE}" -eq 1 ]]; then
    echo
    echo "  This will DESTROY all accounts and characters in '${DB_NAME}'."
    if (( ASSUME_YES )); then
        echo "  --yes given, proceeding without a prompt."
    else
        read -r -p "  Type the database name to confirm: " confirm
        [[ "${confirm}" == "${DB_NAME}" ]] || die "confirmation did not match — nothing changed"
    fi
fi

import() {
    local file="$1" schema="$2"
    [[ -f "${SQL_DIR}/${file}" ]] || die "missing ${SQL_DIR}/${file}"
    echo "  ${file} -> ${schema}"
    db "${schema}" < "${SQL_DIR}/${file}"
}

if (( IMPORT )); then
    log "Importing the schema"
    import main.sql "${DB_NAME}"
    import logs.sql "${DB_LOG_NAME}"
    import web.sql  "${DB_NAME}"
fi

log "Setting the inter-server account"
# sex='S' is what marks an account as a server rather than a player.
db "${DB_NAME}" <<SQL
DELETE FROM login WHERE sex = 'S';
INSERT INTO login (account_id, userid, user_pass, sex, email)
VALUES (1, '${RO_INTER_USER}', '${RO_INTER_PASS}', 'S', 'noreply@invalid');
SQL

account_count="$(db --skip-column-names --batch "${DB_NAME}" \
    -e "SELECT COUNT(*) FROM login WHERE sex='S';")"
[[ "${account_count}" == "1" ]] || die "expected exactly one server account, found ${account_count}"

log "Verifying"
tables="$(db --skip-column-names --batch -e \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';")"
log_tables="$(db --skip-column-names --batch -e \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_LOG_NAME}';")"

echo "  ${DB_NAME}: ${tables} tables"
echo "  ${DB_LOG_NAME}: ${log_tables} tables"
echo "  inter-server account: ${RO_INTER_USER}"

(( tables > 30 )) || die "only ${tables} tables in ${DB_NAME} — the import did not complete"

log "Schema ready — ./tools/compose.sh up -d"
