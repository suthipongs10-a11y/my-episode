#!/usr/bin/env bash
# =============================================================================
# ShellCheck the bash embedded in GitHub Actions workflows
# =============================================================================
#   ./tools/check-workflow-scripts.sh
#
# The deploy and ops workflows carry two kinds of shell that yamllint cannot see
# and plain shellcheck never reaches:
#
#   * the body of each `run:` step, which executes on the runner
#   * the body of each `<<'REMOTE' ... REMOTE` heredoc inside those steps,
#     which executes on the VPS
#
# The second one is the dangerous one. A syntax error there is not a build
# failure — it is a deploy that gets all the way to the server, runs half of
# something, and stops. Checking it here costs a second.
#
# `${{ ... }}` expressions are GitHub's, not the shell's, so they are replaced
# with a placeholder before checking rather than being reported as syntax errors.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

command -v shellcheck >/dev/null || {
    echo "shellcheck not installed — skipping"
    exit 0
}

WORK="$(mktemp -d)"
trap 'rm -rf "${WORK}"' EXIT

python3 - "${WORK}" <<'PY'
import pathlib, re, sys

out = pathlib.Path(sys.argv[1])
import yaml

# GitHub expressions are interpolated before bash ever sees the script.
# Substitute a plain token so shellcheck parses the surrounding shell.
EXPR = re.compile(r'\$\{\{[^}]*\}\}')

files = sorted(pathlib.Path('.github/workflows').glob('*.yml'))
files += sorted(pathlib.Path('.github/actions').glob('*/action.yml'))

count = 0
for f in files:
    doc = yaml.safe_load(f.read_text())
    if not doc:
        continue

    # Workflows nest steps under jobs; a composite action has them at the top.
    step_lists = []
    for job in (doc.get('jobs') or {}).values():
        step_lists.append(job.get('steps') or [])
    runs = doc.get('runs') or {}
    if isinstance(runs, dict):
        step_lists.append(runs.get('steps') or [])

    for steps in step_lists:
        for i, step in enumerate(steps):
            script = step.get('run')
            if not script:
                continue
            name = (step.get('name') or f'step{i}')
            slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') or f'step{i}'
            stem = f'{f.stem}__{slug}'

            body = EXPR.sub('GH_EXPR', script)

            # The runner-side script.
            (out / f'{stem}.runner.sh').write_text('#!/usr/bin/env bash\n' + body)
            count += 1

            # Every heredoc that gets piped to a shell on the VPS.
            # `[^\n]*` after the delimiter matters: several of these end with
            # `<<'REMOTE' || true`, and anchoring straight to the newline
            # skipped those bodies without saying so.
            for n, m in enumerate(re.finditer(
                    r"<<'REMOTE'[^\n]*\n(.*?)\n\s*REMOTE\b", body, re.S)):
                remote = m.group(1)
                suffix = f'.remote{n}.sh' if n else '.remote.sh'
                (out / f'{stem}{suffix}').write_text(
                    '#!/usr/bin/env bash\n' + remote + '\n')
                count += 1

# Report the remote count against the raw occurrences of the delimiter. If the
# extractor ever stops matching a heredoc shape, that must be loud, not a
# quietly shorter list of checked files.
declared = sum(
    len(re.findall(r"<<'REMOTE'", f.read_text()))
    for f in files
)
extracted_remotes = len(list(out.glob('*.remote*.sh')))
print(f'extracted {count} script(s): {extracted_remotes} of {declared} remote heredocs')
if extracted_remotes != declared:
    print(f'ERROR: {declared - extracted_remotes} heredoc(s) were not extracted')
    sys.exit(1)
PY

shopt -s nullglob
scripts=("${WORK}"/*.sh)
if (( ${#scripts[@]} == 0 )); then
    echo "no embedded scripts found — did the workflow layout change?"
    exit 1
fi

status=0
for s in "${scripts[@]}"; do
    label="$(basename "${s}" .sh)"
    # SC2154: the remote side receives variables from the ssh command line, so
    #         they are legitimately unassigned in the extracted fragment.
    # SC2148: fragments have a shebang added, but heredocs inside them may not.
    if output="$(shellcheck --shell=bash --severity=warning \
                     --exclude=SC2154 "${s}" 2>&1)"; then
        printf '  \033[1;32mok\033[0m   %s\n' "${label}"
    else
        printf '  \033[1;31mfail\033[0m %s\n' "${label}"
        printf '%s\n' "${output}" | sed 's/^/       /'
        status=1
    fi
done

echo
if (( status == 0 )); then
    echo "embedded workflow scripts OK"
else
    echo "embedded workflow scripts FAILED"
fi
exit "${status}"
