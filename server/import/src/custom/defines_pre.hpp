// =============================================================================
// defines_pre.hpp — our compile-time overrides
// =============================================================================
#ifndef CONFIG_CUSTOM_DEFINES_PRE_HPP
#define CONFIG_CUSTOM_DEFINES_PRE_HPP
// Guard name kept identical to the stub this replaces: src/config/core.hpp
// includes <custom/defines_pre.hpp>, and upstream's own copy guards under this
// symbol. Diverging would mean the file could be included twice.
// =============================================================================
// rAthena ships src/custom/ for exactly this, so this is not a patch to
// upstream and does not affect our ability to pull upstream fixes
// (CLAUDE.md §2.6). infra/rathena/Dockerfile copies this in before ./configure.
//
// Only one thing lives here, and it is load-bearing for the PC client.
// =============================================================================

// --- packet obfuscation: off -------------------------------------------------
//
// From 2011 to 2018-03 official clients scrambled every packet id with a
// rolling key, and rAthena carries the per-version key table in
// src/map/clif_obfuscation.hpp. At our PACKETVER that table would select:
//
//     #elif PACKETVER == 20180307   // 2018-03-07bRagexeRE
//         packet_keys(0x47DA10EB,0x4B922CCF,0x765C5055);
//
// Our PC client is roBrowser (CLAUDE.md §3b), and roBrowser does not implement
// obfuscation at all — its per-server `packetKeys` flag only chooses between
// "off" and a scheme it does not have keys for. With the table above active,
// every id the client sends arrives scrambled and rAthena parses garbage.
//
// Setting all three keys to zero makes the transform the identity function:
// clif.cpp computes `cmd ^ (((k0 * k1 + k2) >> 16) & 0x7FFF)`, and with zeros
// that is `cmd ^ 0`. The rolling update `k0 = k0 * k1 + k2` also stays zero, so
// it is the identity for every packet, not just the first.
//
// This is the supported mechanism, not a trick: clif_obfuscation.hpp checks for
// these three macros before it consults its own table, and errors out if only
// some of them are defined.
//
// THE COST, STATED PLAINLY: obfuscation is a small speed bump against packet
// editors, and we are removing it. It was never a real defence — CLAUDE.md §8
// is explicit that the client cannot be trusted and every limit is enforced
// server-side. Any client that can be told the keys can also be told to ignore
// them. But it is a bump, and this removes it deliberately rather than by
// accident, which is the only part that matters.
//
// Note that a PACKETVER above 20180307 would zero these anyway — rAthena's own
// table does it, because official clients stopped obfuscating. We cannot use
// such a version: tools/check-client-protocol.mjs measured that roBrowser's
// newest packet-shuffle table is 20180307, and above it the client's map-enter
// and movement packets reach no handler at all.
#define PACKET_OBFUSCATION_KEY1 0x00000000
#define PACKET_OBFUSCATION_KEY2 0x00000000
#define PACKET_OBFUSCATION_KEY3 0x00000000

#endif /* CONFIG_CUSTOM_DEFINES_PRE_HPP */
