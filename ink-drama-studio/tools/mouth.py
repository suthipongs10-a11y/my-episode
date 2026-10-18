import json,os,numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage as ndi
J=json.load(open('crops.json'));H=json.load(open('heads.json'));M={}
for g in ['G','W','Z','F','faces']:
    for o in J[g]:
        fn=o['file'];hd=H.get(fn)
        if not hd:continue
        a=np.array(Image.open('crops/'+fn).convert('RGBA')).astype(int);h,w=a.shape[:2]
        x,y,r=hd;wh=(a[...,0]>215)&(a[...,1]>215)&(a[...,2]>205)&(a[...,3]>200)
        yy,xx=np.ogrid[:h,:w];inhead=(xx-x)**2+(yy-y)**2<(r*1.1)**2;wh&=inhead
        lab,n=ndi.label(wh);best=None
        for i in range(1,n+1):
            m=lab==i;s=m.sum()
            if s<r*r*0.04:continue
            ys,xs=np.nonzero(m);bw,bh=np.ptp(xs)+1,np.ptp(ys)+1;fill=s/(bw*bh)
            if fill<.45 or bw>r*1.1:continue
            if best is None or s>best[0]:best=(s,xs.mean(),ys.mean(),bw,bh)
        if best:
            _,ex,ey,bw,bh=best;M[fn]=[float(ex+.12*r),float(ey+max(bh*.5,r*.18)+r*.32),float(r)]
        else:M[fn]=[x+.5*r,y+.44*r,r]
json.dump(M,open('mouths.json','w'))
ims=[]
for g in ['G','W','Z','F','faces']:
    for o in J[g]:
        fn=o['file'];im=Image.open('crops/'+fn).convert('RGBA');bg=Image.new('RGBA',im.size,(70,70,100,255));bg.alpha_composite(im);d=ImageDraw.Draw(bg)
        if fn in M:mx,my,r=M[fn];d.ellipse([mx-.22*r,my-.12*r,mx+.22*r,my+.12*r],outline=(0,255,255),width=4)
        bg.thumbnail((200,240));ims.append(bg)
sh=Image.new('RGB',(1800,1440),(0,0,0))
for i,t in enumerate(ims):sh.paste(t,((i%9)*200,(i//9)*240))
os.makedirs('check',exist_ok=True);sh.save('check/mouths.png')
