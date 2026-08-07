# ภาพหน้าปก — vox-6 · The EV Insight

สร้างด้วย `python tools/gen_image.py --model pro --prompt "<วาง prompt>" --out media/projects/vox-6-sodium-ion/covers/<ชื่อ>.png`

`gemini-3-pro-image` **เขียนภาษาไทยถูก** ใส่คำไทยลงใน prompt ได้ตรง ๆ (พิสูจน์แล้วใน vox-2)
กฎบังคับทุก prompt (PIPELINE §11): ระบุขอบเขตขอบภาพ · ตัวเลขหนึ่งตัวใหญ่กว่าตัวอื่น 3–4 เท่า ·
`perfectly spelled` · `no gradient, no glow` · เรียกชื่อสีตรง ๆ · **หัวเรื่องไทยอยู่บรรทัดเดียว**

**หน้าปกนี้ต่างจากช่องอื่น:** พื้นหลังเป็น blueprint กรมท่าเข้ม ไม่ใช่กระดาษซีเปีย
(`channels/ev.json` → `theme: blueprint`) ต้องดูเป็นเทคนิค ไม่ใช่ประวัติศาสตร์

---

## แบบ A — ตัวเลขนำ (แนะนำ)

ตัวเลข `−40°` เป็นพระเอก คนเลื่อนผ่านเห็นตัวเลขก่อนอ่านคำ

```
A bold vertical YouTube thumbnail, 1080x1920, dark navy blueprint background (deep midnight
blue #0e1a24) with a faint thin cyan technical grid.

Left side: a large white pile of coarse salt crystals, brightly lit, photographic, sitting on
the grid. Right side: a single bare silver cylindrical battery cell standing upright, metallic,
clean studio lighting.

Huge text in the upper third, in Thai, on ONE single line, perfectly spelled, in a heavy
geometric sans-serif:
แบตจากเกลือ

Directly below it, one enormous number in bright amber yellow, 4x the size of any other type:
−40°

Below the number, one short line of smaller white Thai text, perfectly spelled, one line only:
ยิ่งหนาว ยิ่งได้เปรียบ

Flat solid colours: deep midnight blue, pure white, bright amber yellow, one bright cyan accent.
No gradient, no glow, no lens flare, no bokeh. High contrast. Crisp edges.
Keep 8% clear margin on the left and right, 6% clear at top and bottom — no text or object
may touch any edge. Text must be sharp, level, and fully inside the frame.
```

## แบบ B — การกลับด้าน (ใช้เมื่ออยากได้ engagement จากความงง)

ไอออนสองก้อนขนาดต่างกันชัดเจน แล้วให้ตัวใหญ่กว่าชนะ

```
A bold vertical YouTube thumbnail, 1080x1920, dark navy blueprint background (deep midnight
blue #0e1a24) with a faint thin cyan technical grid.

Centre of the frame: two flat circles side by side on the grid, drawn as a clean technical
diagram. The LEFT circle is small, teal, labelled Li in white. The RIGHT circle is clearly
larger, coral red, labelled Na in white. A thick bright amber arrow points from the small
circle to the large one.

Large text across the upper third, in Thai, on ONE single line, perfectly spelled, heavy
geometric sans-serif, pure white:
ใหญ่กว่า แต่ลื่นกว่า

Below the two circles, one line of bright amber Thai text, one line only, perfectly spelled:
ทำไมไอออนที่ใหญ่กว่า ถึงวิ่งได้ดีกว่า

Flat solid colours only: deep midnight blue, pure white, teal, coral red, bright amber.
No gradient, no glow, no shading, no 3D. Crisp flat vector look with photographic lighting
only on nothing — everything is flat diagram.
Keep 8% clear margin on the left and right, 6% clear at top and bottom.
```

## แบบ C — หักมุมเรื่อง solid-state (ใช้เมื่ออยากดึงคนที่ตามข่าวแบตอยู่แล้ว)

```
A bold vertical YouTube thumbnail, 1080x1920, dark navy blueprint background (deep midnight
blue #0e1a24) with a faint thin cyan technical grid.

Centre: a horizontal row of nine flat rectangular blocks, like a progress scale. The first four
blocks are filled solid coral red; the remaining five are empty dark outlines. Below the row,
small white numerals 1 through 9 under each block, perfectly spelled.

Above the row, large Thai text on ONE single line, perfectly spelled, heavy geometric
sans-serif, pure white:
solid-state อยู่ตรงนี้

Below the row, one enormous number in coral red, 4x the size of any other type:
4 / 9

At the bottom, one short line of bright amber Thai text, one line only, perfectly spelled:
ตัวที่มาถึงจริง คือแบตจากเกลือ

Flat solid colours: deep midnight blue, pure white, coral red, bright amber.
No gradient, no glow, no 3D, no reflections. High contrast, crisp edges.
Keep 8% clear margin on the left and right, 6% clear at top and bottom.
```

---

## หลังสร้างเสร็จ — ต้องดูภาพจริงก่อนใช้

1. **อ่านคำไทยทุกตัวออกไหม** สระลอย วรรณยุกต์หาย หรือตัดคำผิดกลางคำ = ทิ้ง สร้างใหม่
2. **ย่อเหลือ 320px แล้วยังอ่านออกไหม** นั่นคือขนาดจริงในฟีดมือถือ
3. **ตัวเลขใหญ่กว่าตัวอื่นจริงหรือเปล่า** โมเดลชอบทำให้ทุกอย่างขนาดใกล้กัน
4. **เซลล์แบตเตอรี่ในภาพต้องไม่มีโลโก้หรือยี่ห้อ** ถ้ามีอะไรที่อ่านเหมือนแบรนด์ ทิ้ง
   (กฎ PIPELINE §4 — คลิปพูดถึง CATL โดยชื่อ ภาพจึงห้ามดูเหมือนสินค้าของ CATL)

เก็บตัวที่ไม่ผ่านไว้ข้าง ๆ พร้อมชื่อบอกเหตุผล เหมือน `car-modelY-lookalike.png` ของ vox-5 —
prompt ที่ตั้งใจดีไม่ใช่หลักฐาน ภาพที่ออกมาคือหลักฐาน
