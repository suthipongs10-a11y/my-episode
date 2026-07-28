# Threat model — staying up when someone wants you down

Written because the operator named it as a goal, not because it is hypothetical.
Attacks on competing servers are routine in the RO private-server scene, and a
server that goes down during WoE loses its players to whoever is still up.

Nothing here is built yet. This is the specification Phases 7 and 8 build
against, recorded now so the earlier phases do not design something that makes
it impossible later.

---

## 1. The architecture already wins the hardest fight

A traditional RO server must expose raw TCP on 6900 / 6121 / 5121. Raw TCP
cannot go behind Cloudflare's free tier — that needs Spectrum, which is
Enterprise-priced. So traditional servers publish their origin IP by necessity
and absorb attacks themselves. That is why they fall over.

**Ours does not have to.** From Phase 3 the browser talks WebSocket over 443.
Every packet a player sends is HTTP-shaped, and Cloudflare proxies WebSockets on
**all plans including Free**, with DDoS protection, up to 100,000 concurrent
connections per domain.

So the entire player-facing surface can sit behind Cloudflare for free, and the
origin can refuse every packet that did not come from Cloudflare.

This is worth stating plainly because it reframes the mobile-browser decision:
it is not only a distribution choice. It is also what makes DDoS protection
affordable at our budget.

### The constraint that comes with it

**Cloudflare Free and Pro close an idle WebSocket after 100 seconds.**
(Business and Enterprise allow 600.)

An RO player standing still in Prontera sends nothing. At 100 seconds Cloudflare
closes the socket and the player is disconnected — while the server logs nothing
wrong, because nothing was wrong.

This invalidates a comment currently in `infra/caddy/Caddyfile`, which sets
`read_timeout 0` on the reasoning that an idle player should hold the socket
open. Caddy will hold it; Cloudflare will not.

**Phase 3 requirement:** wsProxy must send a WebSocket ping on any connection
idle for more than ~60 seconds, and must handle pongs. This is a protocol-level
keepalive, invisible to rAthena, and it must not be confused with rAthena's own
`ping_timer_inverval` in `conf/battle/client.conf` — that is a game packet and
does not necessarily fire on an idle connection.

If this is missed, the symptom is "players randomly disconnect after a couple of
minutes of standing still", which is expensive to diagnose from scratch.

---

## 2. Denial of service

| Layer | What it looks like | Who stops it |
|---|---|---|
| L3/L4 volumetric | the uplink saturates | **Cloudflare only.** Nothing on the VPS can — the packets arrive whether we drop them or not |
| L7 flood | many valid-looking WSS connections or logins | Cloudflare rate limiting + our own connection caps |
| Application | expensive packets repeated — map changes, vending, chat | rAthena limits + per-connection rate limiting in wsProxy |
| Direct-to-origin | attacker learned the real IP and skips Cloudflare entirely | firewall, and never leaking the IP |

### Direct-to-origin is the one that actually kills you

Cloudflare protects the front door. If someone learns the origin address they
walk around the building. Everything else here is wasted effort if this leaks.

Rules, to be enforced in Phase 8:

- **The firewall accepts 80/443 only from Cloudflare's published IP ranges.**
  Everything else on those ports is dropped. The ranges are published and
  scriptable; the script belongs in `tools/`.
- **No DNS record ever points at the origin.** Not `direct.`, not `ssh.`, not a
  leftover A record from before Cloudflare was in front. Historical DNS is the
  most common leak, and it is permanently archived by third parties.
- **The raw game ports stay closed.** `GAME_PORTS_BIND=127.0.0.1` is the
  production setting; the Phase 1 gate is the only time it is `0.0.0.0`, and it
  goes back immediately after.
  This is the rule the downloadable PC client would have broken. A stock RO
  client speaks raw TCP, so shipping one normally means publishing those ports
  and with them the origin address — one open door that bypasses everything
  else on this page. CLAUDE.md §3a resolves it: the PC client ships with a
  launcher that tunnels localhost TCP to the same WSS endpoint the browser
  uses, so both clients arrive through Cloudflare and the ports stay shut.
- **Nothing else on the box answers on the public IP.** Anything that does — a
  panel agent, a mail server, a status page — will happily tell an attacker
  where you live.
- **SSH is a leak too.** It has to be reachable for the deploy workflow, and its
  host key is a stable fingerprint. Moving it off 22 does not hide it. This is
  an accepted exposure; fail2ban and key-only auth are the mitigation.

> Note for later: the VPS currently runs Hostinger's `hermes-agent` published on
> port 32769. It is unrelated to the game, but it is a service answering on the
> public IP, and Phase 8 has to decide whether that is acceptable.

---

## 3. Cheating

### The client is not trustworthy, and ours is less trustworthy than most

A normal RO client is a compiled binary. Cheating it means reverse engineering.
Ours is **JavaScript in the player's browser**, built on roBrowser, which is
open source. Anyone can read every line, change it, and send whatever packets
they like. There is no obfuscation worth the effort, and no client-side check
that cannot be deleted.

The only consequence that matters:

> **Every rule must be enforced by the server. If the client is the only thing
> stopping something, it is not stopped.**

rAthena is largely server-authoritative already, which is why we are building on
it rather than something homegrown. The discipline is on us: Phase 5's mobile UI
layer must never become the place a limit lives.

### What that means per phase

- **Phase 3 (wsProxy)** — the proxy is the only chokepoint every player passes
  through. Per-connection packet rate limiting belongs there. It must stay
  stateless in the sense that matters (no session data), but a token bucket per
  socket is local state and is fine.
- **Phase 5 (mobile UI)** — cooldowns, ranges and costs displayed by the UI are
  hints. The server decides.
- **Phase 8** — rAthena's own `macro_detection_*` settings in
  `conf/battle/client.conf` are the built-in bot deterrent. They are off by
  default and need tuning, not just enabling.

---

## 4. Accounts

rAthena stores passwords either in plaintext or as unsalted MD5
(`use_MD5_passwords`). Both are bad by modern standards; MD5 is the less bad of
the two and is what we should run.

Practical mitigations, given we cannot change rAthena's scheme without diverging
from upstream:

- The database is treated as sensitive. Backups are already encrypted with
  AES256 before leaving the host.
- Login brute force is already limited: `ipban_dynamic_pass_failure_ban_*` is
  enabled in the generated login config — seven failures in five minutes buys a
  ban.
- Phase 8 should add Cloudflare rate limiting on the login path as a second
  layer, since the first one only triggers after the packets have arrived.
- Players must be told, on the registration page, not to reuse a password.

---

## 5. What exists today, and what is owed

| Control | State |
|---|---|
| Only Caddy publishes to the internet | ✅ built (Phase 0) |
| Game ports bound to loopback by default | ✅ built |
| ufw: SSH + 80/443 only | ✅ built |
| fail2ban on SSH | ✅ built |
| Login brute-force ban | ✅ configured |
| Encrypted off-host backups | ✅ built |
| Docker log caps (disk exhaustion) | ✅ built |
| WebSocket keepalive under 100s | ❌ **Phase 3 — hard requirement** |
| Per-connection rate limiting in wsProxy | ❌ Phase 3 |
| Cloudflare in front of the game traffic | ❌ Phase 4 |
| Firewall restricted to Cloudflare ranges | ❌ Phase 8 |
| Origin-IP leak audit | ❌ Phase 8 |
| Cloudflare rate limiting on login | ❌ Phase 8 |
| Bot/macro detection tuned | ❌ Phase 8 |
| Load test to find the real ceiling | ❌ Phase 7 |

---

## 6. A correction to CLAUDE.md §3

CLAUDE.md says assets go to "Cloudflare (free tier)". That needs one
qualification.

Cloudflare removed the old ToS §2.8 non-HTML restriction in May 2023, but the
replacement still restricts serving large files **hosted outside Cloudflare**
through the CDN. Large files are explicitly fine when they are hosted **on a
Cloudflare service — R2, Images or Stream**.

GB-scale RO assets cached from our origin is exactly the shape the rule still
targets. Putting them in **R2** instead is ToS-clean, has zero egress cost, and
CLAUDE.md already reaches for R2 for backups — so it is one account, not a new
dependency.

**Phase 4 should build the asset pipeline to publish into R2**, not to sit
behind a caching proxy in front of the VPS.

---

## Sources

- [WebSockets — Cloudflare Network settings](https://developers.cloudflare.com/network/websockets/)
- [Goodbye, section 2.8 and hello to Cloudflare's new terms of service](https://blog.cloudflare.com/updated-tos)
