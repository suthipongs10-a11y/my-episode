import json,io,base64
from PIL import Image
def enc(im,maxd=None,q=86):
    if maxd and max(im.size)>maxd:
        f=maxd/max(im.size);im=im.resize((round(im.width*f),round(im.height*f)),Image.LANCZOS)
    b=io.BytesIO();im.save(b,'WEBP',quality=q,method=6);return 'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode(),im.size
SRC={};META={};J=json.load(open('crops.json'));M=json.load(open('mouths.json'))
zmap={0:'z0',1:'z1',2:'z2',6:'z3',8:'z4',11:'z5',13:'z6',14:'z7'}
names={'G':[f'g{i}' for i in range(9)],'W':[f'w{i}' for i in range(9)],'Z':[zmap.get(i) for i in range(17)],'F':[f'f{i}' for i in range(12)],'faces':[f'c{i}' for i in range(14)],
'props':['p.folder','p.stamp','p.cakebox','p.cakesmash','p.plaque',None,'p.sheet1','p.cane','p.sheet2','p.hairpin','p.sheet3','p.champ','p.bottle','p.shard1','p.shard2','p.tray','p.shatter'],
'ex':['x.ring','x.gl1','x.gl2','x.gl3','x.gl4','x.gl5','x.gg1','x.gg2','x.gg3','x.gg4','x.gg5','x.beat','x.pet1','x.pet2','x.pet3','x.sh1','x.sh2','x.sh3','x.crack','x.sh4']}
for g,ns in names.items():
    for o,n in zip(J[g],ns):
        if not n:continue
        im=Image.open('crops/'+o['file']);d,sz=enc(im,maxd=600);SRC[n]=d;META[n]={'w':sz[0],'h':sz[1],'ow':o['w'],'oh':o['h']}
        if o['file'] in M and g in 'GWZFfaces':META[n]['mouth']=M[o['file']]
for k,f in [('bg.wide','out-dragon-09-bg-hall-wide.png'),('bg.hall','out-dragon-08-bg-hall.png'),('bg.office','out-dragon-10-bg-office.png')]:
    im=Image.open('raw/'+f).convert('RGB');d,sz=enc(im,q=80);SRC[k]=d;META[k]={'w':sz[0],'h':sz[1]}
open('assetsd.js','w').write('const ASSET_SRC='+json.dumps(SRC)+';\nconst META='+json.dumps(META)+';\n')
print(len(SRC),sum(len(v) for v in SRC.values())//1024,'KB')
