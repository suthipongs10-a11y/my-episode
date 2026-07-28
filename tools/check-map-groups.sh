#!/usr/bin/env bash
# =============================================================================
# Validate map group files against rAthena's map list
# =============================================================================
#   ./tools/check-map-groups.sh                 lint every group file
#   ./tools/check-map-groups.sh towns fields    also check those groups
#                                               partition the map list exactly
#
# Two failure modes this catches, both silent at runtime:
#   * a map in no group      -> players cannot reach it, no error anywhere
#   * a map in two groups    -> two servers claim it, char-server sends players
#                               to whichever registered last
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GROUP_DIR="${ROOT}/server/map-groups"
UPSTREAM_MAPS="${ROOT}/server/rathena/conf/maps_athena.conf"

ok()   { printf '  \033[1;32mok\033[0m   %s\n' "$*"; }
warn() { printf '  \033[1;33mwarn\033[0m %s\n' "$*"; }
bad()  { printf '  \033[1;31mfail\033[0m %s\n' "$*"; }

extract_maps() {
    sed -e 's/\r$//' "$1" \
        | grep -E '^[[:space:]]*map:' \
        | sed -E 's/^[[:space:]]*map:[[:space:]]*//; s/[[:space:]]+$//' \
        | sort -u
}

if [[ ! -f "${UPSTREAM_MAPS}" ]]; then
    warn "rAthena submodule not checked out — skipping map validation"
    warn "  git submodule update --init --recursive"
    exit 0
fi

all_maps="$(mktemp)"
trap 'rm -f "${all_maps}"' EXIT
extract_maps "${UPSTREAM_MAPS}" > "${all_maps}"
echo "upstream map list: $(wc -l < "${all_maps}") maps"

status=0

echo
echo "linting group files:"
shopt -s nullglob
group_files=("${GROUP_DIR}"/*.conf)
if (( ${#group_files[@]} == 0 )); then
    ok "no group files (MAP_GROUP=all needs none)"
fi

for f in "${group_files[@]}"; do
    name="$(basename "${f}" .conf)"
    maps="$(extract_maps "${f}")"
    count="$(printf '%s' "${maps}" | grep -c . || true)"

    if (( count == 0 )); then
        bad "${name}: contains no 'map:' lines"
        status=1
        continue
    fi

    unknown="$(comm -13 "${all_maps}" <(printf '%s\n' "${maps}") | tr '\n' ' ')"
    if [[ -n "${unknown// /}" ]]; then
        bad "${name}: ${count} maps, but these are not in the upstream list: ${unknown}"
        status=1
    else
        ok "${name}: ${count} maps, all known"
    fi
done

# --- partition check ---------------------------------------------------------
if (( $# > 0 )); then
    echo
    echo "checking that [$*] partition the map list exactly:"

    combined="$(mktemp)"
    dupes="$(mktemp)"
    trap 'rm -f "${all_maps}" "${combined}" "${dupes}"' EXIT

    : > "${combined}"
    for name in "$@"; do
        f="${GROUP_DIR}/${name}.conf"
        [[ -f "${f}" ]] || { bad "group '${name}' has no file at ${f}"; status=1; continue; }
        extract_maps "${f}" >> "${combined}"
    done

    sort "${combined}" | uniq -d > "${dupes}"
    if [[ -s "${dupes}" ]]; then
        bad "claimed by more than one group: $(tr '\n' ' ' < "${dupes}")"
        status=1
    else
        ok "no map is claimed twice"
    fi

    missing="$(comm -23 "${all_maps}" <(sort -u "${combined}") | tr '\n' ' ')"
    if [[ -n "${missing// /}" ]]; then
        bad "in no group (unreachable): ${missing}"
        status=1
    else
        ok "every upstream map is covered"
    fi
fi

echo
(( status == 0 )) && echo "map groups OK" || echo "map group validation FAILED"
exit "${status}"
