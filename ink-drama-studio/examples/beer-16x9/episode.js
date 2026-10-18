/* ================= มูลค่าของฟองเบียร์ (และรถเบนซ์ในจินตนาการ) ================= */
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
function rays(c,x,y,T,col,r=420){c.save();c.globalCompositeOperation='lighter';c.translate(x,y);c.rotate(T*.4);for(let i=0;i<14;i++){c.rotate(TAU/14);c.fillStyle=col;c.beginPath();c.moveTo(0,0);c.lineTo(r,-30);c.lineTo(r,30);c.closePath();c.fill()}c.restore()}
function sparkleAt(c,x,y,T,n=8,col='#fff6c0'){c.save();c.globalCompositeOperation='lighter';for(let i=0;i<n;i++){const a=i*2.4+T*.6,r=50+((i*37)%70),px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.7,s2=4+3*Math.sin(T*6+i);c.fillStyle=col;c.beginPath();c.moveTo(px,py-s2*2);c.lineTo(px+s2*.5,py);c.lineTo(px,py+s2*2);c.lineTo(px-s2*.5,py);c.closePath();c.fill();c.beginPath();c.moveTo(px-s2*2,py);c.lineTo(px,py+s2*.5);c.lineTo(px+s2*2,py);c.lineTo(px,py-s2*.5);c.closePath();c.fill()}c.restore()}

/* ---------- script + timeline ---------- */
const LINES=__LINES__;const DUR=__DURS__;const ENV=__ENVS__;const NL=LINES.length;
const PRE=[0,0,.5,.4,.4,.4,.5,.6,1.6,.4,.2,.4,.6,.3,1.0,.4,.8,.3,.5,.5,.5,.5,.4,.3,1.6,.3,.5,1.4,.6,3.0,.4,1.2,.3,.6];
const T0=6.0;const Q=[null];{let t=T0;for(let i=1;i<=NL;i++){if(i>1)t+=PRE[i];const d=Math.max(DUR[i-1],.5);Q.push({t0:t,t1:t+d});t+=d}}
const q0=n=>Q[n].t0,q1=n=>Q[n].t1;
const E0=q1(NL),END=Math.ceil(E0+7);
function talkEnv(id,T){for(let i=1;i<=NL;i++){const q=Q[i];if(LINES[i-1].who===id&&T>=q.t0&&T<=q.t1){const s=ENV[i-1],k=Math.floor((T-q.t0)/.04);const a=+(s[k]||0)/9,b=+(s[k+1]||0)/9,f=(T-q.t0)/.04-k;return lerp(a,b,f)}}return -1}
const curLine=T=>{for(let i=1;i<=NL;i++)if(T>=Q[i].t0&&T<=Q[i].t1)return i;return 0};
const A={id:'A',name:'เอ',color:'#8cc8ff'},TON={id:'TON',name:'ต้น',color:'#ff9a5c'};const WHO={A,TON};
const WHAT=['สงสารอนาคตเพื่อน','เรอ แล้วงง','ถามวันละกี่ป๋อง','สองป๋องพอหลับสบาย','กี่ปีแล้ว','นับนิ้ว 15 ปี','ตบโต๊ะ โค้ชเข้าสิง','ค่าไฟบ้านกูเหรอ','กดเครื่องคิดเลข','บวกกับแกล้ม','ละเอียดกว่าเมีย','ล้านสองแสน!','สำลักฟองเบียร์','หลับตานึกภาพ','มีอะไรวะ','เบนซ์ป้ายแดง!','เบนซ์กลายเป็นฉี่','ซดล้อแม็กซ์','ตบไหล่','แล้วมึงกินไหม','ไม่เคยแตะ 30 ปี','สุดยอด','วินัยเป๊ะ','ขอถามหน่อย','ปรึกษาได้','แล้วไหนเบนซ์มึง?','ยิ้มค้าง','ต้องมีสองคันแล้วดิ','จักรยานชมพู รุ่น AMG ปั่นเอง','แถ: เงินอยู่ในอากาศ','ยืมสองร้อยค่าเน็ต','ยื่นถั่วต้ม','เคี้ยวถั่วด้วยความแค้น'];
const CUES=LINES.map((l,i)=>({F:WHO[l.who],t0:+Q[i+1].t0.toFixed(1),t1:+Q[i+1].t1.toFixed(1),line:l.text,what:WHAT[i]||''}));
const cueName=q=>q.F.name;
const CHAPTERS=[['หน้าบ้านต้น',0],['วันละกี่ป๋อง',q0(3)],['โค้ชเข้าสิง',q0(7)],['เครื่องคิดเลข',q0(9)],['ล้านสองแสน',q0(12)],['นึกภาพตาม',q0(14)],['เบนซ์ป้ายแดง',q0(16)],['ไม่เคยแตะ',q0(21)],['ไหนเบนซ์มึง?',q0(26)],['จักรยานชมพู',q0(29)],['ถั่วต้มเค็ม',q0(31)]].map(([n,t])=>[n,+t.toFixed(1)]);
const fmt=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const SCENES=[[`0:00–${fmt(q1(13))}`,'ม้าหินอ่อนหน้าบ้านต้น 19.00 น.','ต้นแกะเบียร์ เอสงสารอนาคตเพื่อน ถามวันละกี่ป๋อง กี่ปี แล้วโค้ชการเงินเข้าสิง กดเครื่องคิดเลขจนได้ล้านสองแสน ต้นสำลักฟองเบียร์','ป๊อก ฟู่ ตบโต๊ะ เสียงกดเครื่องคิดเลข จิ้งหรีด'],
 [`${fmt(q0(14))}–${fmt(q1(18))}`,'รถเบนซ์ในจินตนาการ','เอกอดอกมองฟ้า เปียโนแรงบันดาลใจขึ้น ต้นหลับตานึกภาพ เบนซ์ป้ายแดงขับเลียบทะเล แล้วเบนซ์กลายเป็นฉี่ ต้นมองกระป๋องเป็นล้อแม็กซ์','เปียโน คอรัสสวรรค์ ชักโครก'],
 [`${fmt(q0(19))}–${fmt(END)}`,'แล้วไหนอะ... เบนซ์มึง?','เอโอ้ว่าไม่เคยแตะเบียร์ 30 ปี ต้นถามหาเบนซ์ เอยิ้มค้าง จิ้งหรีดร้อง ใบมะม่วงปลิว กล้องแพนไปเจอจักรยานแม่บ้านสีชมพูโซ่ตก ต้นเปิดป๋องที่สอง เอเคี้ยวถั่วด้วยความแค้น','จิ้งหรีด ลม ป๊อก หัวเราะหึๆ']];

/* ---------- characters (sprites + lip-sync) ---------- */
const SK={a:.545,t:.49};
function chr(c,key,x,y,flip,id,T,o={}){const K=SK[key[0]]*(o.sc||1),m=META[key];if(!m)return;const tk=id?talkEnv(id,T):-1;const by=tk>0?tk*2.5:0;
  sprO(c,key,x,y-by,K,.5,1,o.rot||0,flip,o.a??1);const mo=m.mouth;if(!mo)return;const f=flip?-1:1;
  const mx=x+(mo[0]-m.ow*.5)*K*f,my=y-by+(mo[1]-m.oh)*K,R=mo[2]*K;
  if(o.sweat){c.save();const q=(T*.8)%1;c.fillStyle='rgba(124,200,255,.9)';c.beginPath();c.ellipse(mx-R*.9*f,my-R*1.1+q*8,3,5,0,0,TAU);c.fill();c.restore()}
  if(tk>.06&&!o.noMouth){c.save();c.fillStyle='#0b0b10';c.beginPath();c.ellipse(mx,my,R*.3,R*.2,0,0,TAU);c.fill();c.restore();
    c.save();c.fillStyle='#1a0a0a';c.strokeStyle=CR;c.lineWidth=Math.max(1.5,R*.06);c.beginPath();c.ellipse(mx,my,R*(.12+.07*tk),R*(.04+.17*tk),0,0,TAU);c.fill();c.stroke();
    if(tk>.35){c.fillStyle='#ff7a8a';c.beginPath();c.ellipse(mx,my+R*.09*tk,R*.08,R*.05*tk+1,0,0,Math.PI);c.fill()}c.restore()}}
const at=(T,n)=>T>=q0(n);
function aState(T){ // A: pose, x, standing?
  let k='a0',x=440,flip=true;
  if(at(T,3))k='a0';if(at(T,7))k='a1';if(T>=q0(7)+1.6)k='a2';if(at(T,9))k='a2';if(at(T,12))k='a3';if(at(T,13))k='a3';
  if(T>=q1(13)+.3)k='a4';if(at(T,16))k='a5';if(at(T,17))k='a4';if(at(T,19)){k='a6';x=380}if(at(T,20)){k='a7';x=440}if(at(T,24))k='a7';
  if(at(T,27))k='a8';if(at(T,30))k='a9';if(T>=q1(30)+.3)k='a8';if(at(T,33)||T>=q1(32)+.2)k='a10';
  const sit=['a0','a1','a2','a10'].includes(k);return {k,x,flip,y:sit?FY+2:FY}}
function tState(T){let k='t0';
  if(T>2.2&&T<4.6)k='t1';else if(T>=4.6&&T<T0)k='t2';
  if(at(T,2))k='t0';if(at(T,4))k='t2';if(T>=q0(4)+1.6)k='t0';if(at(T,6))k='t3';if(at(T,7))k='t0';if(at(T,11))k='t0';if(at(T,13))k='t4';if(T>=q1(13)+.3)k='t0';
  if(at(T,14)&&T>=q0(14)+4)k='t5';if(at(T,18))k='t7';if(at(T,20))k='t0';if(at(T,22))k='t0';if(T>=q1(23)+.2)k='t9';if(at(T,26))k='t0';if(at(T,29))k='t10';
  if(T>=q0(31)-1.2)k='t1';if(T>=q0(31))k='t0';if(at(T,32))k='t11';if(at(T,33))k='t2';if(T>=E0+.5)k='t0';return k}

/* ---------- the yard (bg 1774×887 at s=.64) ---------- */
const sY=.64,oyY=-16,YW=1774*sY;
function bgDraw(c,key,s,oy){if(!ok(key))return;const im=IMG[key];c.drawImage(im,0,oy,im.naturalWidth*s,im.naturalHeight*s)}
function yard(c,T){c.fillStyle='#0e1126';c.fillRect(-400,-100,2400,800);bgDraw(c,'bg.yard',sY,oyY);
  // porch light flicker glow
  c.save();c.globalCompositeOperation='lighter';const g=c.createRadialGradient(98,128,4,98,128,150);g.addColorStop(0,`rgba(255,200,110,${.22+.03*Math.sin(T*7)})`);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(-60,-30,320,320);c.restore();
  // bike leaning on the fence
  sprO(c,'g.bike',905,352,.3,.5,1,-.04);
  // ghost dream car in the empty spot
  const gc=Math.max(win(T,q0(14)+DUR[13]*.75,q1(16)+.2,.6)*.55,0);if(gc>0){c.save();c.globalAlpha=gc*(.8+.2*Math.sin(T*4));sprO(c,'g.carGlow',700,402,.42,.5,1);c.restore();sparkleAt(c,700,340,T,6)}
  // table set: Ton left, A right
  const ts=tState(T),as=aState(T);
  sprO(c,'p.stool',250,FY+6,.29,.5,1);sprO(c,'p.stool',440,FY+6,.29,.5,1);
  chr(c,ts,252,FY+4,false,'TON',T);
  sprO(c,'p.table',345,FY+8,.39,.5,1);
  // table top items
  sprO(c,'p.shells',320,FY-100,.16,.5,1);sprO(c,'p.canCrush',372,FY-99,.14,.5,1);
  if(T>q1(30)+.5)sprO(c,'p.can',300,FY-99,.14,.5,1);
  if(!['a0','a1','a2','a10'].includes(as.k)||as.k==='a1')sprO(c,'p.bottle',398,FY-99,.14,.5,1);
  chr(c,as.k,as.x,as.y,as.flip,'A',T,{sweat:as.k==='a8'||as.k==='a9'});
  // drifting mango leaf in the awkward silence
  const lt=T-(q1(28)+.4);if(lt>0&&lt<3){sprO(c,'g.leaf',lerp(620,140,lt/3),FY-170+Math.sin(lt*4)*24,.16,.5,.5,lt*3)}
}
function dream(c,T){c.fillStyle='#2a1a3a';c.fillRect(-400,-100,2400,800);if(ok('bg.dream')){const im=IMG['bg.dream'],s=.62,w=im.naturalWidth*s;const off=-((T*90)%w);c.drawImage(im,off,-40,w,im.naturalHeight*s);c.drawImage(im,off+w,-40,w,im.naturalHeight*s)}
  const bob=Math.sin(T*9)*1.5;sprO(c,'g.carGlow',480,470+bob,.6,.5,1);c.save();c.beginPath();c.rect(-400,-100,2400,464+bob);c.clip();chr(c,'t12',470,404+bob,false,'TON',T,{sc:.85,noMouth:true});c.restore();
  for(let i=0;i<7;i++){const q=((T*.5+i/7)%1);c.save();c.globalAlpha=1-q;c.fillStyle='#ff7aa8';const hx=160+i*110,hy=330-q*160;c.beginPath();c.moveTo(hx,hy);c.bezierCurveTo(hx-14,hy-14,hx-8,hy-26,hx,hy-16);c.bezierCurveTo(hx+8,hy-26,hx+14,hy-14,hx,hy);c.fill();c.restore()}
  label(c,'กรี๊ดดด!',150,170,26,'#ff9ac0');label(c,'ป้ายแดง',650,420,15,'#fff');sparkleAt(c,480,300,T,10)}
function peeGag(c,T){const tl=T-q0(17),d=DUR[16];c.fillStyle='#14102a';c.fillRect(-400,-100,2400,800);rays(c,480,260,T,'rgba(160,140,255,.06)');
  const u=sat((tl-d*.3)/(d*.35));c.save();c.globalAlpha=1-u;sprO(c,'g.car',480,330,.5,.5,1);c.restore();
  if(u>0){c.save();c.globalAlpha=u;sprO(c,'g.toilet',480,360,.75,.5,1);c.restore()}
  if(u>.2&&u<1){for(let i=0;i<10;i++){const a=i*.63+T*2,r=60+u*90;c.fillStyle='rgba(255,230,120,.6)';c.beginPath();c.arc(480+Math.cos(a)*r,280+Math.sin(a)*r*.6,4,0,TAU);c.fill()}}
  label(c,'เบนซ์ → ฉี่',480,110,30,'#ffe9a8')}
/* ---------- calculator phone overlay ---------- */
function calcUI(c,T){const a=Math.max(win(T,q0(9)-.3,q1(10)+.4,.25),win(T,q0(12)-.2,q1(12)+.6,.25));if(a<=0)return;
  c.save();c.globalAlpha=a;c.fillStyle='rgba(5,6,14,.5)';c.fillRect(0,0,W,H);const x=770,y=268,s=.86*(1+.03*Math.sin(T*3));c.translate(x,y);c.scale(s,s);
  c.fillStyle='#0b0b12';rr(c,-120,-190,240,380,26);c.fill();c.strokeStyle=CR;c.lineWidth=5;c.stroke();c.fillStyle='#0f1a2e';rr(c,-106,-172,212,344,16);c.fill();
  label(c,'เครื่องคิดเลขโค้ชเอ',0,-150,14,'#9fb0d8');
  const rows=[];const L9=q0(9),d9=DUR[8],L10=q0(10),d10=DUR[9],L12=q0(12),d12=DUR[11];
  const add=(t,txt,col)=>{if(T>=t)rows.push([txt,col,T-t])};
  add(L9+d9*.18,'2 ป๋อง × 60 บาท','#e8eef8');add(L9+d9*.38,'= 120 บาท/วัน','#ffd25a');add(L9+d9*.6,'× 30 = 3,600/เดือน','#ffd25a');add(L9+d9*.82,'× 12 = 43,200/ปี','#ff9a5c');
  add(L10+d10*.15,'× 15 ปี','#e8eef8');add(L10+d10*.45,'+ ถั่วต้ม หมูยอ แหนม','#8fe3b0');add(L10+d10*.8,'+ 100 บาท/วัน','#8fe3b0');
  const big=T>=L12+d12*.45;rows.slice(-6).forEach(([t,col,age],i)=>{c.save();c.globalAlpha=sat(age/.2);label(c,t,0,-104+i*34,18,col);c.restore()});
  if(big){const age=T-(L12+d12*.45);c.save();c.globalAlpha=sat(age/.15);c.fillStyle='rgba(255,60,60,.25)';rr(c,-100,96,200,58,10);c.fill();label(c,'1,200,000 ฿',0,126,30*(1+.15*Math.max(0,1-age*3)),'#ff6a5a');c.restore()}
  c.restore();
  if(T>=L12+d12*.45&&T<q1(12)+.6){for(let i=0;i<10;i++){const q=((T*.6+i/10)%1);sprO(c,i%3?'g.bub1':'g.bubbles',560+((i*73)%260),480-q*420,.12+.08*(i%2),.5,.5,0,false,1-q)}}}
/* ---------- wheel thought bubble ---------- */
function wheelThought(c,T,x,y){const a=win(T,q0(18)+.6,q1(18)+.4,.3);if(a<=0)return;c.save();c.globalAlpha=a;sprO(c,'x.thought',x,y,.62,.5,.5);c.restore();
  c.save();c.globalAlpha=a;c.beginPath();c.ellipse(x+4,y-14,46,38,0,0,TAU);c.fillStyle='#fffdf4';c.fill();sprO(c,'g.wheel',x+4,y-12,.3,.5,.5,T*2);c.restore()}

/* ---------- shots ---------- */
const WIDE={sc:'yard',k:1.32,cx:345};
const ON_A=(k=1.6)=>({sc:'yard',k,cx:430}),ON_T=(k=1.6)=>({sc:'yard',k,cx:260});
function shotAt(T){
  if(T<T0-.3)return {sc:'yard',k:lerp(1.0,1.32,ease(sat((T-.5)/5))),cx:lerp(560,345,ease(sat((T-.5)/5)))};
  const ln=curLine(T)||curLine(T-.4)||curLine(T+.4);
  if(T>=q0(16)-.2&&T<q1(16)+.2)return {sc:'dream',k:1,cx:480};
  if(T>=q0(17)-.1&&T<q1(17)+.2)return {sc:'pee',k:1,cx:480};
  if(T>=q0(14)&&T<q1(15)+.1){const u=ease(sat((T-q0(14)-DUR[13]*.45)/(DUR[13]*.45)));return {sc:'yard',k:lerp(1.32,1.08,u),cx:lerp(345,560,u)}}
  if(T>=q0(29)&&T<q1(29)+.3){const u=ease(sat((T-q0(29)-DUR[28]*.25)/(DUR[28]*.3))),b=ease(sat((T-q1(29)+1.2)/1.2));return {sc:'yard',k:lerp(1.32,1.2,u),cx:lerp(345,lerp(830,430,b),u)}}
  if(T>=q1(28)&&T<q0(29))return WIDE;
  if(T>=q0(9)-.3&&T<q1(12)+.6&&ln!==11)return {sc:'yard',k:1.45,cx:500};
  if(ln===7||ln===13||ln===27||ln===30)return LINES[ln-1].who==='A'?ON_A(1.55):ON_T(1.55);
  if(ln===12||ln===21||ln===33)return ON_A(1.45);
  if(ln===18||ln===26||ln===32)return ON_T(1.5);
  return WIDE}
function drawScene(c,sh,T){if(sh.sc==='yard'){const hw=W/2/sh.k;sh={...sh,cx:clamp(sh.cx,hw,YW-hw)}}c.save();c.translate(W/2,FY);c.scale(sh.k,sh.k);c.translate(-sh.cx,-FY);
  if(sh.sc==='yard')yard(c,T);else if(sh.sc==='dream'){c.restore();c.save();dream(c,T)}else if(sh.sc==='pee'){c.restore();c.save();peeGag(c,T)}
  c.restore()}
const CUTS=[q0(16)-.2,q1(16)+.2,q0(17)-.1,q1(17)+.2];

/* ---------- sound ---------- */
Object.assign(SF,{
  pop(){const t=tnow();osc('sine',900,300,t,.06,.5,AU.sg);noise(t,.05,.5,AU.sg,{type:'highpass',f0:2500})},
  fizz(){const t=tnow();noise(t,1.6,.22,AU.sg,{type:'highpass',f0:5000,a:.02});for(let i=0;i<20;i++)noise(t+Math.random()*1.4,.02,.18,AU.sg,{type:'bandpass',f0:4000+Math.random()*4000,q:3,a:.002})},
  slam(){const t=tnow();osc('sine',140,45,t,.35,.9,AU.sg);noise(t,.18,.7,AU.sg,{type:'lowpass',f0:1200,rev:.3})},
  keys(n=10){const t=tnow();for(let i=0;i<n;i++)osc('square',1200+Math.random()*900,1200,t+i*.09,.03,.08,AU.sg,{filter:'bandpass',ff:2200,q:3})},
  ding(){const t=tnow();osc('sine',1568,1568,t,.5,.16,AU.sg,{rev:.4});osc('sine',2093,2093,t+.08,.5,.12,AU.sg)},
  cough(){const t=tnow();[0,.22].forEach(d=>noise(t+d,.14,.5,AU.sg,{type:'bandpass',f0:700,q:1.2}))},
  spray(){const t=tnow();noise(t,.35,.4,AU.sg,{type:'highpass',f0:2500,a:.01})},
  chime(){const t=tnow();[1046,1318,1568,2093,2637].forEach((f,i)=>osc('sine',f,f*1.003,t+i*.05,1.6,.06,AU.sg,{rev:.8}))},
  flush(){const t=tnow();noise(t,1.8,.5,AU.sg,{type:'lowpass',f0:1800,f1:300,a:.05,rev:.3});osc('sine',300,120,t+.2,1.4,.15,AU.sg)},
  sad(){const t=tnow();[392,370,349,294].forEach((f,i)=>osc('triangle',f,f*(i===3?.94:1),t+i*.32,i===3?.9:.3,.12,AU.sg,{a:.02}))},
  sparkle(){const t=tnow();[1318,1760,2093,2637,3136].forEach((f,i)=>osc('sine',f,f,t+i*.06,1,.1,AU.sg,{rev:.7}))},
  cricket(){const t=tnow();for(let k=0;k<2;k++)for(let i=0;i<4;i++)osc('sine',4300,4300,t+k*.5+i*.05,.035,.05,AU.sg)},
  whoosh(d=.35){const t=tnow();noise(t,d,.35,AU.sg,{type:'bandpass',f0:300,f1:2400,q:1.2,a:d*.4})},
  chain(){const t=tnow();for(let i=0;i<7;i++)noise(t+i*.06,.04,.25,AU.sg,{type:'bandpass',f0:3500+Math.random()*1500,q:4})},
  chuckle(){const t=tnow();for(let i=0;i<3;i++)noise(t+i*.15,.08,.25,AU.sg,{type:'bandpass',f0:500,q:1.5})},
  munch(){const t=tnow();for(let i=0;i<4;i++)noise(t+i*.13,.06,.3,AU.sg,{type:'bandpass',f0:1800,q:1.2})},
  boing(){const t=tnow();osc('sine',180,620,t,.4,.3,AU.sg,{slide:.12})},
  scratch(){const t=tnow();noise(t,.35,.55,AU.sg,{type:'bandpass',f0:1800,f1:400,q:2.5,slide:.3})},
  tick(){const t=tnow();osc('square',2400,2400,t,.025,.05,AU.sg,{filter:'highpass',ff:1500})},
  burp(){const t=tnow();osc('sawtooth',110,80,t,.35,.18,AU.sg,{filter:'lowpass',ff:600,a:.02})},
});
const AMB={};
function ambInit(){const X=AU.ctx;const mk=(type,f,q)=>{const s=X.createBufferSource();s.buffer=AU.noise;s.loop=true;const fl=X.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=X.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(AU.sg);s.start();return g};
  AMB.wind=mk('lowpass',420,.7);AMB.ok=true}
let crickAt=0;
function ambUpdate(T){if(!AMB.ok||!AU.ctx)return;const t=AU.ctx.currentTime,on=playing&&AU.sfxOn?1:0,sh=shotAt(T),y=sh.sc==='yard'?1:0,quiet=T>=q1(28)&&T<q0(29)?2.2:1;
  AMB.wind.gain.setTargetAtTime(.05*y*on*quiet,t,.3);if(on&&y&&realNow>crickAt){crickAt=realNow+(quiet>1?.7:2.2+Math.random()*2);sf('cricket')}}
/* music */
const MUSX=[[0,'chill',84],[q0(7),'coach',120],[q1(13)+.2,'none'],[q0(14),'inspire',72],[q0(16)-.2,'holy',72],[q0(17),'sad',64],[q1(18)+.3,'coach',116],[q1(23)+.3,'none'],[q0(26),'tense',100],[q1(26),'none'],[q0(29),'comic',112],[q0(30),'panic',150],[q1(30)+.2,'chill',84],[E0+5.2,'none']];
const secAtX=T=>{let r=MUSX[0];for(const m of MUSX)if(m[0]<=T)r=m;return r};
let mNext=0,mIdx=0;function musicReset(T){mNext=T;mIdx=0}
const NT=m=>440*Math.pow(2,(m-69)/12);
function piano(m,t,v,d=1.6){const f=NT(m);osc('triangle',f,f,t,d,v,AU.mg,{a:.004,rev:.35});osc('sine',f*2,f*2,t,d*.5,v*.25,AU.mg,{a:.003})}
function pizz(m,t,v){const f=NT(m);osc('triangle',f,f,t,.18,v,AU.mg,{a:.002});osc('sine',f*2,f*2,t,.08,v*.3,AU.mg)}
function bass(m,t,v,d=.25){const f=NT(m);osc('sawtooth',f,f,t,d,v,AU.mg,{a:.005,filter:'lowpass',ff:420});osc('sine',f,f,t,d,v*.8,AU.mg)}
function pad(ms,t,d,v){ms.forEach((m,i)=>{const f=NT(m);osc('sawtooth',f,f*1.002,t,d,v,AU.mg,{a:.5,sus:true,r:.6,filter:'lowpass',ff:1400,detune:(i-1)*7,rev:.6})})}
function playStepX(name,i,t,sd){const R=rng(i*977+31);
  if(name==='chill'){const ch=[[57,60,64],[53,57,60],[55,59,62],[52,55,59]][(i>>3)%4];if(i%2===0)pizz(ch[(i>>1)%3]+12,t,.08);if(i%8===0)bass(ch[0]-12,t,.12,.6);if(i%4===2)noise(t,.03,.04,AU.mg,{type:'highpass',f0:6000})}
  else if(name==='coach'){if(i%4===0)osc('sine',140,50,t,.25,.45,AU.mg);if(i%4===2)noise(t,.1,.16,AU.mg,{type:'bandpass',f0:1800,q:.8});const prog=[[60,64,67],[65,69,72],[67,71,74],[65,69,72]][(i>>3)%4];if(i%2===0)prog.forEach(m=>pizz(m+12,t,.06));if(i%8===0)bass(prog[0]-24,t,.16,.5)}
  else if(name==='inspire'){const ch=[[60,64,67],[67,71,74],[69,72,76],[65,69,72]][(i>>3)%4];const pat=[0,1,2,1,2,1,0,1];piano(ch[pat[i%8]]+12,t,.09);if(i%8===0){piano(ch[0]-12,t,.12,2.6);pad(ch,t,sd*8,.012)}if(i%8===5&&R()<.6)piano(ch[2]+24,t,.06,2)}
  else if(name==='holy'){if(i%8===0)pad(i%16===0?[60,64,67,72]:[65,69,72,77],t,sd*8+.4,.035);if(i%2===0)osc('sine',NT(84+[0,4,7,12][(i>>1)%4]),NT(84),t,.8,.04,AU.mg,{rev:.8})}
  else if(name==='sad'){const ch=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]][(i>>3)%4],pat=[0,1,2,1,3,1,2,1];const n=pat[i%8];piano(n>=3?ch[0]+24:ch[n]+12,t,.09);if(i%8===0)piano(ch[0]-12,t,.12,2.4)}
  else if(name==='tense'){bass(i%8===6?41:40,t,.14,.18);if(i%2===1)osc('sine',2400,2400,t,.03,.03,AU.mg)}
  else if(name==='comic'){const sc=[60,62,64,65,67,69];if(i%2===0)pizz([48,55,52,55][(i>>1)%4],t,.2);if(i%4===1||i%4===3)noise(t,.03,.07,AU.mg,{type:'bandpass',f0:2600,q:3});if(i%2===1&&R()<.55)pizz(sc[Math.floor(R()*6)]+12,t,.12)}
  else if(name==='panic'){pizz(72+((i*5)%7),t,.1);if(i%2===0)bass(43+(i%4),t,.12,.12)}}
function musicTick(T){if(!(AU.on&&AU.ctx&&AU.ctx.state==='running'))return;
  while(mNext<T+.3){const sec=secAtX(mNext);const bpm=sec[2]||90,sd=30/bpm;const at2=AU.ctx.currentTime+(mNext-T)/speed;
    if(at2>=AU.ctx.currentTime-.02&&sec[1]!=='none'&&AU.musicOn)playStepX(sec[1],mIdx,Math.max(at2,AU.ctx.currentTime),sd);mNext+=sd;mIdx++}}
/* events */
const EV=[];const ev=(t,fn)=>EV.push({t,fn});
ev(2.4,()=>{sf('pop');sf('fizz')});ev(4.7,()=>sf('fizz'));ev(q0(2),()=>sf('burp'));
ev(q0(7),()=>{sf('slam');shake(.35,7);flash(.15,'#fff',.25)});ev(q0(7)+1.8,()=>sf('keys',8));ev(q1(7)+.2,()=>sf('keys',14));ev(q0(8)+.5,()=>sf('keys',10));
[[9,.18],[9,.38],[9,.6],[9,.82],[10,.15],[10,.45],[10,.8]].forEach(([n,f])=>ev(q0(n)+DUR[n-1]*f,()=>sf('ding')));
ev(q0(12)+DUR[11]*.45,()=>{sf('scratch');shake(.4,6);flash(.2,'#ff6a5a',.25)});ev(q0(13),()=>{sf('cough');sf('spray');shake(.3,5)});
ev(q0(14)+DUR[13]*.75,()=>sf('sparkle'));ev(q0(16)-.2,()=>{sf('chime');sf('whoosh',.5)});ev(q0(17)+DUR[16]*.4,()=>sf('flush'));ev(q0(17)+DUR[16]*.65,()=>sf('sad'));
ev(q0(18)+.6,()=>sf('boing'));ev(q0(21),()=>sf('sparkle'));ev(q0(27),()=>{sf('scratch');shake(.2,3)});
ev(q1(28)+.5,()=>sf('whoosh',.6));ev(q0(29)+DUR[28]*.4,()=>sf('chain'));ev(q0(30),()=>shake(.3,4));ev(q0(31)-1.2,()=>{sf('pop');sf('fizz')});ev(q0(31),()=>sf('chuckle'));
ev(q0(33)-.4,()=>sf('munch'));ev(q0(33)+2.5,()=>sf('munch'));ev(E0+.5,()=>sf('munch'));
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
  if(sh.sc==='yard'){// overlays in screen space
    const toS=(x,y)=>[W/2+(x-sh.cx)*sh.k,FY+(y-FY)*sh.k];
    if(T>=q0(18)){const [x,y]=toS(330,FY-235);wheelThought(c,T,x,y)}
    if(T>=q0(21)&&T<q1(23)+.3){const [x,y]=toS(440,FY-200);sparkleAt(c,x,y,T,8)}
    if(T>=q0(7)&&T<q0(7)+1.2){c.save();c.globalAlpha=win(T,q0(7),q0(7)+1.2,.15);tag(c,'โหมดโค้ชการเงิน',24,72,'#8cc8ff',15);c.restore()}
    if(T>=q0(14)&&T<q1(14)){c.save();c.globalAlpha=.25*win(T,q0(14),q1(14),.8);c.fillStyle='#ffd88a';c.fillRect(0,0,W,H);c.restore()}
    if(T>=q1(28)&&T<q0(29)){c.save();c.globalAlpha=win(T,q1(28),q0(29),.3);label(c,'กรี๊ด... กรี๊ด...',W-170,120,20,'#cfe8b0');c.restore()}
    if(T>=q0(29)+DUR[28]*.45&&T<q1(29)){c.save();c.globalAlpha=win(T,q0(29)+DUR[28]*.45,q1(29),.3);tag(c,'เบนซ์ รุ่น AMG ปั่นเอง',W/2+60,84,'#ff9ac0',17);c.restore()}
    if(T>=q0(1)&&T<q0(1)+.1){}
  }
  calcUI(c,T);
  c.restore();
  if(sh.sc==='dream'){c.save();c.fillStyle='rgba(235,245,255,.9)';for(let i=0;i<40;i++){const a=i/40*TAU,rx=W/2+Math.cos(a)*(W*.56),ry=H/2+Math.sin(a)*(H*.6);c.beginPath();c.arc(rx,ry,70+Math.sin(T*2+i)*6,0,TAU);c.fill()}c.restore();tag(c,'ในจินตนาการ',24,72,'#ffd25a',15)}
  for(const f of flashes){const q=(realNow-f.r0)/f.dur;if(q<1){c.globalAlpha=f.a*(1-q);c.fillStyle=f.color;c.fillRect(0,0,W,H)}}c.globalAlpha=1;
  c.drawImage(vig,0,0,W,H);
  if(T>.3&&T<5.2){const a=win(T,.3,5.2,.5);c.save();c.globalAlpha=a;c.fillStyle='rgba(5,6,14,.55)';c.fillRect(0,170,W,180);label(c,'มูลค่าของฟองเบียร์',W/2,240,56,'#ffd25a');label(c,'(และรถเบนซ์ในจินตนาการ)',W/2,300,24,CR);c.restore()}
  if(T>.8&&T<6.6){c.save();c.globalAlpha=win(T,.8,6.6,.3);tag(c,'ม้าหินอ่อนหน้าบ้านต้น · 19.00 น.',24,72);c.restore()}
  if(T>E0+1.6){const a=sat((T-E0-1.6)/.6);c.fillStyle=`rgba(5,6,14,${a*.9})`;c.fillRect(0,0,W,H);c.save();c.globalAlpha=a;label(c,'จบบริบูรณ์',W/2,236,60,'#ffd25a');label(c,'มูลค่าของฟองเบียร์ (และรถเบนซ์ในจินตนาการ)',W/2,300,22,CR);c.restore()}
  let fade=Math.max(T<.5?1-T/.5:0,T>END-.6?Math.min(1,(T-END+.6)/.6):0);for(const t of CUTS)fade=Math.max(fade,1-Math.abs(T-t)/.16);
  if(fade>0){c.globalAlpha=fade;c.fillStyle='#000';c.fillRect(0,0,W,H);c.globalAlpha=1}
  if(showBars){c.fillStyle='#000';c.fillRect(0,0,W,BAR);c.fillRect(0,H-BAR,W,BAR)}
  if(showSubs){const ln=curLine(T);if(ln){const q=CUES[ln-1];c.save();c.font='600 19px Kanit, sans-serif';const nm=cueName(q)+':  ';let L2=wrapLines(c,q.line,780);if(L2.some(l=>c.measureText(l).width>880)){c.font='600 16px Kanit, sans-serif';L2=wrapLines(c,q.line,860)}const lh=23,y0=H-BAR/2-(L2.length-1)*lh/2;
    c.textBaseline='middle';c.lineJoin='round';c.lineWidth=5;c.strokeStyle='#000';
    L2.forEach((s2,i)=>{const pre=i===0?nm:'',w1=c.measureText(pre).width,w2=c.measureText(s2).width,x0=W/2-(w1+w2)/2,y=y0+i*lh;c.textAlign='left';if(pre){c.strokeText(pre,x0,y);c.fillStyle=q.F.color;c.fillText(pre,x0,y)}c.strokeText(s2,x0+w1,y);c.fillStyle=C.ink;c.fillText(s2,x0+w1,y)});c.restore()}}
}
