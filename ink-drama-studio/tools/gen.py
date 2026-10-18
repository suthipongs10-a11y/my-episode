# run from episodes/<slug>/:  python3 ../../tools/gen.py [n ...]   (n = force-regenerate those lines)
import json,sys,urllib.request,os,subprocess
K=os.environ.get('CARTESIA_API_KEY') or sys.exit('CARTESIA_API_KEY is not set: export it locally, or add it to the cloud environment settings (never into a file)')
V=json.load(open('voices.json'))  # {"WHO":"cartesia-voice-id"}
L=json.load(open('lines.json'));only=[int(a) for a in sys.argv[1:] if a.isdigit()]
from concurrent.futures import ThreadPoolExecutor
os.makedirs('vo',exist_ok=True)
def go(it):
  out=f"vo/l{it['n']:02d}.wav"
  # enc/*.mp3 is committed and vo/ is not: a fresh checkout must not buy the same line twice
  if (os.path.exists(out) or os.path.exists(f"enc/l{it['n']:02d}.mp3")) and it['n'] not in only: return
  body={"model_id":"sonic-3.6","transcript":it.get('tts',it['text']),"voice":{"mode":"id","id":V[it['who']]},"language":"th",
   "output_format":{"container":"wav","encoding":"pcm_s16le","sample_rate":44100},"generation_config":{"speed":it.get('speed',1.0),"volume":it.get('vol',1.0)}}
  r=urllib.request.Request("https://api.cartesia.ai/tts/bytes",data=json.dumps(body).encode(),method='POST',headers={"X-API-Key":K,"Cartesia-Version":"2025-04-16","Content-Type":"application/json"})
  try:
    b=urllib.request.urlopen(r,timeout=90).read();open(out,"wb").write(b)
  except urllib.error.HTTPError as e: print(it['n'],'ERR',e.code,e.read()[:200])
with ThreadPoolExecutor(2) as ex: list(ex.map(go,L))
os.makedirs('enc',exist_ok=True);D=[]
for it in L:
  i=it['n']
  if os.path.exists(f'vo/l{i:02d}.wav'):subprocess.run(['ffmpeg','-y','-v','error','-i',f'vo/l{i:02d}.wav','-af','silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5','-ac','1','-ar','44100','-b:a','80k',f'enc/l{i:02d}.mp3'])
  d=float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f'enc/l{i:02d}.mp3'],capture_output=True,text=True).stdout);D.append(round(d,3))
json.dump(D,open('durs.json','w'));print(D,sum(D),sum(len(x.get('tts',x['text'])) for x in L))
