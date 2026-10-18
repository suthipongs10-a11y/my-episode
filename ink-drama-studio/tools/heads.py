import json,numpy as np,cv2
from PIL import Image,ImageDraw
J=json.load(open('crops.json'));H={}
def head(fn,top):
    a=np.array(Image.open('crops/'+fn).convert('RGBA'));al=a[...,3]
    g=cv2.cvtColor(a[...,:3],cv2.COLOR_RGB2GRAY);g[al<128]=255
    h,w=g.shape;S=max(h,w);best=None
    blur=cv2.medianBlur(g,5)
    cs=cv2.HoughCircles(blur,cv2.HOUGH_GRADIENT,dp=1.2,minDist=10,param1=120,param2=22,minRadius=int(.06*S),maxRadius=int(.24*S))
    if cs is None:return None
    dark=(a[...,:3].max(axis=2)<60)&(al>128)
    for x,y,r in cs[0][:40]:
        if y>h*top:continue
        yy,xx=np.ogrid[:h,:w];m=(xx-x)**2+(yy-y)**2<(r*.85)**2
        if m.sum()==0:continue
        fill=dark[m].mean();ring=((xx-x)**2+(yy-y)**2<(r*1.08)**2)&((xx-x)**2+(yy-y)**2>(r*.92)**2)
        cream=((a[...,0]>200)&(a[...,1]>190)&(a[...,2]>160)&(al>128))[ring].mean()
        sc=fill*0.6+cream*0.6+r/S*0.8
        if best is None or sc>best[0]:best=(sc,[int(x),int(y),float(r)])
    return best[1] if best else None
for g in ['G','W','Z','F','faces']:
    for i,o in enumerate(J[g]):H[o['file']]=head(o['file'],.55)
json.dump(H,open('heads.json','w'))
ims=[]
for g in ['G','W','Z','F','faces']:
    for o in J[g]:
        im=Image.open('crops/'+o['file']).convert('RGBA');bg=Image.new('RGBA',im.size,(70,70,100,255));bg.alpha_composite(im);d=ImageDraw.Draw(bg)
        if H[o['file']]:
            x,y,r=H[o['file']];d.ellipse([x-r,y-r,x+r,y+r],outline=(255,0,0),width=4);mx,my=x+.5*r,y+.45*r;d.ellipse([mx-.25*r,my-.18*r,mx+.25*r,my+.18*r],outline=(0,255,255),width=3)
        bg.thumbnail((200,240));ims.append(bg)
sh=Image.new('RGB',(1800,720),(0,0,0))
for i,t in enumerate(ims):sh.paste(t,((i%9)*200,(i//9)*240))
sh.save('/tmp/claude-0/-home-claude/997fe572-c1fe-5910-8749-bc5d8a1111b3/scratchpad/heads.png')
