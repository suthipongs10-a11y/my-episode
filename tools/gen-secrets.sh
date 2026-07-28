#!/usr/bin/env bash
# =============================================================================
# Fill in every CHANGE_ME password in .env
# =============================================================================
#   cp .env.example .env
#   ./tools/gen-secrets.sh
#
# Idempotent: only replaces values that still start with CHANGE_ME, so running
# it twice will not rotate a live database password out from under the servers.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT}/.env"

[[ -f "${ENV_FILE}" ]] || { echo "No .env — run: cp .env.example .env" >&2; exit 1; }

# Alphanumeric only. rAthena writes some of these into config files that are
# parsed with sscanf, and a shell metacharacter in a password there costs an
# afternoon.
#
# Reading a fixed block and filtering, rather than piping /dev/urandom into
# `head -c`, because that closes the pipe early and trips `set -o pipefail`.
gen() {
    local want="${1:-40}" out=""
    while (( ${#out} < want )); do
        out+="$(LC_ALL=C head -c 256 /dev/urandom | LC_ALL=C tr -dc 'A-Za-z0-9')"
    done
    printf '%s' "${out:0:want}"
}

# Per-key lengths. RO_INTER_PASS is not ours to size: rAthena's char-server
# stores it in a char[24] buffer (23 usable) and login compares plaintext, so
# anything longer is silently truncated on one side and rejected by the
# `user_pass` column on the other. 23 exactly, no more.
length_for() {
    case "$1" in
        RO_INTER_PASS) echo 23 ;;
        *)             echo 40 ;;
    esac
}

changed=0
for key in DB_PASSWORD DB_ROOT_PASSWORD RO_INTER_PASS BACKUP_GPG_PASSPHRASE; do
    current="$(grep -E "^${key}=" "${ENV_FILE}" | head -n1 | cut -d= -f2- || true)"

    if [[ -z "${current}" ]]; then
        echo "  skip ${key} — not present in .env"
        continue
    fi
    if [[ "${current}" != CHANGE_ME* ]]; then
        echo "  keep ${key} — already set"
        continue
    fi

    value="$(gen "$(length_for "${key}")")"
    # `|` as the sed delimiter, and the value is alphanumeric, so no escaping.
    sed -i "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
    echo "  set  ${key}"
    changed=$((changed + 1))
done

chmod 600 "${ENV_FILE}"

echo
if (( changed > 0 )); then
    echo "Generated ${changed} secret(s). .env is chmod 600 and gitignored."
else
    echo "Nothing to do — every secret was already set."
fi

# Anchored to an assignment: the file's own header mentions CHANGE_ME in a
# comment, and matching that would report a placeholder forever.
remaining="$(grep -cE '^[A-Za-z_][A-Za-z0-9_]*=CHANGE_ME' "${ENV_FILE}" || true)"
if (( remaining > 0 )); then
    echo
    echo "Still needs a human (${remaining} value(s)):"
    grep -nE '^[A-Za-z_][A-Za-z0-9_]*=CHANGE_ME' "${ENV_FILE}" | sed 's/^/  /'
fi
