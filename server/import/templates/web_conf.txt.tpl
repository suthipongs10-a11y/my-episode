// =============================================================================
// GENERATED at container start from the environment — do not edit.
// Source template: server/import/templates/web_conf.txt.tpl
// =============================================================================
// Last import of conf/web_athena.conf.
//
// The web-server serves guild emblems and the web auth token newer clients
// expect. It is off by default; enable it with `web` in COMPOSE_PROFILES.
// Note its CLI has no --web-config, which is why every role here is driven
// through the conf/import chain instead of command-line flags.

web_port: 8888
console_silent: 0
stdout_with_ansisequence: no
print_req_res: off

// Tightened in Phase 3 once the browser client's real origin is known.
allowed_origin_cors:
