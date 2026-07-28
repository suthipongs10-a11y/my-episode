#!/usr/bin/env bash
# =============================================================================
# Enforce CLAUDE.md §2.1 and §2.2
# =============================================================================
#   "Never hardcode an IP, hostname, port, or credential."
#   "Never commit secrets."
#
# Runs in CI on every push. This is the rule that keeps the host disposable:
# the moment a real address lands in a tracked file, moving to a bigger VPS
# stops being a config change and becomes a code change, and we will not
# notice until the move.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

status=0
ok()  { printf '  \033[1;32mok\033[0m   %s\n' "$*"; }
bad() { printf '  \033[1;31mfail\033[0m %s\n' "$*"; status=1; }

# Files where a literal address is legitimate:
#   *.md                  documentation and worked examples
#   .env.example          the documented contract, with placeholder values
#   package-lock          generated
#   .github/              CI uses example.invalid and localhost
#   this script           it contains the patterns it searches for
#   test-entrypoint.sh    its whole job is to feed a fixture address in and
#                         assert it comes out the other side; it uses RFC 5737
#                         TEST-NET, which routes nowhere
exclude_re='^(.*\.md'
exclude_re+='|\.env\.example'
exclude_re+='|proxy/package-lock\.json'
exclude_re+='|\.github/.*'
exclude_re+='|tools/check-no-hardcoded-config\.sh'
exclude_re+='|tools/test-entrypoint\.sh)$'

mapfile -t files < <(git ls-files | grep -Ev "${exclude_re}")
echo "scanning ${#files[@]} tracked files"
echo

# --- 1. IPv4 literals --------------------------------------------------------
# 0.0.0.0 means "every interface in this container's namespace" and 127.0.0.1
# means "this container". Neither is a deployment detail — they stay correct on
# any host. Anything else is someone's actual server.
echo "IPv4 literals:"
hits=$(grep -nE '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b' "${files[@]}" 2>/dev/null \
    | grep -vE '\b(0\.0\.0\.0|127\.0\.0\.1)\b' || true)
if [[ -n "${hits}" ]]; then
    bad "found addresses that are not 0.0.0.0 or 127.0.0.1:"
    printf '%s\n' "${hits}" | sed 's/^/       /'
else
    ok "none outside 0.0.0.0 / 127.0.0.1"
fi

# --- 2. .env is not tracked --------------------------------------------------
echo
echo "secrets:"
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
    bad ".env is tracked by git — it holds live credentials"
else
    ok ".env is not tracked"
fi

# A key that is still CHANGE_ME in .env.example is correct. A key carrying
# what looks like a real value is somebody's live password, committed.
real_secrets=$(grep -E '^(DB_PASSWORD|DB_ROOT_PASSWORD|RO_INTER_PASS|BACKUP_GPG_PASSPHRASE)=' \
    .env.example | grep -v '=CHANGE_ME' || true)
if [[ -n "${real_secrets}" ]]; then
    bad ".env.example has a value that is not a CHANGE_ME placeholder:"
    printf '%s\n' "${real_secrets}" | sed 's/=.*/=<redacted>/; s/^/       /'
else
    ok ".env.example holds only placeholders"
fi

# --- 3. rAthena's shipped defaults ------------------------------------------
# s1/p1 is the inter-server account every rAthena install ships with. It must
# come from RO_INTER_USER/RO_INTER_PASS, never appear as a literal in a config
# template — a rogue map-server registering against the char-server is the
# whole risk.
echo
echo "rAthena defaults:"
tpl_hits=$(grep -rnE '^\s*(userid|passwd):\s*(s1|p1)\s*$' \
    server/import/templates/ 2>/dev/null || true)
if [[ -n "${tpl_hits}" ]]; then
    bad "a config template hardcodes the default s1/p1 server account:"
    printf '%s\n' "${tpl_hits}" | sed 's/^/       /'
else
    ok "no template hardcodes s1/p1"
fi

# --- 4. every template variable is actually substituted ----------------------
# Miss a variable in SUBST_VARS and envsubst emits the literal '${FOO}' into a
# config file, which rAthena then parses as a hostname. Cheap to catch here.
echo
echo "template variables:"
subst_block=$(sed -n '/^SUBST_VARS=/,/^$/p' infra/rathena/entrypoint.sh)
missing=()
while read -r var; do
    [[ -n "${var}" ]] || continue
    grep -q "{${var}}" <<<"${subst_block}" || missing+=("${var}")
done < <(grep -rhoE '\$\{[A-Z_][A-Z0-9_]*\}' server/import/templates/ \
            | tr -d '${}' | sort -u)

if (( ${#missing[@]} )); then
    bad "used in a template but absent from SUBST_VARS in entrypoint.sh: ${missing[*]}"
else
    ok "every template variable is in SUBST_VARS"
fi

# --- 5. every variable Compose reads is documented ---------------------------
echo
echo "documentation:"
undocumented=()
while read -r var; do
    grep -qE "^#?\s*${var}=" .env.example || undocumented+=("${var}")
done < <(grep -oE '\$\{[A-Z_][A-Z0-9_]*[:?}-]' infra/docker-compose.yml \
            | sed -E 's/^\$\{//; s/[:?}-]$//' | sort -u)

if (( ${#undocumented[@]} )); then
    bad "read by docker-compose.yml but not in .env.example: ${undocumented[*]}"
else
    ok "every Compose variable is documented in .env.example"
fi

echo
if (( status == 0 )); then
    echo "config hygiene OK"
else
    echo "config hygiene FAILED — see CLAUDE.md §2"
fi
exit "${status}"
