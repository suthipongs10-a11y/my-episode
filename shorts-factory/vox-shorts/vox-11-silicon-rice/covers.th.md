# ภาพหน้าปก — vox-11 · เกษตรที่คนไทยควรรู้

```
export GEMINI_API_KEY="$GOOGLE_TTS_API_KEY"
python tools/gen_image.py --model pro --aspect 16:9 --prompt "<วาง prompt>" \
  --out media/projects/vox-11-silicon-rice/covers/<ชื่อ>.png
```

> ### ⬛ **16:9 แนวนอน** เพราะคลิปยาว 8 นาที (PIPELINE §3)

**สกิน blueprint กรมท่าเข้ม** · **ห้ามมีชื่อการค้าหรือยี่ห้อปุ๋ย** — คลิปพูดถึง**สูตร**
ไม่ได้พูดถึงสินค้าของใคร และปกที่มีชื่อยี่ห้อจะพลิกความหมายนั้นทันที

---

## แบบ A — ศูนย์ในถุงปุ๋ย (ใช้ตัวนี้ · ผ่านรอบแรก)

หัวใจของคลิปคือ **สิ่งที่ไม่อยู่ตรงนั้น** ปกจึงต้องวาดความว่างเปล่า ไม่ใช่วาดซิลิกอน
วิธีวาดความว่างเปล่าที่อ่านออกใน 320px คือ **เลขศูนย์ตัวใหญ่ในถุงปุ๋ย**

```
A bold horizontal YouTube thumbnail, 1920x1080 landscape, very dark navy blue background
(#0e1a24) with a faint thin blueprint grid, flat technical drawing style.

LEFT HALF: large Thai headline in warm off-white, heavy geometric sans-serif, stacked on
exactly two lines, perfectly spelled, reading exactly:
ธาตุที่ข้าวกินมากที่สุด
อยู่ในถุงปุ๋ยเท่านี้
Directly below the headline, one short line of muted grey-blue Thai text on ONE line,
perfectly spelled, much smaller: ในสูตร N-P-K

RIGHT HALF: one enormous numeral in bright amber, at least four times taller than the
headline text, perfectly formed, reading exactly:
0
The numeral sits inside a simple flat outline drawing of a fertiliser sack, drawn as a plain
rounded rectangle in muted grey-blue outline with a folded top edge, so the amber zero
appears printed on the sack.

Flat solid colours only: very dark navy, warm off-white, bright amber, muted grey-blue.
No gradient, no glow, no drop shadow, no 3D, no photographic texture, no rice plants, no
people, no logos, no brand names, no other numbers or letters anywhere except the specified
Thai text and the single 0.
Keep 8% clear margin left and right, 6% top and bottom.
```

---

## ผลลัพธ์ — ผ่านรอบแรก ไม่มีตัวที่ตก

| ไฟล์ | คืออะไร |
|---|---|
| `covers/A-zero-in-the-bag.png` | ต้นฉบับ 2752×1536 · **2.07 MB — เกินลิมิต 2 MB ของ YouTube** |
| `covers/A-zero-in-the-bag-upload.jpg` | **ตัวที่อัปโหลด** 1920×1080 · 0.26 MB |

### วัดแล้ว ไม่ได้กะเอา (PIPELINE §11)

| สิ่งที่วัด | ค่า |
|---|---|
| ความสูงของเลข `0` | **725 px** |
| ความสูงหัวเรื่องหนึ่งบรรทัด | 227 px |
| **อัตราส่วน** | **3.19 เท่า** — เข้าเกณฑ์ 3–4 เท่า |
| เลข `0` กินความสูงของเฟรม | 47.2% |

### ⬛ สิ่งที่ค้นพบ และควรใช้กับปกใบต่อไป

**ขอ "at least four times taller than the headline text" แล้วได้ 3.19 เท่า**
เทียบกับปกเก่าที่ขอแบบหลวม ๆ ว่า "3–4× larger" แล้วได้ **1.61 เท่า (vox-8)** และ
**1.60 เท่า (vox-10)** — ทั้งสองใบเคยถูกบันทึกไว้ว่า "โมเดลทำได้ราว 1.6 เท่าเป็นเพดาน"

**ข้อสรุปนั้นผิด** เพดานไม่ได้อยู่ที่โมเดล มันอยู่ที่วิธีเขียน prompt
**ขอเป็นตัวเลขที่สูงกว่าที่ต้องการจริง แล้วโมเดลจะเข้าใกล้มากขึ้น** — ปกนี้ขอ 4 ได้ 3.19
ถ้าขอ 3 คงได้ราว 1.6 เหมือนเดิม

### ตรวจแล้ว

- คำไทยสะกดถูกทั้งสามจุด: `ธาตุที่ข้าวกินมากที่สุด` · `อยู่ในถุงปุ๋ยเท่านี้` · `ในสูตร N-P-K`
- **บรรทัด `ในสูตร N-P-K` อยู่ครบ และนี่คือบรรทัดที่สำคัญที่สุดบนปก** — ปุ๋ยซิลิกอน
  มีขายในไทยจริง (script.md §คำเตือนจากการค้นคีย์เวิร์ด) ปกที่บอกว่า "ไม่มีในถุงปุ๋ย"
  เฉย ๆ จะถูกแย้งได้ทันที บรรทัดนี้ตีกรอบข้ออ้างให้ตรงกับสิ่งที่เราพิสูจน์ได้
- ไม่มีชื่อยี่ห้อ ไม่มีต้นข้าว ไม่มีคน ไม่มีตัวเลขอื่นแทรก
- ย่อเหลือกว้าง 320px แล้วยังอ่านหัวเรื่องและเลข `0` ออกทั้งคู่

**สิ่งที่ต้องระวังถ้าสร้างใหม่:** ถ้าโมเดลวาดถุงปุ๋ยทึบแทนที่จะเป็นเส้นขอบ เลข `0` จะจมหาย
คำว่า `flat outline drawing` กับ `muted grey-blue outline` เป็นสองคำที่กันข้อนี้ไว้
