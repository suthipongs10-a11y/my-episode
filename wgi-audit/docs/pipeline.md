# Pipeline — 14 ขั้น

แต่ละขั้น: (ก) เขียนผลลง `snapshots` (ข) อัปเดต `audit_runs.stage` (ค) resume ได้ถ้า crash

| # | ขั้น | ทำอะไร | Milestone |
|---|---|---|---|
| 01 | intake | normalize domain, ตามredirect, เช็คว่าเว็บออนไลน์ | M1 |
| 02 | discover | robots.txt, sitemap.xml (รวม index), หน้าแรก → รายการ URL (ไม่มี sitemap = crawl ลึก 3 ชั้น) | M1 |
| 03 | crawl | ลูกค้า 150 หน้า / คู่แข่ง 50 หน้า/ราย · 1 req/วิ · timeout 20 วิ · retry 2 · Playwright เฉพาะ SPA | M1 |
| 04 | classify | กฎก่อน (URL pattern + H1 + schema) ถ้าตัดสินไม่ได้ค่อยส่ง batch ให้ LLM cheap | M1 |
| 05 | psi | PageSpeed mobile เท่านั้น 3 หน้า: แรก + บริการหลัก + ติดต่อ | M1 |
| 06 | keywords | seed จากโค้ด → LLM cheap เสนอเพิ่ม (ห้ามใส่ volume) → DataForSEO ดึง volume จริง → คัด 30 คำ | M3 |
| 07 | serp | เช็คอันดับ 30 คำบน google.co.th + หาคู่แข่งจาก domain ที่โผล่บ่อย | M3 |
| 08 | gbp | Places: verified, หมวด, รีวิว, % ตอบกลับ, รูป, เวลาทำการ, NAP ตรงกับเว็บไหม + Rank Grid | M4 |
| 09 | presence | **ทำแล้ว (ส่วนฟรี):** ad pixel/tag บนเว็บ + paid SERP · social links · parked · ปีลิขสิทธิ์ · **รอ Places:** รีวิวล่าสุด เวลาทำการ | pivot |
| 10 | competitors | 3 ราย รันขั้น 03-09 แบบย่อ → ตารางเทียบ | M3 |
| 11 | rules | `rules/index.ts` → `Finding[]` · pure · ทุก finding มี evidence | M1-M2 |
| 12 | scoring | 6 หมวดจาก findings + metrics ดิบ | M2 |
| 13 | narrative | LLM smart 1 ครั้ง + post-condition ตรวจตัวเลขปลอม | M5 |
| 14 | report | HTML → Playwright PDF (A4 ฟอนต์ไทย) → Storage + share link | M5 |

## เวลา 10 นาที — คอขวดอยู่ที่ SERP ไม่ใช่ crawl

crawl 150 หน้า @1 req/วิ = ~150 วิ (คู่แข่งขนานกันได้ เพราะจำกัดต่อโดเมน)
**SERP 30 คำแบบ Live ถ้ายิงทีละคำ = ~300 วิ** ครึ่งหนึ่งของงบเวลาทั้งหมด

**แก้แล้ว (M3):** DataForSEO รับ task เป็น *array* ใน POST เดียว
`serp/dataforseo.ts` ส่งทีละ 10 คำแล้วยิงหลาย batch ขนานกัน →
30 คำ = 3 requests ไม่ใช่ 30 · คิดเงินเท่าเดิม (ต่อ task) แต่ประหยัดเวลา
มีเทสต์คุมไว้ว่า 30 คำต้องไม่เกิน 4 requests

## ขั้นที่ไม่มี credential จะข้าม ไม่ใช่พัง

06 ยังทำงานได้เสมอ — seed มาจากหน้าเว็บของลูกค้าเอง (`keywords/seed.ts` เป็น pure function)
LLM และ DataForSEO เป็นของเสริม · 07 และ 10 ข้ามทั้งขั้นถ้าไม่มี DFS
**กฎ:** ไม่มีข้อมูล = rule เงียบ ไม่ใช่ rule ฟันธงว่าแย่ (ดู `SiteFacts.keywords`)

## Rank Grid — ตัวที่แพงที่สุด

5×5 = 25 Places calls ต่อ **1 keyword เท่านั้น** (เลือกคำหลักคำเดียว)
เริ่มที่ 3×3 (9 จุด) ก่อน ขยายเป็น 5×5 เฉพาะลูกค้าที่จ่ายเงินแล้ว


## Opportunity score (ฝั่งคนขาย) — คำนวณใน 12-scoring เก็บที่ `site/opportunity`

คนละตัวกับ site score: ถาม "ควรเสียเวลาเขียน proposal ให้รายนี้ไหม" ไม่ใช่ "เว็บดีไหม"

**v2 (2026-09-06) = ตาราง 9 สัญญาณที่ผู้ใช้ให้คะแนน lead ด้วยมืออยู่แล้ว** บวกกันเต็ม 100

| Signal | คะแนน | วัดจาก | บางส่วน |
|---|---|---|---|
| กำลังยิง Ads | +25 | pixel Meta / Google Ads / TikTok / LINE บนเว็บ หรือโดเมนโผล่ในผล paid ของ DataForSEO | GTM อย่างเดียว = +10 |
| Website มีปัญหา Conversion | +20 | finding หมวด conversion — วิกฤต 20 · สูง 15 | กลาง 10 · ต่ำ 5 |
| Mobile มีปัญหา | +10 | TEC-002, TEC-003, TEC-007, CVR-001, CVR-003 — วิกฤต/สูง = เต็ม | กลาง/ต่ำ = +5 · ไม่มี PSI key = บอกไว้ในหลักฐาน |
| SEO อ่อน | +10 | onpage < 50 · หรือ visibility ที่*วัดจริง* < 40 · หรือ finding SEO ระดับสูงขึ้นไป ≥ 2 | มี finding SEO บ้าง หรือ onpage < 70 = +5 |
| ไม่มี Landing Page | +15 | crawl ได้หน้าเดียว หรือไม่มีหน้า service/location เลย | มีหน้าบริการ 1 หน้า = +8 |
| GBP Active | +5 | Google Places — **ยังไม่ได้วัด** จนกว่าจะมี key | — |
| Facebook Active | +5 | มีลิงก์เพจบนเว็บ (ความเคลื่อนไหวให้คนกดดูเอง มีปุ่มเปิด) | — |
| มี Review จำนวนมาก | +5 | Places · หรือ `aggregateRating.reviewCount` ใน JSON-LD ≥ 20 · ถ้าเว็บไม่บอก = ยังไม่ได้วัด | — |
| มีหลายสาขา | +5 | Places · หน้า location ≥ 2 · ที่อยู่ใน JSON-LD ≥ 2 · ข้อความ "N สาขา" (ไม่นับ "สาขาวิชา") | — |

    score       = round(points / measuredMax × 100)
    measuredMax = 100 − Σ max ของแถวที่ "ยังไม่ได้วัด"   (ไม่มี Places = 90 หรือ 95)
    veto          เข้าไม่ได้ → 0 · parked → ≤ 10

สถานะของแถว: `hit` · `partial` · `miss` (ดูแล้วไม่มี) · `unmeasured` (ยังไม่ได้ดู — **คนละความหมาย** จึงไม่นับในตัวหาร)
ทุกแถวมี `evidence[]` ภาษาไทย · แถวที่มาจาก finding มี `codes[]` · Facebook มี `link`

`pitch` (มุมเปิดเรื่อง เลือกด้วยโค้ด): ads_leak (Ads hit + conversion ≥ 15 หรือไม่มี landing) ·
cannot_be_contacted (ไม่มี tel/LINE/FB) · invisible (SEO hit และไม่ยิง Ads) · fix_list · not_a_lead (veto หรือไม่มีอะไรเลย)
`quickWins`: impact ≥ 6 และ ≤ 3 ชม. เรียงตาม impact/ชม.

v1 (pain/budget/alive/reach) ถูกแทนก่อนมี run จริง — snapshot ที่ไม่มี `version` คือ v1 dashboard จะบอกให้รันใหม่
