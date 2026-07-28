#!/usr/bin/env bash
# =============================================================================
# Dump both schemas and ship them off the VPS
# =============================================================================
# Runs inside the `backup` container, on BACKUP_CRON. Also runnable by hand:
#   ./tools/compose.sh exec backup backup-db
#
# CLAUDE.md §4: backups leave the VPS. A dump sitting on the same NVMe as the
# database survives exactly none of the failures we actually expect —
# a provider suspension, a takedown, or the host simply going away.
# =============================================================================
set -euo pipefail

: "${DB_HOST:?}"; : "${DB_PORT:?}"; : "${DB_USER:?}"; : "${DB_PASSWORD:?}"
: "${DB_NAME:?}"; : "${DB_LOG_NAME:?}"; : "${BACKUP_REMOTE:?}"
: "${BACKUP_RETENTION:=30d}"
: "${DEPLOY_ENV:=dev}"

WORKDIR="${WORKDIR:-/work}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
base="${DEPLOY_ENV}-${stamp}"

log() { printf '[backup-db] %s\n' "$*"; }

cleanup() { rm -f "${WORKDIR}/${base}"*; }
trap cleanup EXIT

dump_one() {
    local schema="$1" out="$2"
    log "dumping ${schema}"
    # --single-transaction keeps InnoDB consistent without locking players out.
    # --routines/--events so a restore is actually complete.
    mariadb-dump \
        --host="${DB_HOST}" --port="${DB_PORT}" \
        --user="${DB_USER}" --password="${DB_PASSWORD}" \
        --single-transaction \
        --quick \
        --routines --events \
        --default-character-set=utf8mb3 \
        --databases "${schema}" \
        | gzip -6 > "${out}"
}

# The game schema is the one that matters. Logs are dumped too but are
# expendable; if they ever dominate the backup window, drop them from here.
dump_one "${DB_NAME}"     "${WORKDIR}/${base}-game.sql.gz"
dump_one "${DB_LOG_NAME}" "${WORKDIR}/${base}-logs.sql.gz"

for f in "${WORKDIR}/${base}"-*.sql.gz; do
    [[ -s "${f}" ]] || { log "FATAL: ${f} is empty — refusing to upload"; exit 1; }
done

# Encrypt before it leaves the box. The dump contains password hashes and
# player data, and it is about to sit in someone else's bucket.
upload_ext="sql.gz"
if [[ -n "${BACKUP_GPG_PASSPHRASE:-}" ]]; then
    log "encrypting"
    for f in "${WORKDIR}/${base}"-*.sql.gz; do
        gpg --batch --yes --symmetric --cipher-algo AES256 \
            --passphrase "${BACKUP_GPG_PASSPHRASE}" \
            --output "${f}.gpg" "${f}"
        rm -f "${f}"
    done
    upload_ext="sql.gz.gpg"
else
    log "WARNING: BACKUP_GPG_PASSPHRASE is empty — uploading unencrypted"
fi

log "uploading to ${BACKUP_REMOTE}"
for f in "${WORKDIR}/${base}"-*."${upload_ext}"; do
    rclone copyto "${f}" "${BACKUP_REMOTE}/$(basename "${f}")" \
        --retries 3 --low-level-retries 10 --stats-one-line
    log "uploaded $(basename "${f}") ($(du -h "${f}" | cut -f1))"
done

log "pruning remote copies older than ${BACKUP_RETENTION}"
rclone delete "${BACKUP_REMOTE}" --min-age "${BACKUP_RETENTION}" --rmdirs || \
    log "WARNING: prune failed; backups still uploaded"

log "done: ${base}"
