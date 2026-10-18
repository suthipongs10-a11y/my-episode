/* ================= มังกรซ่อนลาย EP1 (vertical 9:16) ================= */
const IMG={};function loadAssets(){return Promise.all(Object.keys(ASSET_SRC).map(k=>new Promise(res=>{const im=new Image();im.onload=res;im.onerror=res;im.src=ASSET_SRC[k];IMG[k]=im})))}
const ok=k=>IMG[k]&&IMG[k].complete&&IMG[k].naturalWidth>0;
function sprO(c,key,x,y,K,axF,ayF,rot=0,flip=false,alpha=1){if(!ok(key))return;const m=META[key],w=(m.ow||m.w)*K,h=(m.oh||m.h)*K;
  c.save();c.globalAlpha*=alpha;c.translate(x,y);c.rotate(rot);if(flip)c.scale(-1,1);c.drawImage(IMG[key],-w*axF,-h*ayF,w,h);c.restore()}
const Hh={trail:[]};let effects=[],seedCounter=1,NOW=0,CAM=null;
const CR='#efe6d2',INK0='#0b0b10',FY=790;
const ease=u=>u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2,eo=u=>1-Math.pow(1-u,3),sat=u=>clamp(u,0,1);
const win=(T,a,b,f=.25)=>clamp(Math.min((T-a)/f,(b-T)/f),0,1);
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function label(c,txt,x,y,size=16,col=CR,align='center'){c.font=`700 ${size}px Kanit, sans-serif`;c.textAlign=align;c.textBaseline='middle';c.lineJoin='round';c.lineWidth=Math.max(4,size/5);c.strokeStyle=INK0;c.strokeText(txt,x,y);c.fillStyle=col;c.fillText(txt,x,y)}
function tag(c,txt,x,y,col='#ffd25a',size=16){c.font=`600 ${size}px Kanit, sans-serif`;const w=c.measureText(txt).width+24;c.fillStyle='rgba(8,10,20,.82)';rr(c,x,y,w,size+16,6);c.fill();c.strokeStyle=col;c.lineWidth=2;c.stroke();label(c,txt,x+w/2,y+(size+16)/2,size,col)}
function sparkleAt(c,x,y,T,n=8,col='#fff6c0',rad=1){c.save();c.globalCompositeOperation='lighter';for(let i=0;i<n;i++){const a=i*2.4+T*.6,r=(50+((i*37)%70))*rad,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.7,s2=4+3*Math.sin(T*6+i);c.fillStyle=col;c.beginPath();c.moveTo(px,py-s2*2);c.lineTo(px+s2*.5,py);c.lineTo(px,py+s2*2);c.lineTo(px-s2*.5,py);c.closePath();c.fill();c.beginPath();c.moveTo(px-s2*2,py);c.lineTo(px,py+s2*.5);c.lineTo(px+s2*2,py);c.lineTo(px,py-s2*.5);c.closePath();c.fill()}c.restore()}

/* ---------- script + timeline ---------- */
const LINES=__LINES__;const DUR=__DURS__;const ENV=__ENVS__;const NL=LINES.length;
const PRE=[0,3.4,.3,.3,1.1,1.1,.3,4.2,.5,.3,3.4,.4,1.9,.7,.4,.6,1.2,.6,.9,.3,1.7,1.3];
const Q=[null];{let t=0;for(let i=1;i<=NL;i++){t+=PRE[i];const d=Math.max(DUR[i-1],.6);Q.push({t0:t,t1:t+d});t+=d}}
const q0=n=>Q[n].t0,q1=n=>Q[n].t1;
const E0=q1(NL),T_HIT=E0+1.4,END=Math.ceil(T_HIT+6.2);
function talkEnv(id,T){for(let i=1;i<=NL;i++){const q=Q[i];if(LINES[i-1].who===id&&T>=q.t0&&T<=q.t1){const s=ENV[i-1],k=Math.floor((T-q.t0)/.04);const a=+(s[k]||0)/9,b=+(s[k+1]||0)/9,f=(T-q.t0)/.04-k;return lerp(a,b,f)}}return -1}
const curLine=T=>{for(let i=1;i<=NL;i++)if(T>=Q[i].t0&&T<=Q[i].t1)return i;return 0};
const WHO={WAN:{name:'ซ่งหว่านอิน',color:'#fff1d6'},GU:{name:'กู้เฉิน',color:'#9fc4ff'},ZHAO:{name:'จ้าวไห่',color:'#d59cff'},LIU:{name:'หลิวเหมย',color:'#7fe0a0'},GPA:{name:'คุณปู่ซ่ง',color:'#ffb27a'},JIAO:{name:'ซ่งเจียวเจียว',color:'#ff7a7a'}};
const WHAT=['ยื่นแฟ้มสัญญาให้คุณปู่ มือสั่น','ปู่หัวเราะด้วยความโลภ','เจียวเจียวกระซิบจิกกัด','ย้อนอดีต: มือแหวนมังกรดำ (เสียงในใจ)','จ้าวไห่ถือกุหลาบยักษ์เข้ามา','แม่ยายประจบ','กู้เฉินถือเค้กเข้างาน','หว่านอินถูกกระชากแขน','แม่ยายตวาด','จ้าวไห่เตะเค้ก','เหยียบขยี้ป้ายน้ำตาล','หว่านอินตะโกน','แม่ยายปาใบหย่าใส่หน้า','เจียวเจียวหัวเราะสะใจ','ปู่กระแทกไม้เท้า','กู้เฉินถามหว่านอินคนเดียว','หว่านอินฉีกใบหย่า','จ้าวไห่คว้าขวดไวน์','แม่ยายเชียร์','หว่านอินร้องเตือน','หว่านอินกอดรับขวดแทน'];
const CUES=LINES.map((l,i)=>({F:WHO[l.who],t0:+Q[i+1].t0.toFixed(1),t1:+Q[i+1].t1.toFixed(1),line:l.text,what:WHAT[i]||''}));
const cueName=q=>q.F.name;
const CHAPTERS=[['สัญญา 500 ล้าน',0],['ย้อนอดีต',q0(4)-.8],['จ้าวไห่มา',q0(5)-1],['เค้กครบรอบ',q0(7)-4],['เตะเค้ก',q1(9)],['ใบหย่า',q0(13)-.4],['ฉีกใบหย่า',q0(17)],['ขวดไวน์',q0(18)-.6],['กอดรับแทน',q1(20)],['ตัดจบ',E0]].map(([n,t])=>[n,+Math.max(0,t).toFixed(1)]);
const fmt=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const SCENES=[[`0:00–${fmt(q1(6))}`,'ฉากที่ 1 · สัญญาร่วมทุน 500 ล้าน','ตราประทับทอง หว่านอินยื่นแฟ้มให้คุณปู่ เจียวเจียวอิจฉา ย้อนอดีตเห็นมือแหวนมังกรดำสั่งเลขาหลิน จ้าวไห่ถือกุหลาบเข้ามาอ้างความดี','ตราประทับ ปรบมือ ออร์เคสตรา เบสทรงอำนาจ'],
 [`${fmt(q0(7)-4)}–${fmt(q1(12))}`,'ฉากที่ 2 · เค้กวันครบรอบที่แหลกสลาย','ประตูเปิด กู้เฉินในชุดส่งของถือเค้กเข้ามา แม่ยายกระชากแขนหว่านอิน จ้าวไห่เตะเค้กแบบสโลว์โมชัน แล้วเหยียบขยี้ กู้เฉินกำหมัด ตาวาว','ประตูแอ๊ด เตะผัวะ เค้กแผละ ไวโอลินกรีด'],
 [`${fmt(q0(13))}–${fmt(q1(17))}`,'ฉากที่ 3 · ใบหย่าปลิวว่อน','แม่ยายปาใบหย่าใส่หน้า กระดาษบาดแก้ม ปู่กระแทกไม้เท้า กู้เฉินถามหว่านอินคนเดียว หว่านอินฉีกใบหย่าต่อหน้าทุกคน','กระดาษเพียะ ไม้เท้าตึง เปียโนเศร้า ฉีกกระดาษ'],
 [`${fmt(q0(18))}–${fmt(END)}`,'ฉากที่ 4 · ขวดไวน์มรณะ (ค้างคา)','จ้าวไห่คลั่ง คว้าขวดไวน์พุ่งเข้าใส่ หว่านอินกอดกู้เฉินรับแทน สโลว์โมชัน ปิ่นหยกวาบ แก้วแตก ตัดดำ','กลองรัว หัวใจเต้น ลมวืด แก้วแตกเพล้ง']];

/* ---------- characters ---------- */
const KS={g:.8,w:.86,z:.66,f:.84,c:1.3};const KF={f5:.8,f6:.8,f7:.87,f8:.87,f9:.87,f10:.98,f11:.98};
const kOf=key=>KF[key]??KS[key[0]];
function chr(c,key,x,y,flip,id,T,o={}){const K=kOf(key)*(o.sc||1),m=META[key];if(!m)return;const tk=id&&!o.noMouth?talkEnv(id,T):-1;const by=tk>0?tk*2.5:0;
  sprO(c,key,x,y-by,K,.5,1,o.rot||0,flip,o.a??1);const mo=m.mouth;if(!mo||tk<=.06)return;const f=flip?-1:1;
  const mx=x+(mo[0]-m.ow*.5)*K*f,my=y-by+(mo[1]-m.oh)*K,R=mo[2]*K;
  c.save();c.globalAlpha*=o.a??1;c.fillStyle='#0b0b10';c.beginPath();c.ellipse(mx,my,R*.3,R*.2,0,0,TAU);c.fill();
  c.fillStyle='#1a0a0a';c.strokeStyle=CR;c.lineWidth=Math.max(1.5,R*.06);c.beginPath();c.ellipse(mx,my,R*(.12+.07*tk),R*(.04+.17*tk),0,0,TAU);c.fill();c.stroke();
  if(tk>.35){c.fillStyle='#ff7a8a';c.beginPath();c.ellipse(mx,my+R*.09*tk,R*.08,R*.05*tk+1,0,0,Math.PI);c.fill()}c.restore()}
const at=(T,n)=>T>=q0(n);
/* world layout on the wide hall (bg 1774×887 scaled to 960 tall) */
const SW=960/887,HW=1774*SW;const X={door:226,gu:560,cake:620,wan:1010,liu:1190,zhao:800,jiao:1480,gpa:1640};
function guState(T){if(T<q0(7)-4)return null;const tw=T-(q0(7)-4);let k='g0',x=X.gu,f=false;
  if(tw<3.6){x=lerp(X.door+30,X.gu,ease(sat((tw-.4)/3.2)))}else k='g1';
  if(at(T,8))k='g1';if(T>=q1(9)+.45)k='g2';if(at(T,11))k='g2';if(T>=q1(11)+.2)k='g3';if(at(T,13))k=T<q0(13)+DUR[12]*.35?'g3':'g5';if(at(T,14))k='g2';if(at(T,16))k='g4';if(at(T,18))k='g6';if(at(T,20))k='g7';
  return {k,x,f}}
function wanState(T){let k='w0',x=X.wan,f=true;
  if(T<q0(4)){k='w0';x=1320;f=false}else if(T<q0(7)-4){k='w1';x=1330;f=T>=q1(4)+1.2}
  else{k='w1';if(at(T,8))k='w2';if(at(T,12))k='w3';if(at(T,13))k='w2';if(T>=q1(15))k='w1';if(at(T,17))k=T<q0(17)+DUR[16]*.22?'w4':'w5';if(at(T,18))k='w1';if(at(T,20))k='w6'}
  if(T>=q0(18))x=lerp(X.wan,X.gu+150,ease(sat((T-q0(18))/.9)));
  return {k,x,f}}
function liuState(T){if(T<q0(5)-.6)return null;let k='f0',x=1150,f=false;
  if(T>=q0(7)-4){x=(T>=q0(13)-.4&&T<q1(15)+.6)?lerp(X.liu,X.gu+240,ease(sat((T-q0(13)+.4)/.5)))-(T>q1(15)?lerp(0,X.liu-X.gu-240,ease(sat((T-q1(15))/.6))):0):X.liu;f=true;k='f0';if(at(T,8)||T>=q0(8)-.3)k='f1';if(at(T,9))k='f2';if(at(T,12))k='f2';if(at(T,13))k=T<q0(13)+DUR[12]*.35?'f2':'f3';if(at(T,14))k='f4';if(at(T,17))k='f2';if(at(T,19))k='f4'}
  else{x=lerp(1560,1200,ease(sat((T-q0(5)+.6)/1.4)));f=true}return {k,x,f}}
function zhaoState(T){if(T<q0(5)-1.1)return null;let k='z0',x=1180,f=true;
  if(T<q0(7)-4){x=lerp(760,1020,ease(sat((T-q0(5)+1.1)/2)));f=false;return {k,x,f}}
  x=X.zhao;f=true;k=T<q0(9)?'z0':'z1';const kick=q1(9)+.2;if(T>=kick&&T<kick+1.4)k='z2';if(at(T,10))k='z1';if(at(T,11))k=T<q1(11)-1.4?'z3':'z4';if(at(T,12))k='z4';if(at(T,13))k='z1';if(at(T,18))k='z5';if(T>=q1(19)+.2)k='z6';
  if(T>=q1(12)+.2&&T<q0(18))x=lerp(X.zhao,1330,ease(sat((T-q1(12)-.2)/.8)));if(T>=q0(18))x=lerp(1330,X.zhao+260,ease(sat((T-q0(18))/.8)));
  return {k,x,f}}
function gpaKey(T){if(at(T,2)&&T<q1(2)+.6)return 'f5';return 'f6'}
function jiaoKey(T){if(at(T,3)&&T<q1(3)+.3)return 'f8';if(at(T,11))return 'f9';if(at(T,14))return 'f9';return 'f7'}
const cakeSmashed=T=>T>=q1(9)+1.1;
function guests(c,T,x0){const laugh=(at(T,11)&&T<q0(16))||(at(T,14)&&T<q1(15)),gasp=T>=q0(18)-.6;
  for(let i=0;i<5;i++){const key=(gasp?'x.gg':'x.gl')+(i+1);const x=x0+i*120+(i%2)*40;c.save();c.globalAlpha=.55;sprO(c,key,x,FY-150,.42,.5,1,0,i%2===1);c.restore()}}
function hall(c,T){c.fillStyle='#1a0c10';c.fillRect(-500,-200,3000,1400);if(ok('bg.wide'))c.drawImage(IMG['bg.wide'],0,0,HW,960);
  guests(c,T,700);
  // grandpa + jiao + throne side
  chr(c,gpaKey(T),X.gpa,FY,true,'GPA',T);
  chr(c,jiaoKey(T),X.jiao,FY-26,true,'JIAO',T,{sc:.9});
  // cake on floor
  if(cakeSmashed(T)){sprO(c,'p.cakesmash',X.cake+40,FY+6,.34,.5,1);if(T<q0(11)+DUR[10]*.5)sprO(c,'p.plaque',X.cake+60,FY+2,.18,.5,1)}
  // papers on floor after throw
  if(T>=q0(13)+DUR[12]*.45&&T<q0(17)+DUR[16]*.22){[[-60,.2],[40,-.5],[120,.9],[-120,-1.2]].forEach(([dx,r],i)=>sprO(c,'p.sheet'+(1+i%3),X.gu+60+dx,FY-4,.16,.5,1,r))}
  const L=liuState(T),Z=zhaoState(T),G=guState(T),Wn=wanState(T);
  if(Wn&&!(T>=hugT0()))chr(c,Wn.k,Wn.x,FY,Wn.f,'WAN',T,{sc:Wn.k==='w4'?1:1});
  if(L)chr(c,L.k,L.x,FY,L.f,'LIU',T);
  if(G&&!(T>=hugT0()))chr(c,G.k,G.x,FY,G.f,'GU',T,{a:T<q0(7)-3.6?sat((T-(q0(7)-4))/.4):1});
  if(Z){const lunge=T>=q1(19)+.2;let zx=Z.x;if(lunge)zx=lerp(X.zhao+260,X.gu+260,ease(sat((T-q1(19)-.2)/1.2)));if(T>=hugT0())zx=X.gu+250;
    let zk=Z.k;chr(c,zk,zx,FY,Z.f,'ZHAO',T)}
  if(T>=hugT0()&&T<E0+1.4){sprO(c,'w8',X.gu+30,FY,.86,.5,1)}
  // cake box in hands / flying
  const kick=q1(9)+.2;if(G&&T>=kick+.25&&T<kick+.95){const u=(T-kick-.25)/.7;const x=lerp(X.gu+70,X.cake+40,u),y=lerp(FY-190,FY-40,u)-Math.sin(u*Math.PI)*220;sprO(c,'p.cakebox',x,y,.2,.5,.5,u*6)}
}
function hugT0(){return q1(20)+.35}
function office(c,T){c.fillStyle='#07060a';c.fillRect(-500,-200,3000,1400);if(ok('bg.office')){const im=IMG['bg.office'],s=960/im.naturalHeight;c.drawImage(im,0,0,im.naturalWidth*s,960)}
  chr(c,'g8',300,FY-20,false,'GU',T,{noMouth:true,sc:1.05});chr(c,'f10',140,FY-20,false,null,T)}

/* ---------- shots ---------- */
// {sc, cx, k}  world x of screen centre, zoom about the floor line
function shotAt(T){
  if(T<q0(1)-.25)return {sc:'hook'};
  if(T>=q0(4)-.5&&T<q1(4)+.3){return T<q0(4)+DUR[3]*.45?{sc:'ring'}:{sc:'office',cx:270,k:1.05}}
  const ln=curLine(T);
  if(ln===1)return {sc:'hall',cx:lerp(1440,1480,sat((T-q0(1))/DUR[0])),k:1.15};
  if(ln===2||(T>q1(1)&&T<q0(2)))return {sc:'hall',cx:1560,k:1.2};
  if(ln===3)return {sc:'hall',cx:1490,k:1.6};
  if(T>=q1(4)+.3&&T<q0(7)-4){const u=ease(sat((T-q1(4)-.3)/2.4));return {sc:'hall',cx:lerp(1080,1180,u),k:1.08}}
  if(T>=q0(7)-4&&T<q0(7)){const u=ease(sat((T-q0(7)+4)/4));return {sc:'hall',cx:lerp(330,X.gu+150,u),k:lerp(.95,1.15,u)}}
  if(ln===7)return {sc:'hall',cx:X.gu+220,k:1.08};
  if(ln===8)return {sc:'close',key:'c4',T0:q0(8)};
  if(ln===9||(T>q1(8)&&T<q0(9)))return {sc:'hall',cx:X.wan+80,k:1.2};
  const kick=q1(9)+.2;
  if(T>=q1(9)&&T<q0(10))return {sc:'hall',cx:X.cake+100,k:1.2,low:true};
  if(ln===10)return {sc:'hall',cx:X.zhao-90,k:1.15};
  if(ln===11){const u=T-q0(11);return u<DUR[10]*.55?{sc:'hall',cx:X.cake+90,k:2.2,feet:true}:{sc:'hall',cx:X.zhao-60,k:1.2}}
  if(T>=q1(11)&&T<q0(12))return {sc:'close',key:'c3',T0:q1(11)};
  if(ln===12)return {sc:'close',key:'c5',T0:q0(12)};
  if(ln===13)return {sc:'hall',cx:X.gu+170,k:.98};
  if(ln===14)return {sc:'hall',cx:1540,k:1.15};
  if(ln===15)return {sc:'hall',cx:1600,k:1.3};
  if(ln===16)return {sc:'close',key:T<q0(16)+DUR[15]*.6?'c0':'c7',T0:q0(16)};
  if(ln===17)return {sc:'hall',cx:X.wan-80,k:1.15};
  if(ln===18)return T<q0(18)+DUR[17]*.45?{sc:'close',key:'c9',T0:q0(18)}:{sc:'hall',cx:X.zhao+150,k:1.15};
  if(ln===19)return {sc:'hall',cx:X.liu-60,k:1.1};
  if(T>=q1(19)&&T<q0(20))return {sc:'hall',cx:X.gu+220,k:1.05,shake:true};
  if(ln===20)return {sc:'close',key:'c7',T0:q0(20)};
  if(T>=q1(20)&&T<q0(21))return {sc:'hall',cx:X.gu+150,k:1.2,slow:true};
  if(ln===21)return T<q0(21)+.6?{sc:'hall',cx:X.gu+150,k:1.25,slow:true}:{sc:'close',key:'c2',T0:q0(21)};
  if(T>=E0&&T<T_HIT)return {sc:'pin'};
  if(T>=T_HIT)return {sc:'black'};
  return {sc:'hall',cx:1200,k:1.0}}
const toScreen=(sh,x,y)=>[W/2+(x-sh.cx)*sh.k,FY+(y-FY)*sh.k];
function drawWorld(c,sh,T,fn){const hw=W/2/sh.k;const cx=clamp(sh.cx,hw,(sh.sc==='office'?540:HW)-hw);sh.cx=cx;c.save();c.translate(W/2,FY);c.scale(sh.k,sh.k);c.translate(-cx,-FY);fn(c,T);c.restore()}

/* ---------- special frames ---------- */
function hookFrame(c,T){if(ok('bg.hall')){c.save();c.filter='blur(6px) brightness(.55)';c.drawImage(IMG['bg.hall'],-20,-20,W+40,H+40);c.restore()}
  const st=sat((T-.9)/.12),s=1.9-(st>0?0:0);sprO(c,'p.folder',W/2,H/2+40,.62,.5,.5,-.04);
  if(T>=.9){const k=1+.6*Math.max(0,1-(T-.9)*5);c.save();c.translate(W/2+70,H/2+70);c.scale(k,k);c.rotate(-.12);c.strokeStyle='#d4a017';c.lineWidth=5;rr(c,-150,-48,300,96,10);c.stroke();
    label(c,'อนุมัติงบประมาณ',0,-18,22,'#ffd25a');label(c,'500,000,000 หยวน',0,14,26,'#ffd25a');c.restore();label(c,'— เทียนหงกรุ๊ป',W/2+70,H/2+150,18,'#ffe9a8')}
  if(T<.95)sprO(c,'p.stamp',W/2+70,lerp(-120,H/2+20,ease(sat(T/.9))),.5,.5,1);
  else sprO(c,'p.stamp',W/2+190,H/2-10,.4,.5,1,.3);
  if(T>q0(1)-.7){const u=sat((T-q0(1)+.7)/.45);c.fillStyle=`rgba(255,240,200,${u*.6})`;c.fillRect(0,0,W,H)}}
function ringFrame(c,T){c.fillStyle='#0b0806';c.fillRect(0,0,W,H);const tap=Math.abs(Math.sin(T*9))*6;sprO(c,'x.ring',W/2,H/2+60-tap,1.1,.5,.5)}
function closeFrame(c,sh,T){if(ok('bg.hall')){c.save();c.filter='blur(5px) brightness(.6)';c.drawImage(IMG['bg.hall'],-30,-30,W+60,H+60);c.restore()}
  const key=sh.key,id={c0:'GU',c1:'GU',c2:'GU',c3:'GU',c4:'WAN',c5:'WAN',c6:'WAN',c7:'WAN',c8:'ZHAO',c9:'ZHAO',c10:'LIU',c11:'JIAO',c12:'GPA',c13:'GPA'}[key];
  const z=1+.04*sat((T-sh.T0)/3);chr(c,key,W/2-10,H-120,false,id,T,{sc:z});
  if(key==='c3'){const a=sat((T-sh.T0-.3)/.4);c.save();c.globalCompositeOperation='lighter';const g=c.createRadialGradient(W/2+70,H-330,2,W/2+70,H-330,90);g.addColorStop(0,`rgba(255,220,120,${.7*a})`);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,W,H);c.restore();sparkleAt(c,W/2+70,H-330,T,5,'#ffe9a0',.5)}}
function pinFrame(c,T){const u=T-E0;c.fillStyle='#120708';c.fillRect(0,0,W,H);if(ok('bg.hall')){c.save();c.filter='blur(8px) brightness(.4)';c.drawImage(IMG['bg.hall'],-30,-30,W+60,H+60);c.restore()}
  sprO(c,'p.hairpin',W/2-20,H/2+90,.85,.5,.5,-.5);
  const g=sat((u-.5)/.3)*(1-sat((u-1.1)/.3));if(g>0){c.save();c.globalCompositeOperation='lighter';const gr=c.createRadialGradient(W/2-60,H/2+50,4,W/2-60,H/2+50,260);gr.addColorStop(0,`rgba(255,255,255,${g})`);gr.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gr;c.fillRect(0,0,W,H);c.restore()}
  const by=lerp(-260,H/2-120,ease(sat(u/1.3)));sprO(c,'p.bottle',W/2+70,by,.7,.5,.5,2.5)}
function blackFrame(c,T){const u=T-T_HIT;c.fillStyle='#000';c.fillRect(0,0,W,H);
  if(u<.6){c.save();c.globalAlpha=1-u/.6;sprO(c,'x.crack',W/2,H/2-60,1.3,.5,.5);c.restore()}
  if(u>1.2){const a=sat((u-1.2)/.6);c.save();c.globalAlpha=a;const L=['หว่านอินยอมรับคมแก้วแทนสามี...','พญามังกรจะทนซ่อนเล็บ','ต่อไปได้อีกหรือไม่?'];L.forEach((s,i)=>label(c,s,W/2,H/2-90+i*48,i===0?26:30,'#ff3b3b'));
    c.globalAlpha=sat((u-2.2)/.6);label(c,'ติดตามต่อในตอนที่ 2!',W/2,H/2+110,30,'#ffd25a');c.restore()}}

/* ---------- sound ---------- */
Object.assign(SF,{
  stamp(){const t=tnow();osc('sine',110,40,t,.45,1,AU.sg);noise(t,.12,.7,AU.sg,{type:'lowpass',f0:900,rev:.3})},
  clap(){const t=tnow();for(let i=0;i<40;i++)noise(t+Math.random()*1.8,.04,.12+Math.random()*.15,AU.sg,{type:'bandpass',f0:1400+Math.random()*1200,q:1})},
  whoosh(d=.4){const t=tnow();noise(t,d,.4,AU.sg,{type:'bandpass',f0:300,f1:2600,q:1.2,a:d*.4})},
  door(){const t=tnow();osc('sawtooth',90,140,t,1.2,.08,AU.sg,{filter:'bandpass',ff:500,q:6,a:.1});noise(t+1.1,.2,.4,AU.sg,{type:'lowpass',f0:400})},
  kick(){const t=tnow();osc('sine',160,50,t,.18,.9,AU.sg);noise(t,.08,.7,AU.sg,{type:'bandpass',f0:1200,q:1})},
  splat(){const t=tnow();noise(t,.3,.7,AU.sg,{type:'lowpass',f0:700,f1:200});osc('sine',90,40,t,.2,.5,AU.sg)},
  violin(){const t=tnow();[880,932,988].forEach((f,i)=>osc('sawtooth',f,f*1.02,t+i*.02,1.6,.06,AU.sg,{filter:'bandpass',ff:1800,q:3,a:.05,rev:.4}))},
  grind(){const t=tnow();for(let i=0;i<6;i++)noise(t+i*.12,.12,.3,AU.sg,{type:'bandpass',f0:500+i*60,q:1.4})},
  laugh(){const t=tnow();for(let k=0;k<3;k++)for(let i=0;i<5;i++)noise(t+k*.12+i*.16,.08,.16,AU.sg,{type:'bandpass',f0:500+k*180+Math.random()*120,q:1.6})},
  slap(){const t=tnow();noise(t,.07,.9,AU.sg,{type:'highpass',f0:1800});for(let i=0;i<6;i++)noise(t+.08+i*.07,.12,.18,AU.sg,{type:'bandpass',f0:2500,q:.8})},
  cane(){const t=tnow();osc('sine',140,55,t,.5,1,AU.sg,{rev:.4});noise(t,.08,.6,AU.sg,{type:'lowpass',f0:1500})},
  rip(){const t=tnow();for(let k=0;k<2;k++)noise(t+k*.45,.32,.55,AU.sg,{type:'bandpass',f0:2400,f1:900,q:.9,a:.01})},
  gasp(){const t=tnow();noise(t,.5,.35,AU.sg,{type:'bandpass',f0:900,q:.7,a:.05})},
  swing(){const t=tnow();noise(t,.5,.6,AU.sg,{type:'bandpass',f0:200,f1:3200,q:1.5,a:.3})},
  heart(){const t=tnow();[0,.22].forEach(d=>osc('sine',70,45,t+d,.18,.9,AU.sg))},
  shatter(){const t=tnow();noise(t,1.4,.9,AU.sg,{type:'highpass',f0:2500,a:.002,rev:.5});for(let i=0;i<24;i++)osc('sine',2500+Math.random()*4500,2000+Math.random()*3000,t+Math.random()*.6,.12,.08,AU.sg);osc('sine',60,28,t,1.5,1,AU.sg)},
  sub(){const t=tnow();osc('sine',90,25,t,2.2,1,AU.sg)},
  ting(){const t=tnow();osc('sine',2637,2637,t,1,.15,AU.sg,{rev:.7})},
});
/* music */
const MUSX=[[0,'epic',112],[q0(4)-.5,'power',70],[q1(4)+.3,'cheeky',120],[q0(7)-4,'none'],[q0(8),'tense',96],[q1(9),'none'],[q0(12),'tense',104],[q1(15),'none'],[q0(16)-.4,'sad',64],[q1(17)+.2,'none'],[q0(18),'drums',150],[q1(20),'heart',60],[E0,'none']];
const secAtX=T=>{let r=MUSX[0];for(const m of MUSX)if(m[0]<=T)r=m;return r};
let mNext=0,mIdx=0;function musicReset(T){mNext=T;mIdx=0}
const NT=m=>440*Math.pow(2,(m-69)/12);
function piano(m,t,v,d=1.6){const f=NT(m);osc('triangle',f,f,t,d,v,AU.mg,{a:.004,rev:.35});osc('sine',f*2,f*2,t,d*.5,v*.25,AU.mg,{a:.003})}
function pizz(m,t,v){const f=NT(m);osc('triangle',f,f,t,.18,v,AU.mg,{a:.002});osc('sine',f*2,f*2,t,.08,v*.3,AU.mg)}
function bass(m,t,v,d=.25){const f=NT(m);osc('sawtooth',f,f,t,d,v,AU.mg,{a:.005,filter:'lowpass',ff:420});osc('sine',f,f,t,d,v*.8,AU.mg)}
function pad(ms,t,d,v){ms.forEach((m,i)=>{const f=NT(m);osc('sawtooth',f,f*1.002,t,d,v,AU.mg,{a:.4,sus:true,r:.6,filter:'lowpass',ff:1600,detune:(i-1)*7,rev:.6})})}
function playStepX(name,i,t,sd){const R=rng(i*977+31);
  if(name==='epic'){const ch=[[62,66,69],[67,71,74],[64,67,71],[69,73,76]][(i>>3)%4];if(i%8===0){pad(ch,t,sd*8,.03);bass(ch[0]-24,t,.2,sd*7)}if(i%2===0)pizz(ch[(i>>1)%3]+12,t,.08);if(i%4===0)osc('sine',120,50,t,.3,.5,AU.mg)}
  else if(name==='power'){if(i%8===0){bass(31,t,.25,sd*7.5);pad([43,50],t,sd*8,.03)}if(i%8===4)osc('sine',60,40,t,.6,.4,AU.mg)}
  else if(name==='cheeky'){if(i%2===0)pizz([55,59,62,59][(i>>1)%4],t,.14);if(i%4===3&&R()<.7)pizz(74+Math.floor(R()*5),t,.1);if(i%4===2)noise(t,.03,.06,AU.mg,{type:'bandpass',f0:2600,q:3})}
  else if(name==='tense'){bass(i%8===6?41:40,t,.15,.18);if(i%2===1)osc('sine',2400,2400,t,.03,.03,AU.mg);if(i%16===0)pad([52,53],t,sd*14,.03)}
  else if(name==='sad'){const ch=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]][(i>>3)%4],pat=[0,1,2,1,3,1,2,1];const n=pat[i%8];piano(n>=3?ch[0]+24:ch[n]+12,t,.09);if(i%8===0)piano(ch[0]-12,t,.12,2.4)}
  else if(name==='drums'){osc('sine',150,48,t,.2,i%2?.4:.7,AU.mg);if(i%4===2)noise(t,.08,.3,AU.mg,{type:'bandpass',f0:1500,q:.8});if(i%8===0)pad([40,46],t,sd*8,.035)}
  else if(name==='heart'){if(i%4===0){osc('sine',70,45,t,.18,.8,AU.mg);osc('sine',70,45,t+.22,.18,.6,AU.mg)}}}
function musicTick(T){if(!(AU.on&&AU.ctx&&AU.ctx.state==='running'))return;
  while(mNext<T+.3){const sec=secAtX(mNext);const bpm=sec[2]||90,sd=30/bpm;const at2=AU.ctx.currentTime+(mNext-T)/speed;
    if(at2>=AU.ctx.currentTime-.02&&sec[1]!=='none'&&AU.musicOn)playStepX(sec[1],mIdx,Math.max(at2,AU.ctx.currentTime),sd);mNext+=sd;mIdx++}}
const EV=[];const ev=(t,fn)=>EV.push({t,fn});
ev(.9,()=>{sf('stamp');shake(.3,8);flash(.2,'#ffe9a0',.4)});ev(q0(1)-.6,()=>sf('whoosh',.4));
ev(q0(2)-.1,()=>sf('clap'));ev(q0(4)-.5,()=>sf('whoosh',.5));ev(q1(4)+.3,()=>sf('whoosh',.4));
ev(q0(7)-4,()=>{sf('door')});ev(q0(8)-.3,()=>sf('gasp'));
const KICK=()=>q1(9)+.2;ev(q1(9)+.15,()=>sf('whoosh',.3));ev(q1(9)+.45,()=>{sf('kick');shake(.3,7);hitstop(.08)});ev(q1(9)+1.15,()=>{sf('splat');sf('violin')});
ev(q0(11)+.2,()=>sf('grind'));ev(q1(11)-1.3,()=>sf('laugh'));ev(q1(11)+.2,()=>sf('ting'));
ev(q0(13)+DUR[12]*.35,()=>{sf('slap');shake(.25,6);flash(.12,'#fff',.3)});ev(q0(14)-.2,()=>sf('laugh'));ev(q0(15),()=>{sf('cane');shake(.3,6)});
ev(q0(17)+DUR[16]*.25,()=>sf('rip'));ev(q0(17)+DUR[16]*.45,()=>sf('rip'));ev(q0(17)+DUR[16]*.65,()=>sf('gasp'));
ev(q1(19)+.25,()=>{sf('swing');sf('gasp')});ev(q1(20)+.3,()=>sf('heart'));ev(q0(21),()=>sf('heart'));ev(E0+.4,()=>sf('heart'));ev(E0+.6,()=>sf('ting'));
ev(T_HIT,()=>{sf('shatter');sf('sub');shake(.5,12);flash(.25,'#fff',.8)});
EV.sort((a,b)=>a.t-b.t);

/* ---------- render ---------- */
let showSubs=true,showBars=false;
function wrapLines(c,txt,maxW){const words=txt.split(' ');const out=[];let cur='';for(const w of words){const t2=cur?cur+' '+w:w;if(c.measureText(t2).width>maxW&&cur){out.push(cur);cur=w}else cur=t2}if(cur)out.push(cur);
  // break long unspaced Thai runs
  const res=[];for(const l of out){if(c.measureText(l).width<=maxW){res.push(l);continue}let s=l;while(c.measureText(s).width>maxW){let k=s.length;while(k>1&&c.measureText(s.slice(0,k)).width>maxW)k--;res.push(s.slice(0,k));s=s.slice(k)}res.push(s)}return res}
function render(T){
  const c=ctx;c.setTransform(RS,0,0,RS,0,0);
  let sx=0,sy=0;for(const s of shakes){const q=(realNow-s.r0)/s.dur;if(q<1){const m=s.mag*(1-q);sx+=(Math.random()-.5)*2*m;sy+=(Math.random()-.5)*2*m}}
  const sh=shotAt(T);if(sh.shake){sx+=Math.sin(T*37)*4;sy+=Math.cos(T*29)*4}
  c.fillStyle='#000';c.fillRect(0,0,W,H);c.save();c.translate(sx,sy);
  if(sh.sc==='hook')hookFrame(c,T);
  else if(sh.sc==='ring')ringFrame(c,T);
  else if(sh.sc==='office')drawWorld(c,sh,T,office);
  else if(sh.sc==='hall'){drawWorld(c,sh,T,hall);
    if(T>=q0(13)+DUR[12]*.25&&T<q0(13)+DUR[12]*.6){const u=sat((T-q0(13)-DUR[12]*.25)/(DUR[12]*.3));for(let i=0;i<6;i++){const [x,y]=toScreen(sh,lerp(X.liu-60,X.gu+40,u)+i*14,FY-250+Math.sin(i*2+u*6)*40);sprO(c,'p.sheet'+(1+i%3),x,y,.16*sh.k,.5,.5,u*8+i)}}
    if(T>=q0(17)+DUR[16]*.25&&T<q1(17)+.4){for(let i=0;i<14;i++){const q=((T-q0(17))*.6+i/14)%1;const [x,y]=toScreen(sh,X.wan-30+Math.sin(i*3.1)*60*q,FY-280+q*260);c.fillStyle='#fffaf0';c.save();c.translate(x,y);c.rotate(i+T*3);c.fillRect(-6,-4,12,8);c.restore()}}
    if(sh.slow){c.fillStyle='rgba(120,0,0,.12)';c.fillRect(0,0,W,H);const p=(T*1.6)%1;sprO(c,'x.beat',W/2,170,.8,.5,.5,0,false,.5+.5*Math.sin(p*TAU))}
    if(T>=q1(9)&&T<q0(10)){c.fillStyle='rgba(30,0,40,.15)';c.fillRect(0,0,W,H)}
  }
  else if(sh.sc==='close')closeFrame(c,sh,T);
  else if(sh.sc==='pin')pinFrame(c,T);
  else blackFrame(c,T);
  c.restore();
  // flashback gold frame
  if(sh.sc==='ring'||sh.sc==='office'){c.save();const g=c.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(255,200,90,.55)');c.fillStyle=g;c.fillRect(0,0,W,H);c.restore();tag(c,'ย้อนอดีต',20,60,'#ffd25a',15)}
  for(const f of flashes){const q=(realNow-f.r0)/f.dur;if(q<1){c.globalAlpha=f.a*(1-q);c.fillStyle=f.color;c.fillRect(0,0,W,H)}}c.globalAlpha=1;
  if(sh.sc!=='black')c.drawImage(vig,0,0,W,H);
  if(T>q0(1)-.2&&T<q0(1)+3.4&&sh.sc==='hall'){c.save();c.globalAlpha=win(T,q0(1)-.2,q0(1)+3.4,.4);label(c,'มังกรซ่อนลาย',W/2,96,40,'#ffd25a');label(c,'กับคุณหนูตระกูลตกอับ',W/2,140,22,CR);label(c,'ตอนที่ 1 · เค้กวันครบรอบที่ถูกเหยียบย่ำ',W/2,172,16,'#ff9a9a');c.restore()}
  let fade=Math.max(T<.3?1-T/.3:0,T>END-.6?Math.min(1,(T-END+.6)/.6):0);for(const t of [q0(4)-.5,q1(4)+.3])fade=Math.max(fade,1-Math.abs(T-t)/.15);
  if(fade>0){c.globalAlpha=fade;c.fillStyle='#000';c.fillRect(0,0,W,H);c.globalAlpha=1}
  if(showSubs){const ln=curLine(T);if(ln){const q=CUES[ln-1];c.save();c.font='600 20px Kanit, sans-serif';const L2=wrapLines(c,q.line,470);const lh=26,yb=H-46-(L2.length-1)*lh;
    c.fillStyle='rgba(0,0,0,.45)';rr(c,14,yb-44,W-28,(L2.length)*lh+46,10);c.fill();
    c.textBaseline='middle';c.lineJoin='round';c.lineWidth=5;c.strokeStyle='#000';c.textAlign='center';c.font='700 16px Kanit, sans-serif';c.strokeText(cueName(q),W/2,yb-24);c.fillStyle=q.F.color;c.fillText(cueName(q),W/2,yb-24);
    c.font='600 20px Kanit, sans-serif';L2.forEach((s2,i)=>{const y=yb+i*lh;c.strokeText(s2,W/2,y);c.fillStyle=C.ink;c.fillText(s2,W/2,y)});c.restore()}}
}
function ambInit(){}
