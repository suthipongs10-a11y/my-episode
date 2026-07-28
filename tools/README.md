# tools

| Script | What it does |
|---|---|
| `compose.sh` | the only way to talk to the stack — pairs `infra/` compose with root `.env` |
| `vps-bootstrap.sh` | prepare a fresh Ubuntu host: Docker, swap, firewall, fail2ban, `ro` user |
| `deploy.sh` | pull, validate, build, roll, wait for health |
| `gen-secrets.sh` | fill every `CHANGE_ME` in `.env`; idempotent |
| `check-env.sh` | is `.env` complete and filled in? `--fix` appends keys added by a later phase |
| `db-init.sh` | import the rAthena schema, set the inter-server account (Phase 1) |
| `backup-db.sh` | dump both schemas, encrypt, upload off-host, prune |
| `restore-db.sh` | the other half — and the Phase 8 gate |
| `check-map-groups.sh` | map groups partition the map list exactly |
| `check-no-hardcoded-config.sh` | enforce CLAUDE.md §2.1 and §2.2 in CI |
| `test-entrypoint.sh` | exercise config rendering and map splitting without Docker |
| `check-workflow-scripts.sh` | shellcheck the bash embedded in GitHub Actions, including the parts that run on the VPS |
| `test-deploy-env.sh` | run the deploy workflow's real .env logic against a sandbox |

Phase 2's Ep4 content-cut scripts land here too. They must be idempotent and
re-runnable against a fresh upstream pull (CLAUDE.md §6 Phase 2).
