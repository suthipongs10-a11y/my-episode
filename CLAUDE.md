# CLAUDE.md — WGI Audit Engine

> **โปรเจกต์:** Website Growth Intelligence — Free Audit Engine
> **เป้าหมายธุรกิจ:** รายงาน audit ฟรีอัตโนมัติ ใช้เป็นเครื่องมือเปิดการขายงานเว็บ / SEO / GBP
> ให้ธุรกิจไทยที่มีเว็บแล้วแต่ไม่มีลูกค้า
> **ไฟล์นี้คือ Single Source of Truth** — ถ้าคำสั่งใดขัดกับไฟล์นี้ ให้ยึดไฟล์นี้แล้วแจ้งผู้ใช้

**อ่านไฟล์นี้ + `STATUS.md` แล้วเริ่มทำงานได้เลย** ไม่ต้องอ่านโค้ดทั้ง repo
รายละเอียดที่ยาวกว่านี้แยกไว้ใน `docs/` อ่านเมื่อต้องใช้เท่านั้น

---

## 0. กฎเหล็ก 8 ข้อ

1. **LLM ห้ามผลิตตัวเลข** — ทุกคะแนน ทุกจำนวน ทุกอันดับ มาจากโค้ดที่คำนวณซ้ำได้ผลเดิม
   LLM มีหน้าที่เดียว: แปลงตัวเลขที่คำนวณแล้วเป็นภาษาคน
   ตัวเลขในรายงานที่หาที่มาในโค้ดไม่ได้ = bug ระดับ critical
2. **เก็บ raw data เสมอ คำนวณคะแนนตอนอ่าน** — ห้ามมีตาราง `scores`
   ทุก snapshot มี `scoring_version` คำนวณผ่าน `scoring/v{n}.ts` ตอน query
3. **นี่คือ pipeline ไม่ใช่ agent** — ลำดับขั้น hardcode ใน `pipeline/`
   LLM ไม่เลือกว่าจะเรียกอะไรต่อ เว็บเดียวกันต้องได้ผลเหมือนเดิมทุกครั้ง (ยกเว้น narrative)
4. **ทุก external call ผ่าน `http/cached-fetch.ts`** — ห้ามเรียก `fetch()` ตรง
   รันซ้ำตอน dev ต้องไม่เสียเงินเพิ่ม
5. **ทุก external call บันทึกต้นทุน** ลง `api_calls` — เป้า ≤ 40฿/audit, เกิน 60฿ pipeline หยุด
6. **อ่านอย่างเดียว และสุภาพ** — 1 req/วินาที/โดเมน, User-Agent ระบุตัวตนได้
   **robots.txt: เคารพเต็มที่กับเว็บคู่แข่ง แต่ไม่บังคับใช้กับเว็บลูกค้าที่กรอกฟอร์มขอ audit เอง**
   (เขาเชิญเราเข้าไปอ่าน และเว็บ SME จำนวนมากอยู่หลัง WAF หรือตั้ง `Disallow: /` —
   ถ้าบังคับใช้ สินค้าจะใช้ไม่ได้กับลูกค้ากลุ่มที่เราตั้งใจขายพอดี)
7. **ไม่รับประกันอันดับ** — ใช้ "มีโอกาส / มีแนวโน้ม" ห้าม "รับประกัน / การันตี / ติดหน้าแรกแน่นอน"
8. **ทำทีละ Milestone** — ห้ามข้าม จบแต่ละอันต้อง `git tag m{n}` + อัปเดต `STATUS.md` + เทสต์ผ่านหมด

---

## 1. บริบทธุรกิจ

**กลุ่มเป้าหมาย:** SME ไทยที่จ้างทำเว็บไปแล้ว 1-3 ปี แต่เว็บไม่สร้างลูกค้า
**เขาอยากรู้:** ทำไมยังไม่มีลูกค้า / คู่แข่งทำอะไรที่เราไม่มี / ควรลงทุนอะไรก่อน
**เราอยากได้:** เบอร์/LINE เพื่อปิดงานเว็บ งานแก้เว็บ งาน GBP หรือแพ็กเกจรายเดือน

**Audit ฟรี = เครื่องมือขาย ไม่ใช่สินค้า**
เกณฑ์ตัดสินว่าฟีเจอร์ไหนควรมี: **"ทำให้ลูกค้าอยากโทรกลับไหม"** ไม่ใช่ "ครบตามมาตรฐาน SEO ไหม"

**ข้อจำกัด:** audit จบใน ≤ 10 นาที · เจ้าของตรวจทานเองไม่เกิน 15 นาที/ราย
ฟีเจอร์ที่ทำให้ต้องทำมือเพิ่ม = ตัดทิ้ง

**Fixture หลัก:** `phuketmaidservice.com` + คู่แข่งทำความสะอาดภูเก็ต 3 ราย

---

## 2. Stack

| ชั้น | ใช้ | เหตุผล |
|---|---|---|
| Runtime | Node 20+ · TypeScript strict · ESM | — |
| Monorepo | pnpm workspace: `packages/core`, `apps/worker`, `apps/web` | — |
| DB (prod) | Supabase / Postgres ผ่าน `postgres.js` | ใช้อยู่แล้ว ราคาถูก |
| DB (dev/test) | **PGlite** (Postgres ใน process) | รัน `schema.sql` จริงโดยไม่ต้องมี Docker/Supabase/เน็ต |
| Worker | Node process อ่านตาราง `jobs` (poll 5 วิ) | ปริมาณงานต่ำ ไม่คุ้ม Redis |
| Crawl / PDF | Playwright (chromium) — เพิ่มตอน M1/M5 | ตัวเดียวจบทั้ง crawl SPA และ print PDF |
| Parse HTML | cheerio | เร็วกว่า headless มาก ใช้ Playwright เฉพาะเว็บ SPA |
| Validation | zod | บังคับ schema กับทุก external response |
| Test | vitest + fixtures บนดิสก์ + PGlite | เทสต์ไม่ยิงเน็ตและไม่เสียเงิน |

**ห้ามใช้:** LangChain, agent framework, ORM หนัก

---

## 3. External APIs

| ผู้ให้บริการ | ใช้ทำอะไร | ต้นทุน | ENV |
|---|---|---|---|
| PageSpeed Insights | Core Web Vitals (mobile) | ฟรี | `PSI_API_KEY` |
| DataForSEO | SERP ranking, keyword volume | หลักสตางค์/query | `DFS_LOGIN`, `DFS_PASSWORD` |
| Google Places | GBP, รีวิว, Rank Grid | **กินโควตามากสุด ระวัง** | `GOOGLE_PLACES_KEY` |
| LLM (OpenAI-compatible) | narrative + จัดหมวดหน้า | ~5-10฿/รายงาน | `LLM_BASE_URL`, `LLM_API_KEY` |

**LLM 2 ระดับ:** `cheap` = งานปริมาณมาก (จัดหมวดหน้า) · `smart` = 1 ครั้ง/audit (narrative)
ชื่อรุ่นอยู่ใน `.env` เท่านั้น (`LLM_MODEL_CHEAP`, `LLM_MODEL_SMART`) **ห้าม hardcode**

ทุก LLM call: บังคับ JSON → parse ด้วย zod → parse ไม่ผ่าน retry 1 ครั้ง → fallback template ไทย
บันทึก `prompt_hash`, `model`, tokens ลง `api_calls`

---

## 4. โครงสร้าง

```
packages/core/src/
  db/        schema.sql · client.ts (PGlite|postgres) · queries.ts · testing.ts
  http/      cached-fetch.ts  ← ทางเดียวที่โค้ดนี้ออกเน็ต
  cost/      ledger.ts        ← บันทึกต้นทุน + บังคับเพดาน
  log/       logger.ts        ← ห้าม console.log
  pipeline/  runner.ts · index.ts (STAGE_REGISTRY) · 01-intake.ts …
  rules/     1 ไฟล์ = 1 หมวด (pure functions) · catalog.ts
  scoring/   v1.ts (ห้ามแก้ ถ้าจะเปลี่ยนสูตรให้สร้าง v2.ts)
  llm/       router.ts · prompts/*.md
  i18n/      th.ts            ← ข้อความไทยทั้งหมดอยู่ที่นี่
  types/     index.ts
apps/worker/src/  cli.ts · index.ts (poller) · run-audit.ts · cost-cli.ts
apps/web/         M6
fixtures/         HTML/JSON สำหรับเทสต์ (ห้ามยิงเน็ตตอนเทสต์)
scripts/          ctx.ts · db-push.ts
```

รายละเอียด pipeline 14 ขั้น · rules catalog · สูตรคะแนน · โครงรายงาน → `docs/`

---

## 5. คำสั่ง

```bash
pnpm install
pnpm audit --domain=x.com --area=ภูเก็ต    # รัน pipeline (ไม่มี DATABASE_URL = ใช้ PGlite)
pnpm audit --domain=x.com --only=03-crawl  # เฉพาะบางขั้น (ใช้ cache)
pnpm audit --domain=x.com --dry-run        # ไม่เรียก API ภายนอกเลย
pnpm audit --run=<uuid> --resume           # ทำต่อจากขั้นที่ค้าง
pnpm audit --domain=x.com --queue          # ใส่คิวให้ worker
pnpm worker                                # poller
pnpm test                                  # ไม่ยิงเน็ต ไม่เสียเงิน
pnpm typecheck
pnpm cost --run=<uuid>                     # ต้นทุนจริงของ run นั้น
pnpm ctx                                   # สถานะโปรเจกต์แบบสั้น (ดู §7)
```

---

## 6. กฎการเขียนโค้ด

- TypeScript strict ห้าม `any` (ใช้ `unknown` + zod)
- ทุก external response parse ด้วย zod ก่อนใช้
- ทุกฟังก์ชันใน `rules/` และ `scoring/` ต้อง pure + มี unit test
- ข้อความไทยอยู่ใน `i18n/th.ts` ห้าม hardcode ในโค้ด logic
- ห้าม `console.log` ใช้ `log/logger.ts`
- commit: `feat(m3): add serp ranking check`
- จบงานทุกครั้ง อัปเดต `STATUS.md`

---

## 7. ประหยัด token (สำคัญ — อ่านก่อนเริ่ม session)

โปรเจกต์นี้ตั้งใจให้ session ใหม่เริ่มงานได้โดยไม่ต้องอ่านโค้ดทั้ง repo

1. **เริ่มด้วย `pnpm ctx`** — สรุปสถานะทั้งโปรเจกต์ในไม่กี่บรรทัด
   (milestone, stage ที่ลงทะเบียนแล้ว, rules ที่มี, ผลเทสต์, งานถัดไป)
   วางผลลัพธ์นั้นแทนการให้ AI ไล่อ่านไฟล์
2. **อ่านแค่ 2 ไฟล์:** `CLAUDE.md` + `STATUS.md` รายละเอียดอยู่ใน `docs/` เปิดเมื่อต้องใช้
3. **`--dry-run` และ `--only`** — ทดสอบขั้นเดียวโดยไม่รันทั้ง pipeline
4. **cache + fixtures** — งานซ้ำไม่ยิงเน็ตและไม่เสียเงิน แปลว่าไม่ต้องอธิบายผลใหม่ทุกครั้ง
5. **rules เป็น pure function + unit test** — ตรวจถูก/ผิดด้วยการรันเทสต์ ไม่ใช่ด้วยการอ่านโค้ดยาว ๆ
6. **`i18n/th.ts` แยกข้อความออกจาก logic** — แก้คำพูดโดยไม่ต้องโหลดไฟล์ logic เข้ามาอ่าน

---

## 8. ข้อควรระวังด้านกฎหมาย/จริยธรรม

- ส่งรายงานให้เฉพาะคนที่กรอกฟอร์มเอง **ห้ามยิง audit แล้วส่งหาคนที่ไม่ได้ขอ** (PDPA)
- เก็บข้อมูลติดต่อเท่าที่จำเป็น มีปุ่มขอลบข้อมูล
- ข้อมูลคู่แข่งใช้เฉพาะข้อมูลสาธารณะ ห้าม bypass paywall/login
- เคารพ robots.txt ของคู่แข่งเสมอ (ดูกฎข้อ 6 สำหรับข้อยกเว้นเว็บลูกค้า)
