# Prompt ภาพหน้าปก — vox-2 "ทำไมข้าวหอมมะลิถึงชื่อ 105 ?"

ตัวอย่างที่เจนจาก prompt ในไฟล์นี้อยู่ที่ `media/projects/vox-2-thai-rice/covers/`

---

## เรื่องที่ต้องรู้ก่อน: **โมเดลเขียนภาษาไทยได้แล้ว**

ทดสอบจริงเมื่อ 2026-08-04 กับ `gemini-3-pro-image` — สั่งให้เขียน `ทำไมข้าวหอมมะลิถึงชื่อ 105`
แล้วมันสะกดถูกทุกตัว รวมสระ วรรณยุกต์ และตัวเลข ทั้งสามภาพในโฟลเดอร์นั้นไม่ได้แต่งตัวหนังสือเพิ่ม
เลยสักตัว

**นี่สวนทางกับสิ่งที่คนส่วนใหญ่ยังเชื่ออยู่** และมันเปลี่ยนวิธีเขียน prompt ทั้งหมด — ไม่ต้องเจนพื้นหลัง
เปล่าๆ แล้วเอาไปพิมพ์ตัวหนังสือทับใน Canva อีกที เขียนคำที่ต้องการลงใน prompt ได้เลย

แต่ยังต้องตรวจทุกครั้ง โมเดลนี้ทำได้ ≠ ทำได้ 100% ทุกครั้ง **อ่านตัวหนังสือในภาพที่ได้ก่อนเอาไปใช้เสมอ**
ถ้าคำยาวมากหรือมีหลายบรรทัด โอกาสพลาดสูงขึ้น — ซึ่งเป็นอีกเหตุผลที่ควรใช้คำสั้น

---

## กฎที่ prompt ทั้งสามอันข้างล่างใส่ไว้แล้ว

| กฎ | ทำไม |
|---|---|
| **บอกระยะขอบชัดเจน** (ซ้ายขวา 8% บนล่าง 6%) | ครั้งแรกที่ลอง ตัวหนังสือชนขอบซ้ายขวาพอดี ซึ่ง UI ของ Shorts จะทับ |
| **ตัวเลข "105" ใหญ่กว่าบรรทัดอื่น 3–4 เท่า** | ปกหน้าฟีดกว้างแค่ ~150px ต้องมีอะไรอ่านออกได้ที่ขนาดนั้นอย่างน้อยหนึ่งอย่าง |
| **บอกว่า "ตัวหนังสือสีเรียบ ไม่มีไล่เฉด ไม่มีเรืองแสง ไม่มีขอบ"** | ถ้าไม่บอก โมเดลชอบใส่เอฟเฟกต์ให้ แล้วตัวหนังสือจะพร่าตอนย่อ |
| **บอกชื่อฟอนต์แนวๆ ว่า "Kanit-like heavy Thai geometric sans"** | ให้ปกกับตัวคลิปเป็นตระกูลเดียวกัน คลิปใช้ Kanit จริง |
| **ระบุจานสีเป็นชื่อสีตรงๆ** | "สีสด" อย่างเดียวได้ผลไม่แน่นอน ระบุ เขียวเข้ม/ครีม/เหลืองสด/แดงอิฐ ได้ผลทุกครั้ง |
| **`ทำไมข้าวหอมมะลิถึงชื่อ` บรรทัดเดียว ไม่ตัดเป็นสองบรรทัด** | ไทยไม่มีเว้นวรรคระหว่างคำ ถ้าปล่อยให้โมเดลตัดบรรทัดเอง มันตัดกลางคำ |

---

## Prompt A — คอลลาจกระดาษ สีจัด (ตรงกับสไตล์คลิปที่สุด)

```
YouTube Shorts cover, vertical 9:16, BOLD graphic poster — high saturation, high contrast, readable as a tiny thumbnail.

Background: deep forest-green paper with visible fibre texture, torn-paper edge along the bottom revealing a warm cream layer.

TEXT, in a heavy Thai geometric sans (Kanit-like), tightly stacked, filling the top two-thirds:
Line 1, cream white, large: ทำไมข้าวหอมมะลิ
Line 2, cream white, large: ถึงชื่อ
Line 3: the numerals 105 ENORMOUS — three times the height of the other lines, jet black, sitting inside a thick vivid yellow marker highlight block that is slightly rotated. A small red question mark beside it.
Text must be crisp, perfectly spelled, no extra characters.

Bottom right: one golden rice panicle, photographic, cut out with a white sticker edge and a soft drop shadow, tilted.
Bottom left: a red circular rubber stamp, ink-worn, no lettering inside.

Flat editorial collage, no gradients on the text, no glow, no lens flare. Palette: deep green, cream, vivid yellow, brick red.
```

**ผลที่ได้** → `covers/cover-A.png` · แน่นเต็มเฟรม พลังสูงสุด · **ข้อเสีย: บรรทัดบนชนขอบ** ใช้ B แทนถ้ากังวล

---

## Prompt B — เหมือน A แต่คุมระยะขอบ ⭐ **แนะนำ**

```
YouTube Shorts cover, vertical 9:16, BOLD graphic poster, high saturation, readable as a tiny thumbnail.

IMPORTANT LAYOUT RULE: keep a clear empty margin of at least 8 percent of the width on the left and right, and 6 percent at top and bottom. No text or object may touch or cross the edge of the frame.

Background: deep forest-green paper with fibre texture. A torn-paper edge crosses the lower third, revealing warm cream paper beneath it.

TEXT in a heavy Thai geometric sans (Kanit-like), centred, perfectly spelled, crisp flat colour, no gradient, no glow:
Line 1, cream white, MEDIUM size: ทำไมข้าวหอมมะลิถึงชื่อ
Line 2: the numerals 105 ENORMOUS, jet black, four times the height of line 1, sitting inside a thick vivid yellow marker highlight block tilted about 2 degrees. A brick-red question mark immediately after the 5, slightly smaller.

Lower area, on the cream paper: one golden rice panicle, photographic, cut out with a white sticker edge and soft drop shadow, tilted, on the right. A worn brick-red circular ink stamp on the left, empty inside, partly overlapping the torn edge.

Flat editorial paper-collage. Palette: deep forest green, cream, vivid yellow, brick red. No lens flare, no 3D, no drop shadow on the type.
```

**ผลที่ได้** → `covers/cover-B.png` · สะอาดที่สุด `105` อ่านออกแม้ย่อเหลือนิ้วหัวแม่มือ · **ใช้ตัวนี้**

---

## Prompt C — ภาพถ่ายทุ่งนาจริง + แถบสีทับ

```
YouTube Shorts cover, vertical 9:16, photographic, high saturation, punchy contrast, readable as a tiny thumbnail.

LAYOUT RULE: keep at least 8 percent clear margin left and right, 6 percent top and bottom. Nothing touches the frame edge.

Photo: a Thai rice paddy at golden hour, heavy ripe golden panicles filling the lower half in sharp focus, the field receding to a blurred horizon with a warm orange sky. Rich saturated gold and green, deep shadows, strong directional backlight.

Over the UPPER half, a solid brick-red band angled about 3 degrees across the frame. On that band, in a heavy Thai geometric sans (Kanit-like), cream white, perfectly spelled, one line:
ทำไมข้าวหอมมะลิถึงชื่อ

Directly beneath the band, overlapping it slightly: the numerals 105 ENORMOUS in jet black on a vivid yellow marker block, tilted 2 degrees, plus a cream white question mark after it.

Crisp flat type, no glow, no outline, no gradient on the letters, no bokeh over the text.
```

**ผลที่ได้** → `covers/cover-C.png` · ดึงดูดสายทั่วไปมากกว่า แต่**หลุดจากภาษาภาพของคลิป** ซึ่งเป็นคอลลาจ
ล้วน คนกดเข้ามาแล้วจะเจอคนละอารมณ์ — ใช้ได้ แต่รู้ตัวว่าแลกอะไร

---

## วิธีเจน

```bash
python tools/gen_image.py --prompt-file <ไฟล์ prompt> --model pro --aspect 9:16 --size 2K \
  --out media/projects/vox-2-thai-rice/covers/cover-B.png
```

`--model pro` = `gemini-3-pro-image` · **อย่าใช้ `fast` หรือ `lite` กับปกที่มีตัวหนังสือไทย** ตัวเล็ก
ประหยัดกว่าก็จริงแต่สะกดพลาดบ่อยกว่ามาก ปกเจนครั้งเดียวใช้ยาว ไม่ใช่ที่ที่ควรประหยัด

เปลี่ยน prompt ได้ตามใจ แต่ **อย่าลบสามอย่างนี้**: กฎระยะขอบ, คำว่า `perfectly spelled`,
และ `no gradient / no glow` บนตัวหนังสือ

---

## ถ้าอยากได้ตัวหนังสือคมกริบ 100% แบบไม่ต้องลุ้น

เรามีอีกทางที่แน่นอนกว่า: เรนเดอร์ปกจาก Remotion เหมือนที่เรนเดอร์คลิป ฟอนต์ Kanit ตัวจริงอยู่ใน
บันเดิลแล้ว ตัวหนังสือจึงคมและสะกดถูกเสมอ ไม่มีทางพลาด แล้วใช้ภาพที่เจนจาก prompt ข้างบนเป็น
**พื้นหลังอย่างเดียว** (ตัด TEXT ทั้งบล็อกออกจาก prompt)

ยังไม่ได้ทำ เพราะโจทย์คือขอ prompt — แต่ถ้าอยากได้ บอกได้ ใช้เวลาไม่นาน
