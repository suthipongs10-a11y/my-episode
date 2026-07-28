# Anti-bot — what is possible, what is not, and what it costs

Answering three questions the operator asked: can we design this in from the
start, can we match the commercial products, and how hard is it.

Short version: **we cannot use the commercial products at all** — not "we can do
worse than them", they are structurally unavailable to a browser client. But the
place where they are weakest is the place we are strongest, and the thing that
matters most costs almost nothing if we do it early and is impossible to
retrofit.

---

## 1. Why Gepard Shield and friends are off the table

The de-facto standard in the RO private-server scene is **Gepard Shield** (paid;
Harmony is the other one). What they actually sell is a **Windows DLL injected
into `ragexe.exe`** that:

- encrypts the packet stream with a key derived inside the protected process
- detects debuggers, injectors and memory editors
- fingerprints the machine (HWID) so a ban survives a new account

Every one of those depends on there being a **native binary to protect**.

Our client is JavaScript running in the player's browser. There is no process to
guard, no DLL to inject, no HWID to read, and no code the player cannot read and
modify. Buying Gepard would not help us; there is nothing for it to attach to.

**And it is worse than neutral.** A traditional server's protocol has to be
reverse engineered. Ours ships as readable source that documents exactly how to
talk to the server. We are handing out the integration guide.

### But the gap is smaller than it sounds

**OpenKore** — a from-scratch bot client in Perl — already speaks rAthena's
protocol natively and does not use the RO client at all. Gepard does not stop
it; Gepard makes the *official client* hard to tamper with, which is a different
problem. Servers running Gepard still fight OpenKore constantly.

For us, an OpenKore-style bot needs one extra piece: our WebSocket transport
instead of raw TCP. That is a small shim for anyone motivated. **Treat it as
zero barrier.**

So the honest position: the commercial products would buy us less than their
marketing implies even if we could run them, and the botting we will actually
face — a headless client speaking the protocol — is the kind they handle worst.

---

## 2. Where we are genuinely strong

**Server-side behavioural detection.** We control the server absolutely, and a
bot that wants to farm has to *do things* — and doing things leaves a trace that
cannot be forged, because the trace is what the server itself recorded.

A bot cannot hide:

- action intervals with no human jitter (a human's attack timing has variance;
  a script's does not)
- sessions that never end — 18 hours of continuous activity is not a person
- never responding to a whisper, ever
- identical movement paths repeated hundreds of times
- perfect efficiency: never overkilling, never walking the wrong way, never
  pausing at a shop
- many accounts sharing one IP, or one account seen from many at once
- zeny and item flows that converge on a small number of destination accounts

None of this depends on trusting the client. All of it depends on **having the
logs**, which is the part we must not get wrong early.

This is precisely where Gepard is weak — it is a client-side product. Our
architecture forces us onto the approach that actually holds up.

---

## 3. What rAthena already gives us

`conf/battle/client.conf` carries the **official kRO macro detector**:

```
macro_detection_retry: 3            // failures before punishment
macro_detection_timeout: 60000      // 60s to answer
macro_detection_punishment: 0       // 0 = ban, 1 = jail
macro_detection_punishment_time: 0  // 0 = permanent
macrochecker_delay: 600000          // per-map re-check interval
```

It works by streaming a **BMP captcha to the client in chunks** — the image
comes from `db/captcha_db.yml` and is sent over the wire
(`ZC_APPLY_MACRO_DETECTOR` + `ZC_APPLY_MACRO_DETECTOR_CAPTCHA`), so we supply
the images and can change them whenever we like.

Two facts about it that matter to us:

**It is gated on `PACKETVER >= 20160330`.** Our build is `20180620`, so the
server side is available. ✅

**But the client has to implement packets `0x0a52`–`0x0a57` to render the image
and send an answer — and roBrowser-Legacy almost certainly does not.** It is a
2016+ kRO feature well outside the packet set roBrowser targets.

> **Phase 5 consequence:** rAthena's built-in macro detector is dead weight for
> us until our roBrowser plugin implements those packets. Verify before relying
> on it. The upside is that since we are writing the client anyway, we are not
> limited to BMP captchas once we do — but that is a build, not a config switch.

Also already enabled, in the generated login config: `ipban_dynamic_pass_failure_ban_*`,
which bans an IP after seven password failures in five minutes. That is
credential stuffing, not botting, but it is the same family.

---

## 4. What "design it in from the start" actually means

Not "build anti-bot now" — that would be Phase 8 work done during Phase 0, and
it would be guessing at behaviour we have never observed.

It means **not foreclosing the options**, and specifically **logging from day
one**. Behavioural detection is retrospective by nature: the day you want to ban
a bot, you need the last month of its behaviour, and you cannot go back and
collect it.

Three concrete things, all cheap now:

| When | What | Why it must be early |
|---|---|---|
| **Phase 1** | turn on rAthena's logging properly — pick, drop, zeny, chat, MVP, trade — into the separate `ragnarok_log` schema | the schema already exists and is already backed up; a month of history is worth more than any detector |
| **Phase 3** | wsProxy records connection metadata: source IP, connection id, open/close time, packet counts | it is the one point every player passes through. Nothing else sees IP-level behaviour once Cloudflare is in front |
| **Phase 5** | never put a limit only in the UI | already in CLAUDE.md §8, restated because bots are exactly the case it exists for |

The log database being separate was a scaling decision (CLAUDE.md §3). It turns
out to also be the anti-bot foundation, which is a nice accident — but only if
the logs are actually switched on.

---

## 5. How hard, honestly

| Tier | What | Effort | Catches |
|---|---|---|---|
| **0** | rAthena macro detector + login ban + Cloudflare Turnstile on registration | days | lazy bots, mass account creation |
| **1** | behavioural logging, offline analysis queries, admin review and ban tooling | weeks | most real farm bots |
| **2** | sustained arms race — they adapt, you adapt | never finished | the determined ones |

**Tier 2 is what the paid products actually sell.** Not a cleverer algorithm —
*someone else's ongoing attention*. That is the part we cannot buy and would
have to fund with our own time, indefinitely.

### The uncomfortable truth

Nobody has solved botting. Not Gravity, not the large private servers, not the
paid vendors. The realistic goal is not elimination; it is making botting
**unprofitable and visible** enough that it stays a minority and does not wreck
the economy for everyone else.

**Game design does more here than any detector.** Drop rates that do not reward
24-hour grinding, account-bound rewards, zeny sinks, and content that needs a
party are all worth more than a captcha, and they cost engineering nothing —
they are Phase 2 content decisions.

---

## 6. Recommendation

1. **Now (Phase 1):** switch the logs on. That is the whole "design it in from
   the start" answer, and it is an afternoon of config.
2. **Phase 3:** wsProxy records connection metadata. Design it in; do not add it
   later.
3. **Phase 5:** find out whether roBrowser handles the macro-detector packets
   before planning around them.
4. **Phase 8:** Tier 0 in full — tune the detector, add Turnstile at
   registration.
5. **After launch, with real data:** Tier 1. Not before — you would be building
   detectors for behaviour you have never seen.
6. **Ongoing:** accept that this is maintenance, not a feature that ships.
