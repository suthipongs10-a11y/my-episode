# syntax=docker/dockerfile:1.7
# =============================================================================
# wsProxy — WebSocket <-> TCP bridge
# =============================================================================
# Build context is the repository root. Pinned by digest (CLAUDE.md Phase 0).
# =============================================================================

FROM node:22-bookworm-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3

ENV NODE_ENV=production

WORKDIR /app

# Separate layer so a source edit does not reinstall dependencies. There are
# none today — Phase 3 will add a WebSocket library — but the layout should
# already be right when it does.
COPY proxy/package.json proxy/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY proxy/src ./src

# The image ships with a `node` user (uid 1000). Nothing here needs root.
USER node

# Documentation only; the published port comes from Compose.
EXPOSE 5999

CMD ["node", "src/index.js"]
