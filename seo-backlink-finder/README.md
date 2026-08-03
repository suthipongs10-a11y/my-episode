# seo-backlink-finder

เครื่องมือ **ค้นหา · แยกประเภท · จัดอันดับคุณภาพ** เป้าหมายที่เราสามารถวาง
Backlink ให้เว็บไซต์ของเราได้ พร้อมตัวช่วย **ร่างคอมเมนต์/อีเมลตามภาษาของเว็บ
ปลายทาง** เพื่อให้ลงมือทำได้เร็ว โดย **เน้นคุณภาพมาก่อน** แล้วจึงเรื่องความง่าย

> โค้ด/คอมเมนต์/คำสั่งเป็นภาษาอังกฤษ เอกสารนี้เป็นภาษาไทย

## เริ่มใช้งาน

เครื่องมือนี้อยู่ในโฟลเดอร์ `seo-backlink-finder/` ของ repo `my-episode`
บนบรานช์ `claude/backlink-target-finder-ljivrr` — ต้องดึงลงเครื่องก่อน

**ถ้ายังไม่มี repo ในเครื่อง** (ดึงเฉพาะโฟลเดอร์นี้ ~1MB แทนที่จะโหลดทั้ง repo 167MB):

```bash
git clone --filter=blob:none --sparse --depth 1 \
  -b claude/backlink-target-finder-ljivrr \
  https://github.com/suthipongs10-a11y/my-episode.git
cd my-episode
git sparse-checkout set seo-backlink-finder
cd seo-backlink-finder
```

**ถ้ามี repo อยู่แล้ว:**

```bash
cd my-episode
git fetch origin claude/backlink-target-finder-ljivrr
git checkout claude/backlink-target-finder-ljivrr
cd seo-backlink-finder
```

**แล้วติดตั้งและรัน** (ต้องมี Python 3.9 ขึ้นไป):

```bash
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e .
blf serve                        # เปิด http://127.0.0.1:8080 → วาง URL → กด Start
# หรือทำทั้งหมดในคำสั่งเดียวบนบรรทัดคำสั่ง:
blf start payofflogic.com
```

ระบบจะ **อ่านเว็บคุณเองก่อน** → สรุปว่าเว็บทำเรื่องอะไร ภาษาอะไร ประเทศไหน →
คิด keyword ที่ควรค้น → ไล่หาเป้าหมาย → ตรวจทีละเว็บ → ให้คะแนนและจัดอันดับ

---

## 1. แนวคิดการออกแบบ (โดยย่อ)

งานสร้าง Backlink ที่ได้ผลจริงคือ *ท่อ (pipeline)* เครื่องมือนี้ทำให้ทุกขั้นเป็น
คำสั่งเดียว และเก็บผลลง SQLite เพื่อทำงานต่อเนื่องได้:

```
profile   →  discover  →  analyze  →  score/classify  →  draft  →  track/export
อ่านเว็บเรา    ค้นหา       วิเคราะห์      ให้คะแนน+แยกประเภท    ร่าง      ติดตาม+ออกรายงาน
```

| ขั้น | ทำอะไร | โมดูล |
|---|---|---|
| **profile** | อ่านเว็บ*ของคุณ* หา หัวข้อ/keyword/ภาษา/ประเทศ/แบรนด์ อัตโนมัติ | `profile.py`, `textrank.py` |
| **discover** | ยิง "footprint" (คำค้นเฉพาะทาง) หาเพจที่ *มีช่องให้วางลิงก์* + catalog สำรอง | `footprints.py`, `search_providers.py`, `discover.py`, `seeds.py` |
| **analyze** | เปิดเพจจริง ดูแพลตฟอร์ม/CMS, ระบบคอมเมนต์, dofollow/nofollow, ภาษา, ช่องติดต่อ | `fetcher.py`, `analyze.py`, `language.py` |
| **metrics** | ดึงสัญญาณคุณภาพโดเมน: Domain Authority (Open PageRank) + อายุโดเมน (RDAP) | `metrics.py` |
| **score/classify** | คำนวณ **คุณภาพ 0–100**, **ความตรงกับเว็บเรา (Match)**, **ความง่าย**, จัด **Tier A/B/C/D** | `score.py`, `classify.py` |
| **draft** | ร่างคอมเมนต์/อีเมล **ตามภาษาเว็บปลายทาง** (มีคนตรวจก่อนโพสต์เสมอ) | `assist.py` |
| **track/export** | ไปป์ไลน์สถานะ (new→qualified→contacted→live) + รายงาน CSV/MD/HTML | `store.py`, `report.py` |
| **UI / runner** | หน้าเว็บกด Start + ตัวรันงานเบื้องหลัง (หยุดกลางคันได้) | `webui.py`, `run.py` |

หลักคิดสำคัญ: **คุณภาพมาก่อน** — เราจัดอันดับด้วย "คะแนนคุณภาพ" เป็นหลัก แล้วใช้
"ความง่าย" เป็นตัวช่วยตัดสินเมื่อคุณภาพใกล้เคียงกัน (ปรับได้ที่ `quality_pref`)

---

## 2. ประเภทเป้าหมาย Backlink ที่รองรับ (ครบ 10 แบบที่คุณระบุ + เพิ่มอีก 6)

`blf footprints --list` จะแสดงทั้งหมด แต่ละประเภทมี *เพดานคุณภาพ* และ *ความง่าย*
ต่างกัน (ใช้ป้อนสูตรคะแนน) — ✅ คือรายการที่คุณขอมา:

| | ประเภท | คือ | เพดานคุณภาพ | ความง่าย | ลิงก์ที่มักได้ |
|---|---|---|---|---|---|
| ✅ | `news` | เว็บข่าว / ส่งข่าวประชาสัมพันธ์ / นักข่าวหาแหล่งข้อมูล | **สูงสุด (95)** | ยากสุด | dofollow |
| ✅ | `guest_post` | เขียนบทความให้เว็บเขา (ลิงก์ในเนื้อหา) | สูงมาก (90) | ยาก | dofollow |
| | `editorial` | เว็บอื่นอ้างถึงเราเองใน content | 100 | ยากสุด | dofollow |
| | `resource_page` | หน้ารวม "ลิงก์ที่เป็นประโยชน์" ขอให้เพิ่มชื่อเรา | สูง (75) | ปานกลาง | dofollow |
| ✅ | `blog` | บล็อกในหัวข้อเดียวกัน — ขอแทรกลิงก์/รีวิว/สัมภาษณ์ | สูง (70) | ปานกลาง | dofollow |
| | `edu_resource` | หน้าแหล่งข้อมูลของสถาบันการศึกษา (.edu/.ac) | สูง (85) | ยาก | dofollow |
| | `wiki` | ส่วน external links ของ wiki | สูง (70) | ยาก | nofollow |
| ✅ | `qa` | เว็บถาม-ตอบ (Pantip / Quora / Reddit) | กลาง (55) | กลาง | nofollow |
| ✅ | `community` | ชุมชนออนไลน์ — subreddit, กลุ่ม FB, Discord, Slack | กลาง (50) | กลาง | nofollow |
| ✅ | `local_citation` | NAP ท้องถิ่น (Google Business, Yelp, สมุดหน้าเหลือง) | กลาง (50) | ง่าย | nofollow |
| ✅ | `directory` | ไดเรกทอรีเฉพาะทาง "submit your site" | กลาง (45) | ง่าย | dofollow* |
| ✅ | `business_listing` | ลงประกาศธุรกิจ (ไม่ผูกพื้นที่) | กลาง (45) | ง่าย | nofollow |
| ✅ | `web2` | บล็อกฟรีที่เราคุมเอง (Medium/WordPress.com/Blogger) | กลาง (45) | ง่ายมาก | dofollow |
| ✅ | `forum` | เว็บบอร์ด/กระทู้ + signature | ต่ำ-กลาง (40) | กลาง | nofollow |
| | `blog_comment` | คอมเมนต์ใต้บทความ | ต่ำ (30) | ง่าย | nofollow |
| ✅ | `profile` | โปรไฟล์สมาชิกที่มีช่องใส่เว็บ | ต่ำ (30) | ง่ายมาก | nofollow |
| | `bookmark` | เว็บ social bookmarking | ต่ำ (25) | ง่ายมาก | nofollow |

\* แล้วแต่ไดเรกทอรี — ระบบตรวจ dofollow/nofollow จากหน้าจริงให้

**หมายเหตุเรื่อง Local Citation vs Business Listing:** สองอันนี้แยกกันโดยตั้งใจ —
`local_citation` ผูกกับพื้นที่ (มี NAP: ชื่อ-ที่อยู่-เบอร์โทร) และระบบจะเลือกเฉพาะ
ไดเรกทอรีของประเทศคุณ ส่วน `business_listing` เป็นการลงข้อมูลธุรกิจทั่วไปที่ไม่ผูกพื้นที่

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

### 3.1 คะแนน Match — "ตรงกับเว็บเราแค่ไหน"

นี่คือคอลัมน์ที่ตอบคำถามว่า *ลิงก์จากเว็บนี้เกี่ยวกับธุรกิจเราจริงไหม* แยกจาก
คะแนนคุณภาพ เพราะ **เว็บ authority สูงแต่คนละเรื่อง = ลิงก์ที่ไม่มีค่า**

คำนวณจาก 3 สัญญาณอิสระ (ตัวไหนวัดไม่ได้ก็ตัดทิ้งแล้วปรับน้ำหนักใหม่):

| สัญญาณ | น้ำหนัก | ทำอะไร |
|---|---|---|
| **phrase hits** | 0.45 | หัวข้อของเราโผล่ใน title/description/URL/โดเมนของเป้าหมายไหม |
| **vector similarity** | 0.40 | cosine similarity ระหว่าง term vector ของเว็บเรากับหน้าเป้าหมาย — จับกรณีใช้คำพ้องความหมายที่ phrase match จับไม่ได้ |
| **language match** | 0.15 | ภาษาตรงกันไหม (เว็บไทยได้ลิงก์จากหน้าไทยย่อมเกี่ยวข้องกว่า) |

**ภาษาไทย/ญี่ปุ่น/จีน/เกาหลีทำงานได้จริง** — ภาษาเหล่านี้ไม่มีช่องว่างระหว่างคำและเรา
ไม่มี tokenizer ระบบจึงใช้ **character n-grams** แทนการตัดคำ ซึ่งเป็นวิธีมาตรฐานที่
ให้ผลดีกับ cosine similarity โดยไม่ต้องพึ่งพจนานุกรม

ตัวอย่างจริงจากการทดสอบ (เว็บเรา = เว็บวางแผนชำระหนี้ภาษาไทย):

| เป้าหมาย | Match |
|---|---|
| บล็อกการเงินไทย (ปลดหนี้ / ดอกเบี้ย / รีไฟแนนซ์) | **70.8** |
| บล็อกกาแฟไทย (ภาษาเดียวกัน คนละหัวข้อ) | 29.1 |
| คู่มือกาแฟภาษาอังกฤษ | 15.1 |

ใช้กรองด้วย `blf rank --min-match 50` หรือช่อง "Match ≥" ในหน้าเว็บ

---

## 3.5 "วาง URL แล้วกด Start" ทำงานยังไง

```
blf start payofflogic.com
```

1. **อ่านเว็บคุณ** — เปิดหน้าแรก + หน้า about/services/blog ที่หาเจอ (หรือ sitemap.xml)
2. **สรุปว่าเว็บทำเรื่องอะไร** — ดึง keyphrase จาก title/meta/heading/เนื้อหา
   โดย**กรองเมนูนำทางออก** ("เกี่ยวกับเรา", "บริการ", "About Us" ไม่ใช่หัวข้อธุรกิจ)
   และ**ตัดวลีไทยยาว ๆ ที่ขอบเขตคำ** ("ระบบวางแผนชำระหนี้และบริหารสินเชื่อ"
   → "ระบบวางแผนชำระหนี้" + "บริหารสินเชื่อ" ซึ่งค้นหาได้จริง)
3. **ตรวจภาษา / ประเทศ / แบรนด์ / เป็นธุรกิจท้องถิ่นไหม** — ถ้าเจอที่อยู่+เบอร์โทร
   ระบบจะดัน `local_citation` ขึ้นมาก่อน และเลือกไดเรกทอรีของประเทศคุณ
4. **ค้นหาเป้าหมาย** — เอา keyword ที่ได้ไปประกอบกับ footprint ทุกหมวด
   (ถ้ายังไม่มี Search API key จะใช้ catalog แพลตฟอร์มที่มีให้ในตัวแทน)
5. **ตรวจทีละเว็บ + ให้คะแนน** เทียบกับโปรไฟล์เว็บคุณ แล้วเก็บลงฐานข้อมูล

ทุกอย่างบันทึกระหว่างทาง — กด Stop กลางคันแล้วผลที่ตรวจไปแล้วยังอยู่ครบ

ดูว่าระบบเข้าใจเว็บคุณถูกไหมก่อนเริ่มจริง:

```bash
blf profile payofflogic.com
```

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
| **`blf start [URL]`** | **ทำทุกอย่างในคำสั่งเดียว** — อ่านเว็บ → หา keyword → ค้นหา → ให้คะแนน |
| **`blf serve [--port 8080]`** | **เปิดหน้าเว็บ** วาง URL แล้วกด Start |
| `blf profile [URL] [--pages N] [--save f]` | ดูว่าระบบเข้าใจเว็บคุณว่าอย่างไร |
| `blf init [--force]` | สร้าง `config.yaml` + ฐานข้อมูล |
| `blf footprints [--keyword K] [--categories a,b] [--list]` | พิมพ์คำค้นให้เอาไปใช้ |
| `blf discover --keyword K [--provider ...] [--input f]` | หา URL เป้าหมายผ่าน Search API |
| `blf add URL [--category c]` | เพิ่มเป้าหมายทีละอัน |
| `blf import --input f [--category c]` | เพิ่มเป้าหมายจากไฟล์ URL |
| `blf analyze [--limit N] [--all]` | เปิดหน้าจริง วิเคราะห์+ให้คะแนน |
| `blf rank [--min-tier B] [--min-match 50] [--order match]` | แสดงอันดับ |
| `blf show REF` | รายละเอียดเต็มของเป้าหมายหนึ่ง (URL หรือ `#id`) |
| `blf draft REF [--kind comment\|outreach\|directory] [--link]` | ร่างข้อความ |
| `blf status REF STATE [--note ...]` | เลื่อนสถานะในไปป์ไลน์ |
| `blf export [--format html\|csv\|md] [--out f]` | ออกรายงาน |
| `blf stats` | สรุปภาพรวมไปป์ไลน์ |

สถานะไปป์ไลน์: `new → qualified → drafted → contacted → live` (และ `rejected`,
`discarded`)

---

## 7. API ที่ต้องสมัคร (ทุกตัวไม่บังคับ) และวิธีเปิดใช้

**เครื่องมือรันได้ทันทีโดยไม่ต้องสมัครอะไรเลย** — แต่ละ key ที่เพิ่มเข้ามาจะปลดล็อก
ความสามารถหนึ่งอย่าง ถ้าไม่มีระบบก็ทำงานต่อได้โดยลดความสามารถลง ไม่พังและไม่หยุด

| ลำดับความสำคัญ | ตัวแปร | ให้อะไร | ถ้าไม่มีจะเป็นยังไง |
|---|---|---|---|
| ⭐ **1 — ควรสมัคร** | `GOOGLE_CSE_KEY` + `GOOGLE_CSE_CX` | ค้นหาเป้าหมายเฉพาะทางในหัวข้อของคุณจริง ๆ | ได้แค่ catalog แพลตฟอร์มที่มีให้ในตัว (ประมาณ 50 เป้าหมาย) ซึ่งเป็นแค่พื้นฐาน |
| ⭐ **2 — ควรสมัคร** | `OPENPAGERANK_KEY` | คะแนนความแข็งแรงโดเมน 0–100 | คะแนนคุณภาพยังคำนวณได้ แต่ตัดองค์ประกอบ authority ออกแล้วปรับน้ำหนักที่เหลือใหม่ |
| ทางเลือก | `SERPAPI_KEY` | ผล Google จริง คุณภาพดีกว่า CSE ไม่ต้องตั้งค่า search engine เอง | ใช้ CSE แทนได้ |
| ทางเลือก | `ANTHROPIC_API_KEY` | ให้ Claude เขียนร่างคอมเมนต์/อีเมลแทนเทมเพลต และเขียนได้**ทุกภาษา** | ใช้เทมเพลต (ไทย/อังกฤษ) ภาษาอื่นจะเตือนให้แปลก่อนโพสต์ |

**เลือกอย่างเดียวได้:** `GOOGLE_CSE` หรือ `SERPAPI` อย่างใดอย่างหนึ่งพอ (ถ้ามีทั้งคู่
ระบบเลือก SerpAPI ให้)

### วิธีสมัครแต่ละตัว

**Google Custom Search (แนะนำให้เริ่มที่นี่ — มีโควตาฟรีต่อวัน)**
1. สร้าง Programmable Search Engine ที่ <https://programmablesearchengine.google.com/>
   — ตั้งให้ **ค้นทั้งเว็บ** ("Search the entire web") แล้วคัดลอก **Search engine ID**
   → นี่คือ `GOOGLE_CSE_CX`
2. เปิด Custom Search API + สร้าง API key ที่ <https://console.cloud.google.com/>
   → นี่คือ `GOOGLE_CSE_KEY`

**Open PageRank (ฟรี)** — สมัครที่ <https://www.domcop.com/openpagerank/> รับ key ทางอีเมล

**SerpAPI (เสียเงิน มีโควตาทดลอง)** — <https://serpapi.com/>

**Anthropic API (จ่ายตามการใช้งาน)** — <https://console.anthropic.com/>
แล้วตั้ง `assist.llm: true` ใน `config.yaml` ด้วย

> โควตาและราคาของทุกเจ้าเปลี่ยนได้ ตรวจหน้าราคาปัจจุบันของแต่ละเจ้าก่อนสมัครนะครับ

### วิธีใส่ key

```bash
cp config.example.env .env     # แล้วแก้ .env ใส่ค่าที่ได้มา
set -a; source .env; set +a    # โหลดเข้า shell (Linux/macOS)
blf start https://yoursite.com
```

Windows PowerShell: `$env:GOOGLE_CSE_KEY="..."`
Docker: ใส่ใน `.env` ข้าง ๆ `docker-compose.yml` แล้วมันอ่านให้เอง

**ใส่ key แล้วไม่ต้องแก้ `config.yaml`** — `discovery.provider` ตั้งเป็น `auto` ไว้
ระบบจะตรวจว่ามี key ตัวไหนแล้วเลือกใช้เอง (ลำดับ: SerpAPI → Google CSE → catalog)

### เรื่อง config

- **`config.yaml`** เก็บ *การตั้งค่า* เท่านั้น ปลอดภัยที่จะ commit
- **ไม่ต้องแก้อะไรก่อนเริ่มใช้** — `blf start` อ่านหัวข้อ/ภาษา/ประเทศจากเว็บคุณเอง
  (`site.topics` ใน config เป็นแค่ตัวเสริม ไม่ใช่สิ่งที่ต้องกรอก)
- **ความลับอ่านจาก environment variable เท่านั้น** ไม่เก็บลงไฟล์ config

> **ไม่ scrape Google/Bing โดยตรง** เพราะผิด ToS พังบ่อย และโดนบล็อก — ให้ใช้ API
> ที่เป็นทางการ หรือค้นเองแล้ว `blf import`

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

## 9.5 Deploy ที่ไหน — Cloudflare ได้ไหม?

**คำตอบสั้น: ไม่ควรครับ ใช้เครื่องคุณเองหรือ VPS ดีที่สุด** — รายละเอียดเต็มอยู่ใน
[`DEPLOY.md`](DEPLOY.md) สรุปเหตุผล:

| ที่ | ใช้ได้ไหม | ควรใช้ไหม |
|---|---|---|
| **เครื่องคุณเอง** (`blf serve`) | ✅ ทันที | ⭐ **เริ่มที่นี่** — IP บ้านโดนบล็อกน้อยที่สุด |
| **VPS + Docker** (`docker compose up -d`) | ✅ ทันที | ⭐ ถ้าอยากรันทิ้งไว้ |
| **Vercel** | ⚠️ timeout 60–300 วิ, stateless | ❌ งานตรวจ 60 เว็บไม่ทัน ต้องแยก worker อยู่ดี |
| **Cloudflare Workers** | ⚠️ ต้องเขียนใหม่ทั้งหมด (ไม่มี lxml, ไม่มี SQLite) | ❌ IP โดน CAPTCHA บ่อย = คุณภาพแย่ลง |

งานนี้เป็น **long-running crawler** ไม่ใช่ web request สั้น ๆ — serverless จึงผิดประเภท
โดยธรรมชาติ Cloudflare จะมีประโยชน์ก็ต่อเมื่อคุณทำหน้าเว็บสาธารณะให้คนอื่นใช้
(เอา Cloudflare ไว้หน้า HTTP ส่วน worker คลานเว็บอยู่บน VPS)

> ⚠️ **หน้าเว็บ UI ไม่มีระบบล็อกอิน** และสั่งให้เซิร์ฟเวอร์ดึง URL อะไรก็ได้
> `docker-compose.yml` จึงผูกกับ `127.0.0.1` เท่านั้น เข้าใช้ผ่าน SSH tunnel:
> `ssh -L 8080:127.0.0.1:8080 user@your-vps`
> อย่าเปิดออกอินเทอร์เน็ตโดยไม่มี reverse proxy + auth

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
│   ├── run.py            # ตัวรัน campaign: profile→discover→analyze→score
│   ├── webui.py          # หน้าเว็บกด Start (stdlib http.server, ไม่มี dep)
│   ├── profile.py        # อ่านเว็บเรา → หัวข้อ/keyword/ภาษา/ประเทศ/แบรนด์
│   ├── textrank.py       # ดึง keyphrase + cosine similarity (รองรับไทย/CJK)
│   ├── seeds.py          # catalog แพลตฟอร์ม (ใช้ได้แม้ไม่มี API key)
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
│   ├── score.py          # คะแนนคุณภาพ/match/ความง่าย/priority + tier
│   ├── assist.py         # ร่างคอมเมนต์/อีเมลตามภาษา (มีคนตรวจ)
│   ├── store.py          # SQLite + ไปป์ไลน์สถานะ
│   └── report.py         # ออกรายงาน CSV/MD/HTML
├── tests/                # เทสต์ออฟไลน์ (106 เคส)
├── Dockerfile            # คอนเทนเนอร์เดียวจบ (CLI + web UI)
├── docker-compose.yml    # ผูก 127.0.0.1 โดยตั้งใจ — อ่าน DEPLOY.md
├── DEPLOY.md             # deploy ที่ไหนดี + ความปลอดภัย
├── config.example.yaml   # ตัวอย่าง config
├── config.example.env    # ตัวอย่าง env (secrets)
└── pyproject.toml
```
