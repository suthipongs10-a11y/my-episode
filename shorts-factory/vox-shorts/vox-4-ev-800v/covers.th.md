# ภาพหน้าปก — vox-4 · The EV Insight

```
export GEMINI_API_KEY="$GOOGLE_TTS_API_KEY"
python tools/gen_image.py --model pro --aspect 9:16 --prompt "<วาง prompt>" \
  --out media/projects/vox-4-ev-800v/covers/<ชื่อ>.png
```

> ### ⬛ หน้าปกคลิปนี้เป็น **9:16 แนวตั้ง**
> คลิปยาว 52 วินาที = Shorts ทั้งคลิปและหน้าปกจึงเป็นแนวตั้ง (PIPELINE §3)
> ต่างจาก vox-9 และ vox-10 ที่ยาวเกิน 60 วินาทีจึงเป็น 16:9

**สกินช่องนี้คือ blueprint กรมท่าเข้ม** และ **ห้ามมีชื่อยี่ห้อรถหรือโลโก้** — กฎช่องข้อ 3

---

## แบบ A — สี่เหลี่ยมสองอัน (ใช้ตัวนี้)

แกนของคลิปคือความสัมพันธ์กำลังสอง ปกจึงต้อง**แสดง**มัน ไม่ใช่เขียนบอก
สี่เหลี่ยมสองอันที่พื้นที่ต่างกันสี่เท่า อธิบาย I²R ได้โดยไม่ต้องมีสมการ

```
A bold vertical YouTube Shorts thumbnail, 1080x1920 portrait, very dark navy blue background
(#0f1a2d) with a faint thin blueprint grid, technical drawing style.

TOP THIRD: large Thai headline in warm off-white, heavy geometric sans-serif, stacked on
exactly two lines, perfectly spelled:
กระแสครึ่งเดียว
ความร้อนเหลือเท่าไหร่

MIDDLE: two solid flat squares side by side on the same baseline, separated by a thick amber
arrow pointing right. The LEFT square is muted grey-blue and LARGE. The RIGHT square is bright
amber and clearly only ONE QUARTER of the left square's area — half its width and half its
height. Nothing else between them.

BOTTOM THIRD: one enormous fraction in bright amber, far larger than any other element on the
page, perfectly spelled and reading exactly:
1/4

Flat solid colours only: very dark navy, warm off-white, bright amber, muted grey-blue. No
gradient, no glow, no drop shadow, no 3D, no photographic texture. No car, no cable, no
charging station, no logos, no brand names, no other numbers anywhere.
Keep 8% clear margin left and right, 6% top and bottom.
```

---

## ผลลัพธ์ — ผ่านรอบแรก

| ไฟล์ | คืออะไร |
|---|---|
| `covers/A-quarter-heat.png` | ต้นฉบับ 1536×2752 · 1.96 MB (ใต้ลิมิต 2 MB พอดี ๆ) |
| `covers/A-quarter-heat-upload.jpg` | **ตัวที่อัปโหลด** 1080×1920 · 0.21 MB |

### ⬛ ข้อที่ต้องวัด และวัดแล้ว

**ปกใบนี้อ้างว่า "หนึ่งในสี่" เป็นภาพ ไม่ใช่เป็นคำ** ถ้าโมเดลวาดสี่เหลี่ยมผิดสัดส่วน
ปกจะสอนสิ่งที่ผิดกับคนที่เลื่อนผ่านโดยไม่กดเข้ามาดู — ซึ่งเป็นคนส่วนใหญ่

| วัด | ผล |
|---|---|
| สี่เหลี่ยมเทา | **617 × 617 px** = 380,689 px² |
| สี่เหลี่ยมส้ม | **303 × 303 px** = 91,809 px² |
| อัตราส่วนพื้นที่ | **0.241** (เป้าหมาย 0.25) ✅ |
| อัตราส่วนด้าน | **0.491 × 0.491** (เป้าหมาย 0.5) ✅ |

คลาดจาก 0.25 อยู่ 3.6% ซึ่งตาเปล่าแยกไม่ออกและความหมายไม่เพี้ยน — **ผ่าน**

ข้ออื่นที่ตรวจด้วยตา: คำไทยสะกดถูกทั้งสองบรรทัด · ลูกศรชี้จากใหญ่ไปเล็ก **ถูกทาง**
(ถ้ากลับด้าน ความหมายพลิกเป็น "ความร้อนเพิ่มสี่เท่า") · ไม่มียี่ห้อ ไม่มีรถ ไม่มีตัวเลขอื่นแทรก

ไม่มีตัวที่ตก ไม่มีไฟล์ `-reject` สำหรับหน้าปกคลิปนี้
