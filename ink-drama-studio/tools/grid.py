import numpy as np,json,os
from PIL import Image
from scipy import ndimage as ndi
RAW='raw/';OUT='crops/';os.makedirs('check',exist_ok=True)
def cells(f,boxes,name,amin=170,keepfrac=.02):
    a=np.array(Image.open(RAW+f).convert('RGBA'));res=[]
    for i,(x0,y0,x1,y1) in enumerate(boxes):
        c=a[y0:y1,x0:x1].copy();al=c[...,3]>amin
        lab,n=ndi.label(ndi.binary_dilation(al,iterations=2));sz=ndi.sum(np.ones_like(lab),lab,range(1,n+1))
        big=max(sz);keep=np.isin(lab,[j+1 for j,s in enumerate(sz) if s>=big*keepfrac])&al
        c[...,3]=np.where(keep,c[...,3],0);c[...,3]=np.where(c[...,3]>amin,255,(c[...,3].astype(int)*0).astype(np.uint8))
        ys,xs=np.nonzero(c[...,3]);c=c[ys.min():ys.max()+1,xs.min():xs.max()+1]
        fn=f'{name}_{i:02d}.png';Image.fromarray(c).save(OUT+fn);res.append({'file':fn,'w':c.shape[1],'h':c.shape[0]})
    return res
J=json.load(open('crops.json'))
g3=lambda W,H,cols,rows:[(int(W*cx/cols),int(H*ry/rows),int(W*(cx+1)/cols),int(H*(ry+1)/rows)) for ry in range(rows) for cx in range(cols)]
bx=lambda R,C:[(C[c],R[r],C[c+1],R[r+1]) for r in range(3) for c in range(3)]
J['G']=cells('out-dragon-02-poses-guchen.png',bx([0,392,712,1024],[0,560,1010,1536]),'G',keepfrac=.12)
J['W']=cells('out-dragon-03-poses-wanyin.png',bx([0,356,700,1024],[0,560,1050,1536]),'W',keepfrac=.12)
r1=[(270+i*318,0,270+(i+1)*318,300) for i in range(4)];r2=[(240+i*320,300,240+(i+1)*320,585) for i in range(4)];r3=[(i*296,560,(i+1)*296,887) for i in range(6)]
J['faces']=cells('out-dragon-06-faces.png',r1+r2+r3,'faces',keepfrac=.2)
json.dump(J,open('crops.json','w'))
from PIL import ImageDraw
ims=[Image.open(OUT+o['file']) for g in ['G','W','faces'] for o in J[g]]
sh=Image.new('RGB',(1600,900),(60,60,90));x=y=0;rh=0
for i,t in enumerate(ims):
    t=t.copy();t.thumbnail((170,200))
    if x+t.width>1600:x=0;y+=rh+20;rh=0
    sh.paste(t,(x,y+16),t);ImageDraw.Draw(sh).text((x,y),str(i),fill=(255,255,0));x+=t.width+10;rh=max(rh,t.height)
sh.save('check/csd_g.png')
