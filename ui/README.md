# ui — mobile overlay (Phase 5)

Empty until Phase 5. Our own UI layer, talking to roBrowser over an event bus.

**Never fork roBrowser's own UI components** (CLAUDE.md §6 Phase 5). Use its
plugin system, or we fight merge conflicts forever.

Scope: virtual joystick, hotkey bar, skill buttons, inventory, quest tracker,
and touch → engine input mapping. Gate is a real Android device and a real iOS
device. The mobile gotchas in CLAUDE.md §7 are known in advance — read them
before writing anything here rather than rediscovering them.
