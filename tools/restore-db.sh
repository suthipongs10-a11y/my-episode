#!/usr/bin/env bash
# =============================================================================
# Restore a dump from off-host storage
# =============================================================================
#   ./tools/compose.sh exec backup restore-db --list
#   ./tools/compose.sh exec backup restore-db prod-20260728T030000Z
#
# The Phase 8 gate is a restore drill from a wiped host. A backup you have
# never restored is a hypothesis, not a backup — run this against a scratch
# database periodically, not for the first time during an incident.
# =============================================================================
set -euo pipefail

: "${DB_HOST:?}"; : "${DB_PORT:?}"; : "${DB_USER:?}"; : "${DB_PASSWORD:?}"
: "${DB_NAME:?}"; : "${DB_LOG_NAME:?}"; : "${BACKUP_REMOTE:?}"

WORKDIR="${WORKDIR:-/work}"
log() { printf '[restore-db] %s\n' "$*"; }
die() { printf '[restore-db] FATAL: %s\n' "$*" >&2; exit 1; }

if [[ "${1:-}" == "--list" || -z "${1:-}" ]]; then
    log "available backups in ${BACKUP_REMOTE}:"
    rclone lsl "${BACKUP_REMOTE}" | sort -k4
    [[ -n "${1:-}" ]] || die "no backup name given (use the stamp, e.g. prod-20260728T030000Z)"
    exit 0
fi

base="$1"
which="${2:-game}"   # game | logs
[[ "${which}" == "game" || "${which}" == "logs" ]] || die "second argument must be 'game' or 'logs'"

target_db="${DB_NAME}"
[[ "${which}" == "logs" ]] && target_db="${DB_LOG_NAME}"

# Find whichever variant exists — encrypted or not.
remote_file=""
for candidate in "${base}-${which}.sql.gz.gpg" "${base}-${which}.sql.gz"; do
    if rclone lsf "${BACKUP_REMOTE}/${candidate}" >/dev/null 2>&1; then
        remote_file="${candidate}"
        break
    fi
done
[[ -n "${remote_file}" ]] || die "no ${which} dump found for '${base}' in ${BACKUP_REMOTE}"

local_file="${WORKDIR}/${remote_file}"
trap 'rm -f "${WORKDIR}/${base}-${which}".sql.gz*' EXIT

log "downloading ${remote_file}"
rclone copyto "${BACKUP_REMOTE}/${remote_file}" "${local_file}" --retries 3

if [[ "${remote_file}" == *.gpg ]]; then
    [[ -n "${BACKUP_GPG_PASSPHRASE:-}" ]] || die "dump is encrypted but BACKUP_GPG_PASSPHRASE is empty"
    log "decrypting"
    gpg --batch --yes --quiet --decrypt \
        --passphrase "${BACKUP_GPG_PASSPHRASE}" \
        --output "${local_file%.gpg}" "${local_file}"
    local_file="${local_file%.gpg}"
fi

cat <<WARN

  About to overwrite database '${target_db}' on ${DB_HOST}:${DB_PORT}
  with the contents of ${remote_file}.

  Stop the game servers first, or characters in memory will be written back
  over the restored rows:
      ./tools/compose.sh stop login char map1

WARN
read -r -p "Type the database name to confirm: " confirm
[[ "${confirm}" == "${target_db}" ]] || die "confirmation did not match — nothing changed"

log "restoring into ${target_db}"
gzip -dc "${local_file}" | mariadb \
    --host="${DB_HOST}" --port="${DB_PORT}" \
    --user="${DB_USER}" --password="${DB_PASSWORD}" \
    --default-character-set=utf8mb3

log "restore complete — restart the game servers when you are ready"
