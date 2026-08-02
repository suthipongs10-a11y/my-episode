# seo-backlink-finder

เครื่องมือ **ค้นหา · แยกประเภท · จัดอันดับคุณภาพ** เป้าหมายที่เราสามารถวาง
Backlink ให้เว็บไซต์ของเราได้ พร้อมตัวช่วย **ร่างคอมเมนต์/อีเมลตามภาษาของเว็บ
ปลายทาง** เพื่อให้ลงมือทำได้เร็ว โดย **เน้นคุณภาพมาก่อน** แล้วจึงเรื่องความง่าย

> โค้ด/คอมเมนต์/คำสั่งเป็นภาษาอังกฤษ เอกสารนี้เป็นภาษาไทย

---

## 1. แนวคิดการออกแบบ (โดยย่อ)

งานสร้าง Backlink ที่ได้ผลจริงคือ *ท่อ (pipeline)* 5 ขั้น เครื่องมือนี้ทำให้ทุกขั้นเป็น
คำสั่งเดียว และเก็บผลลง SQLite เพื่อทำงานต่อเนื่องได้:

```
discover  →  analyze  →  score/classify  →  draft  →  track/export
 ค้นหา       วิเคราะห์      ให้คะแนน+แยกประเภท   ร่าง      ติดตาม+ออกรายงาน
```

| ขั้น | ทำอะไร | โมดูล |
|---|---|---|
| **discover** | ยิง "footprint" (คำค้นเฉพาะทาง) หาเพจที่ *มีช่องให้วางลิงก์* | `footprints.py`, `search_providers.py`, `discover.py` |
| **analyze** | เปิดเพจจริง ดูแพลตฟอร์ม/CMS, ระบบคอมเมนต์, dofollow/nofollow, ภาษา, ช่องติดต่อ | `fetcher.py`, `analyze.py`, `language.py` |
| **metrics** | ดึงสัญญาณคุณภาพโดเมน: Domain Authority (Open PageRank) + อายุโดเมน (RDAP) | `metrics.py` |
| **score/classify** | คำนวณ **คะแนนคุณภาพ 0–100**, **คะแนนความง่าย**, จัด **Tier A/B/C/D** | `score.py`, `classify.py` |
| **draft** | ร่างคอมเมนต์/อีเมล **ตามภาษาเว็บปลายทาง** (มีคนตรวจก่อนโพสต์เสมอ) | `assist.py` |
| **track/export** | ไปป์ไลน์สถานะ (new→qualified→contacted→live) + รายงาน CSV/MD/HTML | `store.py`, `report.py` |

หลักคิดสำคัญ: **คุณภาพมาก่อน** — เราจัดอันดับด้วย "คะแนนคุณภาพ" เป็นหลัก แล้วใช้
"ความง่าย" เป็นตัวช่วยตัดสินเมื่อคุณภาพใกล้เคียงกัน (ปรับได้ที่ `quality_pref`)

---

## 2. ประเภทเป้าหมาย Backlink ที่รองรับ

`blf footprints --list` จะแสดงทั้งหมด แต่ละประเภทมี *เพดานคุณภาพ* และ *ความง่าย*
ต่างกัน (ใช้ป้อนสูตรคะแนน):

| ประเภท | คือ | เพดานคุณภาพ | ความง่าย | ลิงก์ที่มักได้ |
|---|---|---|---|---|
| `guest_post` | เขียนบทความให้เว็บเขา (ลิงก์ในเนื้อหา) | สูงมาก | ยาก | dofollow |
| `editorial` | เว็บอื่นอ้างถึงเราเองใน content (PR/HARO) | สูงสุด | ยากสุด | dofollow |
| `resource_page` | หน้ารวม "ลิงก์ที่เป็นประโยชน์" ขอให้เพิ่มชื่อเรา | สูง | ปานกลาง | dofollow |
| `edu_resource` | หน้าแหล่งข้อมูลของสถาบันการศึกษา (.edu/.ac) | สูง | ยาก | dofollow |
| `wiki` | ส่วน external links ของ wiki | สูง | ยาก | nofollow |
| `qa` | เว็บถาม-ตอบ (Pantip/Quora/Reddit ฯลฯ) | กลาง | กลาง | nofollow |
| `directory` | ไดเรกทอรีเฉพาะทาง "submit your site" | กลาง | ง่าย | dofollow* |
| `business_listing` | ลงประกาศธุรกิจ (local citation) | กลาง | ง่าย | nofollow |
| `web2` | บล็อกฟรีที่เราคุมเอง (Medium/WordPress.com/Blogger) | กลาง | ง่ายมาก | dofollow |
| `forum` | เว็บบอร์ด/กระทู้ + signature | ต่ำ-กลาง | กลาง | nofollow |
| `blog_comment` | คอมเมนต์ใต้บทความ | ต่ำ | ง่าย | nofollow |
| `profile` | โปรไฟล์สมาชิกที่มีช่องใส่เว็บ | ต่ำ | ง่ายมาก | nofollow |
| `bookmark` | เว็บ social bookmarking | ต่ำ | ง่ายมาก | nofollow |

\* แล้วแต่ไดเรกทอรี — ระบบตรวจ dofollow/nofollow จากหน้าจริงให้

---

## 3. วิธีคิด "คะแนนคุณภาพ" (หัวใจของการจัดอันดับ)

คะแนนคุณภาพ 0–100 = ผลรวมถ่วงน้ำหนักของ 5 องค์ประกอบ (ปรับน้ำหนักได้ใน config):

| องค์ประกอบ | น้ำหนักเริ่มต้น | มาจากไหน |
|---|---|---|
| **authority** | 0.35 | ความแข็งแรงโดเมน 0–100 (Open PageRank) |
| **relevance** | 0.30 | ความเกี่ยวข้องของเนื้อหาเว็บกับ `topics` ของเรา |
| **link_attribute** | 0.15 | dofollow(1.0) > ugc(0.5) > nofollow(0.35) > sponsored(0.15) |
| **placement** | 0.12 | เพดานคุณภาพของประเภทเป้าหมาย (guest post > comment) |
| **trust** | 0.08 | HTTPS + อายุโดเมน + จำนวนลิงก์ออกที่สมเหตุผล (กันเว็บ farm) |

**จุดสำคัญของสูตร: ถ้าองค์ประกอบไหนวัดไม่ได้ (เช่นไม่มี API key ของ authority)
ระบบจะ *ตัดทิ้งแล้วปรับน้ำหนักที่เหลือให้รวมเป็น 1 ใหม่*** — สัญญาณที่ขาดจะไม่ลาก
คะแนนให้ต่ำผิดจริง ทำให้เครื่องมือใช้ได้ทันทีแม้ยังไม่ใส่ API key ใด ๆ

จากนั้น:

- **Tier**: A ≥ 75, B ≥ 55, C ≥ 35, ต่ำกว่านั้น D (ปรับได้)
- **คะแนนความง่าย (ease)**: ตั้งจากประเภทเป้าหมาย แล้วบวกเพิ่มถ้ามีช่องคอมเมนต์/
  ฟอร์มส่ง/พบอีเมลติดต่อ
- **priority** = `quality × quality_pref + ease × (1 − quality_pref)`
  ค่าเริ่มต้น `quality_pref = 0.80` → **คุณภาพมาก่อน** (อยากเรียงตามคุณภาพล้วน
  ใช้ `blf rank --order quality`)

---

## 4. ติดตั้ง

ต้องใช้ Python 3.9+ (คอร์ทำงานด้วย stdlib ล้วน แพ็กเกจเสริมช่วยเรื่อง HTTP/แสดงผล)

```bash
cd seo-backlink-finder
pip install -e .            # ได้คำสั่ง `blf`
# หรือ:  pip install -r requirements.txt  แล้วใช้ `python -m blf`
```

---

## 5. เริ่มใช้งานเร็ว (Quick start)

```bash
# 1) สร้าง config.yaml + ฐานข้อมูล แล้วแก้ site.url / site.topics / site.languages
blf init
$EDITOR config.yaml

# 2) ดูคำค้น footprint (ถ้ายังไม่มี Search API ก็ก๊อปไปค้น Google เองได้เลย)
blf footprints --keyword "กาแฟดริป"

# 3) หาเป้าหมาย — เลือกทางใดทางหนึ่ง:
#    (ก) มี Search API:
blf discover --keyword "กาแฟดริป" --provider serpapi
#    (ข) ไม่มี API: ค้นเองในเบราว์เซอร์ เซฟ URL ลงไฟล์ แล้ว import
blf import --input urls.txt

# 4) วิเคราะห์ + ให้คะแนน (เปิดหน้าจริง)
blf analyze

# 5) ดูอันดับ (คุณภาพมาก่อน) และกรองเฉพาะของดี
blf rank --min-tier B

# 6) ร่างคอมเมนต์/อีเมลตามภาษาเว็บนั้น (มีคนตรวจก่อนโพสต์)
blf draft "#3"                 # อ้างด้วย #rowid หรือใส่ URL เต็มก็ได้

# 7) อัปเดตสถานะเมื่อทำจริง + ออกรายงานสวย ๆ
blf status "#3" contacted --note "ส่งอีเมลแล้ว 2/8"
blf export --format html --out report.html
```

---

## 6. คำสั่งทั้งหมด

| คำสั่ง | หน้าที่ |
|---|---|
| `blf init [--force]` | สร้าง `config.yaml` + ฐานข้อมูล |
| `blf footprints [--keyword K] [--categories a,b] [--list]` | พิมพ์คำค้นให้เอาไปใช้ |
| `blf discover --keyword K [--provider ...] [--input f]` | หา URL เป้าหมายผ่าน Search API |
| `blf add URL [--category c]` | เพิ่มเป้าหมายทีละอัน |
| `blf import --input f [--category c]` | เพิ่มเป้าหมายจากไฟล์ URL |
| `blf analyze [--limit N] [--all]` | เปิดหน้าจริง วิเคราะห์+ให้คะแนน |
| `blf rank [--min-tier B] [--type t] [--status s] [--order ...]` | แสดงอันดับ |
| `blf show REF` | รายละเอียดเต็มของเป้าหมายหนึ่ง (URL หรือ `#id`) |
| `blf draft REF [--kind comment\|outreach\|directory] [--link]` | ร่างข้อความ |
| `blf status REF STATE [--note ...]` | เลื่อนสถานะในไปป์ไลน์ |
| `blf export [--format html\|csv\|md] [--out f]` | ออกรายงาน |
| `blf stats` | สรุปภาพรวมไปป์ไลน์ |

สถานะไปป์ไลน์: `new → qualified → drafted → contacted → live` (และ `rejected`,
`discarded`)

---

## 7. การตั้งค่า (`config.yaml`) และ API keys

- **`config.yaml`** เก็บ *การตั้งค่า* เท่านั้น — ปลอดภัยที่จะ commit
  (ดูตัวอย่างเต็มใน `config.example.yaml`) จุดที่ต้องแก้แน่ ๆ:
  `site.url`, `site.name`, `site.topics`, `site.languages`
- **ความลับ (API keys)** อ่านจาก *environment variable* เท่านั้น ไม่เก็บในไฟล์
  (ดู `config.example.env`) — ทุกตัว **ไม่บังคับ**:

| ตัวแปร | ให้อะไร | ถ้าไม่มี |
|---|---|---|
| `SERPAPI_KEY` | ผล Google จริงสำหรับ `discover` | ใช้ทาง manual/import แทน |
| `GOOGLE_CSE_KEY`, `GOOGLE_CSE_CX` | Google Custom Search | เหมือนกัน |
| `OPENPAGERANK_KEY` | Domain Authority 0–100 (ฟรี) | คะแนนปรับน้ำหนักองค์ประกอบที่เหลือ |
| `ANTHROPIC_API_KEY` | ให้ Claude ช่วยร่าง (โหมด LLM) | ใช้เทมเพลตแทน |

> **ไม่ scrape Google/Bing โดยตรง** เพราะผิด ToS พังบ่อย และโดนบล็อก — ให้ใช้ API
> ที่เป็นทางการ หรือค้นเองแล้ว `import`

---

## 8. ตัวช่วยลงมือทำ (draft) — ตามภาษาเว็บปลายทาง

`blf draft` ดูภาษาที่ตรวจได้จากหน้าเว็บ แล้วร่างข้อความใน *ภาษานั้น*:

- **comment** — โครงคอมเมนต์ที่อ้างถึงบทความจริง + เตือนถ้าลิงก์เป็น nofollow +
  เช็กลิสต์ก่อนโพสต์ (รองรับเทมเพลตไทย/อังกฤษ ภาษาอื่นเตือนให้แปลหรือเปิด LLM)
- **outreach** — อีเมลเสนอเขียน guest post / แนะนำ resource พร้อมหัวข้อจาก `topics`
- **directory** — ค่าฟิลด์สำหรับกรอกฟอร์มไดเรกทอรี (ชื่อ/URL/คำอธิบายตามภาษา)

`--kind auto` (ค่าเริ่มต้น) เลือกชนิดให้เองตามประเภทเป้าหมาย

### ทำไมไม่ทำ "โพสต์อัตโนมัติจำนวนมาก" (สำคัญ)

ผู้ใช้ขอ "สร้างคอมเมนต์อัตโนมัติ" — เครื่องมือนี้ทำให้ถึงขั้น **ร่างอัตโนมัติตามภาษา
เว็บ** แต่ **ไม่กดส่งแทนคุณ** และมีคนตรวจก่อนเสมอ ด้วยเหตุผลที่ตรงกับเป้าหมาย
"คุณภาพมาก่อน" ของคุณเอง:

1. **คอมเมนต์สแปมซ้ำ ๆ = โดนลบ/โดน nofollow** — ระบบกันสแปมของเว็บและ Google
   (SpamBrain) ตรวจจับได้ ลิงก์ที่ได้จึงแทบไม่มีค่า
2. **เสี่ยงให้เว็บเราเองโดน penalty** — Google ลงโทษ "link spam" ที่ปลายทางคือเว็บ
   ที่ถูกโปรโมต ซึ่งก็คือเว็บคุณ — ตรงข้ามกับสิ่งที่ต้องการ
3. **ผิด ToS ของเว็บปลายทาง** ทุกเว็บ

ทางที่ได้ผลจริงและเร็วคือ: ร่างที่ *เกี่ยวข้องกับบทความนั้นจริง* → คุณตรวจ/แก้ 10
วินาที → โพสต์เอง เครื่องมือช่วยเรื่องภาษา บริบท และคัดว่าเว็บไหน "คุ้มค่าที่จะโพสต์"
(ไม่เสียเวลากับ nofollow ที่ไม่มีผล) — นั่นคือส่วนที่ทำให้เร็วขึ้นจริง

---

## 9. ข้อควรรู้ด้านกฎ/มารยาท

- ระบบ fetch **เคารพ `robots.txt`** และหน่วงเวลาระหว่างคำขอ (`fetch.delay_seconds`)
- ลิงก์คุณภาพยุคนี้มาจาก *เนื้อหาที่มีประโยชน์จริง + ความสัมพันธ์* — เครื่องมือนี้จึง
  ออกแบบให้เร่ง "งานที่ถูกต้อง" ไม่ใช่เร่งสแปม
- ก่อนโพสต์/ส่งอะไรออกไปภายนอก ตรวจให้ชัวร์ว่าเนื้อหาถูกต้องและเหมาะกับเว็บนั้น

---

## 10. ต่อยอด

- **เพิ่ม footprint / หมวดใหม่**: แก้ `blf/footprints.py` (มี metadata ป้อนคะแนนในตัว)
- **เพิ่มภาษาเทมเพลต**: เพิ่มคีย์ภาษาใน `blf/assist.py` (`_COMMENT_SCAFFOLD` ฯลฯ)
- **ปรับสูตรคะแนน**: แก้ `scoring.quality_weights` / `quality_pref` ใน `config.yaml`
- **เพิ่ม Search provider**: สืบทอด `SearchProvider` ใน `blf/search_providers.py`

---

## 11. ทดสอบ

```bash
pip install pytest
python -m pytest -q        # ชุดเทสต์ทำงานออฟไลน์ล้วน ไม่ต้องต่อเน็ต
```

---

## 12. โครงสร้างไฟล์

```
seo-backlink-finder/
├── blf/
│   ├── cli.py            # คำสั่งทั้งหมด (argparse)
│   ├── config.py         # โหลด config + secrets จาก env
│   ├── models.py         # โครงข้อมูล (Prospect, Analysis, Scores, ...)
│   ├── footprints.py     # คลังคำค้นแยกหมวด + metadata คะแนน
│   ├── search_providers.py  # SerpAPI / Google CSE / manual
│   ├── discover.py       # คำค้น → URL เป้าหมาย (normalize + กรอง)
│   ├── fetcher.py        # ดึงหน้าเว็บอย่างสุภาพ (robots, charset, timeout)
│   ├── analyze.py        # อ่านหน้า: แพลตฟอร์ม/คอมเมนต์/ลิงก์/ภาษา
│   ├── language.py       # ตรวจภาษา (stdlib: script + stopwords)
│   ├── metrics.py        # Open PageRank + RDAP อายุโดเมน
│   ├── classify.py       # สรุปประเภทเป้าหมายจากหลักฐานหน้าเว็บ
│   ├── score.py          # คะแนนคุณภาพ/ความง่าย/priority + tier
│   ├── assist.py         # ร่างคอมเมนต์/อีเมลตามภาษา (มีคนตรวจ)
│   ├── store.py          # SQLite + ไปป์ไลน์สถานะ
│   └── report.py         # ออกรายงาน CSV/MD/HTML
├── tests/                # เทสต์ออฟไลน์ (56 เคส)
├── config.example.yaml   # ตัวอย่าง config
├── config.example.env    # ตัวอย่าง env (secrets)
└── pyproject.toml
```
