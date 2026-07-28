# assets-build — GRF pipeline (Phase 4)

Empty until Phase 4. GRF extraction → content-hashed static files → Cloudflare,
with immutable cache headers and IndexedDB caching client-side.

**No assets are ever committed** (CLAUDE.md §2.3). They are large and they are
Gravity's. This directory holds only the pipeline; `out/` and `work/` are
gitignored.

Keep the pipeline format-agnostic where it is cheap to do so. CLAUDE.md §9's
long-term de-risking path is replacing RO assets with owned art, and the
architecture should not assume otherwise.
