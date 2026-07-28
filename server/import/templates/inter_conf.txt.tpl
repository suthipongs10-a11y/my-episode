// =============================================================================
// GENERATED at container start from the environment — do not edit.
// Source template: server/import/templates/inter_conf.txt.tpl
// =============================================================================
// Loaded by login, char, map and web via
//   conf/inter_athena.conf -> import: conf/import/inter_conf.txt
// which is the last import, so these values win over upstream defaults.
//
// Every rAthena subsystem gets its own connection block. They all point at one
// database today; when the DB becomes the bottleneck (CLAUDE.md §3, bottleneck
// #3) the log connection is the first one to move to its own host, and that is
// a change to .env, not to this file.

// ---- account / login ----
login_server_ip: ${DB_HOST}
login_server_port: ${DB_PORT}
login_server_id: ${DB_USER}
login_server_pw: ${DB_PASSWORD}
login_server_db: ${DB_NAME}

// ---- ip bans ----
ipban_db_ip: ${DB_HOST}
ipban_db_port: ${DB_PORT}
ipban_db_id: ${DB_USER}
ipban_db_pw: ${DB_PASSWORD}
ipban_db_db: ${DB_NAME}

// ---- characters ----
char_server_ip: ${DB_HOST}
char_server_port: ${DB_PORT}
char_server_id: ${DB_USER}
char_server_pw: ${DB_PASSWORD}
char_server_db: ${DB_NAME}

// ---- map ----
map_server_ip: ${DB_HOST}
map_server_port: ${DB_PORT}
map_server_id: ${DB_USER}
map_server_pw: ${DB_PASSWORD}
map_server_db: ${DB_NAME}

// ---- web (emblems, auth token) ----
web_server_ip: ${DB_HOST}
web_server_port: ${DB_PORT}
web_server_id: ${DB_USER}
web_server_pw: ${DB_PASSWORD}
web_server_db: ${DB_NAME}

// ---- logs ----
// Separate schema: it grows without bound and we do not want it competing
// with gameplay tables for the InnoDB buffer pool.
log_db_ip: ${DB_HOST}
log_db_port: ${DB_PORT}
log_db_id: ${DB_USER}
log_db_pw: ${DB_PASSWORD}
log_db_db: ${DB_LOG_NAME}

// Reconnect rather than die if the DB blips. 2 = reconnect on demand.
mysql_reconnect_type: 2
mysql_reconnect_count: 1
