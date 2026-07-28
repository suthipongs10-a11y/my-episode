#!/usr/bin/env bash
# =============================================================================
# Run the deploy workflow's .env logic against a sandbox
# =============================================================================
#   ./tools/test-deploy-env.sh
#
# The "Ensure .env is present and complete" step is the part of the first
# deploy nobody watches: it runs on a machine with no .env, invents every
# password, and writes the address the game client will be told to connect to.
# If it is wrong, the failure arrives as a game server that will not start,
# minutes into a deploy, on a box you are not sitting at.
#
# So run it here. The script under test is extracted from deploy.yml itself
# rather than copied, so this cannot drift away from what actually ships.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

pass=0
fail=0
ok()  { printf '  \033[1;32mok\033[0m   %s\n' "$*"; pass=$((pass + 1)); }
bad() { printf '  \033[1;31mfail\033[0m %s\n' "$*"; fail=$((fail + 1)); }

WORK="$(mktemp -d)"
trap 'rm -rf "${WORK}"' EXIT

# --- pull the real step out of the workflow ---------------------------------
python3 - "${ROOT}" "${WORK}/step.sh" <<'PY'
import pathlib, re, sys, yaml

root, dest = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
doc = yaml.safe_load((root / '.github/workflows/deploy.yml').read_text())

body = None
for job in doc['jobs'].values():
    for step in job['steps']:
        if step.get('name', '').startswith('Ensure .env'):
            body = re.sub(r'\$\{\{[^}]*\}\}', 'GH_EXPR', step['run'])

if body is None:
    sys.exit("could not find the 'Ensure .env' step in deploy.yml")

m = re.search(r"<<'REMOTE'[^\n]*\n(.*?)\n\s*REMOTE\b", body, re.S)
if not m:
    sys.exit("the 'Ensure .env' step no longer contains a REMOTE heredoc")

dest.write_text('#!/usr/bin/env bash\n' + m.group(1) + '\n')
print(f"extracted {len(m.group(1).splitlines())} lines from deploy.yml")
PY

# --- build a sandbox that looks like a fresh checkout ------------------------
CHECKOUT="${WORK}/home/ro-ep4"
mkdir -p "${CHECKOUT}"
cp .env.example "${CHECKOUT}/"
cp -R tools "${CHECKOUT}/"

run_step() {
    ( cd "${CHECKOUT}" && env -i \
        PATH="/usr/bin:/bin" \
        HOME="${WORK}/home" \
        VPS_HOST="$1" \
        IN_PUBLIC_HOST="${2:-}" \
        IN_ACME_EMAIL="${3:-}" \
        bash "${WORK}/step.sh" 2>&1 )
}

get() { grep -E "^$1=" "${CHECKOUT}/.env" | head -n1 | cut -d= -f2-; }

# --- 1. first run, with the inputs the operator is told to supply ------------
echo
echo "first run on a machine with no .env:"
if out="$(run_step 203.0.113.10 '' 'ops@example.invalid')"; then
    ok "step succeeded"
else
    bad "step failed:"; printf '%s\n' "${out}" | sed 's/^/       /'
fi

[[ -f "${CHECKOUT}/.env" ]] && ok ".env was created" || bad ".env was not created"

# The whole point of RO_ADVERTISE_IP: what the client is told to dial.
[[ "$(get RO_ADVERTISE_IP)" == "203.0.113.10" ]] \
    && ok "RO_ADVERTISE_IP taken from VPS_HOST" \
    || bad "RO_ADVERTISE_IP is '$(get RO_ADVERTISE_IP)', expected the VPS_HOST value"

[[ "$(get ACME_EMAIL)" == "ops@example.invalid" ]] \
    && ok "ACME_EMAIL taken from the input" \
    || bad "ACME_EMAIL is '$(get ACME_EMAIL)'"

# gen-secrets must actually have run.
db_pw="$(get DB_PASSWORD)"
if [[ "${db_pw}" == CHANGE_ME* || -z "${db_pw}" ]]; then
    bad "DB_PASSWORD was not generated"
elif (( ${#db_pw} < 32 )); then
    bad "DB_PASSWORD is only ${#db_pw} characters"
else
    ok "passwords generated (DB_PASSWORD is ${#db_pw} chars)"
fi

for key in DB_ROOT_PASSWORD RO_INTER_PASS BACKUP_GPG_PASSPHRASE; do
    v="$(get "${key}")"
    [[ -n "${v}" && "${v}" != CHANGE_ME* ]] \
        && ok "${key} generated" || bad "${key} not generated"
done

perms="$(stat -c '%a' "${CHECKOUT}/.env")"
[[ "${perms}" == "600" ]] && ok ".env is 0600" || bad ".env is ${perms}"

# --- 2. second run must not rotate anything ---------------------------------
echo
echo "second run (a normal redeploy):"
before="$(get DB_PASSWORD)"
if out="$(run_step 203.0.113.10 '' 'ops@example.invalid')"; then
    ok "step succeeded again"
else
    bad "step failed on rerun:"; printf '%s\n' "${out}" | sed 's/^/       /'
fi
[[ "$(get DB_PASSWORD)" == "${before}" ]] \
    && ok "DB_PASSWORD unchanged" \
    || bad "DB_PASSWORD was rotated — that would lock the servers out of MariaDB"

# --- 3. moving to a new host rewrites only the address ----------------------
echo
echo "same .env, new VPS address (the CLAUDE.md §4 move):"
kept="$(get DB_PASSWORD)"
run_step 198.51.100.25 'play.example.com' 'ops@example.invalid' >/dev/null
[[ "$(get RO_ADVERTISE_IP)" == "198.51.100.25" ]] \
    && ok "RO_ADVERTISE_IP followed the new host" \
    || bad "RO_ADVERTISE_IP is '$(get RO_ADVERTISE_IP)'"
[[ "$(get PUBLIC_HOST)" == "play.example.com" ]] \
    && ok "PUBLIC_HOST applied" || bad "PUBLIC_HOST is '$(get PUBLIC_HOST)'"
[[ "$(get DB_PASSWORD)" == "${kept}" ]] \
    && ok "credentials survived the move" || bad "credentials changed during a move"

# --- 4. a key added by a later phase gets picked up -------------------------
echo
echo "a later phase adds a key to .env.example:"
printf '\n# Added by a later phase.\nCDN_BASE_URL=https://cdn.example.com\n' \
    >> "${CHECKOUT}/.env.example"
if out="$(run_step 198.51.100.25 '' '')"; then
    ok "step succeeded"
    [[ "$(get CDN_BASE_URL)" == "https://cdn.example.com" ]] \
        && ok "new key appended to .env automatically" \
        || bad "new key missing from .env"
else
    bad "step failed when .env.example gained a key:"; printf '%s\n' "${out}" | sed 's/^/       /'
fi

# --- 5. first run with no acme_email must fail loudly, not silently ---------
echo
echo "first run with no acme_email (operator forgot the input):"
rm -rf "${CHECKOUT:?}/.env"
sed -i 's|^CDN_BASE_URL=.*|CDN_BASE_URL=https://cdn.example.com|' "${CHECKOUT}/.env.example"
if out="$(run_step 203.0.113.10 '' '')"; then
    bad "step passed with ACME_EMAIL still a placeholder — should have failed"
else
    if grep -q 'acme_email' <<<"${out}"; then
        ok "fails, and names the input to fill in"
    else
        bad "fails, but without saying why:"; printf '%s\n' "${out}" | sed 's/^/       /'
    fi
fi

echo
echo "${pass} passed, ${fail} failed"
exit $(( fail > 0 ? 1 : 0 ))
