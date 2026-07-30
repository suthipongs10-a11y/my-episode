# client — the PC client

roBrowser's Electron target, configured for our server. A normal Windows
folder with an `.exe`: unzip, run, play. It reads the player's existing GRF
files off local disk and talks to rAthena over raw TCP.

**Full guide, including what is verified and what is not:
[`docs/phase-3-robrowser.md`](../docs/phase-3-robrowser.md).** Read it before
the first build; it is short and it will save you the two questions everyone
asks.

## Quick start

```
git submodule update --init --recursive
cp client/client.env.example client/client.env   # then edit it
node client/build-client.mjs --run               # unpackaged, starts in seconds
node client/build-client.mjs --win               # package for Windows
```

Needs Node 22+. The first run downloads Electron (~100 MB) into
`client/.build/`, once.

## Layout

| Path | What |
|---|---|
| `robrowser/` | the upstream submodule, pinned. **Never written to** (CLAUDE.md §2.5) |
| `overlay/` | our two templates — the page and the packaging config |
| `client.env.example` | every setting, documented. Copy to `client.env` (gitignored) |
| `build-client.mjs` | stage → configure → run or package. `--selftest` runs in CI |
| `.build/` | the staged copy builds happen in. Disposable, gitignored |
| `public/` | what Caddy serves. Still empty; that is the browser path, not this one |
| `sclientinfo.xml.example` | for the *ragexe*, not for this. See CLAUDE.md §3b |

## Two things worth knowing before you read the code

**This path does not use `/proxy`.** In Electron, roBrowser gets a real TCP
socket from `preload.mjs`, so the WebSocket bridge is a browser requirement, not
a desktop one. `/proxy` stays dormant.

**Upstream's packaged Electron build cannot reach its own login window.**
`rijndael-js` and `granny-ro-js/wasm` are static imports on the startup path
that are in neither the import map nor the packaged files list, so the module
graph fails at load — black window, no message. `build-client.mjs` fixes both
and `tools/check-client-imports.mjs` fails the build if it ever comes back. The
trace is in the phase doc.
