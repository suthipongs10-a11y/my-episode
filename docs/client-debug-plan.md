# Getting the PC client to start — the ordered plan

The client dies at startup with a message box titled `Error` and no text, then
exits with code 0. `docs/phase-1-client.md` has the full history and everything
already eliminated. This is what to do next, in order, and what each step tells
us whether it works or not.

**The principle:** every step must produce information even when it fails. A day
was lost changing things and re-running with no way to tell whether a change
mattered. Each step below has a defined "what we learned if this does nothing".

---

## What the last session concluded, and where it went too far

> *"No missing files. Process Monitor filtered to `NAME NOT FOUND` showed 707
> events... not one game file."*

That is good evidence and it is correctly reported. But the conclusion drawn
from it — that nothing is missing — is wider than what ProcMon can see.

**ProcMon cannot see inside a GRF.** It observes `data.grf` being opened once.
Every lookup after that happens in memory, inside the client. A file the client
needs from inside the archive can be absent, and ProcMon shows nothing at all,
because no filesystem call was ever made for it.

The same blind spot covers `DATA.INI`: if it names an archive that does not
exist, the client opened DATA.INI successfully and then failed on its
*contents*. ProcMon sees a successful open.

Step 1 closes both gaps.

---

## Step 1 — Ask the binary what it wants, and check inside the archives

```
python tools\client-doctor.py "C:\Games\CleanTest"
```

Standard library only, no install, offline. It reads the GRF file table the same
way roBrowser does, extracts every `.lub`/`.lua` path and `C*Mgr` name from the
executable, and reports which of them are reachable — **loose file or GRF entry**.

It also reports:

- GRFs declared in `DATA.INI` that do not exist on disk
- GRFs on disk that `DATA.INI` does not list (the client ignores those)
- **encrypted GRF entries** — the signature of a protected server's archive,
  which is why the Grimoire RO attempt was dead on arrival
- how many entries `msgstringtable.txt` has

**If it finds a missing file:** that is the answer. Fix and re-run.

**If it finds nothing:** we have now genuinely ruled out the file layer, at the
archive level and not just the filesystem level, and Step 2 is next.

---

## Step 2 — Make the error box talk

This is the highest-value step and it has never been tried.

`docs/phase-1-client.md` already worked out *why* the box is empty:

> *"The empty text means the message index is absent from `msgstringtable.txt`,
> so the client cannot say what is wrong; that is the whole difficulty."*

That is right, and it was filed as an obstacle. It is a lever. The client is
looking up an error by index and finding nothing there. If every entry in the
table announced its own index, the box would say `[1837]` instead of nothing —
and an index is a thing you can search for, compare against a stock table, and
report.

```
python tools\make-msgtable-debug.py "C:\Games\CleanTest\data\msgstringtable.txt"
```

Rewrites every entry as `[N] original text#` and pads the table to 6000 entries
so an index that used to fall off the end now lands on a labelled line. The
original is saved as `msgstringtable.txt.orig`; `--restore` puts it back.

> `msgstringtable.txt` must exist as a **loose file** in `data\`. If the doctor
> says it is only inside a GRF, extract it there first — a loose file wins over
> the archive.

> This deliberately puts `[numbers]` in front of every menu string. It is a
> diagnostic build. Restore before giving the client to anyone.

**If the box shows a number:** report it. That number identifies the error and
the next move follows from it directly.

**If the box is still completely empty:** we have learned something real — the
message does not come from `msgstringtable.txt` at all. It is a hardcoded string
or a Windows resource, which changes where to look and makes Step 4 the move.

---

## Step 3 — WARP `Disable MessageBoxes`

`UI → MSGBOX CUSTOMIZATIONS → Disable MessageBoxes`. Re-diff, run.

This was rightly resisted while we were blind — suppressing an error you cannot
read is how you turn a startup failure into a mysterious crash later. That
objection is weaker now: ProcMon and Step 1 between them show nothing is
missing, so there is a real chance these are non-fatal warnings the client would
survive.

**If the client reaches the login screen:** the errors were cosmetic. Take it,
and come back to understanding them later — a working client now is worth more
than a complete explanation.

**If it still exits:** the error is fatal, and the cause is below the file
layer. Step 4.

---

## Step 4 — Break on the message box and read the call stack

Definitive, and it does not require knowing anything about Ragnarok. Roughly
thirty minutes with **x32dbg** (32-bit; the client is a 32-bit binary).

1. Open `Ep4RO.exe` in x32dbg
2. In the command bar: `bp MessageBoxA` then `bp MessageBoxW`
3. Run (F9) until it breaks
4. The call stack pane now shows **which function raised the error**, and the
   arguments show the actual text pointer — confirming whether the string really
   is empty or merely fails to render

This answers the question directly instead of inferring it. Everything above is
cheaper, which is why it is not first, but this is what ends the guessing.

---

## Step 5 — If all of that fails: use a known-good folder as the control

We have never done a controlled comparison. The last session tried three whole
packages and changed many things at once between them.

The one useful fact from those attempts: **a working client folder exists** — a
third-party server's client that starts on this machine. That is a control.

Change **one** thing at a time from working toward ours:

1. Start from the folder that works
2. Replace only `data\clientinfo.xml` with ours, pointing at our server
3. Start it. Still opens? Then the problem is in our data, not our config
4. If it connects to our server, **we are done** — ship that, understand it later

**The catch, so it is not a surprise:** if that client is Gepard-protected it
will refuse to talk to a server without Gepard, and its GRFs will show as
encrypted in Step 1. Run the doctor on it first and check the encrypted-entry
count before spending time here.

---

## What we are not doing

- **Not chasing this before Phase 2.** `CLAUDE.md` §3b is explicit: the PC
  client must never block mobile again. That ordering cost a day once.
- **Not touching the server.** Across every attempt the login-server saw zero
  connections from the client — it dies before opening a socket. Nothing here is
  a server problem, and `tools/smoke-play.py` proves the protocol path
  independently on every deploy.
- **Not giving up on it either.** §3b.4 keeps roBrowser's Electron build as the
  fallback that guarantees PC players are never fully blocked, but a real client
  is better and this is a short list of things that have not been tried.
