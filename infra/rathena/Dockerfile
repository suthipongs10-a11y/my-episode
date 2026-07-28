# syntax=docker/dockerfile:1.7
# =============================================================================
# rAthena — pre-renewal build
# =============================================================================
# Build context is the repository root; the source is the git submodule at
# server/rathena. We never patch upstream in this image: every override is
# copied in at container start from the /overlay mount (see entrypoint.sh).
#
# Base images are pinned by digest (CLAUDE.md Phase 0) so a rebuild six months
# from now produces the same thing.
# =============================================================================

# ---- build ------------------------------------------------------------------
FROM ubuntu:24.04@sha256:4fbb8e6a8395de5a7550b33509421a2bafbc0aab6c06ba2cef9ebffbc7092d90 AS builder

ENV DEBIAN_FRONTEND=noninteractive

# libmariadb-dev-compat supplies `mysql_config`, which rAthena's configure
# looks for by name. libpcre3-dev is the old PCRE1 API rAthena still uses for
# NPC regex; dropping it would silently disable those scripts.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        make \
        cmake \
        git \
        ca-certificates \
        libmariadb-dev \
        libmariadb-dev-compat \
        zlib1g-dev \
        libpcre3-dev \
        libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY server/rathena/ ./

ARG PACKETVER=20180620
ARG RATHENA_PRERE=yes
ARG RATHENA_MAXCONN=16384

# --enable-epoll matters: the default select() backend caps out well below the
# connection counts we are aiming for.
RUN ./configure \
        --enable-prere="${RATHENA_PRERE}" \
        --enable-packetver="${PACKETVER}" \
        --enable-epoll \
        --with-maxconn="${RATHENA_MAXCONN}"

RUN make server -j"$(nproc)" \
    && strip login-server char-server map-server web-server \
    && rm -rf .git 3rdparty/*/obj src/*/obj obj


# ---- runtime ----------------------------------------------------------------
FROM ubuntu:24.04@sha256:4fbb8e6a8395de5a7550b33509421a2bafbc0aab6c06ba2cef9ebffbc7092d90

ENV DEBIAN_FRONTEND=noninteractive

# gettext-base -> envsubst, used to render config from the environment.
# mariadb-client -> the entrypoint waits for the DB before starting.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libmariadb3 \
        zlib1g \
        libpcre3 \
        openssl \
        ca-certificates \
        gettext-base \
        mariadb-client \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --create-home --home-dir /home/rathena --shell /usr/sbin/nologin rathena

WORKDIR /opt/rathena
COPY --from=builder --chown=rathena:rathena /build/ /opt/rathena/

COPY --chmod=0755 infra/rathena/entrypoint.sh /usr/local/bin/entrypoint
COPY --chmod=0755 infra/rathena/tcp-health.sh /usr/local/bin/tcp-health

# The entrypoint renders config into /run/rathena and overlays our files into
# db/import and npc/custom, so those must be writable by the runtime user.
RUN mkdir -p /run/rathena /opt/rathena/log /opt/rathena/map-groups \
    && chown -R rathena:rathena /run/rathena /opt/rathena/log \
         /opt/rathena/db /opt/rathena/npc /opt/rathena/conf

USER rathena

ENTRYPOINT ["/usr/local/bin/entrypoint"]
CMD ["map"]
