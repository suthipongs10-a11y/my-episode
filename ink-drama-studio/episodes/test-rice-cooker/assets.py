# sprites + background -> assetsr.js (base64 webp). Run after cut.py, heads.py, mouth.py
import json,io,base64
from PIL import Image
def enc(im,maxd=None,q=86):
    if maxd and max(im.size)>maxd:
        f=maxd/max(im.size);im=im.resize((round(im.width*f),round(im.height*f)),Image.LANCZOS)
    b=io.BytesIO();im.save(b,'WEBP',quality=q,method=6);return 'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode(),im.size
SRC={};META={};J=json.load(open('crops.json'));M=json.load(open('mouths.json'))
names={'A':[f'a{i}' for i in range(9)],'M':[f'm{i}' for i in range(6)],
'P':['p.cooker','p.cookerOpen','p.pot','p.money','p.new1','p.new2','p.new3','p.box','p.shades']}
for g,ns in names.items():
    for o,n in zip(J[g],ns):
        im=Image.open('crops/'+o['file']);d,sz=enc(im,maxd=600);SRC[n]=d;META[n]={'w':sz[0],'h':sz[1],'ow':o['w'],'oh':o['h']}
        if o['file'] in M and g in ('A','M'):META[n]['mouth']=M[o['file']]
for k,f in [('bg.kitchen','out-rc-04-bg-kitchen-wide.png')]:
    im=Image.open('raw/'+f).convert('RGB');d,sz=enc(im,q=80);SRC[k]=d;META[k]={'w':sz[0],'h':sz[1]}
open('assetsr.js','w').write('const ASSET_SRC='+json.dumps(SRC)+';\nconst META='+json.dumps(META)+';\n')
print(len(SRC),sum(len(v) for v in SRC.values())//1024,'KB')
