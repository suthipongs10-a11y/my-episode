// =============================================================================
// wsProxy configuration
// =============================================================================
// Everything comes from the environment (CLAUDE.md §2.1). Nothing here has a
// hostname or port literal except the loopback bind, which is not a
// deployment detail.
//
// This module is deliberately separate from the server so the allowlist parser
// can be unit-tested without opening a socket:  node src/config.js --selftest

/**
 * Parse PROXY_ALLOWED_TARGETS: "name:host:port,name:host:port".
 *
 * This is an allowlist, not a convenience. The browser tells the proxy which
 * backend to dial; without a fixed set of answers the proxy is an open relay
 * into the internal network, and it sits on a public port.
 *
 * @param {string} raw
 * @returns {Map<string, {host: string, port: number}>}
 */
export function parseTargets(raw) {
  const targets = new Map();
  if (!raw || !raw.trim()) {
    throw new Error('PROXY_ALLOWED_TARGETS is empty — refusing to start with no allowlist');
  }

  for (const entry of raw.split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(':');
    if (parts.length !== 3) {
      throw new Error(`PROXY_ALLOWED_TARGETS entry "${trimmed}" is not name:host:port`);
    }

    const [name, host, portRaw] = parts.map((p) => p.trim());
    const port = Number(portRaw);

    if (!name) throw new Error(`PROXY_ALLOWED_TARGETS entry "${trimmed}" has an empty name`);
    if (!host) throw new Error(`PROXY_ALLOWED_TARGETS entry "${trimmed}" has an empty host`);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`PROXY_ALLOWED_TARGETS entry "${trimmed}" has an invalid port`);
    }
    if (targets.has(name)) {
      throw new Error(`PROXY_ALLOWED_TARGETS defines "${name}" twice`);
    }

    targets.set(name, { host, port });
  }

  if (targets.size === 0) {
    throw new Error('PROXY_ALLOWED_TARGETS parsed to zero targets');
  }
  return targets;
}

/** Read and validate the whole configuration, or throw. */
export function loadConfig(env = process.env) {
  const port = Number(env.PROXY_PORT ?? 5999);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PROXY_PORT "${env.PROXY_PORT}" is not a valid port`);
  }

  const maxConnections = Number(env.PROXY_MAX_CONNECTIONS ?? 2000);
  if (!Number.isInteger(maxConnections) || maxConnections < 1) {
    throw new Error(`PROXY_MAX_CONNECTIONS "${env.PROXY_MAX_CONNECTIONS}" is not a positive integer`);
  }

  return {
    port,
    maxConnections,
    trustProxy: env.PROXY_TRUST_PROXY === '1',
    deployEnv: env.DEPLOY_ENV ?? 'dev',
    targets: parseTargets(env.PROXY_ALLOWED_TARGETS),
  };
}

// --- self test ---------------------------------------------------------------
// Runs in CI. Cheap insurance on the one piece of this service that is a
// security boundary rather than plumbing.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\//, ''))
    && process.argv.includes('--selftest')) {
  const ok = (label, fn) => {
    try { fn(); console.log(`  ok   ${label}`); return true; }
    catch (err) { console.error(`  FAIL ${label}: ${err.message}`); return false; }
  };
  const throws = (label, fn) => ok(label, () => {
    let threw = false;
    try { fn(); } catch { threw = true; }
    if (!threw) throw new Error('expected a throw, got none');
  });

  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
  const results = [];

  console.log('config selftest:');
  results.push(ok('parses a three-target list', () => {
    const t = parseTargets('login:login:6900,char:char:6121,map:map1:5121');
    assert(t.size === 3, `expected 3 targets, got ${t.size}`);
    assert(t.get('map').host === 'map1', 'map target host wrong');
    assert(t.get('map').port === 5121, 'map target port wrong');
  }));
  results.push(ok('tolerates whitespace', () => {
    const t = parseTargets(' login : login : 6900 ');
    assert(t.get('login').port === 6900, 'whitespace not trimmed');
  }));
  results.push(throws('rejects an empty allowlist', () => parseTargets('')));
  results.push(throws('rejects a malformed entry', () => parseTargets('login:6900')));
  results.push(throws('rejects a bad port', () => parseTargets('login:login:abc')));
  results.push(throws('rejects an out-of-range port', () => parseTargets('login:login:70000')));
  results.push(throws('rejects a duplicate name', () => parseTargets('a:h:1,a:h:2')));
  results.push(throws('rejects a bad PROXY_PORT', () => loadConfig({
    PROXY_PORT: 'nope', PROXY_ALLOWED_TARGETS: 'login:login:6900',
  })));

  process.exit(results.every(Boolean) ? 0 : 1);
}
