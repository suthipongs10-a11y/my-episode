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

    pain    0–40   (100 − site score) × 0.3 + วิกฤต + ปัญหา conversion
    budget  0–25   paid SERP +15 · pixel โฆษณา +10 (+5 ต่อแพลตฟอร์ม) · GTM อย่างเดียว +4
    alive   0–20   reachable +8 · ปีลิขสิทธิ์ ≤1 ปี +6 / ≤3 +3 · social +3 ต่อช่องทาง (สูงสุด 6)
    reach   0–15   tel +6 · LINE +6 · Facebook +3
    veto           เข้าไม่ได้ → 0 · parked → ≤10

`pitch` (มุมเปิดเรื่อง เลือกด้วยโค้ด): ads_leak · cannot_be_contacted · invisible · fix_list · not_a_lead
`quickWins`: impact ≥ 6 และ ≤ 3 ชม. เรียงตาม impact/ชม.
