# Where this folder came from

`shorts-factory/` is a **vendored copy** of an upstream open-source project. It is not a
submodule, because the whole point is to edit it — `brand.md`, the skills and the shot
library are meant to become ours.

| | |
|---|---|
| Upstream | https://github.com/hassancs91/claude-faceless-shorts-creator |
| Commit copied | `68c5c97e3f2edd0a69450e5b5d896aa726d3543e` |
| Commit date | 2026-07-15 — *"Add the generative (make-ai-short) and collage (make-vox) tracks"* |
| Copied on | 2026-08-02 |
| Licence | MIT (`LICENSE`, kept verbatim — keep it) |

Everything below `shorts-factory/` is upstream's except the files listed under "Our changes"
below. The nested `.git` was removed.

## Our changes

Kept deliberately small, and every one of them is about making a render work in a sandbox
that upstream never had to care about. Diff against upstream to see them in isolation.

| File | Change | Why |
|---|---|---|
| `remotion/scripts/frames.mjs` | honour `REMOTION_BROWSER_EXECUTABLE` | Remotion downloads its own Chrome Headless Shell on first render; `remotion.media` is not on this environment's egress allowlist, so it 403s. The container already ships a Chromium. |
| `remotion/scripts/render-all.mjs` | same | same |
| `remotion/src/fonts.ts` | load the 5 brand fonts from `media/library/fonts/` instead of `@remotion/google-fonts` | the google-fonts loaders fetch from `fonts.gstatic.com` **during** the render. Behind the TLS-terminating egress proxy every fetch dies with `ERR_CERT_AUTHORITY_INVALID` and the render aborts — Chrome Headless Shell reads neither the system CA store, nor the NSS db, nor enterprise policy, so there is no supported way to make it trust the proxy CA. |
| `remotion/scripts/fetch-fonts.mjs` | **new** | downloads those fonts once, with a client that does trust the CA |
| `media/library/fonts/` | **new** — 14 woff2 + `manifest.json` | the downloaded files. All five families are OFL-licensed, so redistributing them here is fine. |
| `UPSTREAM.md`, `SETUP.md` | **new** | this file and the setup notes |

The font change is worth keeping even off a sandbox: it makes renders offline and
byte-identical run to run, instead of depending on a live CDN mid-render.

## Pulling upstream changes later

There is no remote to `git pull` from — that is the cost of vendoring. To diff against a
newer upstream:

```bash
git clone --depth 50 https://github.com/hassancs91/claude-faceless-shorts-creator /tmp/upstream
diff -ru --exclude=.git --exclude=UPSTREAM.md /tmp/upstream shorts-factory
```

Anything we change lives in the diff, so review it before merging upstream work back in.

## What is committed, and why it is 134 MB

Upstream commits its generated media on purpose: AI video clips, collage layers and story
frames cost money to produce and are not reproducible from a prompt. `media/projects/`,
`ai-shorts/blue-man/` and `shorts/short-7-kids/images/` are that. Rendered videos and TTS
audio are *not* committed — `shorts-factory/.gitignore` excludes `*/voice/` and `*/output/`
because the pipeline rebuilds them.

If we ever want the repo small again, `media/projects/` and the example `shorts/*/images/`
are the 120 MB, and deleting them costs only the ability to re-render the examples.

## Two things that do not carry over from the parent repo

1. **Run it from `shorts-factory/`, not from the repo root.** Upstream's CLAUDE.md says
   "run everything from the repo root" and means *its* root, which is this folder. The
   Python tools resolve project paths against the current directory.
2. **Its `.env` is its own.** Keys go in `shorts-factory/.env` (copy `.env.example`). The
   root `.gitignore` already ignores `.env` at any depth; do not put video-service keys in
   the RO server's `.env`.
