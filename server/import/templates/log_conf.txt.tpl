// =============================================================================
// GENERATED at container start from the environment — do not edit.
// Source template: server/import/templates/log_conf.txt.tpl
// =============================================================================
// Last import of conf/log_athena.conf, so these win.
//
// CLAUDE.md Phase 1 requires pick, drop, zeny, chat, MVP and trade logging from
// the first day the server runs. That is not a preference — anti-bot work is
// retrospective. On the day you want to ban an account you need the month of
// behaviour behind it, and there is no way to collect that after the fact.
//
// rAthena's shipped defaults get half of this right: enable_logs is already
// 0xFFFFFFFF and sql_logs is on, so item movement is covered. But zeny, chat and
// MVP logging are all OFF by default, which is the half that silently does not
// happen. Every value below is set explicitly, including the ones that match the
// default, so nobody has to diff against upstream to know what we rely on.

// --- item movement: pick, drop, trade, storage, vending, NPC ----------------
// Every bit set. The flags are documented in conf/log_athena.conf; the ones that
// matter for abuse detection are pick/drop (1|2), trade (4), vending (8),
// storage (128|256) and mail (2048).
enable_logs: 0xFFFFFFFF

// 1 = log every item regardless of type or value. The alternative filters exist
// to keep the table small on a busy server; a filtered log is worthless for the
// thing we want it for, because farming bots move cheap, common items.
log_filter: 1

// Into MariaDB, not flat files. Flat files cannot be queried, and the whole
// point is asking questions across weeks.
sql_logs: yes

// --- zeny --------------------------------------------------------------------
// 1 = log any change, no minimum. Upstream default is 0, which is off.
// RMT and gold-selling show up as zeny flow between accounts, so a threshold
// here would hide exactly the pattern worth finding.
log_zeny: 1

// --- chat --------------------------------------------------------------------
// 63 = global + whisper + party + guild + main + clan. Upstream default is 0.
//
// This does record private messages. It is what CLAUDE.md asks for and it is
// how bot advertising and RMT solicitation are actually caught, but it is worth
// knowing it is on rather than discovering it later: anyone with database access
// can read player whispers. Narrow it by dropping bits if that trade stops being
// worth it — 61 keeps everything except whispers.
log_chat: 63

// Keep logging during WoE. The default already does, but WoE is when the
// interesting disputes happen, so it should not be left to a default.
log_chat_woe_disable: no

// --- monsters, commands, scripts --------------------------------------------
// MVP kills. Upstream default is no. picklog covers the drops themselves; this
// records who tapped the MVP, which is the part players argue about.
log_mvpdrop: yes

// Dead branch usage — a classic abuse vector, cheap to record.
log_branch: yes

log_commands: yes
log_npc: yes
log_cash: yes

// Pet and homunculus feeding. 3 = both. Feeding intervals are one of the more
// reliable macro tells, and this is the only place they are visible.
log_feeding: 3
