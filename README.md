# wgi-audit — Website Growth Intelligence

รายงาน audit เว็บไซต์อัตโนมัติสำหรับธุรกิจไทย SME ที่มีเว็บแล้วแต่ไม่มีลูกค้า
ใช้เป็นเครื่องมือเปิดการขายงานเว็บ / SEO / GBP

> **เอกสารหลัก:** [`CLAUDE.md`](CLAUDE.md) (กฎและสถาปัตยกรรม) · [`STATUS.md`](STATUS.md) (สถานะล่าสุด)
> รายละเอียดแยกไว้ใน [`docs/`](docs/)

## เริ่มใช้

```bash
pnpm install
pnpm audit --domain=phuketmaidservice.com --area=ภูเก็ต
```

**ไม่ต้องตั้งค่าอะไรก่อน** — ถ้าไม่ได้ตั้ง `DATABASE_URL` ระบบใช้ PGlite (Postgres ในโปรเซส)
เก็บไว้ที่ `.data/dev` และไม่เรียก API ภายนอกใด ๆ ที่เสียเงิน

## คำสั่ง

```bash
pnpm ctx                                # สถานะโปรเจกต์แบบสั้น (ใช้เปิด session ใหม่)
pnpm test                               # ไม่ยิงเน็ต ไม่เสียเงิน
pnpm typecheck
pnpm audit --domain=x.com --dry-run     # ไม่เรียก API ภายนอกเลย
pnpm audit --domain=x.com --only=03-crawl
pnpm audit --run=<uuid> --resume        # ทำต่อจากขั้นที่ค้าง
pnpm audit --domain=x.com --queue       # ใส่คิว
pnpm worker                             # poller
pnpm cost --run=<uuid>                  # ต้นทุนจริงของ run นั้น
pnpm db:push                            # apply schema.sql
```

## หลักการที่ทั้งโปรเจกต์ยึด

1. **LLM ไม่ผลิตตัวเลข** — ตัวเลขทุกตัวมาจากโค้ดที่คำนวณซ้ำได้ผลเดิม LLM แค่แปลงเป็นภาษาคน
2. **เก็บ raw data คำนวณคะแนนตอนอ่าน** — ไม่มีตาราง `scores` สูตรเปลี่ยนได้โดยประวัติไม่พัง
3. **pipeline ไม่ใช่ agent** — ลำดับ hardcode เว็บเดียวกันได้ผลเหมือนเดิมทุกครั้ง
4. **ทุก external call ผ่าน cache และถูกบันทึกต้นทุน** — เกินเพดาน pipeline หยุด
5. **อ่านอย่างเดียว และสุภาพ** — 1 req/วิ/โดเมน · เคารพ robots.txt ของคู่แข่ง

## สถานะ

M0 (Skeleton) ผ่านแล้ว · ถัดไป M1 (Crawl + On-page + Technical) — ดู `STATUS.md`

## License

Private.
