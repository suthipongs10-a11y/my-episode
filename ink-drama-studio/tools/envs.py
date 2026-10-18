import subprocess,numpy as np,json
E=[]
for i in range(1,len(json.load(open('lines.json')))+1):
  raw=subprocess.run(['ffmpeg','-v','error','-i',f'enc/l{i:02d}.mp3','-ac','1','-ar','8000','-f','s16le','-'],capture_output=True).stdout
  a=np.frombuffer(raw,dtype=np.int16).astype(np.float32)/32768;hop=320  # 40ms
  r=np.array([np.sqrt(np.mean(a[j:j+hop]**2)) for j in range(0,len(a),hop)])
  m=np.percentile(r,95) or 1;q=np.clip(r/m,0,1)
  E.append(''.join(str(int(round(v*9))) for v in q))
json.dump(E,open('envs.json','w'));print(len(E),E[0][:60])
