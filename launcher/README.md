# launcher — PC client tunnel (Phase 3)

Empty until Phase 3. A small static binary that ships inside the PC client zip.

It listens on `127.0.0.1:6900` and forwards that TCP stream to
`wss://<host>/ws` — the same endpoint the browser client uses. The game client's
`clientinfo.xml` points at `127.0.0.1`, so the client itself is unmodified and
has no idea a tunnel exists.

**Why this exists** is CLAUDE.md §3a, and it is worth reading before changing
anything here: a stock RO client speaks raw TCP, and publishing those ports
would publish the origin address and bypass every DDoS protection in
`docs/threat-model.md`. Tunnelling the PC client is what lets
`GAME_PORTS_BIND=127.0.0.1` stay true in production.

Requirements:

- **Static, no runtime.** The player extracts a zip and runs it. Anything that
  needs Java or .NET installed first is not "extract and play". A single Go
  binary is the obvious fit — cross-compiles to Windows, Linux and macOS with
  no dependencies.
- **Server address from config, not compiled in** (CLAUDE.md §2.1). Moving
  hosts must not mean rebuilding and redistributing the client.
- **Same keepalive discipline as wsProxy.** Cloudflare Free closes an idle
  WebSocket after 100 seconds and a standing-still player sends nothing.
- **Fails loudly.** If it cannot reach the server, the player sees why, rather
  than a game client that hangs at the login screen.

Expect antivirus warnings on an unsigned binary. This is accepted and normal
for the scene — do not spend effort working around it. What it does oblige is
that releases are built by CI from a tag and published with a checksum, so the
download itself stays trustworthy (CLAUDE.md §3a).
