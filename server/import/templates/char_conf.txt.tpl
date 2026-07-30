// =============================================================================
// GENERATED at container start from the environment — do not edit.
// Source template: server/import/templates/char_conf.txt.tpl
// =============================================================================
// Last import of conf/char_athena.conf, so these win.

// How this char-server authenticates to the login-server. Not a DB credential:
// it is a row in the `login` table. Anyone holding it can register a rogue
// map-server, so it is generated per deployment, never checked in.
userid: ${RO_INTER_USER}
passwd: ${RO_INTER_PASS}

server_name: ${RO_SERVER_NAME}

// Where to find the login-server. A Compose service name — DNS inside the
// game network — so moving hosts never touches this.
login_ip: ${LOGIN_HOST}
login_port: ${LOGIN_PORT}

// What we tell the CLIENT to connect to next. This one must be an address the
// player's machine can actually reach, which is why it is a separate variable
// from LOGIN_HOST above. Getting this wrong is the classic "server select
// works, character select hangs" symptom.
char_ip: ${RO_ADVERTISE_IP}
bind_ip: 0.0.0.0
char_port: ${CHAR_PORT}

console: off
stdout_with_ansisequence: no

// Pre-renewal start point. rAthena picks start_point_pre on a PRERE build;
// setting it explicitly keeps the intent visible.
start_point_pre: new_1-1,53,111
start_zeny: 0

// --- PIN code: off -----------------------------------------------------------
// rAthena ships this ON, with pincode_force: yes. At PACKETVER >= 20110309 the
// char-server then demands a PIN before character select, and the client opens
// a dialog for it.
//
// Turned off because our PC client cannot render that dialog. roBrowser draws
// it from msgstringtable entries that only exist in clients from ~2011 onward;
// with older game data every label falls back to the component name and the
// player sees a box captioned "Pincodewindow" containing "NO MSG 1900". Which
// is not a broken client — it is a working client asked to say something its
// data has no words for. Observed the first time a human logged in, 2026-07-30.
//
// It is also a feature nobody asked for on a server with no players. Revisit
// with the website (§6 Phase 6): a PIN is only worth having once accounts are
// worth stealing, and by then the client data will be modern enough to say so.
pincode_enabled: no
