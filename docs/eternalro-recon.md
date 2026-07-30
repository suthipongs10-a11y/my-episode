# Reading EternalRO's client — the procedure, and what it can answer

`CLAUDE.md` §8a names `eternal-origin.com` as the server we are trying to match.
Everything we know about them so far came from **screenshots** — the operator's
own, plus public pages. That produced §8a's table, and it is thin: "modern
content era", "streamed assets", "Thai UI".

Their installed client is a much better source, and we already have one.
`docs/phase-1-client.md` records it as one of the three packages tried during
Phase 1: *"EternalRO — real, playable install — got much further."* It is sitting
on the Windows box.

A client folder is a detailed, machine-readable description of the server behind
it. It has to be: the client cannot connect without knowing where to connect, it
cannot render content it does not ship, and it cannot be patched without knowing
where patches come from. `tools/client-survey.py` reads all of that out.

---

## Why this is not the same job as `client-doctor.py`

| | asks | run against |
|---|---|---|
| `client-doctor.py` | "is every file this client needs to start actually reachable?" | **our** broken folder |
| `client-survey.py` | "what is in here, and what does it say about the server?" | **anyone's** working folder |

They share `tools/grflib.py`, which is the only GRF reader in the repo.
`tools/test-client-survey.py` covers both against a synthetic archive and a
synthetic executable built byte by byte, so a change to the reader cannot
quietly break the doctor.

---

## Run it

On the Windows box, in the repo:

```
tools\survey-client.cmd "C:\Games\EternalRO" "C:\Games\Ep4Client2\data.grf"
```

Or directly, which is the same thing with the arguments visible:

```
python tools\client-survey.py "C:\Games\EternalRO" ^
       --out docs\recon\EternalRO ^
       --baseline "C:\Games\Ep4Client2\data.grf" ^
       --extract
```

Standard library only, no install, offline, read-only. It writes nothing into
the folder it is surveying.

**Give it the `--baseline`.** Without it you get an inventory; with it you get
the inventory *minus stock kRO*, which is the difference between "this archive
has 240,000 files" and "these 3,100 files are the ones this server added." The
second is the Phase 4 content roster. Any stock kRO-derived `data.grf` works —
`Ep4Client2\data.grf` is the one `docs/phase-3-robrowser.md` already uses and
`client-doctor.py` reported clean.

### What it writes

```
docs/recon/<name>/report.md          the summary — this is what you send back
docs/recon/<name>/survey.json        the same findings, structured
docs/recon/<name>/manifest/*.txt     every entry in every archive
docs/recon/<name>/diff/*.txt         added / changed / removed vs baseline
docs/recon/<name>/extracted/...      unencrypted text and config entries
```

`docs/recon/.gitignore` tracks `report.md` and ignores the rest. That is
deliberate: the manifests are hundreds of thousands of lines, and everything
under `extracted/` is their content, which `CLAUDE.md` §2.3 keeps out of the
repo. **Send `report.md`.** Ask for a manifest when a question needs one.

### How long it should take

Measured against a synthetic 300,000-entry archive, which is the scale of a
modern client's `data.grf`:

| | |
|---|---|
| whole survey | ~4 seconds |
| peak memory | ~160 MB |
| `manifest/data.txt` | ~13 MB |

Only the file table is read, never the archive body, so a 4 GB `data.grf` costs
about the same as a small one. If it appears to hang for minutes, something is
wrong — say so rather than waiting. `--extract` is the one slow flag, and it is
capped at 6,000 files and 64 MB.

### Then commit it

The report lands inside the repo on purpose, so getting it back is a push rather
than a paste:

```
git add docs/recon/EternalRO/report.md
git commit -m "docs: EternalRO client survey"
git push -u origin <branch>
```

`docs/recon/.gitignore` means `git add` on that directory picks up the report and
nothing else — no manifests, no extracted content, no archives. Pushing it is
what lets the findings be read and turned into §8a rows without anyone
transcribing a table by hand.

---

## The eight things it answers

Each one is currently an open question in `CLAUDE.md`, and each is answered from
their disk rather than from a guess or a vendor promise.

| # | Question | Where the answer comes from |
|---|---|---|
| 1 | **What client date / packetver does their server speak?** | date strings in the executable — `2018-06-20eRagexeRE` and the `20180620` form. §3a Q1, currently unanswered and blocking Phase 2 planning |
| 2 | **Is Gepard actually there, and what else is?** | `gepard.dll` on disk, the import table, and protection names in the strings. §3a Q2 and §3b.1 — the one purchase that might close both the anti-cheat and PC-client gaps |
| 3 | **Where does their client connect, and is it fronted?** | `clientinfo.xml`: address, port. A bare IP on 6900 confirms raw TCP to a public origin and settles §3c's shape |
| 4 | **How are assets and patches delivered?** | patch hosts in the launcher and the binary; the size and shape of their archives. Phase 5, and the "streamed with a progress bar" note in §8a |
| 5 | **Where does in-client registration go?** | `registrationweb` in `clientinfo.xml`. The §8a `สมัครไอดี` button, from the client side. Phase 6 |
| 6 | **What content have they actually added?** | `--baseline` diff: every file they ship that stock kRO does not, grouped by area, with their custom maps listed. Phase 4 |
| 7 | **Which features does their client support?** | `C*Mgr` manager names and feature strings — cash shop, achievements, RODEX, attendance, 4th job. Replaces §8a's screenshot-derived table with evidence |
| 8 | **How big is the install, and of what?** | per-archive uncompressed totals and a breakdown by area. Phase 5's per-player first-load number starts here |

---

## What it will not do, and why

**It does not decrypt anything.** `tools/grflib.py` reads file tables and
extracts entries that are stored plainly. An entry marked encrypted is reported
as encrypted and skipped. Two different schemes get called "an encrypted GRF" —
the format's own old DES scrambling, and a protection product's — and this tool
implements neither. If their archive comes back mostly encrypted, that is an
answer (it tells us Gepard is doing its job), not a problem to route around.

**The file table is readable either way.** This is the part worth understanding
before reading a report: entry *names* are only zlib-compressed, even when entry
*contents* are locked. So a protected archive still yields a complete list of
every file the server ships — every custom map, sprite, and UI texture — by
name and size. Questions 6, 7 and 8 above survive full encryption. Only
`--extract` needs plaintext.

**A packed executable hides its strings.** §8a says their ragexe is
Gepard-protected, and `docs/phase-1-client.md` records Grimoire RO's client
refusing a foreign exe outright. If the survey reports a `.themida` section or a
high-entropy section with no name, then questions 1, 2, 4 and 7 come back thin
and the report says so rather than reporting an absence as a finding. Note that
our *own* ragexe turned out to be effectively unpacked despite carrying
`CThemidaMgr` — so this is worth measuring rather than assuming.

**It reads only the folder you point it at.** No network, no registry, no
processes, nothing outside the path given. Values that look like credentials are
redacted before they can reach the report.

---

## What this does not change

**It is not a substitute for the RoPlay questions.** `docs/vendor-roplay.md`'s
eight questions are about a contract — what is supported, what it costs, what
happens when the subscription lapses. A client folder cannot answer any of
those. What it can do is let us *check* the answers, Q1 especially: if RoPlay
says one packetver and EternalRO's client says another, that discrepancy is
worth understanding before paying.

**It is not a client we can use.** Their exe is locked to their server and their
archives are theirs. §3b's decision stands: our PC client is roBrowser Electron,
built, waiting on one human login (`docs/phase-3-robrowser.md`).

**It does not tell us how their mobile client works.** RoPlay is a separate app
on a phone, not in this folder. If anything in the PC folder mentions it, that
is a bonus and the report will show it under URLs and hostnames.

---

## After the report comes back

In order, because each step changes what the next one is worth doing:

1. **Compare their client date against our `PACKETVER=20180620`.** If they are
   modern-era, as §8a's feature list suggests, our build target is the thing to
   revisit first — it decides the content baseline for Phase 4 and the packet
   table `tools/smoke-play.py` pins.
2. **Write the findings into `CLAUDE.md` §8a**, replacing the screenshot-derived
   rows with measured ones and noting which are now evidence rather than
   inference.
3. **Turn the baseline diff into the Phase 4 content list** — what to match,
   and more importantly what to deliberately do differently. §8a is explicit:
   where we differ should be rates, content and custom NPCs.
4. **Re-check §3c against their ingress.** If their client dials a bare IP on
   6900, they are as exposed as we would be, and whatever they do about it is
   worth knowing before we pick a host.

Run the same survey against `Ep4Client2` too, and against any other client on
the box. It costs one command each, and a second data point is what turns "they
ship 3,100 custom files" into a sense of what normal looks like.
