# refs/ — style references for the art pack

Every art-pack prompt says "same style as the attached references". These are
those references: finished ChatGPT sheets from earlier episodes, added by the
owner on 2026-10-18 (`ink-style-refs.zip`). They already carry the names the
prompts attach them by, so a pack's builder just copies them:
`refs={k:'../../refs/'+k for k in [...]}`.

| file | what it shows | use it for |
|---|---|---|
| `ref-dg-00-style-cast.png` | cast of four, navy background | 01 model sheet |
| `ref-dg-01-style-cast2.png` | second cast sheet | 01 model sheet |
| `ref-dg-09-style-cast-dragon.png` | the มังกรซ่อนลาย cast | 01 model sheet, formal clothes |
| `ref-dg-02-style-poses.png` | 3×3 full-body pose sheet (has soft glows — ask for none) | pose sheets |
| `ref-dg-03-style-poses-sitting.png` | pose sheet with sitting poses | pose sheets with sitting |
| `ref-dg-04-style-faces.png` | face close-up sheet | face sheets |
| `ref-dg-05-style-props.png` | prop sheet | props |
| `ref-dg-06-style-props2.png` | gag-prop sheet | props |
| `ref-dg-07-style-bg.png` | background, day, 16:9 | 16:9 sets |
| `ref-dg-08-style-bg-night.png` | background, night, 2:1 | night sets, wide pans |
| `ref-dg-10-style-bg-vertical.png` | background, 9:16 | vertical episodes |

Every episode's `raw/` is committed too, so a new pack can also attach
`../<earlier-slug>/raw/out-*.png` directly.

Images only — no text, numbers or logos in them, same as every sheet.
