# ภาพหน้าปก — vox-7 · สุขภาพแบบเข้าใจง่าย

```
export GEMINI_API_KEY="$GOOGLE_TTS_API_KEY"    # gen_image.py มองหาชื่อนี้ ไม่ใช่ GOOGLE_TTS_API_KEY
python tools/gen_image.py --model pro --prompt "<วาง prompt>" \
  --out media/projects/vox-7-hearing-dementia/covers/<ชื่อ>.png
```

`gemini-3-pro-image` เขียนภาษาไทยถูก ใส่คำไทยลงใน prompt ได้ตรง ๆ
กฎบังคับทุก prompt (PIPELINE §11): ระบุขอบเขตขอบภาพ · ตัวเลขหนึ่งตัวใหญ่กว่าตัวอื่น 3–4 เท่า ·
`perfectly spelled` · `no gradient, no glow` · เรียกชื่อสีตรง ๆ · **หัวเรื่องไทยอยู่บรรทัดเดียว**

**หน้าปกช่องนี้ใช้สกินกระดาษ** (ครีม/หมึกเข้ม/แดงอิฐ/เหลืองมัสตาร์ด) ไม่ใช่ blueprint กรมท่า
ของช่อง EV — คนดูต้องแยกออกว่าเป็นคนละช่องตั้งแต่ยังไม่อ่านตัวหนังสือ

---

## แบบ A — สองแท่งเท่ากัน (แนะนำ)

แกนของคลิปคือ "เท่ากัน" หน้าปกจึงควรเป็นสิ่งเดียวกัน คนเลื่อนผ่านเห็นสองแท่งยาวเท่ากันแล้วงงก่อน
แล้วค่อยอ่านว่าอะไรเท่ากับอะไร

```
A bold vertical YouTube thumbnail, 1080x1920, warm cream paper background (#efe6d3) with a
very subtle paper grain, editorial magazine style.

Centre of the frame: two thick horizontal brick-red bars of EXACTLY the same length, stacked
one above the other with clear space between them, drawn flat like a printed chart. To the
right of both bars, one shared brick-red bracket joining them.

Above the top bar, small dark ink Thai label, perfectly spelled, one line:
หูตึง

Above the lower bar, small dark ink Thai label, perfectly spelled, one line:
ไขมัน LDL

To the right of the bracket, one enormous number in brick red, 4x the size of any other type,
perfectly spelled:
7%

Large Thai headline across the upper third, dark ink on cream, heavy geometric sans-serif,
on ONE single line, perfectly spelled:
เท่ากันพอดี

At the bottom, one line of smaller dark ink Thai text, one line only, perfectly spelled:
ปัจจัยเสี่ยงสมองเสื่อม

Flat solid colours only: warm cream, dark ink brown-black, brick red, one mustard yellow accent.
No gradient, no glow, no drop shadow, no 3D. Crisp flat editorial print look.
Keep 8% clear margin on the left and right, 6% clear at top and bottom — nothing touches an edge.
```

## แบบ B — หูกับตัวเลข (ใช้เมื่ออยากให้จำภาพได้เร็ว)

```
A bold vertical YouTube thumbnail, 1080x1920, warm cream paper background (#efe6d3) with subtle
paper grain, editorial magazine style.

Lower half: a large clean photograph of a single human ear in profile, an older adult, soft
even lighting, cut out cleanly and placed on the cream background like a magazine collage.
No jewellery, no earring, no hearing device.

Upper third: large Thai headline in dark ink, heavy geometric sans-serif, on ONE single line,
perfectly spelled:
หูกับความจำ เกี่ยวกันอย่างไร

Beside the ear, one enormous number in brick red, 4x the size of any other type:
7%

Below the number, one short line of dark ink Thai text, one line only, perfectly spelled:
เท่ากับไขมันในเลือด

Flat solid colours: warm cream, dark ink, brick red. Photographic only for the ear; everything
else flat. No gradient, no glow, no 3D, no neon.
Keep 8% clear margin on the left and right, 6% clear at top and bottom.
```

## แบบ C — คานพาดหัวข่าว (กล้าที่สุด ใช้คู่กับหัวข้อทางเลือกข้อ 5)

หน้าปกที่วางจุดยืนของช่อง: เราอ่านงานวิจัย ไม่ได้ลอกพาดหัว

```
A bold vertical YouTube thumbnail, 1080x1920, warm cream paper background (#efe6d3) with subtle
paper grain, editorial magazine style.

Upper half: one enormous number in brick red, 4x the size of any other type, with a thick
brick-red diagonal strike-through line drawn straight across it:
48%

Directly under the struck-through number, large Thai headline in dark ink, heavy geometric
sans-serif, on ONE single line, perfectly spelled:
ข่าวบอกครึ่งเดียว

Lower half: a flat grid of 40 small circles in 2 rows of 20. The first 10 circles are solid
brick red; the remaining 30 are pale grey outlines. Drawn flat like a printed infographic.

Below the circles, one line of smaller dark ink Thai text, one line only, perfectly spelled:
ตัวเลขนั้นมาจากคนกลุ่มนี้

Flat solid colours only: warm cream, dark ink, brick red, pale grey. No gradient, no glow,
no 3D, no shadow.
Keep 8% clear margin on the left and right, 6% clear at top and bottom.
```

---

## หลังสร้างเสร็จ — ต้องดูภาพจริงก่อนใช้

1. **อ่านคำไทยทุกตัวออกไหม** สระลอย วรรณยุกต์หาย ตัดคำผิดกลางคำ = ทิ้ง สร้างใหม่
2. **แบบ A: สองแท่งยาวเท่ากันจริงไหม** ถ้าโมเดลวาดไม่เท่ากัน **หน้าปกกำลังโกหกแกนของคลิป** —
   ทิ้งทันที ไม่ต้องเสียดาย นี่คือข้อที่สำคัญที่สุดในหน้านี้
3. **แบบ C: เส้นขีดฆ่าอยู่บนตัวเลขจริงไหม** ถ้าเส้นหลุดไปอยู่ข้าง ๆ ความหมายพลิกทันที
4. **ย่อเหลือ 320px แล้วยังอ่านออกไหม** ขนาดจริงในฟีดมือถือ
5. **หูในภาพต้องไม่มีต่างหูและไม่มีเครื่องช่วยฟัง** — คลิปพูดถึงคนที่ *ยังไม่* ใส่

เก็บตัวที่ไม่ผ่านไว้ข้าง ๆ พร้อมชื่อบอกเหตุผล เหมือน `haze-sovietblocks-reject.png` ของคลิปนี้
ที่ได้แฟลตแบบโซเวียตมาทั้งที่ prompt ไม่ได้ขอ — **ภาพที่ออกมาคือหลักฐาน ไม่ใช่ prompt**
