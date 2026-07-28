// =============================================================================
// wsProxy — WebSocket <-> TCP bridge
// =============================================================================
// PHASE 0 SCOPE: this is the service skeleton. It validates configuration,
// serves /healthz so Compose and Caddy have something real to depend on, and
// refuses WebSocket upgrades with 501. The bridge itself is Phase 3 (CLAUDE.md
// §6) and must not be written before the Phase 1 gate passes — a browser
// client is worthless until a PC client can log in.
//
// Two properties are already load-bearing and are implemented here:
//   * the target allowlist is parsed and enforced at startup, because this
//     process listens on a public port and must never become an open relay;
//   * there is no session state. wsProxy is horizontally scalable (CLAUDE.md
//     §3, bottleneck #4) and stays that way only if nothing is kept here.
//     If you find yourself adding a Map keyed by account id, stop.

import http from 'node:http';
import process from 'node:process';
import { loadConfig } from './config.js';

let config;
try {
  config = loadConfig();
} catch (err) {
  console.error(`[wsproxy] FATAL: ${err.message}`);
  process.exit(1);
}

const startedAt = Date.now();
let openConnections = 0;

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      env: config.deployEnv,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      targets: [...config.targets.keys()],
      connections: openConnections,
      maxConnections: config.maxConnections,
      bridge: 'not-implemented',
    }));
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('not found\n');
});

server.on('upgrade', (req, socket) => {
  // Phase 3 replaces this with the real bridge: resolve the requested target
  // against config.targets, open a TCP socket, pipe both ways, and tear both
  // down together.
  socket.end('HTTP/1.1 501 Not Implemented\r\nConnection: close\r\n\r\n');
});

server.listen(config.port, () => {
  console.log(
    `[wsproxy] listening on :${config.port} env=${config.deployEnv} ` +
    `targets=${[...config.targets.keys()].join(',')} max=${config.maxConnections}`,
  );
  console.log('[wsproxy] bridge not implemented — Phase 3');
});

const shutdown = (signal) => {
  console.log(`[wsproxy] ${signal} received, closing`);
  server.close(() => process.exit(0));
  // Do not let a hung socket hold the deploy up.
  setTimeout(() => process.exit(0), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
