# test-rice-cooker — status

| step | state |
|---|---|
| 1 script analysed, `lines.json` (10 lines, 293 TTS chars) | done 2026-10-18 |
| 2 voices (`gen.py`, `envs.py`) | done 2026-10-18 — 10 lines, 293 chars bought via the network secret; 22.9 s of speech (`durs.json`), envelopes in `envs.json`. Re-buy one line with `gen.py <n>`. |
| 3 art pack (5 prompts) | sent to the owner 2026-10-18 — `python3 mkpack.py` rebuilds the zip |
| 4 owner makes images → `raw/out-rc-0{1..5}-*.png` | done 2026-10-18 — all 5, clean #00FF00, no glow |
| 5 build from `examples/beer-16x9` | done 2026-10-18 — 42 s. `python3 cut.py && python3 heads.py && python3 mouth.py && python3 assets.py && python3 build.py` |
| 6 verify | sweep 0–42 s: no errors · voice_test: 10/10 clips decoded, fire on time · screenshots read |
| 7 published | https://claude.ai/artifact/WYhK5ko6YpwnQhxr1mna8K (private, downloads capability) |

Shot plan, so the build does not have to re-derive it: one wide kitchen set,
camera pans. A runs in from the left door; MOM at the stove on the right,
facing right (her back to A) until line 5, then flipped to face him. Dream
insert in a cloud frame over lines 4–5 (A in sunglasses on the money pile,
new cookers floating, "3,000,000" drawn in code) and popped on MOM's line 5.
The old cooker sits on the table as a prop until MOM lifts it (pose 4).
Silence beat before line 10 (A looks at the cooker, then at MOM; close-up on
the head crop). Ending: MOM raises the ladle (pose 6), A runs out of the left
door (pose 1 flipped), end card. Target about 40 s.
