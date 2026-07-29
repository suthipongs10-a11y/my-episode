#!/usr/bin/env bash
# =============================================================================
# Is game logging actually recording anything?  (CLAUDE.md Phase 1)
# =============================================================================
#   ./tools/check-logging.sh
#
# CLAUDE.md requires pick, drop, zeny, chat, MVP and trade logging from day one,
# on the grounds that anti-bot work is retrospective: on the day you want to ban
# an account you need the month of behaviour behind it, and there is no way to
# collect that afterwards.
#
# "Configured" is not the same as "working", and the failure is silent — a
# server with logging misconfigured looks exactly like one with no players. This
# reports what each log table actually contains, so the difference is visible.
#
# Run it after ./tools/smoke-play.py, which creates a character and moves it and
# therefore should leave rows behind.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

log() { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[fatal]\033[0m %s\n' "$*" >&2; exit 1; }

[[ -f .env ]] || die ".env not found"

# Read .env rather than sourcing it — a valid Compose line whose value contains
# spaces would otherwise execute as a command. Same parser as db-init.sh.
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
need_env() {
    local value
    value="$(env_get "$1")" || die "$1 is missing or empty in .env"
    printf '%s' "${value}"
}

DB_LOG_NAME="$(need_env DB_LOG_NAME)"
DB_USER="$(need_env DB_USER)"
DB_PASSWORD="$(need_env DB_PASSWORD)"

db() {
    ./tools/compose.sh exec -T db \
        mariadb --user="${DB_USER}" --password="${DB_PASSWORD}" \
                --default-character-set=utf8mb3 --skip-column-names --batch "$@"
}

log "Row counts in ${DB_LOG_NAME}"

# What CLAUDE.md names, mapped to the table rAthena writes it to. picklog covers
# pick, drop, trade, storage and vending — they are separate `type` values in one
# table, which is why one table answers four of the six requirements.
declare -A WHAT=(
    [picklog]="items: pick, drop, trade, vending, storage"
    [zenylog]="zeny movement"
    [chatlog]="chat: global, whisper, party, guild"
    [mvplog]="MVP kills"
    [branchlog]="dead branch use"
    [atcommandlog]="GM and player commands"
    [npclog]="npc logmes"
    [cashlog]="cash shop"
    [feedinglog]="pet and homunculus feeding"
    [loginlog]="login attempts, by IP"
)

status=0
empty=()
for table in picklog zenylog chatlog mvplog branchlog atcommandlog npclog cashlog feedinglog loginlog; do
    count="$(db "${DB_LOG_NAME}" -e "SELECT COUNT(*) FROM \`${table}\`;" 2>/dev/null)" || {
        printf '  \033[1;31mmissing\033[0m  %-14s %s\n' "${table}" "table does not exist"
        status=1
        continue
    }
    if (( count > 0 )); then
        printf '  \033[1;32m%7s\033[0m  %-14s %s\n' "${count}" "${table}" "${WHAT[${table}]}"
    else
        printf '  %7s  %-14s %s\n' "0" "${table}" "${WHAT[${table}]}"
        empty+=("${table}")
    fi
done

# picklog is the one that must never be empty after any real activity: creating
# a character and walking does not trade or chat, but the server hands out the
# starting equipment, and that is a pick.
log "Verdict"
if (( status != 0 )); then
    echo "  a log table is missing — the log schema did not import."
    echo "  fix: ./tools/db-init.sh"
    exit 1
fi

if [[ " ${empty[*]} " == *" loginlog "* ]]; then
    echo "  loginlog is empty, so nothing has logged in at all."
    echo "  run ./tools/smoke-play.py first, then this again."
    exit 1
fi

echo "  loginlog has rows, so logging reaches the database."
if [[ " ${empty[*]} " == *" picklog "* ]]; then
    echo
    echo "  \033[1;31mpicklog is empty\033[0m despite a login having happened."
    echo "  enable_logs or sql_logs is wrong in conf/import/log_conf.txt."
    exit 1
fi

echo "  picklog has rows, so item logging is recording."
if (( ${#empty[@]} )); then
    echo
    echo "  Still empty, which is expected until a player does these things:"
    printf '    %s\n' "${empty[@]}"
    echo
    echo "  Empty is only meaningful once the matching activity has happened."
    echo "  chatlog stays empty until somebody talks; mvplog until an MVP dies."
fi
