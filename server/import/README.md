# server/import — every change we make to rAthena

Upstream rAthena is a git submodule at `server/rathena` and is **never edited
in place** (CLAUDE.md §2.6). Everything we change lives here and is copied over
the upstream tree when a container starts, so `git pull` on the submodule can
always fast-forward and we can always take upstream security fixes.

## Layout

| Path | Copied to | What goes here |
|---|---|---|
| `templates/` | rendered into `conf/import/` | env-driven config — addresses, ports, credentials |
| `conf/` | `conf/import/` | static config overrides (gameplay knobs, rates, atcommands, groups) |
| `conf/local/` | `conf/import/local/` | per-role static overrides, imported *after* the generated files |
| `db/` | `db/import/` | database overrides — item, mob, skill, exp tables |
| `npc/` | `npc/custom/` | our own NPC scripts |

## The five generated filenames

The entrypoint owns these and overwrites them on every container start:

```
conf/import/inter_conf.txt      conf/import/char_conf.txt
conf/import/login_conf.txt      conf/import/map_conf.txt
                                conf/import/web_conf.txt
```

Do not put files with those names in `conf/` — they will be silently replaced.
Static settings that need to override a generated value go in `conf/local/`
under the same filename; the entrypoint appends an `import:` for it so it is
read last.

## Why templates and not a committed config file

CLAUDE.md §2.1: no IP, hostname, port or credential in the repo. A rendered
`inter_conf.txt` contains the database password, so it exists only inside a
running container, at mode 0600, and is regenerated from `.env` every start.
Moving to a new VPS is editing `.env`.

## Adding a variable

1. Add it to `.env.example`, documented.
2. Pass it through in `infra/docker-compose.yml` (`x-rathena-env`).
3. Add it to `SUBST_VARS` in `infra/rathena/entrypoint.sh`.
4. Use `${VAR}` in the template.

Miss step 3 and the placeholder is emitted literally into the config — which
rAthena will then parse as a hostname. `./tools/compose.sh logs login` shows it
immediately.
