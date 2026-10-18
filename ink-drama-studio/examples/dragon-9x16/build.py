# run from the episode folder:  python3 build.py   ->  out/<slug>.html
import re,json,base64,os
ENGINE=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','engine')
L=open(os.path.join(ENGINE,'base-template.html'),encoding='utf-8').read().split('\n')
def idx(p,start=0):
    for i in range(start,len(L)):
        if L[i].startswith(p):return i
    raise Exception(p)
sc=idx('<script>');au=idx('const AU=');sa=idx('function stopAll');ju=idx('let LIVE=true');hs=idx('const hitstop');st=idx('/* ---------- STAGE');pb=idx('/* ---------- PLAYBACK');rg=idx('function rng(')
head='\n'.join(L[:sc])
lines=[{'who':l['who'],'text':l['text']} for l in json.load(open('lines.json'))];durs=json.load(open('durs.json'));envs=json.load(open('envs.json'))
END=int(-(-(0)))  # placeholder
head=head.replace('<title>ไอ้หนุ่มพันธุ์ข้าวเหนียว EP7</title>','<title>มังกรซ่อนลาย EP1</title>')
head=re.sub(r'<div class="eyebrow">.*?</div>','<div class="eyebrow">ละครสั้นแนวตั้ง 9:16 · ตอนที่ 1 / 30 · ราว 2 นาที 15 วินาที · พากย์เสียงครบทุกบรรทัด</div>',head,flags=re.S)
head=re.sub(r'<h1>.*?</h1>','<h1>มังกร<span class="p">ซ่อนลาย</span></h1>',head,flags=re.S)
head=re.sub(r'<p class="lede">.*?</p>','<p class="lede">ตอนที่ 1 เค้กวันครบรอบที่ถูกเหยียบย่ำ: กู้เฉินประธานเทียนหงกรุ๊ปที่ซ่อนตัวเป็นเขยคนส่งของ ถือเค้กครบรอบ 3 ปีมาให้หว่านอิน แต่ถูกจ้าวไห่เตะเค้กเหยียบขยี้ แม่ยายปาใบหย่าใส่หน้า หว่านอินฉีกใบหย่าทิ้ง แล้วยอมกอดรับขวดไวน์แทนสามี</p>',head,flags=re.S)
head=head.replace('--pink:#ff7eb6;','--pink:#ff4d5e;')
head=re.sub(r'<h2>บทพูด EP\d · \d+ ช่องพากย์</h2>','<h2>บทพูด · 21 บรรทัด พากย์แล้ว</h2>',head)
head=re.sub(r'<p class="note">.*?</p>','<p class="note">พากย์ครบทุกบรรทัดด้วยเสียง AI ภาษาไทย (Cartesia) ปากตัวละครขยับตามเสียง แตะแถวเพื่อฟังบรรทัดนั้น ปิดเสียงพากย์ได้ที่ปุ่ม เสียงพากย์</p>',head,flags=re.S)
head=head.replace('<button id="sfx" aria-pressed="true">เอฟเฟ็คเสียง</button>','<button id="sfx" aria-pressed="true">เอฟเฟ็คเสียง</button><button id="voice" aria-pressed="true">เสียงพากย์</button>')
head=head.replace('<button id="subs" aria-pressed="false">ซับตัวอย่าง</button>','<button id="subs" aria-pressed="true">ซับไตเติล</button>')
head=re.sub(r'aria-label="การ์ตูนตอนที่ 7[^"]*"','aria-label="การ์ตูน หมูกระทะมื้อสุดท้าย"',head)
consts='''(()=>{
const W=540,H=960,D=Math.PI/180,TAU=Math.PI*2,BAR=58;
const C={bg:'#0d0e14',ink:'#ece8dc'};
const lerp=(a,b,u)=>a+(b-a)*u, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
'''
rng=L[rg]
audio='\n'.join(L[au:sa+1])
audio=audio.replace('function audioInit(){','var audioInit=function(){',1)
# remove ep7 sf definition duplicates if present
juice='\n'.join(L[ju:hs+1])
stage='\n'.join(L[st:st+5])
tail='\n'.join(L[pb:])
main=open('assetsd.js').read()+'\n'+open('episode.js').read().replace('__LINES__',json.dumps(lines,ensure_ascii=False)).replace('__DURS__',json.dumps(durs)).replace('__ENVS__',json.dumps(envs))
V=[base64.b64encode(open(f'enc/l{i:02d}.mp3','rb').read()).decode() for i in range(1,len(lines)+1)]
rend=open(os.path.join(ENGINE,'voice.js')).read().replace('__VOICE__',json.dumps(V))
tail=tail.replace("function pushTrails(){const r=J(Hh,T);","function pushTrails(){return;const r=J(Hh,T);").replace('khao-niao-ep7','dragon-ep1').replace('(82 วินาที)','(ราว 2 นาที)')
tail=tail.replace("q.F===M?'m':q.F===Hh?'h':q.F===RV?'r':'b'","q.F===WHO.WAN||q.F===WHO.GU?'h':q.F===WHO.ZHAO?'r':'m'")
tail=tail.replace("เอาไปใส่เสียงพากย์ต่อได้เลย","พร้อมเสียงพากย์แล้ว")
tail=tail.replace("tog('subs',v=>showSubs=v);","tog('voice',v=>{AU.voiceOn=v;if(AU.vg)AU.vg.gain.value=v?1.25:0});tog('subs',v=>showSubs=v);")
tail=tail.replace("resetTo(1.6);syncUI();","seekEl.max=END;resetTo(0);syncUI();")
assert "seekEl.max=END" in tail and "tog('voice'" in tail
src='\n'.join(['<script>',consts,rng,juice,audio,main,stage,rend,tail])
src=src.replace('rng(seed){','rng(seed){',1)
head=head.replace('.screen{position:relative;width:100%;aspect-ratio:16/9;','.screen{position:relative;width:min(100%,430px);margin-inline:auto;aspect-ratio:9/16;').replace('.screen:fullscreen canvas{width:100%;height:auto;max-height:100%;aspect-ratio:16/9}','.screen:fullscreen canvas{height:100%;width:auto;max-width:100%;aspect-ratio:9/16}')
src=src.replace('1920×1080','1080×1920');out=head+'\n'+src
os.makedirs('out',exist_ok=True);open('out/dragon-ep1.html','w',encoding='utf-8').write(out);print(len(out))
