# docs

Per-phase audit reports. CLAUDE.md §6: no phase starts before the previous
phase's gate passes and its audit is written here.

Each report states what was built, what was tested, what failed, what is
deferred, and what the next phase now assumes.

| Report | Phase | Status |
|---|---|---|
| [`phase-0-audit.md`](phase-0-audit.md) | 0 — Foundation | gate PASSED |
| [`phase-1-audit.md`](phase-1-audit.md) | 1 — rAthena baseline | gate PARTIAL — server proven, PC client outstanding |

Also here:

| Document | |
|---|---|
| [`vps-setup.md`](vps-setup.md) | connecting the repository to a VPS, and moving to a new one |
| [`remote-ops.md`](remote-ops.md) | operating the VPS from GitHub Actions — no terminal needed |
| [`phase-1-client.md`](phase-1-client.md) | the PC client the Phase 1 gate needs, and how to diagnose it |
| [`threat-model.md`](threat-model.md) | staying up when someone wants you down — DDoS, cheating, accounts |
| [`anti-bot.md`](anti-bot.md) | what is possible against bots, what is not, and what it costs |
