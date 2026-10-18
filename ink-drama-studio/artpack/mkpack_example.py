import os,shutil,zipfile
S='/tmp/claude-0/-home-claude/997fe572-c1fe-5910-8749-bc5d8a1111b3/scratchpad/dragonpack/'
B=S+'dragon-art-pack';shutil.rmtree(B,ignore_errors=True);os.makedirs(B+'/refs');os.makedirs(B+'/prompts')
R='/home/claude/mk2/raw/';RB='/home/claude/beer/raw/'
refs={'ref-dg-00-style-cast.png':R+'out-mk-01-model-sheet.png','ref-dg-01-style-cast2.png':RB+'out-beer-01-model-sheet.png','ref-dg-02-style-poses.png':RB+'out-beer-02-poses-A.png',
'ref-dg-03-style-poses-sitting.png':R+'out-mk-04-poses-TON-TAN.png','ref-dg-04-style-faces.png':R+'out-mk-05-faces.png','ref-dg-05-style-props.png':RB+'out-beer-05-props.png',
'ref-dg-06-style-props2.png':RB+'out-beer-06-props-gags.png','ref-dg-07-style-bg.png':R+'out-mk-11-bg-classroom.png','ref-dg-08-style-bg-night.png':R+'out-mk-08-bg-shop.png'}
for k,v in refs.items():shutil.copy(v,f'{B}/refs/{k}')
STYLE='''STYLE (identical to the attached style references from my series — same artist, same world):
- Premium hand-drawn ink brush line art, bold tapered strokes with thick-thin variation.
- Stick-figure people: thin cream limbs, round solid BLACK heads with an off-white outline, ONE big white eye, small simple mouth. Real clothes with flat colors, exactly like the references. Hair shapes and accessories are allowed on the black head.
- Warm off-white ink line #ece8dc. Flat colors only. No shading, no gradients, no texture noise.
- Side view, every character FACING RIGHT. Full body, same scale in every image, feet on one invisible baseline.
- Keep the MOUTH SMALL AND CLOSED in every pose (I animate the mouth myself), unless the prompt says otherwise.
- Transparent background PNG. If not possible, a solid flat #00FF00 background with nothing else on it.
- Every item isolated with WIDE gaps, nothing touching or overlapping.
- No text, no letters, no numbers, no logos, no shadows, no ground line. Violence stays cartoon-mild: no blood splatter.'''
BG='''STYLE: same painted ink-line scenery as the attached background references — off-white ink outlines, flat rich colors, warm glows. NO characters (unless stated). NO text anywhere.
VERTICAL 9:16 (about 1080×1920) for a phone-screen drama. Side-on, flat "stage" view like a 2D cartoon set: the floor is a flat strip along the bottom third with plenty of empty space for characters.'''
P=[
('01','แบบตัวละคร 7 คน (ทำก่อน)',['ref-dg-00-style-cast.png','ref-dg-01-style-cast2.png'],'out-dragon-01-model-sheet.png',
'''Image 1 and 2 = the STYLE to copy exactly (my ink stick-figure series, characters with real clothes).

Draw a CHARACTER MODEL SHEET for a modern Chinese family-revenge drama set at a luxury mansion banquet. 7 characters standing in a row, side view facing right, same scale (wide image, two rows is fine):
1 GU CHEN (hero, 28) — tall, calm; worn-out delivery-courier uniform (faded grey-blue jacket and cap, dusty), torn canvas sneakers; quiet but powerful look.
2 SONG WANYIN (heroine, 25) — elegant but tired; simple luxurious WHITE work dress; hair in a neat bun with a half WHITE JADE hairpin.
3 ZHAO HAI (villain, 29) — arrogant rich heir; flashy PURPLE-and-gold designer suit, big gold watch, glossy pointed leather shoes, slicked hair, sneer.
4 LIU MEI (mother-in-law, 50) — greedy and loud; tight sequined QIPAO in emerald green, diamond necklace and earrings everywhere, small luxury handbag, permed hair.
5 GRANDPA SONG (patriarch, 70) — dark red silk Tang suit, white beard, DRAGON-HEAD walking cane.
6 SONG JIAOJIAO (jealous cousin, 24) — fiery RED evening gown, heavy makeup feel, long wavy hair, smug.
7 SECRETARY LIN (30) — sharp black suit, tie, neat short hair, very formal.
A dark navy background is OK for this sheet only.'''),
('02','ท่าทางกู้เฉิน (พระเอก)',['out-dragon-01-model-sheet.png (ที่เพิ่งได้)','ref-dg-02-style-poses.png'],'out-dragon-02-poses-guchen.png',
'''Image 1 = the cast. Image 2 = how my full-body pose sheets look (copy that layout and style).

Draw 9 FULL-BODY POSES of GU CHEN only (dusty courier uniform), side view facing right, same scale:
1 walking in, carefully holding a small cake box with both hands, warm gentle face · 2 standing, holding out the cake box toward the right, smiling softly · 3 standing still, empty hands, calm, ignoring insults · 4 standing, fists clenched at his sides, eye narrowed with a cold glint (hidden power) · 5 standing, head turned toward the right, sincere serious look · 6 flinching, a small red scratch line on his cheek, papers hitting his face (draw a few flying sheets) · 7 tensed, ready to counter-punch, one fist pulled back · 8 shocked, eye wide, one arm reaching forward, shouting · 9 FLASHBACK version: same man in a sharp black luxury suit, sitting in a leather chair, one hand resting on a desk (no desk drawn), commanding presence.'''),
('03','ท่าทางหว่านอิน (นางเอก) + ภาพคู่กอดกัน',['out-dragon-01-model-sheet.png (ที่เพิ่งได้)','ref-dg-02-style-poses.png'],'out-dragon-03-poses-wanyin.png',
'''Image 1 = the cast. Image 2 = pose sheet style.

Draw 9 images, side view facing right, same scale. WANYIN (white dress, bun with half white jade hairpin):
1 holding out a contract folder with both trembling hands, happy tears · 2 smiling sincerely, stepping forward · 3 being held back: her arm stretched BACKWARD (someone grabs it, not drawn), body leaning forward, longing face · 4 tears in eye, shouting angrily, one hand pointing forward · 5 crouching, picking papers up from the floor · 6 standing, tearing a stack of papers in half, determined · 7 eye wide in horror, shouting a warning, one hand reaching forward · 8 running/lunging forward with arms open.
9 PAIR IMAGE (one image, two characters): WANYIN hugging GU CHEN tightly from the front, her back turned toward the right to shield him, her arms wrapped around him; GU CHEN's eye wide in shock. Same scale as the single poses.'''),
('04','ท่าทางจ้าวไห่ (ตัวร้าย)',['out-dragon-01-model-sheet.png (ที่เพิ่งได้)','ref-dg-02-style-poses.png'],'out-dragon-04-poses-zhaohai.png',
'''Image 1 = the cast. Image 2 = pose sheet style.

Draw 8 FULL-BODY POSES of ZHAO HAI only (flashy purple-gold suit, gold watch), side view facing right, same scale:
1 strutting in, holding a HUGE bouquet of red roses, winking, eyebrows raised · 2 standing, arrogant, pointing at someone, smug · 3 KICKING high with one leg (a hard upward kick), sneering · 4 stomping down with one foot, grinding, laughing · 5 laughing with his head thrown back, hand on belly · 6 furious, face twisted, a cartoon anger vein mark, grabbing a red wine bottle · 7 lunging forward with the wine bottle raised high overhead, ready to smash · 8 swinging the bottle down hard (motion lines).'''),
('05','ท่าทางแม่ยาย คุณปู่ เจียวเจียว เลขาหลิน',['out-dragon-01-model-sheet.png (ที่เพิ่งได้)','ref-dg-03-style-poses-sitting.png'],'out-dragon-05-poses-family.png',
'''Image 1 = the cast. Image 2 = pose sheet style (sitting poses sit on an invisible chair).

Draw 12 FULL-BODY POSES, side view facing right, same scale:
LIU MEI (green qipao, diamonds): 1 rushing forward fawning, hands clasped, big fake smile · 2 grabbing and yanking someone's arm (her arm stretched forward pulling) · 3 screaming, pointing furiously · 4 throwing a stack of papers forward hard · 5 cheering cruelly, fist raised.
GRANDPA SONG (red Tang suit, dragon cane): 6 sitting on a grand chair (chair not drawn), reading an open folder, eye wide with greed, laughing · 7 sitting, slamming the dragon cane down on the floor, cold stern face.
SONG JIAOJIAO (red gown): 8 standing, pouting with jealousy, side-eye · 9 leaning to whisper behind her hand, sly · 10 arms crossed, laughing mockingly.
SECRETARY LIN (black suit): 11 bowing deeply 90 degrees · 12 standing straight, holding a folder.'''),
('06','หน้าโคลสอัพ (สำคัญ ละครแนวตั้งใช้เยอะ)',['out-dragon-01-model-sheet.png (ที่เพิ่งได้)','ref-dg-04-style-faces.png'],'out-dragon-06-faces.png',
'''Image 1 = the cast. Image 2 = how my face sheets look (match head size and style, WIDE gaps between heads).

Heads, necks and shoulders only, side view facing right, all the same size, mouth SMALL and CLOSED:
ROW 1 — GU CHEN: calm deep stare · eye glinting cold with hidden power · shocked eye wide · gentle warm look.
ROW 2 — WANYIN: smiling with happy tears · crying · determined · horrified.
ROW 3 — ZHAO HAI: smug sneer · rage with anger vein · LIU MEI: screaming · JIAOJIAO: smirk · GRANDPA: greedy wide eye · GRANDPA: cold stern.'''),
('07','พร็อพหลัก',['ref-dg-05-style-props.png','ref-dg-06-style-props2.png'],'out-dragon-07-props.png',
'''Image 1 and 2 = how my prop sheets look (style + spacing).

Draw these items, separate, wide gaps, NO text anywhere (blank labels):
1 a luxury contract folder (dark leather) open, with a big GOLD wax seal stamp mark on the page · 2 a gold seal stamp tool · 3 a small round white anniversary cake inside a clear plastic box with a ribbon, blank sugar plaque on top · 4 the same cake SMASHED and splattered (cream splat) · 5 a small broken sugar plaque · 6 a thick stack of documents · 7 three single flying paper sheets in different angles · 8 a dark red wine bottle · 9 the wine bottle SHATTERING: glass shards and a red wine burst (cartoon) · 10 a huge bouquet of red roses · 11 a dragon-head walking cane · 12 a half WHITE JADE hairpin · 13 a champagne glass · 14 a waiter's silver tray.'''),
('08','ฉาก: โถงจัดเลี้ยงคฤหาสน์ตระกูลซ่ง (แนวตั้ง)',['ref-dg-07-style-bg.png','ref-dg-08-style-bg-night.png'],'out-dragon-08-bg-hall.png',
'''Image 1 and 2 = background style to copy.

Draw the grand banquet hall of a rich Chinese family mansion at night: huge CRYSTAL CHANDELIERS glowing at the top, red-and-gold walls with carved wood panels, a long RED CARPET on the floor running left to right, a grand carved wooden chair for the patriarch on one side, round banquet tables with white cloth in the background, faint silhouettes of guests holding champagne far behind. Leave the front floor EMPTY for my characters.
'''+BG),
('09','ฉาก: โถงจัดเลี้ยงแบบกว้าง (สำหรับแพนกล้อง)',['out-dragon-08-bg-hall.png (ที่เพิ่งได้)'],'out-dragon-09-bg-hall-wide.png',
'''Image 1 = the hall you just drew. Draw the SAME hall as an EXTRA WIDE panorama 2:1 (about 2400×1200): on the LEFT the huge double ENTRANCE DOORS (dark wood with gold handles), in the MIDDLE the long red carpet, on the RIGHT the patriarch's grand chair on a small platform. Chandeliers along the top, guests' silhouettes far behind. Front floor EMPTY.
'''+BG.replace('VERTICAL 9:16 (about 1080×1920) for a phone-screen drama. ','')),
('10','ฉาก: ห้องทำงานประธาน (ย้อนอดีต) แนวตั้ง',['ref-dg-07-style-bg.png'],'out-dragon-10-bg-office.png',
'''Image 1 = background style to copy, but darker and more powerful.

Draw a dark, imposing CEO office at night: a big carved TEAK desk, a tall leather chair, floor-to-ceiling window with a glittering city skyline, a dragon painting on the wall (no text), low golden lamp light. Mood: hidden power, luxury, secrecy.
'''+BG),
('11','พร็อพเสริม + มือแหวนมังกร + ฝูงแขก',['ref-dg-05-style-props.png','out-dragon-01-model-sheet.png (ที่เพิ่งได้)'],'out-dragon-11-props-extra.png',
'''Image 1 = prop sheet style. Image 2 = the cast (for the clothing style).

Draw separately, wide gaps:
1 CLOSE-UP of a man's hand wearing a BLACK JADE DRAGON RING, fingers tapping on a teak desk edge · 2 a row of 5 party GUESTS as ink stick figures in evening wear holding champagne, LAUGHING and pointing (one wide strip) · 3 the same 5 guests GASPING in shock, hands over mouths · 4 a crimson heart-beat pulse symbol (for a heartbeat effect) · 5 a falling rose petal (draw 3) · 6 a cartoon glass-crack burst effect.
'''),
('12','(ทางเลือก) ภาพปกแนวตั้ง',['out-dragon-01-model-sheet.png (ที่เพิ่งได้)','ref-dg-00-style-cast.png'],'out-dragon-12-thumbnail.png',
'''Vertical 9:16 cover (1080×1920), same ink style. In a glittering banquet hall: WANYIN in her white dress hugging GU CHEN in his dusty courier uniform to shield him, ZHAO HAI in the purple suit swinging a red wine bottle down at them, LIU MEI and JIAOJIAO laughing behind, a smashed cake on the red carpet. Dramatic lighting. Big empty dark area at the top for a title I add myself. No text.'''),
]
allmd=['# คำสั่งทั้งหมด · มังกรซ่อนลาย EP1 (หน้าเดียว)\n'];rows=[]
for n,th,att,out,body in P:
    full=body if n in('08','09','10') else body+'\n\n'+STYLE
    atts=', '.join(a if 'ที่เพิ่งได้' in a else 'refs/'+a for a in att)
    txt=f"# {n} · {th}\nแนบรูป: {atts}\nบันทึกผลเป็น: {out}\n\n----- คัดลอกตั้งแต่บรรทัดนี้ -----\n\n{full}\n"
    open(f'{B}/prompts/{n}-prompt.txt','w').write(txt);allmd.append(txt.replace('----- คัดลอกตั้งแต่บรรทัดนี้ -----','```').rstrip()+'\n```\n')
    rows.append(f"| {n} | {th} | {atts} | {out} |")
open(f'{B}/ALL-PROMPTS.md','w').write('\n'.join(allmd))
open(f'{B}/README.md','w').write(open(S+'README-src.md').read().replace('{{ROWS}}','\n'.join(rows)))
z=zipfile.ZipFile(S+'dragon-ep1-art-pack.zip','w',zipfile.ZIP_DEFLATED)
for r,d,fs in os.walk(B):
    for f in sorted(fs):p=os.path.join(r,f);z.write(p,os.path.relpath(p,S))
z.close();print(os.path.getsize(S+'dragon-ep1-art-pack.zip'))
