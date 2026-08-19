# ภาพหน้าปก — vox-13 · ถอดรหัสจักรวาล

```
export GEMINI_API_KEY="$GOOGLE_TTS_API_KEY"
python tools/gen_image.py --model pro --aspect 16:9 --prompt "<วาง prompt>" \
  --out media/projects/vox-13-dark-sky/covers/<ชื่อ>.png
```

> ### ⬛ **16:9 แนวนอน** · สกิน `cosmos` — น้ำเงินอมม่วงเข้มเกือบดำ ตัวหนังสือขาวแสงดาว

> ## ⛔ กฎเฉพาะช่องนี้ — ปกห้ามดูเหมือนภาพจากกล้องโทรทรรศน์
>
> `channels/cosmos.json` ห้ามสร้างภาพที่ดูเหมือนข้อมูลจริง ปกจึงห้ามมีกาแล็กซีเต็มเฟรม
> ห้ามมีเนบิวลาคลุมจอ ห้ามมีแผนที่ CMB **สิ่งเหล่านั้นคือรูปของข้อมูล และเราไม่มีข้อมูล**
> ดาวเป็นจุดเล็ก ๆ บนพื้นมืดใช้ได้ เพราะนั่นคือสิ่งที่ตาคนเห็นจริง

**ปกนี้ต้องวาดสิ่งที่ไม่อยู่ตรงนั้น** — ความมืด ซึ่งวาดยากกว่าวาดของ
วิธีที่อ่านออกที่ 320px คือ **ปล่อยให้ด้านขวาว่างและมืดจริง ๆ** แล้วให้ตัวหนังสือด้านซ้าย
เป็นสิ่งเดียวที่มีน้ำหนัก ความว่างคือเนื้อหา ไม่ใช่ที่เหลือ

---

## แบบ A — ความมืดคือคำตอบ (ใช้ตัวนี้)

```
A bold horizontal YouTube thumbnail, 1920x1080 landscape. The background is a very deep
indigo, almost black (#07060f), completely flat, with a scattering of small white dots of
varying size across it like stars seen by the naked eye. No nebula, no galaxy, no telescope
imagery of any kind.

LEFT HALF: large Thai headline in warm starlight white, heavy geometric sans-serif, stacked
on exactly two lines, perfectly spelled, reading exactly:
ฟ้ากลางคืน
ควรสว่างเท่าดวงอาทิตย์
Directly below the headline, one short line of muted violet-grey Thai text on ONE line,
perfectly spelled, much smaller: ถ้าจักรวาลไม่มีที่สิ้นสุด

RIGHT HALF: almost entirely empty deep indigo with only the faint scattered star dots. In the
lower right, one short line of bright amber Thai text on ONE line, perfectly spelled, small,
reading exactly: แล้วทำไมมันมืด

Flat solid colours only: very deep indigo, warm starlight white, bright amber, muted violet-grey.
No gradient, no glow, no lens flare, no 3D, no planets, no spacecraft, no people, no logos,
no other numbers or letters anywhere except the specified Thai text.
Keep 8% clear margin left and right, 6% top and bottom.
```

---

## แบบ B — ตัวเลขนำ

ถ้าแบบ A อ่านยากเกินไปตอนย่อ ให้ลองแบบนี้ ตัวเลข 2.725 คือหมัดฮุกของคลิป
และมันแปลกพอที่จะทำให้คนหยุด

```
A bold horizontal YouTube thumbnail, 1920x1080 landscape. Background very deep indigo, almost
black (#07060f), flat, with small scattered white star dots. No nebula, no galaxy, no
telescope imagery.

LEFT HALF: large Thai headline in warm starlight white, heavy geometric sans-serif, stacked on
exactly two lines, perfectly spelled, reading exactly:
ฟ้ากลางคืน
สว่างทั้งผืนอยู่แล้ว
Directly below, one short line of muted violet-grey Thai text on ONE line, perfectly spelled,
much smaller: เราแค่มองด้วยตาไม่เห็น

RIGHT HALF: one large number in bright amber, at least three times taller than the headline
text, perfectly formed, reading exactly:
2.725
Directly under it, one short line of amber Thai text on ONE line, perfectly spelled, much
smaller, reading exactly: เคลวิน

Flat solid colours only: very deep indigo, warm starlight white, bright amber, muted violet-grey.
No gradient, no glow, no lens flare, no 3D, no planets, no people, no logos, no other numbers
or letters anywhere except the specified Thai text and 2.725.
Keep 8% clear margin left and right, 6% top and bottom.
```

---

## ตรวจก่อนใช้

- [ ] ย่อเหลือกว้าง 320px แล้วยังอ่านบรรทัดแรกออก
- [ ] สะกดไทยถูกทุกตัว โดยเฉพาะ **สว่าง · ดวงอาทิตย์ · สิ้นสุด** (โมเดลชอบทำสระหาย)
- [ ] ไม่มีกาแล็กซี เนบิวลา ดาวเคราะห์ หรืออะไรที่ดูเหมือนภาพถ่ายจากกล้องโทรทรรศน์
- [ ] ไม่มีตัวเลขหรือตัวอักษรอื่นหลุดเข้ามา
