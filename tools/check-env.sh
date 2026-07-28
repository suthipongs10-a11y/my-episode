#!/usr/bin/env bash
# =============================================================================
# Is .env complete and filled in?
# =============================================================================
#   ./tools/check-env.sh          report what is missing or unset
#   ./tools/check-env.sh --fix    append missing keys, then report
#
# `.env` is gitignored, so it does not travel with the repository — it lives
# only on the host it configures. That is what keeps credentials out of git,
# but it means `git pull` can add a key to `.env.example` while the `.env`
# beside it stays stale. Compose would then fall back to a default, or fail
# with an interpolation error, and neither points at the real cause.
#
# Run by deploy.sh before every deploy.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT}/.env"
EXAMPLE="${ROOT}/.env.example"

FIX=0
[[ "${1:-}" == "--fix" ]] && FIX=1

ok()   { printf '  \033[1;32mok\033[0m   %s\n' "$*"; }
warn() { printf '  \033[1;33mwarn\033[0m %s\n' "$*"; }
bad()  { printf '  \033[1;31mfail\033[0m %s\n' "$*"; }

if [[ ! -f "${ENV_FILE}" ]]; then
    cat >&2 <<EOF

  No .env at ${ENV_FILE}

      cp .env.example .env
      ./tools/gen-secrets.sh

EOF
    exit 1
fi

keys_of() { grep -oE '^[A-Za-z_][A-Za-z0-9_]*=' "$1" | tr -d '=' | sort -u; }

expected="$(mktemp)"; actual="$(mktemp)"
trap 'rm -f "${expected}" "${actual}"' EXIT
keys_of "${EXAMPLE}"  > "${expected}"
keys_of "${ENV_FILE}" > "${actual}"

status=0

# --- missing keys ------------------------------------------------------------
mapfile -t missing < <(comm -23 "${expected}" "${actual}")

if (( ${#missing[@]} && FIX )); then
    {
        printf '\n\n'
        printf '# ---------------------------------------------------------------\n'
        printf '# Added by tools/check-env.sh — keys that appeared in .env.example\n'
        printf '# Read .env.example for what each one does, then set it.\n'
        printf '# ---------------------------------------------------------------\n'
        for key in "${missing[@]}"; do
            grep -E "^${key}=" "${EXAMPLE}" | head -n1
        done
    } >> "${ENV_FILE}"
    printf '  appended %d key(s) to .env\n\n' "${#missing[@]}"
    keys_of "${ENV_FILE}" > "${actual}"
    mapfile -t missing < <(comm -23 "${expected}" "${actual}")
fi

echo "keys:"
if (( ${#missing[@]} )); then
    bad "in .env.example but not in .env: ${missing[*]}"
    echo "       ./tools/check-env.sh --fix    adds them with their documented defaults"
    status=1
else
    ok "all $(wc -l < "${expected}") keys present"
fi

# Extra keys are not an error — you may be carrying something deliberately —
# but a typo'd key name looks exactly like this and is otherwise invisible.
mapfile -t extra < <(comm -13 "${expected}" "${actual}")
if (( ${#extra[@]} )); then
    warn "in .env but not in .env.example (typo, or removed upstream): ${extra[*]}"
fi

# --- unfilled placeholders ---------------------------------------------------
echo
echo "values:"
mapfile -t placeholders < <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=CHANGE_ME' "${ENV_FILE}" | cut -d= -f1)
if (( ${#placeholders[@]} )); then
    bad "still placeholders: ${placeholders[*]}"
    echo "       ./tools/gen-secrets.sh        fills every password"
    echo "       ACME_EMAIL needs a real address you own"
    status=1
else
    ok "no CHANGE_ME placeholders left"
fi

# --- values that need a human, not a generator -------------------------------
# These have defaults that are correct for a local dev stack and wrong for a
# real host. Compose will not complain about either.
if [[ "$(grep -E '^DEPLOY_ENV=' "${ENV_FILE}" | cut -d= -f2-)" == "prod" ]]; then
    for key in PUBLIC_HOST RO_ADVERTISE_IP; do
        value="$(grep -E "^${key}=" "${ENV_FILE}" | cut -d= -f2-)"
        case "${value}" in
            localhost|127.0.0.1|"")
                bad "DEPLOY_ENV=prod but ${key}=${value:-<empty>} — that is the dev default"
                status=1
                ;;
            *) ok "${key} set for production" ;;
        esac
    done
fi

# --- permissions -------------------------------------------------------------
echo
echo "file:"
perms="$(stat -c '%a' "${ENV_FILE}")"
if [[ "${perms}" == "600" ]]; then
    ok ".env is 0600"
else
    warn ".env is ${perms} — it holds the database password; chmod 600 .env"
fi

echo
if (( status == 0 )); then
    echo ".env OK"
else
    echo ".env INCOMPLETE"
fi
exit "${status}"
