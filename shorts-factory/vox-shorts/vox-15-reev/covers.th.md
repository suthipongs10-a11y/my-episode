# ภาพหน้าปก — vox-15 · The EV Insight

```
export GEMINI_API_KEY="$GOOGLE_TTS_API_KEY"
python tools/gen_image.py --model pro --aspect 16:9 --prompt "<วาง prompt>" \
  --out media/projects/vox-15-reev/covers/<ชื่อ>.png
```

> ### ⬛ **16:9 แนวนอน** · สกิน blueprint กรมท่าเข้ม

> ## ⛔ กฎของช่องที่ใช้กับปกนี้
>
> `channels/ev.json` ข้อ 3 ห้ามเชียร์ยี่ห้อ **ปกจึงห้ามมีรถรุ่นที่ระบุตัวตนได้ ห้ามมีโลโก้
> ห้ามมีป้ายทะเบียน** แม้แต่คลิปที่ยกรถรุ่นหนึ่งมาเป็นตัวอย่างก็ตาม — ชื่อรุ่นอยู่ในคำอธิบายได้
> แต่ปกต้องขายกลไก ไม่ใช่ขายแบรนด์
>
> และข้อ 4 บอกว่าแผนภาพต้องสะท้อนโครงจริง **ปกแบบ A จึงวาดเส้นทางกำลังจริง ๆ
> ไม่ใช่วาดเส้นให้ดูเหมือนเทคนิค**

**สิ่งที่ต้องอ่านออกที่ 320px คือเส้นที่ถูกตัดทิ้ง** เพราะนั่นคือทั้งคลิปในภาพเดียว

---

## แบบ A — เส้นที่ไม่มี (ใช้ตัวนี้)

```
A bold horizontal YouTube thumbnail, 1920x1080 landscape, very dark navy blue background
(#0e1a24) filling the whole frame edge to edge with a faint thin blueprint grid, flat
technical drawing style. No border, no frame, no second background colour.

LEFT HALF: large Thai headline in warm off-white, heavy geometric sans-serif, stacked on
exactly two lines, perfectly spelled, reading exactly:
มีเครื่องยนต์
แต่ไม่เคยขับล้อ
Directly below the headline, one short line of muted grey-blue Thai text on ONE line,
perfectly spelled, much smaller: REEV ต่างจาก PHEV ตรงนี้

RIGHT HALF: a simple flat schematic diagram drawn as plain rounded rectangles joined by
straight lines, like a clean engineering block diagram. Three small boxes in a row along the
top and two along the bottom, joined left to right by thin amber and teal lines. Below them,
ONE separate line that runs from the top-left box down and across toward the bottom-right box
— and this line is drawn in flat red and is CROSSED OUT with a single bold red X in the middle
of it. The crossed-out line is the most eye-catching element on the right half.
The boxes are empty — no text inside any box.

Flat solid colours only: very dark navy, warm off-white, amber, teal, warm red, muted
grey-blue. No gradient, no glow, no drop shadow, no 3D, no photographic texture. No car, no
vehicle, no wheels, no engine picture, no people, no brand logos, no badges, no number plates,
no other numbers or letters anywhere except the specified Thai text.
Keep 8% clear margin left and right, 6% top and bottom.
```

---

## แบบ B — ตัวเลขค่าผ่านทาง

ถ้าอยากขายมุมตัวเลขมากกว่ามุมแผนภาพ

```
A bold horizontal YouTube thumbnail, 1920x1080 landscape, very dark navy blue background
(#0e1a24) filling the whole frame edge to edge with a faint thin blueprint grid, flat
technical drawing style. No border, no frame.

LEFT HALF: large Thai headline in warm off-white, heavy geometric sans-serif, stacked on
exactly two lines, perfectly spelled, reading exactly:
REEV แลกอะไร
กับความประหยัด
Directly below, one short line of muted grey-blue Thai text on ONE line, perfectly spelled,
much smaller: เฉพาะตอนที่ใช้น้ำมันปั่นไฟ

RIGHT HALF: one enormous number in warm red, at least four times taller than the headline
text, perfectly formed, reading exactly:
15–20%
Directly under it, one short line of red Thai text on ONE line, perfectly spelled, much
smaller, reading exactly: หายไปกับการแปลงสองต่อ

Flat solid colours only: very dark navy, warm off-white, warm red, muted grey-blue.
No gradient, no glow, no drop shadow, no 3D, no photographic texture. No car, no vehicle, no
engine, no people, no brand logos, no badges, no other numbers or letters anywhere except the
specified Thai text and 15–20%.
Keep 8% clear margin left and right, 6% top and bottom.
```

---

## ตรวจก่อนใช้

- [ ] ย่อเหลือกว้าง 320px แล้วยังเห็นว่ามีเส้นหนึ่งถูกกากบาททิ้ง (แบบ A) หรืออ่าน 15–20% ออก (แบบ B)
- [ ] สะกดไทยถูกทุกตัว โดยเฉพาะ **เครื่องยนต์ · ประหยัด · แปลง**
- [ ] **ไม่มีรถ ไม่มีโลโก้ ไม่มีป้ายทะเบียน** ในทุกมุมของภาพ
- [ ] สีเต็มเฟรมชนขอบ ไม่มีกรอบโผล่มา
