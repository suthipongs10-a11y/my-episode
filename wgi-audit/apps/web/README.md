# apps/web — the operator dashboard

```bash
pnpm dash          # http://127.0.0.1:4321
```

Paste a domain, press เริ่มตรวจ, watch it run, read the result. The same
process polls the `jobs` table, so this is the only command you need.

## Three views

| Route | Who reads it |
|---|---|
| `/` | you — every run, newest first, with score and critical count |
| `/audits/:id` | you — the full result: rule codes, evidence, what it cost |
| `/audits/:id/report` | **the client** — findings and fixes, print to PDF |

The report is a separate document, not the same page with things hidden. It
carries no rule codes, no JSON evidence and no cost line — those are on the
page a customer reads only if you decide to put them there.

## No build step, and why

No React, no Next.js, no bundler. Server-rendered HTML with an inlined
stylesheet, so `pnpm dash` works on a clean machine with nothing but Node.

The spec puts Next.js at M6 and that is still right for what M6 is: a *public*
site with an intake form, registration and share links. This is a different
job — one operator, one laptop — where a build step is pure risk on the
morning of a client meeting. It also prints to PDF natively, which is how the
report actually reaches a customer.

## It has no login

`WEB_HOST` defaults to `127.0.0.1` deliberately. Every client's data is on
these pages and there is no authentication in front of it. Do not bind it to
`0.0.0.0` until there is.

## Settings

| Variable | Default | |
|---|---|---|
| `WEB_PORT` | `4321` | |
| `WEB_HOST` | `127.0.0.1` | read the section above before changing this |
| `WORKER_POLL_MS` | `3000` | how often the built-in worker checks for a job |

`pnpm dash --no-worker` serves pages only, for running the worker separately.
