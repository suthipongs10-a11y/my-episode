# ภาพหน้าปก — vox-14 · เกษตรที่คนไทยควรรู้

```
export GEMINI_API_KEY="$GOOGLE_TTS_API_KEY"
python tools/gen_image.py --model pro --aspect 16:9 --prompt "<วาง prompt>" \
  --out media/projects/vox-14-trichoderma/covers/<ชื่อ>.png
```

> ### ⬛ **16:9 แนวนอน** · สกิน blueprint กรมท่าเข้ม เหมือน vox-11

> ## ⛔ กฎเฉพาะคลิปนี้ — ปกห้ามมีภาพเชื้อจริง
>
> ในคลิปนี้ **สีของถุงคือผลการทดสอบ** ไม่ใช่ของประดับ คนดูจะเอาสีที่เห็นไปเทียบกับถุงจริง
> ในมือ ถ้าเราเจนภาพ "ถุงเชื้อสีเขียว" ขึ้นมาแล้วเฉดเพี้ยน เขาอาจทิ้งถุงที่ใช้ได้
> หรือแย่กว่านั้นคือใช้ถุงที่เสีย (`channels/agri.json` กฎข้อสุดท้าย)
>
> **ปกจึงใช้แถบสีแบน ๆ ที่วาดขึ้น ไม่ใช่ภาพถ่ายหรือภาพเจนของเชื้อ** และห้ามมีอะไรที่ดูเหมือน
> ภาพถ่ายจุลชีววิทยา ไม่มีจานเพาะเชื้อ ไม่มีภาพขยาย ไม่มีเส้นใยรา

**สิ่งที่ต้องอ่านออกที่ 320px คือความต่างระหว่างสองสี** เพราะนั่นคือคำสัญญาของคลิป

---

## แบบ A — เขียวใช้ได้ ดำทิ้ง (ใช้ตัวนี้)

```
A bold horizontal YouTube thumbnail, 1920x1080 landscape, very dark navy blue background
(#0e1a24) filling the whole frame edge to edge with a faint thin blueprint grid. Flat
technical drawing style. No border, no frame, no second background colour.

LEFT HALF: large Thai headline in warm off-white, heavy geometric sans-serif, stacked on
exactly two lines, perfectly spelled, reading exactly:
ขยายเชื้อเอง
ถุงไหนใช้ได้ ถุงไหนทิ้ง
Directly below the headline, one short line of muted grey-blue Thai text on ONE line,
perfectly spelled, much smaller: ไตรโคเดอร์มา 5 ขั้น

RIGHT HALF: exactly two large plain flat-colour rounded squares side by side, each about a
third of the image height, with a clear gap between them. The LEFT square is a flat olive
green (#7d9440). The RIGHT square is a flat near-black charcoal (#26241f) with a thin grey
outline so it is visible against the navy. They are plain solid colour swatches — NOT
photographs, NOT textured, NOT petri dishes, NOT microscope images, nothing growing on them.
Under the green square, one short Thai word in bright green, perfectly spelled: ใช้ได้
Under the dark square, one short Thai word in warm red, perfectly spelled: ทิ้ง

Flat solid colours only: very dark navy, warm off-white, olive green, charcoal, warm red,
muted grey-blue. No gradient, no glow, no drop shadow, no 3D, no photographic texture, no
plants, no bags, no people, no logos, no other numbers or letters anywhere except the
specified Thai text.
Keep 8% clear margin left and right, 6% top and bottom.
```

---

## แบบ B — ขั้นที่คนพลาด

ถ้าอยากขายมุม "เคยทำแล้วพัง" มากกว่ามุมสอนทำ

```
A bold horizontal YouTube thumbnail, 1920x1080 landscape, very dark navy blue background
(#0e1a24) filling the whole frame edge to edge with a faint thin blueprint grid. Flat
technical drawing style. No border, no frame.

LEFT HALF: large Thai headline in warm off-white, heavy geometric sans-serif, stacked on
exactly two lines, perfectly spelled, reading exactly:
ขยายแล้วไม่ขึ้น
เพราะพลาดขั้นนี้
Directly below, one short line of muted grey-blue Thai text on ONE line, perfectly spelled,
much smaller: และรู้ตัวตอนวันที่เจ็ด

RIGHT HALF: one enormous numeral in bright amber, at least four times taller than the
headline text, perfectly formed, reading exactly:
2
Directly under it, one short line of amber Thai text on ONE line, perfectly spelled, much
smaller, reading exactly: รอให้เย็นสนิท

Flat solid colours only: very dark navy, warm off-white, bright amber, muted grey-blue.
No gradient, no glow, no drop shadow, no 3D, no photographic texture, no plants, no bags,
no petri dishes, no people, no logos, no other numbers or letters anywhere except the
specified Thai text and the single numeral 2.
Keep 8% clear margin left and right, 6% top and bottom.
```

---

## ตรวจก่อนใช้

- [ ] ย่อเหลือกว้าง 320px แล้วยังแยกสีเขียวกับสีดำออกจากกันได้ชัด
- [ ] สะกดไทยถูกทุกตัว โดยเฉพาะ **ไตรโคเดอร์มา · ใช้ได้ · ทิ้ง**
- [ ] ไม่มีอะไรที่ดูเหมือนภาพถ่ายเชื้อจริง จานเพาะเชื้อ หรือภาพขยาย
- [ ] สีเต็มเฟรมชนขอบ ไม่มีกรอบหรือแถบสีอื่นโผล่มา
