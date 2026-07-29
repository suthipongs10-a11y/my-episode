#!/usr/bin/env bash
# =============================================================================
# rAthena container entrypoint
# =============================================================================
# One image, four roles. Usage: entrypoint <login|char|map|web>
#
# Config strategy (CLAUDE.md §2.1 and §2.6):
#   Every upstream config file ends with `import: conf/import/<name>.txt`, so
#   that directory is both the last word and the only place we are allowed to
#   write. We render those files from the environment at container start. No
#   address, port or credential exists in a file tracked by git, and upstream
#   is never patched, so `git pull` on the submodule can never conflict.
#
#   conf/import/<role>_conf.txt   <- generated here, owned by this script
#   conf/import/local/*.txt       <- your static overrides, imported last
#   conf/import/<anything else>   <- copied verbatim from server/import/conf
#
# Order of operations:
#   1. check the environment is complete (fail loudly, not at 3am)
#   2. overlay our files onto conf/import, db/import, npc/custom
#   3. render the generated config from templates + environment
#   4. for map-servers, turn a map-group name into `delmap:` lines
#   5. wait for the database
#   6. exec the server, so signals reach it
# =============================================================================
set -euo pipefail

# Overridable so the rendering logic can be exercised outside a container
# (tools/test-entrypoint.sh). In the image these are always the defaults.
RATHENA_HOME="${RATHENA_HOME:-/opt/rathena}"
OVERLAY="${OVERLAY:-/overlay}"
CONF_IMPORT="${RATHENA_HOME}/conf/import"
MAPGROUP_DIR="${MAPGROUP_DIR:-${RATHENA_HOME}/map-groups}"

log() { printf '[entrypoint] %s\n' "$*"; }
die() { printf '[entrypoint] FATAL: %s\n' "$*" >&2; exit 1; }

ROLE="${1:-${RO_ROLE:-}}"
[[ -n "${ROLE}" ]] || die "no role given. Usage: entrypoint <login|char|map|web>"


# --- 1. environment ----------------------------------------------------------

require() {
    local missing=()
    for var in "$@"; do
        [[ -n "${!var:-}" ]] || missing+=("${var}")
    done
    (( ${#missing[@]} == 0 )) || die "missing required environment variables: ${missing[*]}"
}

require DB_HOST DB_PORT DB_NAME DB_LOG_NAME DB_USER DB_PASSWORD

case "${ROLE}" in
    login) require LOGIN_PORT ;;
    char)  require CHAR_PORT LOGIN_HOST LOGIN_PORT RO_ADVERTISE_IP RO_INTER_USER RO_INTER_PASS RO_SERVER_NAME ;;
    map)   require MAP_PORT MAP_GROUP CHAR_HOST CHAR_PORT RO_ADVERTISE_IP RO_INTER_USER RO_INTER_PASS ;;
    web)   ;;
    *)     die "unknown role '${ROLE}' (expected login, char, map or web)" ;;
esac

# Defaults for values only some roles set, so a template never renders an
# empty value into a key and produces a confusing parse error later.
: "${LOGIN_HOST:=login}"
: "${LOGIN_PORT:=6900}"
: "${CHAR_HOST:=char}"
: "${CHAR_PORT:=6121}"
: "${MAP_PORT:=5121}"
: "${MAP_GROUP:=all}"
: "${RO_ADVERTISE_IP:=127.0.0.1}"
: "${RO_INTER_USER:=s1}"
: "${RO_INTER_PASS:=p1}"
: "${RO_SERVER_NAME:=Episode4}"
export LOGIN_HOST LOGIN_PORT CHAR_HOST CHAR_PORT MAP_PORT MAP_GROUP \
       RO_ADVERTISE_IP RO_INTER_USER RO_INTER_PASS RO_SERVER_NAME

cd "${RATHENA_HOME}"


# --- 2. overlay our overrides onto the upstream tree -------------------------
# Copy, never symlink or bind-mount over: the upstream tree must stay exactly
# as checked out so `git status` in the submodule stays clean.

overlay_into() {
    local src="$1" dst="$2"
    [[ -d "${src}" ]] || return 0
    find "${src}" -mindepth 1 -maxdepth 1 -print -quit | grep -q . || return 0
    mkdir -p "${dst}"
    cp -RL "${src}/." "${dst}/"
    log "overlaid ${src} -> ${dst}"
}

overlay_into "${OVERLAY}/conf" "${CONF_IMPORT}"
overlay_into "${OVERLAY}/db"   "${RATHENA_HOME}/db/import"
overlay_into "${OVERLAY}/npc"  "${RATHENA_HOME}/npc/custom"


# --- 3. render the generated config ------------------------------------------
# Only the variables named here are substituted; anything else that happens to
# look like a shell variable inside a template is left alone.

SUBST_VARS='${DB_HOST} ${DB_PORT} ${DB_NAME} ${DB_LOG_NAME} ${DB_USER} ${DB_PASSWORD}'
SUBST_VARS+=' ${LOGIN_HOST} ${LOGIN_PORT} ${CHAR_HOST} ${CHAR_PORT} ${MAP_PORT}'
SUBST_VARS+=' ${RO_ADVERTISE_IP} ${RO_INTER_USER} ${RO_INTER_PASS} ${RO_SERVER_NAME}'

render() {
    local name="$1"
    local tpl="${OVERLAY}/templates/${name}.tpl"
    local out="${CONF_IMPORT}/${name}"
    [[ -f "${tpl}" ]] || die "template not found: ${tpl}"

    envsubst "${SUBST_VARS}" < "${tpl}" > "${out}"

    # Hand the last word to the operator's static overrides, if any.
    if [[ -f "${CONF_IMPORT}/local/${name}" ]]; then
        printf '\nimport: conf/import/local/%s\n' "${name}" >> "${out}"
        log "  + conf/import/local/${name}"
    fi

    chmod 0600 "${out}"   # inter_conf.txt holds the database password
    log "rendered conf/import/${name}"
}

render inter_conf.txt
case "${ROLE}" in
    login) render login_conf.txt ;;
    char)  render char_conf.txt ;;
    # log_conf is the map-server's alone: conf/log_athena.conf is only read
    # there, and it is where every logged event originates.
    map)   render map_conf.txt; render log_conf.txt ;;
    web)   render web_conf.txt ;;
esac


# --- 4. map group -> delmap list --------------------------------------------
# A map-server owns a subset of maps. The group file lists what it KEEPS; we
# diff that against upstream's full list and append `delmap:` for the rest.
# Doing it as a diff rather than a hand-written exclusion list means the split
# stays correct when upstream adds maps. Adding a map-server is then purely a
# .env change, which is the CLAUDE.md §3 requirement.

append_mapgroup() {
    local out="${CONF_IMPORT}/map_conf.txt"

    if [[ "${MAP_GROUP}" == "all" ]]; then
        printf '\n// MAP_GROUP=all — this map-server owns every map.\n' >> "${out}"
        log "map group 'all': serving the full upstream map list"
        return
    fi

    local group_file="${MAPGROUP_DIR}/${MAP_GROUP}.conf"
    [[ -f "${group_file}" ]] || die "map group '${MAP_GROUP}' not found at ${group_file}"

    local all_maps keep_maps
    all_maps="$(mktemp)"
    keep_maps="$(mktemp)"

    extract_maps() {
        sed -e 's/\r$//' "$1" \
            | grep -E '^[[:space:]]*map:' \
            | sed -E 's/^[[:space:]]*map:[[:space:]]*//; s/[[:space:]]+$//' \
            | sort -u
    }

    extract_maps "${RATHENA_HOME}/conf/maps_athena.conf" > "${all_maps}"
    extract_maps "${group_file}" > "${keep_maps}"

    # A map in the group that upstream does not know about is nearly always a
    # typo, and a typo here silently costs this server a map.
    local unknown
    unknown="$(comm -13 "${all_maps}" "${keep_maps}" | tr '\n' ' ')"
    [[ -z "${unknown// /}" ]] || log "WARNING: map group '${MAP_GROUP}' lists unknown maps: ${unknown}"

    {
        printf '\n// ---- generated from map-groups/%s.conf ----\n' "${MAP_GROUP}"
        comm -23 "${all_maps}" "${keep_maps}" | sed -E 's/^/delmap: /'
    } >> "${out}"

    log "map group '${MAP_GROUP}': keeping $(wc -l < "${keep_maps}") of $(wc -l < "${all_maps}") maps"
    rm -f "${all_maps}" "${keep_maps}"
}

if [[ "${ROLE}" == "map" ]]; then
    append_mapgroup
fi


# --- 5. wait for the database ------------------------------------------------
# Compose already gates on the DB healthcheck, but a restarting DB or a slow
# InnoDB recovery will still race us, and rAthena exits rather than retrying.

log "waiting for ${DB_HOST}:${DB_PORT} ..."
for attempt in $(seq 1 60); do
    if mariadb-admin ping \
            --host="${DB_HOST}" --port="${DB_PORT}" \
            --user="${DB_USER}" --password="${DB_PASSWORD}" \
            --silent --connect-timeout=2 >/dev/null 2>&1; then
        log "database reachable after ${attempt} attempt(s)"
        break
    fi
    (( attempt < 60 )) || die "database at ${DB_HOST}:${DB_PORT} never became reachable"
    sleep 2
done


# --- 6. launch ---------------------------------------------------------------
# No --*-config flags: every path above is reached through the upstream import
# chain, which keeps the web-server (whose CLI has no --web-config) consistent
# with the rest.

log "starting ${ROLE}-server"

case "${ROLE}" in
    login) exec ./login-server ;;
    char)  exec ./char-server ;;
    map)   exec ./map-server ;;
    web)   exec ./web-server ;;
esac
