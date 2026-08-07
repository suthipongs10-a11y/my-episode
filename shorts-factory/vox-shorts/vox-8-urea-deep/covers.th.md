# ภาพหน้าปก — vox-8 · เกษตรที่คนไทยควรรู้

```
export GEMINI_API_KEY="$GOOGLE_TTS_API_KEY"
python tools/gen_image.py --model pro --aspect 16:9 --prompt "<วาง prompt>" \
  --out media/projects/vox-8-urea-deep/covers/<ชื่อ>.png
```

> ### ⬛ หน้าปกของคลิปนี้เป็น **16:9 แนวนอน** ไม่ใช่ 9:16
>
> ไฟล์นี้เขียนไว้เป็น 9:16 ตอนที่คลิปยังเป็นแนวตั้ง เมื่อคลิปเปลี่ยนเป็นแนวนอน
> **หน้าปกต้องเปลี่ยนตาม** — หน้าปก YouTube มาตรฐานคือ 1280×720 (16:9)
> prompt ทั้งสามข้างล่างแก้ให้เป็นแนวนอนแล้ว และวางองค์ประกอบเป็นสองคอลัมน์
> ซึ่งเป็นสิ่งที่แนวตั้งทำไม่ได้
>
> **กฎเดียวกับตัวคลิป:** คลิปยาว = แนวนอนทั้งวิดีโอและหน้าปก · Shorts = แนวตั้ง

กฎบังคับทุก prompt (PIPELINE §11): ระบุขอบเขตขอบภาพ · ตัวเลขหนึ่งตัวใหญ่กว่าตัวอื่น 3–4 เท่า ·
`perfectly spelled` · `no gradient, no glow` · เรียกชื่อสีตรง ๆ · **หัวเรื่องไทยบรรทัดเดียว**
ห้ามใช้คำว่า degrees หรือสะกดตัวเลขเป็นคำ — เขียนสัญลักษณ์ไปเลย (บทเรียนจาก vox-6)

**สกินช่องนี้คือกระดาษครีม** เหมือน vox-2 ไม่ใช่ blueprint กรมท่าของช่อง EV
คนดูต้องแยกออกว่าเป็นคนละช่องตั้งแต่ยังไม่อ่านตัวหนังสือ

---

## แบบ A — 38 กับ 85 (แนะนำ)

แกนของคลิปคือตัวเลขสองตัวที่ห่างกันมาก และเหตุผลของมันคือความลึกอย่างเดียว
ปกจึงควรเป็นตัวเลขสองตัวนั้น กับความลึกที่ทำให้มันต่างกัน

```
A bold horizontal YouTube thumbnail, 1280x720 landscape, warm cream paper background (#efe6d3)
with a very subtle paper grain, editorial magazine style.

LEFT HALF: large Thai headline in dark ink brown-black, heavy geometric sans-serif, on ONE
single line, perfectly spelled:
ปุ๋ยหายไปไหน

Directly under it on the left half: two numbers side by side, separated by a thick dark ink
arrow pointing right.
The LEFT number is dark grey and plain: 38%
The RIGHT number is brick red and MUCH larger, at least twice the height of the left one: 85%
Under the left number, small dark ink Thai text on one line, perfectly spelled: หว่าน
Under the right number, small dark ink Thai text on one line, perfectly spelled: ฝัง

RIGHT HALF: a simple flat cross-section drawing of flooded paddy soil — a thin blue band of
water at the top, a thin light brown band under it, and dark blue-grey mud below that. A small
white cylinder sits inside the dark mud layer with a thin dark ink line and the label 7 ซม.
drawn beside it, perfectly spelled.

Flat solid colours only: warm cream, dark ink brown-black, brick red, muted blue, mustard
yellow accent. No gradient, no glow, no drop shadow, no 3D, no photographic texture.
Keep 8% clear margin left and right, 6% top and bottom — nothing touches an edge.
```

## แบบ B — เงาคนหว่าน (ใช้เมื่ออยากให้อารมณ์นำ)

```
A bold horizontal YouTube thumbnail, 1280x720 landscape, warm cream paper background (#efe6d3)
with subtle paper grain, editorial magazine style.

RIGHT HALF: a dark silhouette of a single person standing in a flooded rice field with
one arm swung out, broadcasting fertiliser by hand, the scattered grains visible as a small arc
of dark dots in the air. Pure black silhouette, no face, no clothing detail, placed on the
cream background like a cut-out magazine collage.

LEFT HALF, upper area: large Thai headline in dark ink, heavy geometric sans-serif, on ONE
single line, perfectly spelled:
หว่านไปแล้ว หายไปไหน

Over the arc of scattered grains, one enormous number in brick red, 4x the size of any other
type, perfectly spelled:
62%

Beside that number, one short line of dark ink Thai text, one line only, perfectly spelled:
ที่ต้นข้าวไม่ได้กิน

Flat solid colours: warm cream, dark ink brown-black, brick red. Silhouette only — no
photographic detail anywhere. No gradient, no glow, no 3D.
Keep 8% clear margin left and right, 6% top and bottom.
```

## แบบ C — ชั้นดินสองโลก (สายอธิบาย)

```
A bold horizontal YouTube thumbnail, 1280x720 landscape, warm cream paper background (#efe6d3)
with subtle paper grain, editorial magazine style.

RIGHT TWO THIRDS: a large flat cross-section diagram of a flooded rice paddy, drawn like a
printed textbook figure. From top to bottom: a band of muted blue water, then a THIN light
brown band, then a thick dark blue-grey band filling the lower half.

To the right of the thin brown band, a dark ink label on one line, perfectly spelled:
มีออกซิเจน
To the right of the thick dark band, a dark ink label on one line, perfectly spelled:
ไม่มีออกซิเจน

A brick red arrow starts at the water surface and curves downward, ending at a small white
cylinder drawn inside the dark lower band.

LEFT THIRD: large Thai headline in dark ink, heavy geometric sans-serif, stacked on two lines,
perfectly spelled:
ดินนา
มีสองโลก

Flat solid colours only: warm cream, dark ink, brick red, muted blue, light brown, dark
blue-grey. No gradient, no glow, no 3D, no photographic texture.
Keep 8% clear margin left and right, 6% top and bottom.
```

---

## หลังสร้างเสร็จ — ต้องดูภาพจริงก่อนใช้

1. **อ่านคำไทยทุกตัวออกไหม** สระลอย วรรณยุกต์หาย ตัดคำผิดกลางคำ = ทิ้ง สร้างใหม่
2. **แบบ A: 85% ต้องใหญ่กว่า 38% ชัดเจน** ถ้าโมเดลวาดเท่ากัน ปกจะไม่เล่าอะไรเลย
   และ**ลูกศรต้องชี้จาก 38 ไป 85** ไม่ใช่กลับด้าน — ถ้ากลับด้าน ความหมายพลิกทั้งคลิป
3. **แบบ A และ C: ก้อนปุ๋ยต้องอยู่ใน**ชั้นดินสีเข้ม** ไม่ใช่ลอยอยู่ในน้ำ**
   นั่นคือทั้งเรื่องของคลิป ถ้าวาดผิดตำแหน่ง ปกกำลังสอนสิ่งที่ตรงข้ามกับคลิป
4. **แบบ B: ต้องไม่เห็นหน้าคน** ถ้าโมเดลใส่รายละเอียดใบหน้ามา ทิ้ง
5. **ย่อเหลือ 320px แล้วยังอ่านออกไหม** ขนาดจริงในฟีดมือถือ
6. **ห้ามมีโลโก้หรือยี่ห้อปุ๋ยโผล่มา** ในภาพใด ๆ

**ถ้าเป็นแบบ A หรือ C ให้วัดด้วยเครื่อง อย่าใช้สายตา** — เหมือนที่ vox-7 วัดความยาวสองแท่ง
ได้ 614px เท่ากันเป๊ะ ตัวเลข 85 ต้องสูงกว่า 38 อย่างน้อยหนึ่งเท่าตัวจริง ๆ

เก็บตัวที่ไม่ผ่านไว้ข้าง ๆ พร้อมชื่อบอกเหตุผล เหมือน `haze-sovietblocks-reject.png` ของ vox-7
และ `A-minus40-english-reject.png` ของ vox-6 — **ภาพที่ออกมาคือหลักฐาน ไม่ใช่ prompt**
