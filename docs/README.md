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
| [`client-strategy.md`](client-strategy.md) | why the browser-first plan was dropped, and what replaced it |
| [`client-debug-plan.md`](client-debug-plan.md) | the ordered steps left for making the ragexe start |
| [`phase-3-robrowser.md`](phase-3-robrowser.md) | the PC client we built — how it works, what was and was not verified |
| [`vendor-roplay.md`](vendor-roplay.md) | the eight questions RoPlay must answer before money moves |
| [`eternalro-recon.md`](eternalro-recon.md) | reading EternalRO's own client folder — what it answers, and the boundary |
| [`threat-model.md`](threat-model.md) | staying up when someone wants you down — DDoS, cheating, accounts |
| [`anti-bot.md`](anti-bot.md) | what is possible against bots, what is not, and what it costs |
