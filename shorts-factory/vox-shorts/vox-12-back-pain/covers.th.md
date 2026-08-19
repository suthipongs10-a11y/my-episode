# ภาพหน้าปก — vox-12 · สุขภาพแบบเข้าใจง่าย

```
export GEMINI_API_KEY="$GOOGLE_TTS_API_KEY"
python tools/gen_image.py --model pro --aspect 16:9 --prompt "<วาง prompt>" \
  --out media/projects/vox-12-back-pain/covers/<ชื่อ>.png
```

> ### ⬛ **16:9 แนวนอน** เพราะคลิปยาว 8 นาที (PIPELINE §3)

**สกิน blueprint กรมท่าเข้ม** เหมือนตัวคลิป

> ## ⛔ กฎเฉพาะคลิปนี้ — ปกห้ามมีภาพสแกน
>
> คลิปนี้พูดว่า *ภาพสแกนตีความผิดได้ง่าย* การเอาภาพเอกซเรย์หรือ MRI ที่ AI สร้างขึ้นมาแปะบนปก
> คือการทำเอกสารทางการแพทย์ปลอมขึ้นมาประกอบเรื่องที่พูดถึงเอกสารทางการแพทย์ ซึ่งเป็นสิ่งเดียวกับ
> ที่คลิปกำลังเตือน — และคนเลื่อนผ่านจะจำภาพนั้นไปโดยไม่ได้ดูคลิปด้วย
>
> ในคลิปทั้ง 8 นาทีจึงไม่มีภาพสแกนสักภาพ (พื้นหลังช่วงนั้นคือ**ห้องเครื่องสแกนจริง** ไม่ใช่ภาพผลสแกน)
> ปกก็ต้องเป็นแบบเดียวกัน **ห้ามมีกระดูกสันหลังแบบภาพถ่ายรังสี ห้ามมีฟิล์ม ห้ามมีตู้ไฟอ่านฟิล์ม**

**ตัวเลขที่ต้องอ่านออกที่ 320px คือ `96%`** — มันคือทั้งคลิปในตัวเลขเดียว
`tools/gen_image.py` เคยถูกวัดไว้แล้วว่าถ้าสั่ง *"อย่างน้อยสูงกว่าสี่เท่า"* จะได้อัตราส่วนจริง
ราว **3.19 เท่า** (PIPELINE §11 ที่แก้แล้ว) — ให้เขียนคำสั่งแบบนั้น ไม่ใช่เขียนว่า "ตัวใหญ่"

---

## แบบ A — 96% ของคนที่ไม่ปวดหลังเลย (ใช้ตัวนี้)

ปกนี้ทำงานเพราะมันขัดกัน: ตัวเลขที่ฟังดูเหมือนคนป่วย ติดอยู่กับประโยคที่บอกว่าไม่มีใครปวด

```
A bold horizontal YouTube thumbnail, 1920x1080 landscape, very dark navy blue background
(#0b1a2a) with a faint thin blueprint grid, flat technical drawing style.

LEFT HALF: large Thai headline in warm off-white, heavy geometric sans-serif, stacked on
exactly two lines, perfectly spelled, reading exactly:
สแกนแล้วเจอ
ไม่ได้แปลว่าเป็นสาเหตุ
Directly below the headline, one short line of muted grey-blue Thai text on ONE line,
perfectly spelled, much smaller: ในคนที่ไม่มีอาการปวดหลังเลย

RIGHT HALF: one enormous number in bright amber, at least four times taller than the
headline text, perfectly formed, reading exactly:
96%
Directly under the number, one short line of amber Thai text, perfectly spelled, much
smaller, reading exactly: อายุ 80 ปี

Flat solid colours only: very dark navy, warm off-white, bright amber, muted grey-blue.
No gradient, no glow, no drop shadow, no 3D, no photographic texture.
No x-ray, no MRI, no radiograph, no medical scan image of any kind, no film, no lightbox,
no spine, no skeleton, no anatomy drawing, no people, no doctors, no hospital, no logos,
no other numbers or letters anywhere except the specified Thai text and 96%.
Keep 8% clear margin left and right, 6% top and bottom.
```

---

## แบบ B — สองอายุ สองแท่ง

ถ้าแบบ A ออกมาแล้วตัวเลขเล็กเกินไป ให้ลองแบบนี้ กราฟสองแท่งอ่านออกเร็วกว่าตัวเลขเดี่ยว
ในบางขนาด และมันคือกราฟเดียวกับที่อยู่ในคลิปนาทีที่ 1:13

```
A bold horizontal YouTube thumbnail, 1920x1080 landscape, very dark navy blue background
(#0b1a2a) with a faint thin blueprint grid, flat technical drawing style.

LEFT HALF: large Thai headline in warm off-white, heavy geometric sans-serif, stacked on
exactly two lines, perfectly spelled, reading exactly:
คนที่ไม่ปวดหลังเลย
ก็เจอความเสื่อม

RIGHT HALF: a simple flat bar chart with exactly two horizontal bars on a plain dark
background, no axes, no gridlines, no frame. The upper bar is short, in muted grey-blue.
The lower bar is very long, in bright amber, about three times the length of the upper bar.
To the LEFT of each bar, one short Thai label in muted grey-blue, perfectly spelled,
reading exactly, top to bottom: อายุ 20 ปี  then  อายุ 80 ปี
To the RIGHT of each bar, one number in the same colour as its bar, large and perfectly
formed, reading exactly, top to bottom: 37%  then  96%
The 96% is the largest text on the right half.

Flat solid colours only: very dark navy, warm off-white, bright amber, muted grey-blue.
No gradient, no glow, no drop shadow, no 3D, no photographic texture.
No x-ray, no MRI, no radiograph, no medical scan image of any kind, no spine, no skeleton,
no anatomy drawing, no people, no logos, no other numbers or letters anywhere except the
specified Thai text and the two percentages.
Keep 8% clear margin left and right, 6% top and bottom.
```

---

## ตรวจก่อนใช้

- [ ] อ่าน **96%** ออกตอนย่อเหลือกว้าง 320px
- [ ] สะกดไทยถูกทุกตัว โดยเฉพาะ **สาเหตุ · อาการ · ความเสื่อม** (โมเดลชอบทำสระหาย)
- [ ] ไม่มีภาพสแกน ฟิล์ม กระดูกสันหลัง หรือโครงกระดูก ในทุกมุมของภาพ
- [ ] ไม่มีตัวเลขหรือตัวอักษรอื่นหลุดเข้ามา
