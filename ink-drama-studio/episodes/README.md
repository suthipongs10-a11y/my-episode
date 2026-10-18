# episodes/ — one folder per episode

Every command runs **from inside the episode folder**; the shared code is two
levels up.

```
episodes/<slug>/
  script.md            the owner's script, verbatim
  lines.json           [{n, who, text, tts?, speed, vol}]
  voices.json          {"WHO": "cartesia-voice-id"}       from ../../voices.example.json
  enc/lNN.mp3          trimmed, loudnormed voice lines     committed — paid for
  durs.json envs.json  line lengths and 40 ms lip-sync envelopes
  README-src.md        Thai README template for the art pack (from ../../artpack/)
  mkpack.py            this episode's prompts               (from ../../artpack/mkpack_example.py)
  raw/                 the owner's ChatGPT images          committed — hand work
  crops.json heads.json mouths.json                         committed — mouths are hand-fixed
  episode.js build.py  copied from the closest ../../examples/*
  vo/ crops/ check/ out/ assets*.js                         gitignored, rebuilt
```

```bash
cd ink-drama-studio/episodes/<slug>
python3 ../../tools/gen.py           # voices -> vo/, enc/, durs.json  (spends credits)
python3 ../../tools/envs.py          # -> envs.json
python3 mkpack.py                    # -> out/artpack/*.zip for the owner
# ...owner's images arrive in raw/...
python3 ../../tools/grid.py          # or a copy of extract.py, tuned per sheet
python3 ../../tools/heads.py && python3 ../../tools/mouth.py   # look at check/*.png
python3 ../../tools/assets.py        # -> assets*.js
python3 build.py                     # -> out/<slug>.html
python3 ../../tests/screenshot.py out/<slug>.html 0,10,20 check/shot
python3 ../../tests/sweep.py out/<slug>.html
python3 ../../tests/voice_test.py out/<slug>.html
```

`grid.py`, `extract.py`'s `__main__`, `assets.py` and both `build.py`s carry
the names and pixel bounds of the episode they were written for. Copy the one
you need into the episode folder and edit the copy; leave the shared ones as
the reference.
