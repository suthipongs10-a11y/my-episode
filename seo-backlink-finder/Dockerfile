# syntax=docker/dockerfile:1
#
# The whole tool in one container: CLI and web UI. Data lives on a volume at
# /data so the container itself stays disposable.
FROM python:3.12-slim

# lxml needs no build tools on slim for manylinux wheels, but curl is useful
# for container healthchecks.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies first so a code change does not invalidate the wheel cache.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY pyproject.toml README.md ./
COPY blf ./blf
RUN pip install --no-cache-dir --no-deps -e .

# Config and database live outside the image.
ENV BLF_DATA=/data
VOLUME ["/data"]
WORKDIR /data

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/api/status || exit 1

# 0.0.0.0 so the port is reachable from outside the container. Put it behind a
# reverse proxy with auth before exposing it to the internet — see README §14.
CMD ["blf", "serve", "--host", "0.0.0.0", "--port", "8080"]
