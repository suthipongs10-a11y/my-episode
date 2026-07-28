#!/usr/bin/env bash
# Installs BACKUP_CRON into crond and runs it in the foreground.
#
# One backup is taken immediately at startup rather than waiting for the first
# scheduled slot — a backup system whose first run is six hours away has not
# actually protected anything yet, and a broken configuration should surface
# now, in the deploy, not at 03:00.
set -euo pipefail

: "${BACKUP_CRON:?BACKUP_CRON must be set}"
: "${BACKUP_REMOTE:?BACKUP_REMOTE must be set}"

log() { printf '[backup] %s\n' "$*"; }

if [[ ! -r "${RCLONE_CONFIG}" ]]; then
    log "FATAL: no rclone config at ${RCLONE_CONFIG}"
    log "       run 'rclone config' and save it to infra/backup/rclone.conf"
    log "       see docs/vps-setup.md"
    exit 1
fi

remote_name="${BACKUP_REMOTE%%:*}"
if ! rclone listremotes | grep -qx "${remote_name}:"; then
    log "FATAL: rclone config has no remote named '${remote_name}'"
    log "       BACKUP_REMOTE is '${BACKUP_REMOTE}'; known remotes:"
    rclone listremotes | sed 's/^/       /'
    exit 1
fi

log "verifying the destination is writable before trusting the schedule"
if ! rclone mkdir "${BACKUP_REMOTE}" 2>&1 | sed 's/^/[backup] /'; then
    log "FATAL: cannot create ${BACKUP_REMOTE}"
    exit 1
fi

log "taking an initial backup"
if ! backup-db; then
    log "FATAL: the initial backup failed — not installing the schedule"
    exit 1
fi

# Preserve the environment for cron, which otherwise starts with almost none.
printenv | grep -E '^(DB_|BACKUP_|DEPLOY_ENV|RCLONE_)' | sed 's/^/export /' > /etc/backup.env
chmod 0600 /etc/backup.env

echo "${BACKUP_CRON} . /etc/backup.env && /usr/local/bin/backup-db >> /proc/1/fd/1 2>&1" > /etc/crontabs/root
log "schedule installed: ${BACKUP_CRON}"

exec crond -f -l 8
