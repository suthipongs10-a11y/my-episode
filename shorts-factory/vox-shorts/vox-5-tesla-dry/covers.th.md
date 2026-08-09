# ภาพหน้าปก — vox-5 · The EV Insight

```
export GEMINI_API_KEY="$GOOGLE_TTS_API_KEY"
python tools/gen_image.py --model pro --aspect 9:16 --prompt "<วาง prompt>" \
  --out media/projects/vox-5-tesla-dry/covers/<ชื่อ>.png
```

> ### ⬛ **9:16 แนวตั้ง** เพราะคลิปยาว 58 วินาที = Shorts (PIPELINE §3)

**สกิน blueprint กรมท่าเข้ม** · **ห้ามมีโลโก้หรือชื่อยี่ห้อ** แม้คลิปจะพูดถึงเทสลาโดยตรง —
คลิปพูดถึง**กระบวนการผลิต** ไม่ใช่ยกย่องบริษัท และปกที่มีโลโก้จะพลิกความหมายนั้น

---

## แบบ A — เตาอบที่ถูกกากบาท (ใช้ตัวนี้)

หัวใจของคลิปคือ "ข่าวคือสิ่งที่**เอาออก**" ปกจึงต้องแสดงการเอาของออก ไม่ใช่การใส่ของเข้า
และสิ่งที่เอาออกคือวัตถุที่คนไม่เคยนึกว่ามีอยู่ในโรงงานแบต — เตาอบยาวหลายสิบเมตร

```
A bold vertical YouTube Shorts thumbnail, 1080x1920 portrait, very dark navy blue background
(#0f1a2d) with a faint thin blueprint grid, technical drawing style.

TOP THIRD: large Thai headline in warm off-white, heavy geometric sans-serif, stacked on
exactly two lines, perfectly spelled:
ของใหม่ล่าสุด
คือการเอาออก

MIDDLE: a simple flat side-view line drawing of a very long industrial drying oven tunnel,
drawn as a plain elongated horizontal rectangle with a few vertical division lines and a small
roller at each end, in muted grey-blue outline. A thick bright red diagonal cross is drawn
straight over the whole oven, cancelling it out.

BOTTOM THIRD: one enormous number in bright amber, far larger than any other element on the
page, perfectly spelled and reading exactly:
40%
Directly under it, one short line of warm off-white Thai text on ONE line, perfectly spelled:
ของต้นทุนผลิตเซลล์

Flat solid colours only: very dark navy, warm off-white, bright amber, muted grey-blue, bright
red. No gradient, no glow, no drop shadow, no 3D, no photographic texture. No car, no battery
cell, no logos, no brand names, no other numbers anywhere.
Keep 8% clear margin left and right, 6% top and bottom.
```

---

## ผลลัพธ์ — ผ่านรอบแรก

| ไฟล์ | คืออะไร |
|---|---|
| `covers/A-oven-out.png` | ต้นฉบับ 1536×2752 · **2.02 MB — เกินลิมิต 2 MB ของ YouTube** |
| `covers/A-oven-out-upload.jpg` | **ตัวที่อัปโหลด** 1080×1920 · 0.25 MB |

**เกินลิมิตอีกแล้วเป็นคลิปที่สาม** (vox-8 2.27 MB · vox-10 2.11 MB · vox-5 2.02 MB) —
`--model pro` คืนภาพ 2K เสมอ และ PNG 2K แทบจะเกิน 2 MB ทุกครั้ง **ทำ `-upload.jpg` คู่ไว้เลย
อย่ารอให้อัปโหลดไม่ผ่านก่อน** (กฎอยู่ใน PIPELINE §11)

### ตรวจแล้ว

- คำไทยสะกดถูกทั้งสามจุด: `ของใหม่ล่าสุด` · `คือการเอาออก` · `ของต้นทุนผลิตเซลล์`
- **กากบาททับเตาอบทั้งตัว** ไม่ใช่ทับแค่บางส่วน — ความหมาย "เอาออก" อ่านได้ทันที
- `40%` เป็นองค์ประกอบที่ใหญ่ที่สุดบนหน้า ตามกฎตัวเลขเด่นหนึ่งตัว
- ไม่มีโลโก้ ไม่มีชื่อยี่ห้อ ไม่มีรถ ไม่มีตัวเลขอื่นแทรก
- ย่อเหลือความกว้าง 320px แล้วยังอ่านหัวเรื่องและ 40% ออก

**สิ่งที่ต้องระวังถ้าสร้างใหม่:** ถ้าโมเดลวาดกากบาทเป็นสีเดียวกับเส้นเตา ความหมายจะหายไปทันที
สีแดงสดเป็นสิ่งเดียวในปกที่ไม่ใช่พาเลตต์ blueprint และนั่นคือความตั้งใจ

ไม่มีตัวที่ตก ไม่มีไฟล์ `-reject` สำหรับหน้าปกคลิปนี้
