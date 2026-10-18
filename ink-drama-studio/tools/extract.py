import sys,os,json,numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage as ndi
RAW='raw/';OUT='crops/';os.makedirs(OUT,exist_ok=True);os.makedirs('check',exist_ok=True)
def load(f,green=False):
    im=Image.open(RAW+f).convert('RGBA');a=np.array(im).astype(np.int16)
    if green:
        r,g,b=a[...,0],a[...,1],a[...,2]
        key=(g>200)&(r<130)&(b<110)&(g-r>110)  # strict, so green costume parts survive
        # soft edge: greenish pixels partially
        spill=(g>r+40)&(g>b+40)
        a[...,3]=np.where(key,0,255)
        # despill
        gg=np.minimum(a[...,1],np.maximum(a[...,0],a[...,2]))
        a[...,1]=np.where(spill&~key,gg,a[...,1])
    return a.astype(np.uint8)
def extract(name,f,green=False,amin=200,minarea=800,merge=18,close=3):
    a=load(f,green);al=a[...,3]>amin
    m=ndi.binary_closing(al,iterations=close)
    lab,n=ndi.label(ndi.binary_dilation(m,iterations=merge))
    objs=ndi.find_objects(lab);res=[]
    for i,sl in enumerate(objs):
        sub=(lab[sl]==i+1)&al[sl]
        if sub.sum()<minarea:continue
        y0,y1,x0,x1=sl[0].start,sl[0].stop,sl[1].start,sl[1].stop
        crop=a[sl].copy();crop[...,3]=np.where(sub,crop[...,3],0)
        # clean tiny islands inside crop
        l2,n2=ndi.label(crop[...,3]>amin);sizes=ndi.sum(np.ones_like(l2),l2,range(1,n2+1))
        keep=np.isin(l2,[j+1 for j,s in enumerate(sizes) if s>=max(40,0.002*sub.sum())])
        crop[...,3]=np.where(keep,crop[...,3],0)
        ys,xs=np.nonzero(crop[...,3]);crop=crop[ys.min():ys.max()+1,xs.min():xs.max()+1]
        res.append(((y0+y1)/2,(x0+x1)/2,x0+xs.min(),y0+ys.min(),crop))
    # reading order: rows by y bands
    res.sort(key=lambda r:r[0]);rows=[];
    for r in res:
        if rows and abs(rows[-1][-1][0]-r[0])<120: rows[-1].append(r)
        else: rows.append([r])
    out=[];k=0
    for row in rows:
        for r in sorted(row,key=lambda r:r[1]):
            fn=f'{name}_{k:02d}.png';Image.fromarray(r[4]).save(OUT+fn);out.append({'file':fn,'x':int(r[2]),'y':int(r[3]),'w':r[4].shape[1],'h':r[4].shape[0]});k+=1
    # contact sheet
    th=[Image.open(OUT+o['file']) for o in out];W=1600;x=y=0;rowh=0;pos=[]
    for t in th:
        t2=t.copy();t2.thumbnail((180,180))
        if x+t2.width>W:x=0;y+=rowh+24;rowh=0
        pos.append((x,y,t2));x+=t2.width+12;rowh=max(rowh,t2.height)
    sh=Image.new('RGB',(W,y+rowh+30),(60,60,90));d=ImageDraw.Draw(sh)
    for i,(x,y,t2) in enumerate(pos):sh.paste(t2,(x,y+20),t2);d.text((x,y+2),str(i),fill=(255,255,0))
    sh.save(f'check/csd_{name}.png')
    return out
    return out
if __name__=='__main__':  # the sheets of one episode (mk): copy this file into the episode and edit
    J={}
    J['B']=extract('B','out-mk-02-poses-B.png',merge=10)
    J['A']=extract('A','out-mk-03-poses-A.png',merge=14)
    J['TT']=extract('TT','out-mk-04-poses-TON-TAN.png',green=True,merge=10)
    J['faces']=extract('faces','out-mk-05-faces.png',green=True,merge=10)
    J['props']=extract('props','out-mk-09-props-shop.png',merge=8)
    J['gags']=extract('gags','out-mk-10-props-gags.png',merge=10)
    json.dump(J,open('crops.json','w'))
    print({k:len(v) for k,v in J.items()})
