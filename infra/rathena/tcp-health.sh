#!/usr/bin/env bash
# Container healthcheck: is the server accepting TCP on <port>?
#
# It deliberately does not speak the RO protocol. A listening socket means the
# process finished loading its databases and entered its main loop, which is
# the thing Compose's `depends_on: service_healthy` needs to know.
set -euo pipefail

port="${1:?usage: tcp-health <port>}"

exec 3<>"/dev/tcp/127.0.0.1/${port}" 2>/dev/null || exit 1
exec 3<&-
exec 3>&-
exit 0
