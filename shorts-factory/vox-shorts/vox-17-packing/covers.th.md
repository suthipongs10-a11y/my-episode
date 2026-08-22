# ภาพหน้าปก — vox-17 · เกษตรที่คนไทยควรรู้

> ## ⛔ ผมไม่เจนภาพนี้ให้ — คุณเจนเอง
>
> `CLAUDE.md` → Cost rules ข้อ 1 `gen_image.py` จะ exit non-zero ถ้าปลายทางอยู่ใน `covers/`
> ไฟล์นี้คือ prompt ที่พร้อมวาง ไม่ใช่บันทึกของภาพที่มีอยู่แล้ว

```
export GEMINI_API_KEY="<คีย์ของคุณ>"
python tools/gen_image.py --model pro --aspect 16:9 --i-am-the-operator \
  --out media/projects/vox-17-packing/covers/<ชื่อ>.png --prompt "<วาง prompt>"
```

> ### ⬛ **16:9 แนวนอน** · สกิน blueprint กรมท่าเข้ม (เข้าชุดกับ vox-8/11/14/16)

> ## ⛔ กฎของช่องที่ใช้กับปกนี้
>
> `channels/agri.json` ข้อ 9 — **ห้ามมีภาพผลไม้ช้ำบนปกเด็ดขาด** ระดับความช้ำคือผลการตรวจ
> คนดูจะเอาไปเทียบกับผลจริงในมือ ปกขายเรื่อง **แรงสั่น** กับ **กล่อง** ไม่ใช่ขายอาการเสียหาย
>
> ข้อ 8 — คลิปพาลงมือทำมีมาตรฐานสูงกว่า ปกต้องไม่สัญญาอะไรที่คลิปไม่ได้สอน
> คลิปนี้**ไม่ได้**บอกจำนวนน้ำแข็งต่อกล่อง ปกจึงห้ามมีตัวเลขสูตรใด ๆ

**สิ่งที่ต้องอ่านออกที่ 320px คือเส้นสั่นที่ลากยาวข้างเส้นกระแทกที่มีแค่ยอดเดียว**
เพราะนั่นคือทั้งคลิปในภาพเดียว — ตัวที่ทำร้ายไม่ใช่ตัวที่แรงที่สุด แต่คือตัวที่ไม่หยุด

---

## แบบ A — ยอดเดียว เทียบกับเส้นที่ไม่หยุด (ใช้ตัวนี้)

```
A bold horizontal YouTube thumbnail, 1920x1080 landscape, very dark navy blue background
(#0e1a24) filling the whole frame edge to edge with a faint thin blueprint grid, flat technical
drawing style. The dark navy fills THE ENTIRE IMAGE, EDGE TO EDGE. It is NOT a card or panel
sitting on another colour — no border, no frame, no second background colour.

LEFT HALF: large Thai headline in warm off-white, heavy geometric sans-serif, stacked on
exactly two lines, perfectly spelled, reading exactly:
ของช้ำไม่ได้เกิดตอนตก
มันเกิดตลอดทาง
Directly below the headline, one short line of muted grey-blue Thai text on ONE line, perfectly
spelled, much smaller: แพ็กยังไงให้ถึงมือลูกค้าสวย

RIGHT HALF: two simple flat line graphs stacked one above the other, drawn as thin bright lines
on a plain horizontal baseline, like a technical chart with no axes and no numbers.
The TOP graph is a flat line with ONE single tall narrow spike in the middle, drawn in muted
grey-blue.
The BOTTOM graph is a continuous wavy zigzag line that runs the full width without ever
flattening out, drawn in bright warm red, noticeably thicker than the top line. The bottom red
wavy line is the most eye-catching element in the whole image.
No labels, no words, no numbers anywhere on either graph.

Flat solid colours only: very dark navy, warm off-white, warm red, muted grey-blue. No gradient,
no glow, no drop shadow, no 3D, no photographic texture. No fruit, no boxes, no bruises, no
damaged produce, no people, no logos, no other numbers or letters anywhere except the specified
Thai text.
Keep 8% clear margin left and right, 6% top and bottom.
```

---

## แบบ B — กล่องสองใบ

ถ้าอยากขายมุมลงมือทำมากกว่ามุมกลไก

```
A bold horizontal YouTube thumbnail, 1920x1080 landscape, very dark navy blue background
(#0e1a24) filling the whole frame edge to edge with a faint thin blueprint grid, flat technical
drawing style. No border, no frame, no second background colour.

LEFT HALF: large Thai headline in warm off-white, heavy geometric sans-serif, stacked on
exactly two lines, perfectly spelled, reading exactly:
แน่น ชนะ นุ่ม
แพ็กยังไงไม่ให้ช้ำ
Directly below, one short line of muted grey-blue Thai text on ONE line, perfectly spelled,
much smaller: ผลทดสอบที่สวนความรู้สึกคนส่วนใหญ่

RIGHT HALF: two simple flat outline drawings of open-topped boxes side by side, drawn as plain
rectangles with three circles inside each, like a cross-section diagram.
The LEFT box is outlined in warm red and its three circles sit loosely with wide empty gaps
between them and the walls.
The RIGHT box is outlined in bright teal and its three circles are packed tightly, with the
gaps between them filled in with solid teal blocks so nothing could move.
No text inside either box, no labels, no numbers.

Flat solid colours only: very dark navy, warm off-white, warm red, bright teal, muted grey-blue.
No gradient, no glow, no drop shadow, no 3D, no photographic texture. No real fruit, no bruises,
no damaged produce, no people, no logos, no other numbers or letters anywhere except the
specified Thai text.
Keep 8% clear margin left and right, 6% top and bottom.
```

---

## ตรวจก่อนใช้

- [ ] ย่อเหลือกว้าง 320px แล้วยังเห็นความต่างระหว่างเส้นยอดเดียวกับเส้นที่สั่นตลอด (แบบ A)
      หรือเห็นว่ากล่องขวาอัดแน่นกว่ากล่องซ้าย (แบบ B)
- [ ] สะกดไทยถูกทุกตัว โดยเฉพาะ **ช้ำ · ตลอดทาง · แพ็ก**
- [ ] **ไม่มีผลไม้ช้ำ ไม่มีจุดดำ ไม่มีรอยเสียหาย** ในทุกมุมของภาพ (กฎช่องข้อ 9)
- [ ] ไม่มีตัวเลขสูตรใด ๆ (กฎช่องข้อ 8 — คลิปไม่ได้สอนอัตราส่วน)
- [ ] สีเต็มเฟรมชนขอบ ไม่มีกรอบโผล่มา
- [ ] ทำไฟล์อัปโหลด — crop ให้เป็น 16:9 เป๊ะ แล้วย่อเป็น 1280×720 JPEG (ลิมิต YouTube 2 MB)
