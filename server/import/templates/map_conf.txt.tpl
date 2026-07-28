// =============================================================================
// GENERATED at container start from the environment — do not edit.
// Source template: server/import/templates/map_conf.txt.tpl
// =============================================================================
// Last import of conf/map_athena.conf — after conf/maps_athena.conf — so both
// the settings below and the `delmap:` block the entrypoint appends take
// effect over the upstream map list.

userid: ${RO_INTER_USER}
passwd: ${RO_INTER_PASS}

// Where to find the char-server (internal Compose DNS).
char_ip: ${CHAR_HOST}
char_port: ${CHAR_PORT}

// What we tell the CLIENT to connect to for this map-server. Must be reachable
// from the player's machine.
map_ip: ${RO_ADVERTISE_IP}
bind_ip: 0.0.0.0
map_port: ${MAP_PORT}

console: off
stdout_with_ansisequence: no

// Assets are served to the browser by the CDN (Phase 4), never read from a GRF
// by the server process.
use_grf: no

// The entrypoint appends the map-group `delmap:` block below this line.
