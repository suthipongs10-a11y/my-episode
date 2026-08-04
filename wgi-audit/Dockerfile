# The dashboard and the worker in one image — the same process `pnpm dash`
# starts locally. There is no build step to run: the app is TypeScript executed
# by tsx, and the pages are server-rendered HTML with the CSS inlined.
#
# Debian rather than Alpine on purpose: PGlite ships a WASM build that expects
# glibc, and a first boot that dies inside a WASM loader is a bad way to learn
# that. In production the database is Postgres anyway (DATABASE_URL), so this
# only matters for a container started without one.
FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable

# Manifests first, so a code change does not re-resolve the dependency tree.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json    packages/core/
COPY apps/worker/package.json      apps/worker/
COPY apps/web/package.json         apps/web/

# --prod=false: tsx and typescript are devDependencies and this runs from source.
RUN pnpm install --frozen-lockfile --prod=false

COPY . .

# Inside a container the only route in is the published port, so binding to all
# interfaces is correct here. The server still refuses to start without
# DASHBOARD_PASSWORD — see apps/web/src/auth.ts.
ENV WEB_HOST=0.0.0.0 \
    WEB_PORT=8080 \
    WEB_SECURE_COOKIE=1 \
    WEB_TRUST_PROXY=1
EXPOSE 8080

# A cache that survives a restart saves both money and somebody else's
# bandwidth. Mount a volume here, or accept a cold cache on every deploy.
VOLUME ["/app/.cache"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.WEB_PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["pnpm", "dash"]
