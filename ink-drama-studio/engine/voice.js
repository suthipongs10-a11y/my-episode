/* ---------- VOICE (Cartesia Sonic, Thai, embedded) ---------- */
const VOICE_SRC=__VOICE__;
const VOICE={buf:[],ready:false,log:[]};window.__VOICE=VOICE;
function b64ab(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer}
const _audioInit=audioInit;
audioInit=function(){const fresh=!AU.ctx,ok=_audioInit();if(ok&&fresh){const X=AU.ctx;
  AU.vg=X.createGain();AU.vg.gain.value=AU.voiceOn===false?0:1.25;AU.vg.connect(AU.out);ambInit();
  Promise.all(VOICE_SRC.map((s,i)=>new Promise(res=>{try{X.decodeAudioData(b64ab(s),b=>{VOICE.buf[i]=b;res()},()=>res())}catch(e){res()}}))).then(()=>{VOICE.ready=true})}
  return ok};
function playVoice(i){if(!LIVE||!AU.ctx||!VOICE.buf[i])return;VOICE.log.push([i+1,+T.toFixed(2)]);const X=AU.ctx,t=X.currentTime+.01,b=VOICE.buf[i],d=b.duration;
  const s=X.createBufferSource();s.buffer=b;s.connect(AU.vg);s.start(t);AU.live.add(s);s.onended=()=>AU.live.delete(s);
  const mb=AU.musicOn?.3:0;AU.mg.gain.cancelScheduledValues(t);AU.mg.gain.setTargetAtTime(mb*.45,t,.06);AU.mg.gain.setTargetAtTime(mb,t+d+.1,.3)}
for(let i=1;i<=NL;i++)ev(Q[i].t0,()=>playVoice(i-1));EV.sort((a,b)=>a.t-b.t);
