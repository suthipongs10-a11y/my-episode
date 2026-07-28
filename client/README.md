# client — roBrowser-Legacy (Phase 3)

Empty until Phase 3. roBrowser-Legacy goes here as a submodule, plus our
plugins, with `packetver` matched to the server build (`PACKETVER` in `.env`).

`client/public/` is what Caddy serves. Phase 4 fills it with the content-hashed
build output; the heavy assets then move to Cloudflare and only the shell stays
on origin — serving GB-scale first loads from the VPS is the first thing that
breaks (CLAUDE.md §3).

Phase 3's gate is desktop browser play. Mobile is Phase 5 and must not be
chased before then.
