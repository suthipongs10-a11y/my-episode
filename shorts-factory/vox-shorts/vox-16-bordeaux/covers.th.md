# ภาพหน้าปก — vox-16 · เกษตรที่คนไทยควรรู้

> ## ⛔ ผมไม่เจนภาพนี้ให้ — คุณเจนเอง
>
> `CLAUDE.md` → Cost rules ข้อ 1 (ตัดสินใจ 2026-08-21) `gen_image.py` จะ exit non-zero
> ถ้าปลายทางอยู่ใน `covers/` ไฟล์นี้คือ prompt ที่พร้อมวาง ไม่ใช่บันทึกของภาพที่มีอยู่แล้ว

```
export GEMINI_API_KEY="<คีย์ของคุณ>"
python tools/gen_image.py --model pro --aspect 16:9 --i-am-the-operator \
  --out media/projects/vox-16-bordeaux/covers/<ชื่อ>.png --prompt "<วาง prompt>"
```

`--model pro` เพราะปกมีตัวอักษรไทย และ pro คือตัวเดียวที่เขียนไทยถูก — นี่คือเหตุผลเดียว
ที่ยังคุ้มค่า ฿4.51 ต่อรูป ส่วนภาพพื้นหลังในคลิปใช้ `fast` ที่ ฿2.25 ทั้งหมด

> ### ⬛ **16:9 แนวนอน** · สกิน paper (VOX) โทนกระดาษเก่า

> ## ⛔ กฎของช่องที่ใช้กับปกนี้
>
> `channels/agri.json` ข้อ 9 — **ภาพที่ทำหน้าที่เป็นผลการทดสอบ ห้ามใช้ภาพเจน**
> ปกนี้จึง **ห้ามมีใบองุ่นหรือใบทุเรียนที่เป็นโรค** ไม่ว่าจะดูสวยแค่ไหน เพราะคนดูจะเอาไป
> เทียบกับใบจริงในสวนตัวเอง ปกขายเรื่อง *สีฟ้า* กับ *ความบังเอิญ* ไม่ใช่ขายอาการของโรค
>
> ข้อ 7 (หลักการเดียวกับเรื่องการเผา) — ปกต้อง**ไม่ตัดสิน** ห้ามทำให้ดูเหมือนคลิปแฉสารพิษ
> และห้ามทำให้ดูเหมือนคลิปเชียร์สูตรโบราณ

**สิ่งที่ต้องอ่านออกที่ 320px คือแถวองุ่นสีฟ้าหนึ่งแถว ท่ามกลางไร่ที่เหลืองตายหมด**
เพราะนั่นคือทั้งคลิปในภาพเดียว

---

## แบบ A — แถวเดียวที่รอด (ใช้ตัวนี้)

```
A bold horizontal YouTube thumbnail, 1920x1080 landscape. The whole frame edge to edge is a
warm off-white aged-paper background (#efe9dc) with a faint paper grain, flat editorial
illustration style. The paper fills THE ENTIRE IMAGE — it is NOT a card or panel sitting on
another colour. No border, no frame, no second background colour.

RIGHT HALF: a simple flat illustration of a vineyard seen from above at a slight angle, drawn
as rows of small simple vine shapes running from lower left to upper right. Almost every row is
drawn in dull yellow-brown, looking dead. ONE single row, the one closest to the bottom edge, is
drawn in vivid blue-green and clearly alive. The contrast between that one blue row and all the
dead rows is the most eye-catching thing in the image. Along the bottom edge beside that row,
one plain grey strip suggesting a road. No people, no buildings, no vehicles.

LEFT HALF: large Thai headline in near-black ink, heavy geometric sans-serif, stacked on
exactly two lines, perfectly spelled, reading exactly:
ยากันราตัวแรกของโลก
เกิดจากการกันขโมย
Directly below the headline, one short line of muted warm grey Thai text on ONE line, perfectly
spelled, much smaller: และมันยังอยู่ในสวนทุเรียนไทยวันนี้

Flat solid colours only: aged off-white paper, near-black ink, dull yellow-brown, vivid
blue-green, muted warm grey. No gradient, no glow, no drop shadow, no 3D, no photographic
texture. No diseased leaves, no spots, no lesions, no close-up foliage. No logos, no numbers or
letters anywhere except the specified Thai text.
Keep 8% clear margin left and right, 6% top and bottom.
```

---

## แบบ B — ผลึกสีฟ้า

ถ้าอยากขายมุมวัตถุมากกว่ามุมเล่าเรื่อง

```
A bold horizontal YouTube thumbnail, 1920x1080 landscape. The whole frame edge to edge is a
warm off-white aged-paper background (#efe9dc) with a faint paper grain, flat editorial
illustration style. No border, no frame.

RIGHT HALF: one large flat illustration of a single angular blue crystal, drawn simply with
three or four flat facets in vivid blue, no shading, no sparkle, no glow. Beside it, much
smaller and lower, one small flat white heap suggesting powder. Nothing else.

LEFT HALF: large Thai headline in near-black ink, heavy geometric sans-serif, stacked on
exactly two lines, perfectly spelled, reading exactly:
ทองแดงฆ่าเชื้อรา
ปูนขาวไม่ได้ฆ่าอะไรเลย
Directly below, one short line of muted warm grey Thai text on ONE line, perfectly spelled,
much smaller: แล้วทำไมต้องใส่ปูนขาว

Flat solid colours only: aged off-white paper, near-black ink, vivid blue, white, muted warm
grey. No gradient, no glow, no drop shadow, no 3D, no photographic texture. No plants, no
leaves, no people, no logos, no other numbers or letters anywhere except the specified Thai text.
Keep 8% clear margin left and right, 6% top and bottom.
```

---

## ตรวจก่อนใช้

- [ ] ย่อเหลือกว้าง 320px แล้วยังเห็นแถวสีฟ้าแถวเดียวชัด (แบบ A) หรือผลึกสีฟ้าชัด (แบบ B)
- [ ] สะกดไทยถูกทุกตัว โดยเฉพาะ **ขโมย · ทุเรียน · ปูนขาว**
- [ ] **ไม่มีใบไม้เป็นโรค ไม่มีจุด ไม่มีแผล** ในทุกมุมของภาพ (กฎช่องข้อ 9)
- [ ] สีเต็มเฟรมชนขอบ ไม่มีกรอบโผล่มา
- [ ] ทำไฟล์อัปโหลด — crop ให้เป็น 16:9 เป๊ะ แล้วย่อเป็น 1280×720 JPEG (ลิมิต YouTube 2 MB)
