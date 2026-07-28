#!/bin/bash
# Runs once, on first initialisation of an empty data directory.
#
# MARIADB_DATABASE creates the game schema. rAthena also needs a second schema
# for its logs — kept separate because it grows without bound and we do not
# want it competing with gameplay tables for the InnoDB buffer pool.
#
# Schema import itself is a Phase 1 step: ./tools/db-init.sh
set -euo pipefail

: "${RO_DB_LOG_NAME:?RO_DB_LOG_NAME must be set on the db service}"
: "${MARIADB_USER:?MARIADB_USER must be set}"
: "${MARIADB_ROOT_PASSWORD:?MARIADB_ROOT_PASSWORD must be set}"

echo "[initdb] creating log database '${RO_DB_LOG_NAME}'"

mariadb --protocol=socket -u root -p"${MARIADB_ROOT_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS \`${RO_DB_LOG_NAME}\`
    CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
GRANT ALL PRIVILEGES ON \`${RO_DB_LOG_NAME}\`.* TO '${MARIADB_USER}'@'%';
FLUSH PRIVILEGES;
SQL

echo "[initdb] done"
