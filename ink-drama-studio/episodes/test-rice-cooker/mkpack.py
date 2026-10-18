# art pack for test-rice-cooker (5 images, 16:9). Run from this folder -> out/artpack/test-rice-cooker-art-pack.zip
import os,shutil,zipfile
S='out/artpack/'
B=S+'test-rice-cooker-art-pack';shutil.rmtree(B,ignore_errors=True);os.makedirs(B+'/refs');os.makedirs(B+'/prompts')
R='../../refs/'  # style sheets from earlier episodes, see refs/README.md
refs={k:R+k for k in ['ref-dg-00-style-cast.png','ref-dg-01-style-cast2.png','ref-dg-03-style-poses-sitting.png',
'ref-dg-05-style-props.png','ref-dg-06-style-props2.png','ref-dg-07-style-bg.png','ref-dg-08-style-bg-night.png']}
for k,v in refs.items():shutil.copy(v,f'{B}/refs/{k}')
# the poses go on a #00FF00 screen and tools/extract.py keys g>200,r<130,b<110: nothing in this episode may be saturated green
STYLE='''STYLE (identical to the attached style references from my series — same artist, same world):
- Premium hand-drawn ink brush line art, bold tapered strokes with thick-thin variation.
- Stick-figure people: thin cream limbs and hands with a dark ink outline, round solid BLACK heads with a thick off-white outline, ONE big white eye near the front of the head, small simple mouth. Hair is part of the black head shape, with a few off-white strokes. Real clothes in flat colors, exactly like the references.
- A thick off-white sticker outline runs around every whole figure and every item.
- Flat colors only. No shading, no gradients, no texture noise.
- Side view, every character FACING RIGHT. Full body, same scale in every image, feet on one invisible baseline.
- Keep the MOUTH SMALL AND CLOSED in every pose (I animate the mouth myself).
- Background: solid flat #00FF00 green with nothing else on it, exactly like the green reference sheet. No glow, no halo, no shadows, no ground line.
- Every item isolated with WIDE gaps, nothing touching or overlapping. Nothing green on the characters or items.
- No text, no letters, no numbers, no logos. Violence stays cartoon-mild.'''
BG='''STYLE: same painted ink-line scenery as the attached background references — off-white ink outlines, flat rich colors, warm glowing lights, dark navy shadows. NO characters. NO text anywhere (no labels on jars, no calendar, no signs, no numbers).
Side-on, flat "stage" view like a 2D cartoon set, exactly like the wide reference: the floor is a flat EMPTY strip along the bottom third with plenty of space for characters.'''
P=[
('01','แบบตัวละคร 2 คน (ทำก่อน)',['ref-dg-00-style-cast.png','ref-dg-01-style-cast2.png'],'out-rc-01-model-sheet.png',
'''Image 1 and 2 = the STYLE to copy exactly (my ink stick-figure series, characters with real clothes). The chubby man with the round belly in image 2 shows the body type I want for A.

Draw a CHARACTER MODEL SHEET for a short Thai family comedy set in an old wooden-house kitchen. 2 characters standing side by side, side view facing right, same scale:
1 A (son, about 25) — CHUBBY with a big round belly; a plain bright ORANGE t-shirt (no print), faded blue denim shorts, red rubber flip-flops; a small messy tuft of hair; dreamy, over-excited get-rich-quick look.
2 MOM (about 55) — a Thai housewife, a little shorter than A; a FLORAL-PATTERN APRON (red and pink flowers on cream) over a simple maroon blouse and a long dark-brown batik wrap skirt; hair in a low bun; holding a long-handled metal LADLE in one hand; calm, unimpressed look.
Background: plain dark navy for this sheet only, like image 1.'''+'\n\n'+STYLE.replace('- Background: solid flat #00FF00 green with nothing else on it, exactly like the green reference sheet. No glow','- No glow')),
('02','ท่าทางเอ (9 ท่า)',['out-rc-01-model-sheet.png (ที่เพิ่งได้)','ref-dg-03-style-poses-sitting.png'],'out-rc-02-poses-A.png',
'''Image 1 = the cast (draw A exactly like this). Image 2 = how my pose sheets look: flat #00FF00 green background, clean figures, no glow.

Draw 9 FULL-BODY POSES of A only (orange t-shirt, denim shorts, red flip-flops), side view facing right, same scale, in 3 rows of 3 with wide gaps:
1 running in fast, leaning forward, arms pumping, excited · 2 standing, one finger pointing up "I have an idea!", chest puffed out · 3 holding a smartphone up high in one hand, the other fist pumping · 4 arms spread wide, eye sparkling with a dreamy far-away look (imagining money) · 5 DREAM VERSION: wearing BLACK SUNGLASSES, sitting smugly cross-legged on an invisible pile (pile not drawn), one arm spread out like a king · 6 deflated: scratching the back of his head, a big blue sweat drop, awkward look · 7 jumping for joy, both arms up, feet off the ground · 8 standing frozen, head tilted down, staring at something on a table in front of him, blank eye · 9 sheepish: palms pressed together begging, shoulders hunched, small apologetic look.'''+'\n\n'+STYLE),
('03','ท่าทางแม่ (6 ท่า)',['out-rc-01-model-sheet.png (ที่เพิ่งได้)','ref-dg-03-style-poses-sitting.png'],'out-rc-03-poses-mom.png',
'''Image 1 = the cast (draw MOM exactly like this). Image 2 = pose sheet style: flat #00FF00 green background, clean figures, no glow.

Draw 6 FULL-BODY POSES of MOM only (floral apron, maroon blouse, batik skirt, low bun), side view facing right, same scale, in 2 rows of 3 with wide gaps:
1 standing at a stove (stove not drawn), stirring a pot in front of her with the long ladle, arm reaching forward and down, bored half-closed eye · 2 standing, ladle held loosely at her side, flat unimpressed stare · 3 one hand on her hip, pointing the ladle forward, questioning look · 4 lifting an OLD round rice cooker up in front of her with both hands, offering it forward (the cooker: faded pastel-PINK body with chipped paint and small dents, yellowed white lid) · 5 holding the same old rice cooker against her hip with one arm, one eyebrow raised, knowing look · 6 angry: raising the ladle high over her head, ready to chase, a red cartoon anger-vein mark.'''+'\n\n'+STYLE),
('04','ฉาก: ครัวบ้านไม้ตอนเย็น แบบกว้าง (สำหรับแพนกล้อง)',['ref-dg-08-style-bg-night.png','ref-dg-07-style-bg.png'],'out-rc-04-bg-kitchen-wide.png',
'''Image 1 = the wide-set style and layout to copy (extra wide, empty floor strip along the bottom). Image 2 = how my interiors look with warm evening light through a window.

Draw the kitchen of an old Thai WOODEN HOUSE in the early evening, as an EXTRA WIDE panorama 2:1 (about 2400×1200), left to right:
LEFT: an open wooden back door showing the dusky orange yard outside (a character runs in and out here).
CENTER-LEFT: a small old wooden dining table with a completely EMPTY tabletop (I add the rice cooker myself), one wooden stool.
CENTER: a wooden-shutter window with a warm orange sunset sky, a single bare bulb hanging from the ceiling with a soft warm glow.
RIGHT: a low wooden counter with a two-burner gas stove, EMPTY on top (I add the pot myself), hanging aluminium pots and pans, a shelf with plain unlabeled jars, a woven rice basket.
Wooden plank walls and floor, warm cosy evening light. The front floor strip stays EMPTY for my characters.
'''+BG),
('05','พร็อพ',['ref-dg-05-style-props.png','ref-dg-06-style-props2.png'],'out-rc-05-props.png',
'''Image 1 and 2 = how my prop sheets look (style, sticker outline, spacing).

Draw these 7 items, separate, WIDE gaps, side view, NO text anywhere (no brand, no words on buttons):
1 an OLD round electric rice cooker: faded pastel-PINK body with chipped paint and small dents, yellowed white lid, short cord, lid CLOSED · 2 the SAME old rice cooker with the lid OPEN, completely empty inside · 3 an aluminium cooking pot full of orange-red curry (no steam) · 4 a big MOUNTAIN of banknotes and gold coins with a wide flat top a person could sit on (plain PURPLE and RED bills: NO numbers, NO faces, NO text) · 5 three shiny NEW white-and-chrome rice cookers at different tilts, as if floating, with small gold sparkles · 6 a takeaway white foam lunch box, lid open, white rice with a fried egg · 7 a pair of black sunglasses.'''+'\n\n'+STYLE),
]
allmd=['# คำสั่งทั้งหมด · หม้อหุงข้าวแห่งความฝัน (หน้าเดียว)\n'];rows=[]
for n,th,att,out,body in P:
    atts=', '.join(a if 'ที่เพิ่งได้' in a else 'refs/'+a for a in att)
    txt=f"# {n} · {th}\nแนบรูป: {atts}\nบันทึกผลเป็น: {out}\n\n----- คัดลอกตั้งแต่บรรทัดนี้ -----\n\n{body}\n"
    open(f'{B}/prompts/{n}-prompt.txt','w',encoding='utf-8').write(txt);allmd.append(txt.replace('----- คัดลอกตั้งแต่บรรทัดนี้ -----','```').rstrip()+'\n```\n')
    rows.append(f"| {n} | {th} | {atts} | {out} |")
open(f'{B}/ALL-PROMPTS.md','w',encoding='utf-8').write('\n'.join(allmd))
open(f'{B}/README.md','w',encoding='utf-8').write(open('README-src.md',encoding='utf-8').read().replace('{{ROWS}}','\n'.join(rows)))
# the owner drops the whole zip into ChatGPT, so it carries its own brief for ChatGPT, in English
steps='\n'.join(f"| {n} | prompts/{n}-prompt.txt | "+', '.join('your image 01' if 'ที่เพิ่งได้' in a else 'refs/'+a for a in att)+f" | {out} |" for n,th,att,out,body in P)
open(f'{B}/00-START-HERE-for-ChatGPT.md','w',encoding='utf-8').write(f'''# For ChatGPT: make 5 images for my animated short

Short: "The Dream Rice Cooker" (Thai family comedy, 16:9). Everything is in this zip:
- `refs/` — finished sheets from my series. Copy their art style EXACTLY.
- `prompts/01-prompt.txt` … `05-prompt.txt` — the exact prompt for each image.

How to work:
1. Unzip, open the images in `refs/`, and study the style before drawing anything.
2. Make the images ONE AT A TIME, in order 01 → 05. After each image, stop and wait for my OK or my fixes.
3. Image 01 (model sheet) defines both characters. Images 02 and 03 must use your image 01 as the character reference.
4. For each step, use the reference images listed below and follow its prompt file word for word.
5. Give each result the file name listed below.

| step | prompt | reference images | save as |
|---|---|---|---|
{steps}

Rules for every image: no text, letters, numbers or logos anywhere · characters face RIGHT · mouths small and closed · no glow or halo · nothing green on characters or props (02, 03 and 05 are on a flat #00FF00 green background) · image 04 is an extra-wide 2:1 panorama with an empty floor strip.
''')
z=zipfile.ZipFile(S+'test-rice-cooker-for-chatgpt.zip','w',zipfile.ZIP_DEFLATED)
for r,d,fs in os.walk(B):
    for f in sorted(fs):p=os.path.join(r,f);z.write(p,os.path.relpath(p,S))
z.close();print(os.path.getsize(S+'test-rice-cooker-for-chatgpt.zip'))
