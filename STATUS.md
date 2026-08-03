# STATUS.md — WGI Audit Engine

> อัปเดตไฟล์นี้ **ทุกครั้งที่จบ session** — อ่านเป็นไฟล์ที่สองต่อจาก `CLAUDE.md`
> เขียนให้ "ตัวเราในอีก 2 สัปดาห์" อ่านแล้วทำงานต่อได้ทันทีโดยไม่ต้องเดา
>
> เริ่ม session ใหม่ให้รัน **`pnpm ctx`** ก่อน จะได้สถานะย่อในไม่กี่บรรทัด

---

## สถานะปัจจุบัน

| หัวข้อ | ค่า |
|---|---|
| Milestone ปัจจุบัน | **M0 — Skeleton** |
| สถานะ | ผ่าน acceptance แล้ว |
| อัปเดตล่าสุด | 2026-08-03 |
| git tag ล่าสุด | `m0` |
| ต้นทุน API สะสม | 0 บาท (ยังไม่ได้เรียก API ใดเลย) |

---

## รอบล่าสุดทำอะไรไป

- สร้าง repo `wgi-audit` แยกจาก repo เดิม (repo เดิมมี git history 167 MB ที่ลบไม่ได้)
- pnpm workspace + TypeScript strict + vitest
- `schema.sql` ครบทุกตารางตามสเปก (ไม่มีตาราง `scores` ตามกฎข้อ 2)
- `db/client.ts` — PGlite สำหรับ dev/test, `postgres.js` สำหรับ prod, SQL ชุดเดียวกัน
- `http/cached-fetch.ts` — cache ลงดิสก์, robots.txt, 1 req/วิ/โดเมน, ต่อสายเข้า ledger
- `cost/ledger.ts` — บันทึกทุก call (รวม cache hit) + บังคับเพดาน 40/60 บาท
- `log/logger.ts` — แทน console.log
- `pipeline/runner.ts` — ลำดับ hardcode, resume ได้, `--only`, `--dry-run`
- CLI `pnpm audit` + worker polling + `pnpm cost` + **`pnpm ctx`** (ประหยัด token)
- เทสต์ 48 ข้อ ไม่ยิงเน็ต ไม่เสียเงิน

**Acceptance M0 ผ่าน:** `pnpm audit --domain=x --area=ภูเก็ต` สร้าง client + audit_run
ที่ไปถึงสถานะ `done` และ `--queue` → worker หยิบงาน → `done` (มีเทสต์คุมทั้งสองเส้นทาง)

---

## งานถัดไปที่ต้องทำ (เรียงตามลำดับ)

### M1 — Crawl + On-page + Technical
- [ ] pipeline 01-intake: normalize domain, ตาม redirect, เช็คว่าเว็บออนไลน์
- [ ] pipeline 02-discover: robots.txt + sitemap.xml + crawl หน้าแรก
- [ ] pipeline 03-crawl: ดึงหน้า + แยก field ตามตาราง `pages`
- [ ] pipeline 04-classify: จัดประเภทด้วยกฎ (LLM ไว้ M3)
- [ ] pipeline 05-psi: PageSpeed mobile 3 หน้า
- [ ] rules ONP-001..009 + TEC-001..008
- [ ] fixtures จาก `phuketmaidservice.com` (หน้าแรก + บริการ 2 + ติดต่อ)
- **Acceptance:** รัน CLI แล้วได้ findings ONP/TEC ถูกต้อง โดย unit test ใช้ fixture ไม่ยิงเน็ต

### ก่อนถึง M3/M4 — ทำมือ
- [ ] สมัคร DataForSEO เติมเครดิตขั้นต่ำ → บันทึกราคาจริงต่อ SERP query
- [ ] เปิด Google Places API + ตั้ง quota alert
- [ ] ขอ PageSpeed Insights API key (ฟรี)
- [ ] เตรียม LLM endpoint + ทดสอบว่าตอบภาษาไทยได้
- [ ] สร้างโปรเจกต์ Supabase ชื่อ `wgi-audit` แล้วใส่ `DATABASE_URL`

---

## ติดค้าง / ปัญหาที่ยังไม่แก้

- **ยังไม่ได้สร้าง GitHub repo** — integration ไม่มีสิทธิ์สร้าง ต้องสร้างเองแล้ว push
  (คำสั่งอยู่ท้ายไฟล์นี้)
- `apps/web` ยังว่าง ตั้งใจให้ไปทำที่ M6

---

## คำถามที่ยังไม่มีคำตอบ

| คำถาม | ต้องตอบก่อน | สถานะ |
|---|---|---|
| Rank Grid 5×5 กินโควตา Places เท่าไรจริง คุ้มไหม หรือ 3×3 พอ | M4 | รอราคาจริง — เริ่มที่ 3×3 ไว้ก่อน |
| DataForSEO Live SERP หรือ Task-based | M3 | ยังไม่ตัดสินใจ · เกี่ยวกับงบเวลา 10 นาที (ดู `docs/pipeline.md`) |
| เก็บ HTML ดิบทุกหน้าหรือเฉพาะหน้าสำคัญ | M1 | เริ่มจากเก็บทุกหน้า แล้ววัดขนาดจริง |
| ฟอนต์ไทยใน PDF: Sarabun หรือ IBM Plex Thai | M5 | ยังไม่ตัดสินใจ |

---

## บันทึกการตัดสินใจ (Decision Log)

| วันที่ | ตัดสินใจ | เหตุผล |
|---|---|---|
| 2026-08-03 | แยก repo ใหม่ ไม่ใช้ `my-episode` | git history 167 MB (วิดีโอที่ commit ไปแล้ว) ลบไฟล์ไม่ช่วย · stack คนละอย่าง · submodule และ CI ของโปรเจกต์เดิมต้องรื้อทั้งหมด |
| 2026-08-03 | **PGlite สำหรับ dev/test** | รัน `schema.sql` จริงในโปรเซส ไม่ต้องมี Docker/Supabase/เน็ต → `pnpm test` ฟรีและรันได้ทุกที่ ตรงกับกฎ "เทสต์ไม่ยิง API จริง" |
| 2026-08-03 | เลื่อน Next.js (`apps/web`) ไป M6 | ไม่มี milestone ก่อน M6 ที่ใช้ ถ้าใส่ตอนนี้ต้องอัปเกรดก่อนได้ใช้จริง — **นี่คือส่วนที่ต่างจากสเปกเดิมที่ระบุ Next.js ไว้ใน M0** |
| 2026-08-03 | robots.txt: บังคับกับคู่แข่ง ไม่บังคับกับเว็บลูกค้า | ลูกค้ากรอกฟอร์มขอ audit เอง = ให้ความยินยอมแล้ว · เว็บ SME จำนวนมากอยู่หลัง WAF หรือตั้ง `Disallow: /` ถ้าบังคับใช้ สินค้าจะพังกับลูกค้ากลุ่มเป้าหมายพอดี |
| 2026-08-03 | ดึง robots.txt ด้วย User-Agent ของเราเอง | client ทั่วไปโดน WAF ตอบ 403 และมาตรฐานอ่าน 403 = "ห้ามทั้งเว็บ" ทำให้เว็บที่ยินดีให้อ่านดูเหมือนปิดสนิท |
| 2026-08-03 | เทสต์ใช้ PGlite instance เดียวต่อไฟล์ แล้ว truncate | instance ละ ~2 วิ · 12 เทสต์ = 26 วิ → 7 วิ · เทสต์ที่ช้าคือเทสต์ที่ไม่มีใครรัน |
| — | job table + polling แทน Redis/BullMQ | ปริมาณงานต่ำมาก ไม่คุ้มความซับซ้อนและค่า Redis |
| — | ไม่สร้างตาราง `scores` | สูตรคะแนนจะเปลี่ยนแน่นอน เก็บคะแนนสำเร็จรูปแล้วประวัติย้อนหลังจะพัง |
| — | หยุดที่ M6 จนกว่าจะมีลูกค้ารายเดือน ≥ 5 ราย | คอขวดจริงคือการขาย ไม่ใช่จำนวนฟีเจอร์ |
| — | ชื่อรุ่น LLM อยู่ใน `.env` เท่านั้น | ราคาและรุ่นเปลี่ยนทุก 2-3 เดือน |

---

## ต้นทุนจริง (อัปเดตเมื่อรู้ตัวเลขจริง)

| รายการ | ราคาที่คาด | ราคาจริง | หมายเหตุ |
|---|---|---|---|
| DataForSEO — SERP 1 query | ~สตางค์ | — | |
| DataForSEO — keyword volume | ~สตางค์ | — | |
| Google Places — place details | — | — | |
| Google Places — rank grid (25 จุด) | — | — | แพงที่สุด เริ่มที่ 3×3 (9 จุด) |
| LLM narrative 1 รายงาน | 5-10฿ | — | |
| **รวมต่อ audit** | **≤ 40฿** | — | เกิน 60฿ = pipeline หยุด (บังคับในโค้ดแล้ว) |

> **M1 + M2 ไม่ต้องใช้ API เสียเงินเลย** (PSI ฟรี) — รายงานที่มีแค่ on-page + technical +
> conversion ก็ขายได้แล้ว ใช้พิสูจน์ว่าลูกค้าโทรกลับไหมก่อนจ่ายค่า DataForSEO/Places

---

## ไฟล์ที่แก้ล่าสุด

`packages/core/src/{db,http,cost,log,pipeline,types,i18n}` · `apps/worker/src` · `scripts/ctx.ts`

## คำสั่งที่ใช้รันต่อจากจุดนี้

```bash
pnpm install
pnpm ctx                                    # สถานะย่อ
pnpm test
pnpm audit --domain=phuketmaidservice.com --area=ภูเก็ต
```

## ยังไม่ได้ push — สร้าง repo แล้วรันสองคำสั่งนี้

```
git remote add origin https://github.com/<user>/wgi-audit.git
git push -u origin main --tags
```
