# Map groups — how we scale the map-server

rAthena's map-server is single-threaded (CLAUDE.md §3). One process uses one
core no matter how big the box is. You do not scale it vertically; you run more
of them, each owning a subset of maps, all reporting to one char-server.

A **map group** is that subset, as a config file. Splitting Prontera onto its
own process must be a one-line change, and this is the mechanism that makes it
one line.

## How it works

A group file lists the maps this server **keeps**, one per line:

```
map: prontera
map: prt_fild00
```

At container start the entrypoint diffs that against rAthena's full map list
(`conf/maps_athena.conf`) and appends a `delmap:` for everything else. It is a
diff rather than a hand-written exclusion list so the split stays correct when
upstream adds maps — and so a typo in a map name gets reported as a warning
instead of silently costing you a map.

The special name `all` means "no split, serve everything" and needs no file.

## Running one map-server (current: KVM2, 2 vCPU)

```ini
MAP1_GROUP=all
```

That is the default. Nothing else to do.

## Running three

Write `towns.conf`, `fields.conf`, `dungeons.conf` here, then in `.env`:

```ini
COMPOSE_PROFILES=map2,map3
MAP1_GROUP=towns
MAP2_GROUP=fields
MAP3_GROUP=dungeons
```

`./tools/deploy.sh` and you are done — no rebuild, no code change. Also extend
`PROXY_ALLOWED_TARGETS` so the browser client can reach the new map-servers.

## Rules for splitting

- **Every map must appear in exactly one group.** A map in no group is
  unreachable; a map in two groups means two servers claim it and the
  char-server hands players to whichever registered last. `tools/check-map-groups.sh`
  checks both.
- **Split by load, not by tidiness.** Prontera alone can outweigh every field
  map put together. Watch per-process CPU before deciding.
- **Keep maps that players cross between on the same server where you can.**
  A map change across processes is a full client reconnect to a different port
  — cheap, but not free, and it is more noticeable on mobile.
- Groups take effect on container restart, which disconnects everyone on that
  server. Not a live operation.

## Files here

| File | Purpose |
|---|---|
| `example-towns.conf` | worked example — the Ep4 town set, as a starting point |
