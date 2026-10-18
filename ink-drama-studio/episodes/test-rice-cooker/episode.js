/* ================= หม้อหุงข้าวแห่งความฝัน (ตอนทดสอบระบบ 16:9) ================= */
const IMG={};function loadAssets(){return Promise.all(Object.keys(ASSET_SRC).map(k=>new Promise(res=>{const im=new Image();im.onload=res;im.onerror=res;im.src=ASSET_SRC[k];IMG[k]=im})))}
const ok=k=>IMG[k]&&IMG[k].complete&&IMG[k].naturalWidth>0;
function sprO(c,key,x,y,K,axF,ayF,rot=0,flip=false,alpha=1){if(!ok(key))return;const m=META[key],w=(m.ow||m.w)*K,h=(m.oh||m.h)*K;
  c.save();c.globalAlpha*=alpha;c.translate(x,y);c.rotate(rot);if(flip)c.scale(-1,1);c.drawImage(IMG[key],-w*axF,-h*ayF,w,h);c.restore()}
const Hh={trail:[]};let effects=[],seedCounter=1,NOW=0,CAM=null;
const CR='#efe6d2',INK0='#0b0b10',FY=432;
const ease=u=>u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2,eo=u=>1-Math.pow(1-u,3),sat=u=>clamp(u,0,1);
const win=(T,a,b,f=.25)=>clamp(Math.min((T-a)/f,(b-T)/f),0,1);
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function label(c,txt,x,y,size=16,col=CR,align='center'){c.font=`600 ${size}px Kanit, sans-serif`;c.textAlign=align;c.textBaseline='middle';c.lineJoin='round';c.lineWidth=Math.max(4,size/5);c.strokeStyle=INK0;c.strokeText(txt,x,y);c.fillStyle=col;c.fillText(txt,x,y)}
function tag(c,txt,x,y,col='#ffd25a',size=16){c.font=`600 ${size}px Kanit, sans-serif`;const w=c.measureText(txt).width+24;c.fillStyle='rgba(8,10,20,.82)';rr(c,x,y,w,size+16,6);c.fill();c.strokeStyle=col;c.lineWidth=2;c.stroke();label(c,txt,x+w/2,y+(size+16)/2,size,col)}
function rays(c,x,y,T,col,r=520){c.save();c.globalCompositeOperation='lighter';c.translate(x,y);c.rotate(T*.4);for(let i=0;i<14;i++){c.rotate(TAU/14);c.fillStyle=col;c.beginPath();c.moveTo(0,0);c.lineTo(r,-34);c.lineTo(r,34);c.closePath();c.fill()}c.restore()}
function sparkleAt(c,x,y,T,n=8,col='#fff6c0'){c.save();c.globalCompositeOperation='lighter';for(let i=0;i<n;i++){const a=i*2.4+T*.6,r=50+((i*37)%70),px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.7,s2=4+3*Math.sin(T*6+i);c.fillStyle=col;c.beginPath();c.moveTo(px,py-s2*2);c.lineTo(px+s2*.5,py);c.lineTo(px,py+s2*2);c.lineTo(px-s2*.5,py);c.closePath();c.fill();c.beginPath();c.moveTo(px-s2*2,py);c.lineTo(px,py+s2*.5);c.lineTo(px+s2*2,py);c.lineTo(px,py-s2*.5);c.closePath();c.fill()}c.restore()}
function cloud(c,x,y,w,h,a=1){c.save();c.globalAlpha*=a;c.fillStyle='#fffdf4';c.strokeStyle=INK0;c.lineWidth=3;
  const n=9;c.beginPath();for(let i=0;i<n;i++){const t=i/n*TAU;c.moveTo(x+Math.cos(t)*w*.42+w*.16,y+Math.sin(t)*h*.36);c.arc(x+Math.cos(t)*w*.42,y+Math.sin(t)*h*.36,h*.24,0,TAU)}c.fill();
  c.beginPath();c.ellipse(x,y,w*.46,h*.4,0,0,TAU);c.fill();c.restore()}

/* ---------- script + timeline ---------- */
const LINES=__LINES__;const DUR=__DURS__;const ENV=__ENVS__;const NL=LINES.length;
// pause before each line: dream holds before 5, walk to the table before 7, the silence before 10
const PRE=[0,0,.5,.5,.25,2.6,.6,1.3,.4,.7,2.8];
const T0=3.8;const Q=[null];{let t=T0;for(let i=1;i<=NL;i++){if(i>1)t+=PRE[i];const d=Math.max(DUR[i-1],.5);Q.push({t0:t,t1:t+d});t+=d}}
const q0=n=>Q[n].t0,q1=n=>Q[n].t1;
const E0=q1(NL),T_RUN=E0+.9,T_CARD=E0+3.0,END=Math.ceil(E0+5.6);
function talkEnv(id,T){for(let i=1;i<=NL;i++){const q=Q[i];if(LINES[i-1].who===id&&T>=q.t0&&T<=q.t1){const s=ENV[i-1],k=Math.floor((T-q.t0)/.04);const a=+(s[k]||0)/9,b=+(s[k+1]||0)/9,f=(T-q.t0)/.04-k;return lerp(a,b,f)}}return -1}
const curLine=T=>{for(let i=1;i<=NL;i++)if(T>=Q[i].t0&&T<=Q[i].t1)return i;return 0};
const A={id:'A',name:'เอ',color:'#ffb35c'},MOM={id:'MOM',name:'แม่',color:'#ff8fa8'};const WHO={A,MOM};
const WHAT=['เอวิ่งเข้าครัว','แม่คนแกงไม่หันมา','ชูมือถือ','กางแขนฝัน → ในจินตนาการ','แม่หันมา หน้านิ่ง','เกาหัว เหงื่อตก','แม่ยกหม้อเก่าให้','กระโดดดีใจ','แม่เลิกคิ้ว','มองหม้อ มองแม่ แล้วขอเงิน'];
const CUES=LINES.map((l,i)=>({F:WHO[l.who],t0:+Q[i+1].t0.toFixed(1),t1:+Q[i+1].t1.toFixed(1),line:l.text,what:WHAT[i]||''}));
const cueName=q=>q.F.name;
const CHAPTERS=[['ครัวตอนเย็น',0],['วิธีรวย',q0(1)],['เดือนละสามล้าน',q0(4)],['เอามาจากไหน',q0(5)],['ใบแรก',q0(7)],['หุงข้าวด้วยอะไร',q0(9)],['วิ่งหนี',E0]].map(([n,t])=>[n,+t.toFixed(1)]);
const fmt=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const SCENES=[[`0:00–${fmt(q1(4))}`,'ครัวบ้านไม้ ตอนเย็น','แม่คนแกงอยู่หน้าเตา เอวิ่งเข้ามาประกาศจะเลิกงานเพราะเจอวิธีรวย: ขายหม้อหุงข้าวออนไลน์','ประตูกระแทก ฝีเท้า แกงเดือด'],
 [`${fmt(q1(4))}–${fmt(q0(5))}`,'ในจินตนาการ','เอใส่แว่นดำนั่งบนกองเงิน หม้อหุงข้าวลอยรอบตัว ตัวเลข 3,000,000 เด้งขึ้นจอ','คอรัสสวรรค์ ติ๊ง ป๊อก'],
 [`${fmt(q0(5))}–${fmt(END)}`,'แล้วหุงข้าวด้วยอะไร','แม่ถามหม้อร้อยใบเอามาจากไหน เอเกาหัว แม่ยกหม้อเก่าให้เป็นทุน เอดีใจ แม่ถามคืนนี้หุงข้าวด้วยอะไร เอเงียบ แล้วขอยืมเงินซื้อข้าวกล่อง แม่เงื้อทัพพี เอวิ่งหนี','จิ้งหรีด ฟิ้ว ฝีเท้าวิ่ง']];

/* ---------- characters (sprites + lip-sync) ---------- */
const SK={a:.72,m:.46};
function chr(c,key,x,y,flip,id,T,o={}){const K=SK[key[0]]*(o.sc||1),m=META[key];if(!m)return;const tk=id?talkEnv(id,T):-1;const by=tk>0?tk*2.5:0;
  sprO(c,key,x,y-by,K,.5,1,o.rot||0,flip,o.a??1);const mo=m.mouth;if(!mo)return;const f=flip?-1:1;
  const mx=x+(mo[0]-m.ow*.5)*K*f,my=y-by+(mo[1]-m.oh)*K,R=mo[2]*K;
  if(o.sweat){c.save();const q=(T*1.6)%1;c.fillStyle='rgba(124,200,255,.9)';c.beginPath();c.ellipse(mx-R*1.1*f,my-R*1.3+q*10,3,5,0,0,TAU);c.fill();c.restore()}
  if(tk>.06&&!o.noMouth){c.save();c.fillStyle='#0b0b10';c.beginPath();c.ellipse(mx,my,R*.3,R*.2,0,0,TAU);c.fill();c.restore();
    c.save();c.fillStyle='#1a0a0a';c.strokeStyle=CR;c.lineWidth=Math.max(1.5,R*.06);c.beginPath();c.ellipse(mx,my,R*(.12+.07*tk),R*(.04+.17*tk),0,0,TAU);c.fill();c.stroke();
    if(tk>.35){c.fillStyle='#ff7a8a';c.beginPath();c.ellipse(mx,my+R*.09*tk,R*.08,R*.05*tk+1,0,0,Math.PI);c.fill()}c.restore()}}
const at=(T,n)=>T>=q0(n);
const AX=230,AY=428,MY=392,M_STOVE=735,M_TABLE=560;
function aState(T){let k='a1',x=AX,flip=false,y=AY,sweat=false;
  if(T<T0-1.5)x=-160;else if(T<T0-.25){k='a0';x=lerp(-160,AX,sat((T-T0+1.5)/1.25));y=AY-Math.abs(Math.sin(T*15))*7}
  if(at(T,3))k='a2';if(at(T,4))k='a3';if(at(T,6))k='a5';
  if(at(T,8)){k='a6';const u=T-q0(8);if(u<1.1)y=AY-Math.abs(Math.sin(u*Math.PI*1.8))*34}
  if(T>=q1(8)+.3)k='a1';if(T>=q1(9)+.2)k='a7';if(at(T,10))k='a8';
  if(T>=T_RUN){k='a0';flip=true;sweat=true;const u=T-T_RUN;x=AX-u*420;y=AY-Math.abs(Math.sin(u*16))*7}
  return {k,x,y,flip,sweat}}
function mState(T){let k='m2',x=M_STOVE,flip=false,rot=Math.sin(T*5)*.025;
  if(at(T,5)){k='m1';flip=true;rot=0}
  const w0=q1(6)+.1,w1=q0(7)-.35;if(T>=w0){x=lerp(M_STOVE,M_TABLE,ease(sat((T-w0)/(w1-w0))));if(T<w1)rot=Math.sin(T*14)*.03}
  if(T>=w1)k='m3';if(at(T,9))k='m4';
  if(T>=E0+.35){k='m5';if(T>=T_RUN+.2)x=M_TABLE-(T-T_RUN-.2)*260}
  return {k,x,y:MY,flip,rot}}
const cookerOnTable=T=>T<q0(7)-.35||T>=E0+.35;

/* ---------- the kitchen (bg 1774×887 at s=.64) ---------- */
const sK=.64,oyK=-16,KW=1774*sK,POT={x:806,y:262};
function bgDraw(c,key,s,oy){if(!ok(key))return;const im=IMG[key];c.drawImage(im,0,oy,im.naturalWidth*s,im.naturalHeight*s)}
function kitchen(c,T){c.fillStyle='#0e1126';c.fillRect(-400,-100,2400,800);bgDraw(c,'bg.kitchen',sK,oyK);
  // the bulb breathes a little
  c.save();c.globalCompositeOperation='lighter';const g=c.createRadialGradient(456,64,4,456,64,170);g.addColorStop(0,`rgba(255,200,110,${.2+.03*Math.sin(T*6)})`);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(280,-60,360,320);c.restore();
  if(cookerOnTable(T))sprO(c,'p.cooker',430,281,.22,.5,1);
  const ms=mState(T),as=aState(T);
  chr(c,ms.k,ms.x,ms.y,ms.flip,'MOM',T,{rot:ms.rot});
  // the pot goes over the ladle so it reads as stirring
  sprO(c,'p.pot',POT.x,POT.y,.2,.5,1);
  for(let i=0;i<4;i++){const q=(T*.45+i/4)%1;c.save();c.globalAlpha=.32*(1-q)*sat(q*4);c.strokeStyle='#f5ecd8';c.lineWidth=5;c.lineCap='round';c.beginPath();const sx=POT.x-20+i*13;c.moveTo(sx,POT.y-44);c.bezierCurveTo(sx+10,POT.y-60-q*30,sx-10,POT.y-80-q*40,sx+6*Math.sin(T+i),POT.y-100-q*60);c.stroke();c.restore()}
  chr(c,as.k,as.x,as.y,as.flip,'A',T,{sweat:as.sweat});
  if(T>=T_RUN){for(let i=0;i<5;i++){const u=(T-T_RUN)*2.4-i*.18;if(u<0||u>1)continue;const px=AX-((T-T_RUN)-i*.12)*420+30;c.save();c.globalAlpha=.5*(1-u);c.fillStyle='#d8c8a8';c.beginPath();c.arc(px+u*30,AY-6-u*14,8+u*14,0,TAU);c.fill();c.restore()}}
}
/* ---------- the dream ---------- */
const D0=()=>q0(4)+DUR[3]*.35,D1=()=>q0(5)-.05;
function dream(c,T){const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#3a2160');g.addColorStop(1,'#a8661e');c.fillStyle=g;c.fillRect(0,0,W,H);
  rays(c,W/2,330,T,'rgba(255,220,120,.07)');
  const bob=Math.sin(T*3)*4;
  [[150,150,'p.new1',.34,0],[640,120,'p.new2',.28,1.3],[140,380,'p.new3',.3,2.1],[640,390,'p.new1',.26,3.2]].forEach(([x,y,k,s,ph])=>sprO(c,k,x+Math.cos(T*1.2+ph)*14,y+Math.sin(T*1.7+ph)*12,s,.5,.5,Math.sin(T+ph)*.25));
  sprO(c,'p.money',400,482+bob,.62,.5,1);
  chr(c,'a4',392,318+bob,false,'A',T,{noMouth:true});
  sparkleAt(c,400,240,T,10);
  const rows=[[.45,'1,000 ฿ × 100 ใบ','#fff3c8'],[.72,'× 30 วัน','#fff3c8']];const L4=q0(4),d4=DUR[3];
  rows.forEach(([f,txt,col],i)=>{const t=L4+d4*f;if(T>=t){c.save();c.globalAlpha=sat((T-t)/.2);label(c,txt,W-200,150+i*40,24,col);c.restore()}});
  const tb=q1(4)-.15;if(T>=tb){const u=T-tb,s=1+.5*Math.max(0,1-u*4)*Math.abs(Math.sin(u*18));c.save();c.translate(W-205,262);c.scale(s,s);c.fillStyle='rgba(255,60,60,.28)';rr(c,-170,-38,340,76,16);c.fill();label(c,'3,000,000 ฿',0,0,48,'#ffe066');c.restore()}}

/* ---------- shots ---------- */
const WIDE={sc:'k',k:1.12,cx:520};
// medium shots frame the body (cy), so heads stay inside the bars
const ON_A=(k=1.55)=>({sc:'k',k,cx:AX+70,cy:AY-125}),ON_M=(T,k=1.5)=>({sc:'k',k,cx:mState(T).x-40,cy:MY-120});
function shotAt(T){
  if(T<T0-1.6)return {sc:'k',k:lerp(1.0,1.12,ease(sat(T/2.2))),cx:568};
  if(T>=D0()&&T<D1())return {sc:'dream'};
  const ln=curLine(T)||curLine(T-.35)||curLine(T+.35);
  if(T>=T_RUN-.5)return {sc:'k',k:1.12,cx:lerp(470,330,sat((T-T_RUN)/1.5))};
  if(T>=q1(9)+.2&&T<q0(10)){if(T<q1(9)+1.4)return {sc:'k',k:1.35,cx:(AX+M_TABLE)/2};return {sc:'k',k:2.7,cx:AX+30,cy:AY-190}}
  if(T>=q1(6)+.1&&T<q0(7))return WIDE;
  if(ln===1||ln===7)return WIDE;
  if(ln===2||ln===5||ln===9)return ON_M(T);
  if(ln===4)return {sc:'k',k:lerp(1.55,1.85,ease(sat((T-q0(4))/(D0()-q0(4))))),cx:AX+60,cy:AY-130};
  if(ln===3||ln===6||ln===10)return ON_A(1.55);
  if(ln===8)return ON_A(1.35);
  return WIDE}
function camT(sh){const hw=W/2/sh.k;let cx=clamp(sh.cx,hw,KW-hw);
  if(sh.cy===undefined)return {cx,ax:W/2,ay:FY,wy:FY,k:sh.k};const hh=H/2/sh.k;return {cx,ax:W/2,ay:H/2,wy:clamp(sh.cy,hh-16,552-hh),k:sh.k}}
function drawScene(c,sh,T){if(sh.sc==='dream'){dream(c,T);return}const m=camT(sh);c.save();c.translate(m.ax,m.ay);c.scale(m.k,m.k);c.translate(-m.cx,-m.wy);kitchen(c,T);c.restore()}
const CUTS=[D0(),D1()];

/* ---------- sound ---------- */
Object.assign(SF,{
  pop(){const t=tnow();osc('sine',900,300,t,.06,.5,AU.sg);noise(t,.05,.5,AU.sg,{type:'highpass',f0:2500})},
  bang(){const t=tnow();osc('sine',120,40,t,.3,.8,AU.sg);noise(t,.15,.6,AU.sg,{type:'lowpass',f0:900,rev:.3})},
  steps(n=6,gap=.11){const t=tnow();for(let i=0;i<n;i++)noise(t+i*gap,.05,.35,AU.sg,{type:'bandpass',f0:500+Math.random()*200,q:1.4})},
  ding(){const t=tnow();osc('sine',1568,1568,t,.5,.16,AU.sg,{rev:.4});osc('sine',2093,2093,t+.08,.5,.12,AU.sg)},
  chime(){const t=tnow();[1046,1318,1568,2093,2637].forEach((f,i)=>osc('sine',f,f*1.003,t+i*.05,1.6,.06,AU.sg,{rev:.8}))},
  sparkle(){const t=tnow();[1318,1760,2093,2637,3136].forEach((f,i)=>osc('sine',f,f,t+i*.06,1,.1,AU.sg,{rev:.7}))},
  cash(){const t=tnow();osc('square',2093,2093,t,.08,.12,AU.sg,{filter:'bandpass',ff:3000,q:2});osc('sine',2637,2637,t+.07,.6,.18,AU.sg,{rev:.5});noise(t,.12,.3,AU.sg,{type:'highpass',f0:4000})},
  sad(){const t=tnow();[392,370,349,294].forEach((f,i)=>osc('triangle',f,f*(i===3?.94:1),t+i*.3,i===3?.9:.28,.12,AU.sg,{a:.02}))},
  boing(){const t=tnow();osc('sine',180,620,t,.4,.3,AU.sg,{slide:.12})},
  whoosh(d=.35){const t=tnow();noise(t,d,.35,AU.sg,{type:'bandpass',f0:300,f1:2400,q:1.2,a:d*.4})},
  cricket(){const t=tnow();for(let k=0;k<2;k++)for(let i=0;i<4;i++)osc('sine',4300,4300,t+k*.5+i*.05,.035,.05,AU.sg)},
  rage(){const t=tnow();osc('sawtooth',90,60,t,.5,.25,AU.sg,{filter:'lowpass',ff:500});noise(t,.4,.3,AU.sg,{type:'lowpass',f0:600})},
  thud(){const t=tnow();osc('sine',160,60,t,.18,.5,AU.sg)},
});
const AMB={};
function ambInit(){const X=AU.ctx;const mk=(type,f,q)=>{const s=X.createBufferSource();s.buffer=AU.noise;s.loop=true;const fl=X.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=X.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(AU.sg);s.start();return g};
  AMB.simmer=mk('bandpass',900,.8);AMB.ok=true}
let crickAt=0,bubAt=0;
function ambUpdate(T){if(!AMB.ok||!AU.ctx)return;const t=AU.ctx.currentTime,on=playing&&AU.sfxOn?1:0,k=shotAt(T).sc==='k'?1:0,quiet=T>=q1(9)+.2&&T<q0(10);
  AMB.simmer.gain.setTargetAtTime(.035*k*on,t,.3);
  if(on&&k&&realNow>bubAt){bubAt=realNow+.25+Math.random()*.5;osc('sine',300+Math.random()*300,700,AU.ctx.currentTime,.06,.04,AU.sg)}
  if(on&&quiet&&realNow>crickAt){crickAt=realNow+.7;sf('cricket')}}
/* music */
const MUSX=[[0,'chill',84],[q0(3),'comic',112],[D0(),'holy',72],[D1(),'none'],[q0(5)+.3,'chill',84],[q0(8),'comic',120],[q1(8)+.3,'chill',84],[q1(9)+.2,'none'],[E0+.3,'panic',150],[T_CARD+.4,'none']];
const secAtX=T=>{let r=MUSX[0];for(const m of MUSX)if(m[0]<=T)r=m;return r};
let mNext=0,mIdx=0;function musicReset(T){mNext=T;mIdx=0}
const NT=m=>440*Math.pow(2,(m-69)/12);
function piano(m,t,v,d=1.6){const f=NT(m);osc('triangle',f,f,t,d,v,AU.mg,{a:.004,rev:.35});osc('sine',f*2,f*2,t,d*.5,v*.25,AU.mg,{a:.003})}
function pizz(m,t,v){const f=NT(m);osc('triangle',f,f,t,.18,v,AU.mg,{a:.002});osc('sine',f*2,f*2,t,.08,v*.3,AU.mg)}
function bass(m,t,v,d=.25){const f=NT(m);osc('sawtooth',f,f,t,d,v,AU.mg,{a:.005,filter:'lowpass',ff:420});osc('sine',f,f,t,d,v*.8,AU.mg)}
function pad(ms,t,d,v){ms.forEach((m,i)=>{const f=NT(m);osc('sawtooth',f,f*1.002,t,d,v,AU.mg,{a:.5,sus:true,r:.6,filter:'lowpass',ff:1400,detune:(i-1)*7,rev:.6})})}
function playStepX(name,i,t,sd){const R=rng(i*977+31);
  if(name==='chill'){const ch=[[57,60,64],[53,57,60],[55,59,62],[52,55,59]][(i>>3)%4];if(i%2===0)pizz(ch[(i>>1)%3]+12,t,.08);if(i%8===0)bass(ch[0]-12,t,.12,.6);if(i%4===2)noise(t,.03,.04,AU.mg,{type:'highpass',f0:6000})}
  else if(name==='holy'){if(i%8===0)pad(i%16===0?[60,64,67,72]:[65,69,72,77],t,sd*8+.4,.035);if(i%2===0)osc('sine',NT(84+[0,4,7,12][(i>>1)%4]),NT(84),t,.8,.04,AU.mg,{rev:.8})}
  else if(name==='comic'){const sc=[60,62,64,65,67,69];if(i%2===0)pizz([48,55,52,55][(i>>1)%4],t,.2);if(i%4===1||i%4===3)noise(t,.03,.07,AU.mg,{type:'bandpass',f0:2600,q:3});if(i%2===1&&R()<.55)pizz(sc[Math.floor(R()*6)]+12,t,.12)}
  else if(name==='panic'){pizz(72+((i*5)%7),t,.1);if(i%2===0)bass(43+(i%4),t,.12,.12)}}
function musicTick(T){if(!(AU.on&&AU.ctx&&AU.ctx.state==='running'))return;
  while(mNext<T+.3){const sec=secAtX(mNext);const bpm=sec[2]||90,sd=30/bpm;const at2=AU.ctx.currentTime+(mNext-T)/speed;
    if(at2>=AU.ctx.currentTime-.02&&sec[1]!=='none'&&AU.musicOn)playStepX(sec[1],mIdx,Math.max(at2,AU.ctx.currentTime),sd);mNext+=sd;mIdx++}}
/* events */
const EV=[];const ev=(t,fn)=>EV.push({t,fn});
ev(T0-1.5,()=>{sf('bang');shake(.2,4)});ev(T0-1.4,()=>sf('steps',10,.1));
ev(q0(3)+.1,()=>sf('sparkle'));ev(D0(),()=>{sf('chime');sf('whoosh',.5)});
ev(q0(4)+DUR[3]*.45,()=>sf('ding'));ev(q0(4)+DUR[3]*.72,()=>sf('ding'));ev(q1(4)-.15,()=>{sf('cash');shake(.3,5)});
ev(D1(),()=>{sf('pop');flash(.12,'#fff',.4)});ev(q0(6),()=>sf('sad'));
ev(q1(6)+.1,()=>sf('steps',5,.22));ev(q0(7)-.35,()=>sf('thud'));
ev(q0(8),()=>{sf('boing');sf('sparkle')});ev(q0(8)+.55,()=>sf('boing'));
ev(E0+.35,()=>{sf('rage');sf('whoosh',.3);shake(.35,6)});ev(T_RUN,()=>sf('steps',12,.08));ev(T_RUN+.9,()=>sf('bang'));
EV.sort((a,b)=>a.t-b.t);

/* ---------- render ---------- */
let showSubs=true,showBars=true;
function wrapLines(c,txt,maxW){const words=txt.split(' ');const out=[];let cur='';for(const w of words){const t2=cur?cur+' '+w:w;if(c.measureText(t2).width>maxW&&cur){out.push(cur);cur=w}else cur=t2}if(cur)out.push(cur);
  if(out.length>2){const all=out.join(' ');const mid=Math.floor(all.length/2);let k=all.indexOf(' ',mid);if(k<0)k=mid;return [all.slice(0,k),all.slice(k+1)]}return out}
function render(T){
  const c=ctx;c.setTransform(RS,0,0,RS,0,0);ambUpdate(T);
  let sx=0,sy=0;for(const s of shakes){const q=(realNow-s.r0)/s.dur;if(q<1){const m=s.mag*(1-q);sx+=(Math.random()-.5)*2*m;sy+=(Math.random()-.5)*2*m}}
  c.fillStyle='#000';c.fillRect(0,0,W,H);c.save();c.translate(sx,sy);
  const sh=shotAt(T);drawScene(c,sh,T);
  if(sh.sc==='k'){const m=camT(sh),toS=(x,y)=>[m.ax+(x-m.cx)*m.k,m.ay+(y-m.wy)*m.k];
    const as=aState(T),ms=mState(T);
    if(T>=q0(3)&&T<q1(3)+.2){const [x,y]=toS(as.x+60,AY-250);sparkleAt(c,x,y,T,7)}
    if(T>=q0(8)&&T<q1(8)+.4){const [x,y]=toS(as.x,AY-200);sparkleAt(c,x,y,T,10,'#ffe9a0')}
    if(T>=q0(6)&&T<q1(6)){c.save();c.globalAlpha=win(T,q0(6),q1(6),.3);const [x,y]=toS(as.x-70,AY-250);label(c,'?',x,y,40,'#9fd0ff');c.restore()}
    if(T>=q1(9)+1.4&&T<q0(10)){c.save();c.globalAlpha=win(T,q1(9)+1.4,q0(10),.3);label(c,'. . .',W/2+150,160,40,CR);c.restore()}
    if(T>=q0(10)+.2&&T<q1(10)+.3){const a=win(T,q0(10)+.2,q1(10)+.3,.3),[hx]=toS(as.x,AY),x=hx+150,y=150;
      for(let i=0;i<3;i++){c.save();c.globalAlpha=a;c.fillStyle='#fffdf4';c.strokeStyle=INK0;c.lineWidth=2;c.beginPath();c.arc(x-30+i*16,y+80-i*22,4+i*3,0,TAU);c.fill();c.stroke();c.restore()}
      cloud(c,x+40,y,170,110,a);c.save();c.globalAlpha=a;sprO(c,'p.box',x+40,y+4,.28,.5,.5);c.restore()}
    if(T>=E0+.35&&T<T_CARD){const [x,y]=toS(ms.x-10,MY-260);c.save();c.globalAlpha=win(T,E0+.35,T_CARD,.2);label(c,'ไอ้ลูกคนนี้!!',x,y,30,'#ff6a5a');c.restore()}
  }
  c.restore();
  if(sh.sc==='dream'){c.save();c.fillStyle='rgba(235,245,255,.92)';for(let i=0;i<40;i++){const a=i/40*TAU,rx=W/2+Math.cos(a)*(W*.56),ry=H/2+Math.sin(a)*(H*.6);c.beginPath();c.arc(rx,ry,70+Math.sin(T*2+i)*6,0,TAU);c.fill()}c.restore();tag(c,'ในจินตนาการของเอ',24,72,'#ffd25a',15)}
  for(const f of flashes){const q=(realNow-f.r0)/f.dur;if(q<1){c.globalAlpha=f.a*(1-q);c.fillStyle=f.color;c.fillRect(0,0,W,H)}}c.globalAlpha=1;
  c.drawImage(vig,0,0,W,H);
  if(T>.2&&T<T0-1.7){const a=win(T,.2,T0-1.7,.4);c.save();c.globalAlpha=a;c.fillStyle='rgba(5,6,14,.55)';c.fillRect(0,175,W,170);label(c,'หม้อหุงข้าวแห่งความฝัน',W/2,245,54,'#ffd25a');label(c,'ละครสั้นตัวเส้นหมึก',W/2,302,22,CR);c.restore()}
  if(T>T0-1.6&&T<T0+2.4){c.save();c.globalAlpha=win(T,T0-1.6,T0+2.4,.3);tag(c,'ครัวบ้านไม้ · ตอนเย็น',24,72);c.restore()}
  if(T>T_CARD){const a=sat((T-T_CARD)/.6);c.fillStyle=`rgba(5,6,14,${a*.9})`;c.fillRect(0,0,W,H);c.save();c.globalAlpha=a;label(c,'จบ',W/2,236,64,'#ffd25a');label(c,'หม้อหุงข้าวแห่งความฝัน',W/2,302,24,CR);c.restore()}
  let fade=Math.max(T<.4?1-T/.4:0,T>END-.6?Math.min(1,(T-END+.6)/.6):0);for(const t of CUTS)fade=Math.max(fade,1-Math.abs(T-t)/.16);
  if(fade>0){c.globalAlpha=fade;c.fillStyle='#000';c.fillRect(0,0,W,H);c.globalAlpha=1}
  if(showBars){c.fillStyle='#000';c.fillRect(0,0,W,BAR);c.fillRect(0,H-BAR,W,BAR)}
  if(showSubs){const ln=curLine(T);if(ln){const q=CUES[ln-1];c.save();c.font='600 19px Kanit, sans-serif';const nm=cueName(q)+':  ';let L2=wrapLines(c,q.line,780);if(L2.some(l=>c.measureText(l).width>880)){c.font='600 16px Kanit, sans-serif';L2=wrapLines(c,q.line,860)}const lh=23,y0=H-BAR/2-(L2.length-1)*lh/2;
    c.textBaseline='middle';c.lineJoin='round';c.lineWidth=5;c.strokeStyle='#000';
    L2.forEach((s2,i)=>{const pre=i===0?nm:'',w1=c.measureText(pre).width,w2=c.measureText(s2).width,x0=W/2-(w1+w2)/2,y=y0+i*lh;c.textAlign='left';if(pre){c.strokeText(pre,x0,y);c.fillStyle=q.F.color;c.fillText(pre,x0,y)}c.strokeText(s2,x0+w1,y);c.fillStyle=C.ink;c.fillText(s2,x0+w1,y)});c.restore()}}
}
