# สูตรคะแนน (scoring/v1.ts)

6 หมวด หมวดละ 0-100 คำนวณจาก **ข้อมูลดิบ ไม่ใช่จากจำนวน findings**

```
technical_score  = 0.4×psi_mobile + 0.2×index_ratio×100 + 0.2×https_ok×100 + 0.2×mobile_ok×100
onpage_score     = ค่าเฉลี่ย % หน้าที่ผ่านเกณฑ์ (h1, title, meta, wordcount, schema)
conversion_score = (CVR checks ที่ผ่าน / CVR checks ทั้งหมด) × 100
local_score      = 0.3×gbp_exists + 0.2×review_ratio_vs_competitor + 0.2×reply_rate
                   + 0.15×freshness + 0.15×info_completeness
content_score    = min(100, (our_pages / avg_competitor_pages) × 100) ถ่วงน้ำหนักตาม page_type
visibility_score = (top10/ทั้งหมด)×60 + (top3/ทั้งหมด)×40
```

**Overall** = conversion 25% · local 25% · content 20% · visibility 15% · onpage 10% · technical 5%

น้ำหนักนี้ตั้งใจให้ conversion + local สูงสุด เพราะแก้แล้วเห็นผลเร็วที่สุด และเป็นบริการที่เราขาย

**ทุกฟังก์ชันคะแนนต้องมี snapshot test ที่ล็อกค่าไว้**
จะแก้สูตร → สร้าง `v2.ts` ใหม่ **ห้ามแก้ `v1.ts`** (ไม่งั้นรายงานเก่าจะอธิบายตัวเองไม่ได้)
