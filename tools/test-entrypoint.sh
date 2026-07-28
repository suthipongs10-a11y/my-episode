#!/usr/bin/env bash
# =============================================================================
# Exercise the rAthena entrypoint without Docker
# =============================================================================
#   ./tools/test-entrypoint.sh
#
# The entrypoint is where the "no hardcoded configuration" rule is actually
# enforced at runtime, and where a map-group name becomes a set of delmap
# lines. Both are easy to get subtly wrong and neither shows up as a build
# failure — a bad render produces a server that starts and then behaves oddly.
#
# This builds a throwaway rAthena tree from the submodule, points the
# entrypoint at it, stubs the database probe and the server binaries, and
# checks what came out.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM="${ROOT}/server/rathena"

if [[ ! -f "${UPSTREAM}/conf/maps_athena.conf" ]]; then
    echo "rAthena submodule not checked out — skipping"
    echo "  git submodule update --init --recursive"
    exit 0
fi

WORK="$(mktemp -d)"
trap 'rm -rf "${WORK}"' EXIT

pass=0
fail=0
ok()  { printf '  \033[1;32mok\033[0m   %s\n' "$*"; pass=$((pass + 1)); }
bad() { printf '  \033[1;31mfail\033[0m %s\n' "$*"; fail=$((fail + 1)); }

# --- scaffolding -------------------------------------------------------------

HOME_DIR="${WORK}/rathena"
mkdir -p "${HOME_DIR}/conf/import" "${HOME_DIR}/db/import" "${HOME_DIR}/npc/custom"
cp "${UPSTREAM}/conf/maps_athena.conf" "${HOME_DIR}/conf/"

# Stubs: a database that is always up, and servers that report and exit.
mkdir -p "${WORK}/bin"
printf '#!/bin/sh\nexit 0\n' > "${WORK}/bin/mariadb-admin"
chmod +x "${WORK}/bin/mariadb-admin"
for role in login char map web; do
    printf '#!/bin/sh\necho "STUB %s-server started"\n' "${role}" > "${HOME_DIR}/${role}-server"
    chmod +x "${HOME_DIR}/${role}-server"
done

# Last argument is the role; everything before it is a VAR=value assignment.
run_entrypoint() {
    local role="${!#}"
    local envs=("${@:1:$#-1}")

    rm -rf "${HOME_DIR}/conf/import"
    mkdir -p "${HOME_DIR}/conf/import"

    env -i PATH="${WORK}/bin:/usr/bin:/bin" \
        RATHENA_HOME="${HOME_DIR}" \
        OVERLAY="${ROOT}/server/import" \
        MAPGROUP_DIR="${ROOT}/server/map-groups" \
        ${envs[@]+"${envs[@]}"} \
        bash "${ROOT}/infra/rathena/entrypoint.sh" "${role}"
}

base_env=(
    DB_HOST=db DB_PORT=3306 DB_NAME=ragnarok DB_LOG_NAME=ragnarok_log
    DB_USER=rouser DB_PASSWORD=s3cr3tpw
    RO_ADVERTISE_IP=198.51.100.7
    RO_INTER_USER=svr1 RO_INTER_PASS=interpw
    RO_SERVER_NAME=Episode4
    LOGIN_HOST=login LOGIN_PORT=6900
    CHAR_HOST=char CHAR_PORT=6121
)

# --- 1. missing environment is fatal ----------------------------------------
echo "refuses to start without configuration:"
if out="$(run_entrypoint map 2>&1)"; then
    bad "started with no environment set"
else
    if grep -q 'missing required environment variables' <<<"${out}"; then
        ok "fails with a usable message"
    else
        bad "failed, but not with the expected message: ${out}"
    fi
fi

# --- 2. rendering ------------------------------------------------------------
echo
echo "renders configuration from the environment:"
out="$(run_entrypoint "${base_env[@]}" MAP_PORT=5121 MAP_GROUP=all map 2>&1)" || {
    bad "map role failed to start: ${out}"; exit 1;
}
grep -q 'STUB map-server started' <<<"${out}" \
    && ok "reached exec" || bad "never reached exec"

inter="${HOME_DIR}/conf/import/inter_conf.txt"
mapc="${HOME_DIR}/conf/import/map_conf.txt"

grep -q '^login_server_pw: s3cr3tpw$'  "${inter}" && ok "DB password substituted" || bad "DB password not substituted"
grep -q '^log_db_db: ragnarok_log$'    "${inter}" && ok "log schema separated"    || bad "log schema wrong"
grep -q '^map_ip: 198.51.100.7$'       "${mapc}"  && ok "advertised IP is the env value" || bad "advertised IP wrong"
grep -q '^char_ip: char$'              "${mapc}"  && ok "internal char host is the service name" || bad "internal char host wrong"
grep -q '^map_port: 5121$'             "${mapc}"  && ok "map port substituted"    || bad "map port wrong"
grep -q '^passwd: interpw$'            "${mapc}"  && ok "inter-server password substituted" || bad "inter password wrong"

# Nothing may survive as a literal placeholder — envsubst silently leaves
# unknown variables alone and rAthena would then parse '${FOO}' as a value.
if grep -rq '\${' "${HOME_DIR}/conf/import/"; then
    bad "unsubstituted placeholders remain:"
    grep -rn '\${' "${HOME_DIR}/conf/import/" | sed 's/^/       /'
else
    ok "no unsubstituted placeholders"
fi

perms="$(stat -c '%a' "${inter}")"
[[ "${perms}" == "600" ]] && ok "inter_conf.txt is 0600" || bad "inter_conf.txt is ${perms}, expected 600"

# --- 3. MAP_GROUP=all --------------------------------------------------------
echo
echo "MAP_GROUP=all:"
if grep -q '^delmap:' "${mapc}"; then
    bad "generated delmap lines for the 'all' group"
else
    ok "no maps removed"
fi

# --- 4. a real split ---------------------------------------------------------
echo
echo "MAP_GROUP=example-towns:"
out="$(run_entrypoint "${base_env[@]}" MAP_PORT=5122 MAP_GROUP=example-towns map 2>&1)" || {
    bad "split group failed: ${out}"; exit 1;
}

total=$(grep -cE '^[[:space:]]*map:' "${HOME_DIR}/conf/maps_athena.conf")
kept=$(grep -cE '^[[:space:]]*map:' "${ROOT}/server/map-groups/example-towns.conf")
dropped=$(grep -c '^delmap:' "${mapc}" || true)

echo "       upstream=${total} kept=${kept} delmap=${dropped}"
if (( dropped == total - kept )); then
    ok "delmap count matches upstream minus kept"
else
    bad "expected $(( total - kept )) delmap lines, got ${dropped}"
fi

grep -q '^delmap: prontera$' "${mapc}" \
    && bad "removed prontera, which the group keeps" \
    || ok "kept maps are not in the delmap list"

grep -q '^delmap: yuno$' "${mapc}" \
    && ok "maps outside the group are removed" \
    || bad "yuno should have been removed"

if grep -q 'unknown maps' <<<"${out}"; then
    bad "example-towns lists maps upstream does not know: ${out}"
else
    ok "every map in the group exists upstream"
fi

# --- 5. an unknown group is fatal -------------------------------------------
echo
echo "unknown map group:"
if out="$(run_entrypoint "${base_env[@]}" MAP_PORT=5121 MAP_GROUP=does-not-exist map 2>&1)"; then
    bad "started with a nonexistent map group"
else
    grep -q "map group 'does-not-exist' not found" <<<"${out}" \
        && ok "fails with a usable message" || bad "wrong error: ${out}"
fi

# --- 6. the other roles render too ------------------------------------------
echo
echo "other roles:"
for role in login char; do
    if out="$(run_entrypoint "${base_env[@]}" MAP_PORT=5121 MAP_GROUP=all "${role}" 2>&1)"; then
        grep -q "STUB ${role}-server started" <<<"${out}" \
            && ok "${role} reached exec" || bad "${role} did not exec"
    else
        bad "${role} failed: ${out}"
    fi
done
grep -q '^char_ip: 198.51.100.7$' "${HOME_DIR}/conf/import/char_conf.txt" \
    && ok "char advertises the public address" || bad "char_ip wrong"
grep -q '^login_ip: login$' "${HOME_DIR}/conf/import/char_conf.txt" \
    && ok "char reaches login by service name" || bad "login_ip wrong"

# --- summary -----------------------------------------------------------------
echo
echo "${pass} passed, ${fail} failed"
exit $(( fail > 0 ? 1 : 0 ))
