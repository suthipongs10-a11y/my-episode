#!/usr/bin/env bash
# Run ON THE VOICE POD, in the folder the /job zip was extracted into.
# Lays the six measured lines onto one 44s track at the exact starts in beats.json,
# so the edit only has to place ONE file at 0:00 instead of aligning six by hand.
set -e
cd $(find /tmp/voice_out -name timing.json -printf "%h\n") && ffmpeg -y -i s01_hook.wav -i s02_origin.wav -i s03_accident.wav -i s04_selection.wav -i s05_crown.wav -i s06_twist.wav -filter_complex "[0:a]adelay=500|500[a0];[1:a]adelay=4540|4540[a1];[2:a]adelay=11300|11300[a2];[3:a]adelay=20580|20580[a3];[4:a]adelay=30540|30540[a4];[5:a]adelay=37300|37300[a5];[a0][a1][a2][a3][a4][a5]amix=inputs=6:normalize=0:dropout_transition=0[out]" -map "[out]" -t 44 -ar 48000 -ac 1 voice.wav
echo "-> voice.wav (44s) ready"
