// =============================================================================
// GENERATED at container start from the environment — do not edit.
// Source template: server/import/templates/login_conf.txt.tpl
// =============================================================================
// Last import of conf/login_athena.conf, so these win.

// 0.0.0.0 is correct here: the container's own network namespace is the
// boundary, and what the outside world can reach is decided by Compose's
// port publishing (GAME_PORTS_BIND) and the host firewall — not by rAthena.
bind_ip: 0.0.0.0
login_port: ${LOGIN_PORT}

// Container logs are the console; an interactive console on a background
// process just burns CPU on a 2 vCPU box.
console: off
stdout_with_ansisequence: no

// Accounts are created through the login server with the _M/_F suffix during
// development. Turn this off before the server is public.
new_account: yes

log_login: yes
ipban_enable: yes
