# syntax=docker/dockerfile:1.7
# =============================================================================
# Off-host database backup
# =============================================================================
# CLAUDE.md §4 and §9: the host is disposable, the player data is not. A DMCA
# takedown or a provider suspension must not lose characters, so dumps leave
# the VPS on a schedule.
#
# rclone talks to Cloudflare R2 and Backblaze B2 (both free tier) with the same
# config, so switching providers is an rclone.conf edit.
# =============================================================================

FROM alpine:3.22@sha256:14358309a308569c32bdc37e2e0e9694be33a9d99e68afb0f5ff33cc1f695dce

RUN apk add --no-cache \
        bash \
        mariadb-client \
        rclone \
        gnupg \
        tzdata \
        ca-certificates

COPY --chmod=0755 tools/backup-db.sh   /usr/local/bin/backup-db
COPY --chmod=0755 tools/restore-db.sh  /usr/local/bin/restore-db
COPY --chmod=0755 infra/backup/entrypoint.sh /usr/local/bin/entrypoint

ENV RCLONE_CONFIG=/config/rclone/rclone.conf

WORKDIR /work

ENTRYPOINT ["/usr/local/bin/entrypoint"]
