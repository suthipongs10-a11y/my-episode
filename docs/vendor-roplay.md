# RoPlay — what we need to know before paying

Status: **questions unanswered. No money has moved.**

RoPlay (`roplay-app.com`, Discord `roplayapp`) is the native iOS+Android RO
client that `eternal-origin.com` uses — the string `Roplay [v.3.6.48]` is on
their login screen. Published tiers as of July 2026 were around **$190 / 3
months** and **$250 / 6 months**.

The operator has decided to buy it (`CLAUDE.md` §3a). This file is the record
of what we asked, what they answered, and what each answer changed. **Fill in
the Answer column before purchase.** Every row is something that costs more than
the subscription if it is answered badly after the fact.

---

## The eight questions

| # | Question | Why it matters | Answer |
|---|---|---|---|
| 1 | Which `packetver`s do you support? | Decides our rAthena build, our client data, our whole content baseline. We currently build `PACKETVER=20180620`. | |
| 2 | Is Gepard Shield required or optional? What does it cost? | A second subscription. Also decides §3b.1 — whether buying it gets us a working PC client too. | |
| 3 | How does the app reach the server — raw TCP to 6900/6121/5121, or a proxy/WSS endpoint? | **Decides `CLAUDE.md` §3c entirely.** Raw TCP means the origin address is public and Cloudflare cannot protect the game traffic. | |
| 4 | iOS distribution: App Store, TestFlight, or sideload? | Android sideloading is routine. iOS is not. If this needs an Apple developer account or a TestFlight slot, that is an external dependency with its own review process and its own annual fee. | |
| 5 | What do we supply, and where is it hosted? GRF? a client build? assets on your CDN or ours? | Decides whether the asset pipeline is ours or theirs, and who pays the bandwidth. | |
| 6 | How much can we rebrand? Logo, login art, UI colours, app name. | The operator's goal is to *differ* from EternalRO, not to look like a second instance of it. | |
| 7 | Can we change the server address ourselves at runtime? | `CLAUDE.md` §2.1. If the address is baked into your build, moving hosts becomes a support ticket instead of a DNS change. | |
| 8 | What happens the day the subscription lapses? Does the app stop working immediately? | **The biggest business risk in the project.** If it hard-fails, the entire mobile playerbase is one missed invoice away from gone. | |

---

## Ready to paste (Thai)

> สวัสดีครับ ผมกำลังจะเปิดเซิร์ฟ RO (rAthena) และสนใจใช้ RoPlay ครับ
> ขอสอบถามก่อนตัดสินใจ 8 ข้อครับ
>
> 1. รองรับ packetver อะไรบ้างครับ? ตอนนี้เซิร์ฟผม build ด้วย 20180620
> 2. จำเป็นต้องใช้ Gepard Shield ไหมครับ ถ้าจำเป็น ค่าใช้จ่ายประมาณเท่าไหร่
> 3. แอปเชื่อมต่อเซิร์ฟยังไงครับ — ต่อ TCP ตรงเข้าพอร์ต 6900/6121/5121 เลย
>    หรือผ่าน proxy / WebSocket ของทาง RoPlay
> 4. ฝั่ง iOS ผู้เล่นติดตั้งยังไงครับ — App Store, TestFlight หรือ sideload
>    และผมต้องมี Apple Developer account เองไหม
> 5. ผมต้องเตรียมอะไรให้บ้างครับ (GRF? client build?) และไฟล์ asset โฮสต์ไว้
>    ที่ฝั่งไหน ของ RoPlay หรือของผม
> 6. ปรับแบรนด์ได้มากแค่ไหนครับ — โลโก้ ภาพหน้าล็อกอิน สีของ UI ชื่อแอป
> 7. ผมเปลี่ยน IP/โดเมนของเซิร์ฟเองได้ไหมครับ หรือต้องแจ้งทาง RoPlay ทุกครั้ง
> 8. ถ้าหมดอายุ subscription แล้วไม่ได้ต่อ แอปจะหยุดทำงานทันทีเลยไหมครับ
>    หรือผู้เล่นยังเข้าได้อยู่
>
> ขอบคุณครับ

---

## What buying this does *not* buy

**The PC client.** RoPlay is mobile-only. The PC path is still a diffed ragexe,
which `CLAUDE.md` §3b records as unsolved after a full day of work. Budgeting
for RoPlay and assuming "the client problem is handled" would be an expensive
repeat of a mistake already made once.

The one link between them is question 2: if Gepard Shield is required *and* it
ships a working patched client, one purchase closes both gaps. Worth asking
explicitly — it may be the highest-value answer in the table.

---

## Decisions waiting on these answers

Nothing below can be planned accurately until the table is filled in.

- **`packetver`** (Q1) — may force an rAthena rebuild and a regenerated packet
  table in `tools/smoke-play.py`.
- **Host choice** (Q3 + `CLAUDE.md` §3c) — if the app speaks raw TCP, the origin
  is exposed and we need a host with L3/L4 DDoS protection, not Hostinger.
- **Asset pipeline ownership** (Q5) — `CLAUDE.md` §6 Phase 5 is ours or theirs.
- **Total running cost** (Q2 + Q4) — RoPlay alone is not the budget. Gepard and
  an Apple developer account, if required, are recurring too.
