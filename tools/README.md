# tools

| Script | What it does |
|---|---|
| `compose.sh` | the only way to talk to the stack — pairs `infra/` compose with root `.env` |
| `vps-bootstrap.sh` | prepare a fresh Ubuntu host: Docker, swap, firewall, fail2ban, `ro` user |
| `deploy.sh` | pull, validate, build, roll, wait for health |
| `gen-secrets.sh` | fill every `CHANGE_ME` in `.env`; idempotent |
| `check-env.sh` | is `.env` complete and filled in? `--fix` appends keys added by a later phase |
| `db-init.sh` | import the rAthena schema, set the inter-server account (Phase 1) |
| `smoke-play.py` | the Phase 1 gate over the real protocol: log in, create a character, walk it — no client, no GRF |
| `backup-db.sh` | dump both schemas, encrypt, upload off-host, prune |
| `restore-db.sh` | the other half — and the Phase 8 gate |
| `check-map-groups.sh` | map groups partition the map list exactly |
| `check-no-hardcoded-config.sh` | enforce CLAUDE.md §2.1 and §2.2 in CI |
| `test-entrypoint.sh` | exercise config rendering and map splitting without Docker |
| `check-workflow-scripts.sh` | shellcheck the bash embedded in GitHub Actions, including the parts that run on the VPS |
| `test-deploy-env.sh` | run the deploy workflow's real .env logic against a sandbox |
| `test-smoke-play.py` | run `smoke-play.py` against mock servers that pin the 20180620 byte layout |
| `check-logging.sh` | the game logging Phase 1 requires is actually switched on |

## The client tools

| Script | What it does |
|---|---|
| `grflib.py` | the one GRF/GPF reader in the repo — file tables, and extraction of unencrypted entries |
| `client-doctor.py` | **our** client: is every file it needs at startup actually reachable, loose or in an archive? |
| `client-survey.py` | **anyone's** client: inventory the folder and report what it says about the server behind it (`docs/eternalro-recon.md`) |
| `survey-client.cmd` | drag-and-drop wrapper for `client-survey.py`, for the Windows box |
| `make-msgtable-debug.py` | make the client's empty error box report its message index instead |
| `check-client-imports.mjs` | every static import on roBrowser's startup graph resolves — the Phase 3 bug that CI now catches |
| `test-client-survey.py` | builds a synthetic GRF and a synthetic PE32, runs `grflib`, the survey and the doctor against them |

Phase 4's content scripts land here too. They must be idempotent and
re-runnable against a fresh upstream pull (CLAUDE.md §6 Phase 4).
