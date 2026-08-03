"""How do I actually get a link from this site?

Ranking a prospect is only half the job. This module answers the other half:
what to do, in order, on this specific page — and the question that decides
whether it is worth your afternoon at all: *does it go live immediately, or
does someone have to approve it?*

Three layers, most specific wins:

1. **Type playbook** — every opportunity type has a generic procedure.
2. **Domain override** — the big platforms have their own flows that the
   generic steps get wrong (Google Business Profile needs verification;
   Reddit's rules are per-subreddit).
3. **Page facts** — what we actually detected while analysing: the comment
   system in use, a contact email, whether links there are nofollow. These get
   appended so the steps refer to this page, not to a hypothetical one.

Approval expectations are typical, not guaranteed — any site can change its
moderation policy. Where a platform is known to be strict about promotion, the
pitfalls say so rather than pretending the link is free.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from .models import Approval, LinkAttribute, OpportunityType, Prospect

TH = "th"
EN = "en"


@dataclass
class Guide:
    """A complete, ordered answer to 'what do I do here'."""

    approval: Approval = Approval.UNKNOWN
    effort: str = ""                                  # rough time cost
    summary: str = ""                                 # one line: what this is
    prep: list[str] = field(default_factory=list)     # have these ready first
    steps: list[str] = field(default_factory=list)    # do these, in order
    pitfalls: list[str] = field(default_factory=list) # why submissions get rejected
    verify: list[str] = field(default_factory=list)   # confirm the link is live
    facts: list[str] = field(default_factory=list)    # what we saw on THIS page
    source: str = "type"                              # type | domain
    language: str = EN                                # language this guide is in

    def to_dict(self) -> dict:
        return {
            "approval": self.approval.value,
            "effort": self.effort,
            "summary": self.summary,
            "prep": self.prep,
            "steps": self.steps,
            "pitfalls": self.pitfalls,
            "verify": self.verify,
            "facts": self.facts,
            "source": self.source,
            "language": self.language,
        }


# ---------------------------------------------------------------------------
# Layer 1 — one playbook per opportunity type.
# ---------------------------------------------------------------------------
# Keyed by (type, language). Written so the steps are followable by someone who
# has never done link building before.
TYPE_GUIDES: dict[OpportunityType, dict[str, dict]] = {

    OpportunityType.GUEST_POST: {
        TH: dict(
            approval=Approval.EDITORIAL, effort="2–5 ชม. เขียน + รอตอบ 1–3 สัปดาห์",
            summary="เขียนบทความให้เว็บเขาลง แล้วใส่ลิงก์เราในเนื้อหา — ลิงก์คุณภาพสูงสุดที่หาได้",
            prep=[
                "หัวข้อที่จะเสนอ 2–3 หัวข้อ ที่ตรงกับแนวเว็บเขาและเราเขียนได้ดีจริง",
                "ตัวอย่างงานเขียนเก่าของเรา 1–2 ชิ้น (ถ้ามี) ไว้แนบให้ดูฝีมือ",
                "อีเมลจริงที่ใช้ติดต่อได้ ไม่ใช่อีเมลชั่วคราว",
            ],
            steps=[
                "หาหน้า 'Write for us' / 'Guest post guidelines' ของเว็บนี้ แล้วอ่านให้จบก่อน — เขามักบอกความยาว รูปแบบ และจำนวนลิงก์ที่อนุญาต",
                "หาชื่อบรรณาธิการหรือคนดูแลคอนเทนต์ (ดูหน้า About / ท้ายบทความ / LinkedIn)",
                "กด 'ร่าง' ในเครื่องมือนี้เพื่อเอาอีเมลตั้งต้น แล้วแก้ให้เป็นชื่อเขาจริง และอ้างถึงบทความของเขาที่เราอ่านจริง",
                "ส่งอีเมลเสนอหัวข้อก่อน อย่าเพิ่งส่งบทความเต็ม — เสียเวลาเปล่าถ้าเขาไม่สนใจหัวข้อนั้น",
                "ถ้าตอบรับ เขียนบทความให้ดีที่สุด ใส่ลิงก์เราแบบเป็นธรรมชาติในจุดที่ช่วยคนอ่านจริง 1 ลิงก์พอ",
                "ถ้าไม่ตอบภายใน 1 สัปดาห์ ตามอีก 1 ครั้ง แล้วหยุด",
            ],
            pitfalls=[
                "ส่งอีเมลแบบ copy-paste ที่ไม่ได้อ่านเว็บเขาเลย — บรรณาธิการดูออกทันทีและเป็นสาเหตุอันดับ 1 ที่ไม่ได้รับการตอบ",
                "ยัดลิงก์เกิน 1–2 จุด หรือใส่ anchor text ที่เป็นคีย์เวิร์ดล้วน ๆ",
                "เขียนบทความขายของ — เว็บที่ดีจะปฏิเสธ",
            ],
            verify=[
                "เปิดหน้าบทความที่ลง แล้วคลิกลิงก์เราดูว่าไปถูกที่",
                "คลิกขวา → View page source แล้วค้นหา URL เรา ดูว่ามี rel=\"nofollow\" หรือไม่",
                "กลับมาอัปเดตสถานะเป็น live ในเครื่องมือนี้",
            ],
        ),
        EN: dict(
            approval=Approval.EDITORIAL, effort="2-5 h writing + 1-3 weeks waiting",
            summary="You write an article for their site with a link to yours in the body — the highest-value link there is.",
            prep=["2-3 topic ideas that fit their site and that you can genuinely write well",
                  "1-2 writing samples if you have them", "A real email address you monitor"],
            steps=[
                "Find and read their 'Write for us' / guest post guidelines page in full first",
                "Find the editor's actual name (About page, article bylines, LinkedIn)",
                "Use the Draft button here for a starting email, then personalise it and reference a specific article of theirs you read",
                "Pitch the topic ideas first — never send a finished article cold",
                "If accepted, write it properly and place one natural link where it genuinely helps the reader",
                "No reply after a week? Follow up once, then stop.",
            ],
            pitfalls=["Obvious copy-paste outreach — the number one reason pitches are ignored",
                      "More than 1-2 links, or exact-match keyword anchors",
                      "Writing an advert instead of an article"],
            verify=["Open the published article and click your link",
                    "View source and search for your URL — check for rel=\"nofollow\"",
                    "Mark it live in this tool"],
        ),
    },

    OpportunityType.NEWS: {
        TH: dict(
            approval=Approval.EDITORIAL, effort="2–4 ชม. + รอ 3 วัน–2 สัปดาห์",
            summary="ส่งข่าวหรือให้ข้อมูลกับสื่อ — ลิงก์แรงที่สุด แต่ต้องมี 'ข่าว' จริง ๆ",
            prep=[
                "เรื่องที่เป็นข่าวจริง: เปิดตัวสินค้าใหม่ ผลสำรวจ ตัวเลขที่น่าสนใจ ความร่วมมือ รางวัล",
                "ข่าวประชาสัมพันธ์ 300–500 คำ พร้อมคำพูดอ้างอิงจากผู้บริหาร",
                "รูปประกอบความละเอียดสูง และโลโก้",
            ],
            steps=[
                "หาหน้า 'ส่งข่าว' / 'ฝากข่าว' / 'Submit press release' หรืออีเมลกองบรรณาธิการ",
                "เขียนหัวข้อข่าวให้เหมือนพาดหัวข่าวจริง ไม่ใช่โฆษณา",
                "ใส่ลิงก์เว็บเราในย่อหน้าท้ายที่บอกว่า 'เกี่ยวกับบริษัท' ซึ่งเป็นที่ที่สื่อยอมรับ",
                "ส่งแล้วรอ อย่าตามบ่อย สื่อได้รับข่าววันละหลายร้อยชิ้น",
            ],
            pitfalls=[
                "ส่งเรื่องที่ไม่ใช่ข่าว (เช่น 'เว็บเราปรับดีไซน์ใหม่') — โดนทิ้งทันที",
                "บางเว็บที่รับ 'ฝากข่าว' ฟรีคือเว็บคุณภาพต่ำที่รับทุกอย่าง ลิงก์แทบไม่มีค่า ดูคะแนน Authority ประกอบ",
                "เว็บข่าวใหญ่หลายเจ้าใส่ nofollow ให้ลิงก์ในข่าว PR อยู่แล้ว",
            ],
            verify=["ค้นชื่อบริษัทใน Google หลังส่ง 1 สัปดาห์", "เปิดข่าวที่ลงแล้วตรวจว่าลิงก์ทำงาน"],
        ),
        EN: dict(
            approval=Approval.EDITORIAL, effort="2-4 h + 3 days to 2 weeks",
            summary="Pitch a story or send a press release — the strongest links, but you need actual news.",
            prep=["A genuine story: launch, survey data, partnership, award",
                  "A 300-500 word release with a quote", "High-resolution images and a logo"],
            steps=["Find their submit-news page or editorial email",
                   "Write the headline like news, not an advert",
                   "Put your link in the 'About the company' boilerplate at the end",
                   "Send it and wait — do not chase"],
            pitfalls=["Pitching something that is not news gets binned instantly",
                      "Free press-release sites that accept everything are low value — check the Authority column",
                      "Big outlets usually nofollow PR links anyway"],
            verify=["Search your company name a week later", "Open the published piece and test the link"],
        ),
    },

    OpportunityType.RESOURCE_PAGE: {
        TH: dict(
            approval=Approval.EDITORIAL, effort="20–30 นาที + รอ 1–2 สัปดาห์",
            summary="หน้ารวมลิงก์ที่เป็นประโยชน์ — ขออีเมลให้เขาเพิ่มเว็บเราเข้าไปในลิสต์",
            prep=[
                "หน้าใดหน้าหนึ่งของเราที่ 'มีประโยชน์จริง' พอจะอยู่ในลิสต์นั้นได้ เช่น คู่มือ เครื่องมือคำนวณ งานวิจัย",
                "คำอธิบายเว็บเรา 1–2 ประโยค",
            ],
            steps=[
                "เปิดหน้านั้นแล้วดูว่าลิงก์ที่เขารวมไว้เป็นแนวไหน — ถ้าของเราไม่เข้าพวก ข้ามไปเลย ประหยัดเวลา",
                "หาอีเมลคนดูแลหน้า (หน้า Contact / About / ท้ายเว็บ)",
                "กด 'ร่าง' เพื่อเอาอีเมลตั้งต้น แล้วระบุชื่อหน้าเขาให้ตรง และบอกว่าของเราช่วยผู้อ่านเขายังไง",
                "ถ้าเจอลิงก์เสียในหน้านั้นให้บอกเขาด้วย — เพิ่มโอกาสได้รับการตอบมาก",
            ],
            pitfalls=[
                "ขอให้เพิ่มหน้าขายของ — หน้ารวมลิงก์รับเฉพาะของที่ให้ความรู้",
                "อีเมลยาวเกินไป เขียนสั้น ๆ 4–5 บรรทัดพอ",
            ],
            verify=["กลับไปเปิดหน้านั้นอีกครั้งใน 2 สัปดาห์ แล้ว Ctrl+F หาชื่อเว็บเรา"],
        ),
        EN: dict(
            approval=Approval.EDITORIAL, effort="20-30 min + 1-2 weeks",
            summary="A curated links page — email and ask to be added.",
            prep=["One genuinely useful page of yours: a guide, calculator, or study",
                  "A one-or-two sentence description"],
            steps=["Read the page and check your resource actually belongs there — skip it if not",
                   "Find the page owner's email (Contact/About/footer)",
                   "Use Draft here, then name their exact page and say how yours helps their readers",
                   "If you spot a broken link on the page, mention it — it markedly raises reply rates"],
            pitfalls=["Asking them to add a sales page", "Writing more than a few lines"],
            verify=["Revisit the page in two weeks and Ctrl+F for your domain"],
        ),
    },

    OpportunityType.BLOG: {
        TH: dict(
            approval=Approval.EDITORIAL, effort="30 นาที–2 ชม. ต่อเว็บ",
            summary="บล็อกในหัวข้อเดียวกัน — สร้างความสัมพันธ์ก่อน แล้วค่อยขอลิงก์/รีวิว/สัมภาษณ์",
            prep=["อ่านบทความเขา 2–3 ชิ้นจริง ๆ", "คิดว่าเรามีอะไรที่เป็นประโยชน์กับผู้อ่านเขา"],
            steps=[
                "คอมเมนต์ที่มีสาระใต้บทความเขาก่อน 1–2 ครั้ง (ยังไม่ต้องใส่ลิงก์)",
                "ติดตามเขาในโซเชียล แชร์บทความเขาบ้าง",
                "จากนั้นค่อยอีเมลไปเสนอ: เขียน guest post / ให้สัมภาษณ์ / ส่งของให้รีวิว / เสนอข้อมูลเสริมบทความเก่าของเขา",
                "ถ้าเขามีบทความที่พูดถึงหัวข้อเราอยู่แล้ว เสนอให้เพิ่มลิงก์เราเป็นข้อมูลเสริม (link insert)",
            ],
            pitfalls=[
                "อีเมลขอลิงก์ตั้งแต่ครั้งแรกที่ติดต่อ — อัตราสำเร็จต่ำมาก",
                "เสนอ 'แลกลิงก์กัน' — Google ถือว่าเป็นการแลกเปลี่ยนลิงก์ซึ่งผิดแนวทาง",
            ],
            verify=["เปิดหน้าที่เขาลงแล้วตรวจลิงก์", "ดู rel ด้วย View page source"],
        ),
        EN: dict(
            approval=Approval.EDITORIAL, effort="30 min - 2 h per site",
            summary="A blog in your topic — build a relationship first, then ask for a mention, review, or interview.",
            prep=["Actually read 2-3 of their posts", "Know what you can offer their readers"],
            steps=["Leave one or two substantive comments first, with no link",
                   "Follow and share their work",
                   "Then email: offer a guest post, an interview, a product to review, or an addition to an existing post",
                   "If they already have a post on your topic, offer your page as a supporting link"],
            pitfalls=["Asking for a link in first contact", "Proposing a link exchange — Google treats reciprocal schemes as spam"],
            verify=["Open the page and test the link", "Check rel in the page source"],
        ),
    },

    OpportunityType.DIRECTORY: {
        TH: dict(
            approval=Approval.MODERATED, effort="10–20 นาทีต่อไดเรกทอรี",
            summary="ไดเรกทอรีเฉพาะทาง — กรอกฟอร์มลงทะเบียนเว็บ ส่วนใหญ่มีคนตรวจก่อนอนุมัติ",
            prep=[
                "ชื่อเว็บ, URL, คำอธิบาย 2 แบบ (สั้น ~50 คำ / ยาว ~150 คำ)",
                "โลโก้ไฟล์ PNG",
                "อีเมลติดต่อ (บางที่ส่งลิงก์ยืนยันมา)",
            ],
            steps=[
                "หาปุ่ม 'Submit' / 'Add your site' / 'ลงทะเบียน' ในหน้านั้น",
                "กด 'ร่าง' ในเครื่องมือนี้ → เลือกแบบ 'ฟอร์มไดเรกทอรี' จะได้ข้อความสำหรับกรอกทุกช่อง",
                "เลือกหมวดหมู่ที่ 'เฉพาะเจาะจงที่สุด' ที่เขามีให้ ไม่ใช่หมวดกว้าง ๆ",
                "กรอกให้ครบทุกช่อง โปรไฟล์ที่กรอกครบมีโอกาสผ่านสูงกว่า",
                "ส่งแล้วบันทึกวันที่ไว้ ปกติรู้ผลใน 3–14 วัน",
            ],
            pitfalls=[
                "ไดเรกทอรีที่รับทุกเว็บโดยไม่ตรวจอะไรเลย = เว็บคุณภาพต่ำ ลิงก์ไม่มีค่าและอาจเป็นโทษ ดูคะแนน Quality/Authority ก่อนเสียเวลา",
                "เขียนคำอธิบายยัดคีย์เวิร์ด — เป็นเหตุผลที่โดนปฏิเสธบ่อยที่สุด",
                "ไดเรกทอรีที่ขอให้ใส่ลิงก์กลับมาหาเขาก่อน (reciprocal) ควรข้าม",
            ],
            verify=["ค้นชื่อเว็บเราในช่องค้นหาของไดเรกทอรีนั้น", "ตรวจว่าลิงก์เป็น dofollow หรือ nofollow ด้วย View page source"],
        ),
        EN: dict(
            approval=Approval.MODERATED, effort="10-20 min each",
            summary="A niche directory — fill in a submission form; most are reviewed before going live.",
            prep=["Site name, URL, a short and a long description, logo, contact email"],
            steps=["Find Submit / Add your site on the page",
                   "Use Draft → 'directory' here to get the field values",
                   "Pick the most specific category they offer",
                   "Fill every field — complete profiles get approved more often",
                   "Note the date; expect 3-14 days"],
            pitfalls=["Directories that accept everything are worthless or harmful — check Quality first",
                      "Keyword-stuffed descriptions are the most common rejection reason",
                      "Skip any directory that demands a reciprocal link"],
            verify=["Search for your name in their directory", "Check the link's rel attribute"],
        ),
    },

    OpportunityType.BUSINESS_LISTING: {
        TH: dict(
            approval=Approval.MODERATED, effort="15–30 นาที",
            summary="ลงข้อมูลธุรกิจในเว็บรวมธุรกิจ — ได้ทั้งลิงก์และคนเห็นจริง",
            prep=["ชื่อธุรกิจ ที่อยู่ เบอร์โทร ให้ตรงกันทุกที่ (NAP)", "โลโก้ + รูปธุรกิจ 3–5 รูป", "เวลาทำการ"],
            steps=[
                "สมัครบัญชีด้วยอีเมลบริษัท",
                "กด 'ร่าง' → 'ฟอร์มไดเรกทอรี' เพื่อเอาข้อความไปกรอก",
                "กรอกข้อมูลให้ครบ โดยเฉพาะ ชื่อ-ที่อยู่-เบอร์ ต้องพิมพ์เหมือนกันเป๊ะกับที่ลงในเว็บอื่น",
                "อัปโหลดรูปจริง ไม่ใช่ภาพ stock",
            ],
            pitfalls=["ชื่อ/ที่อยู่/เบอร์ เขียนไม่ตรงกันในแต่ละเว็บ ทำให้ Google สับสนและเสียประโยชน์ที่ควรได้"],
            verify=["ค้นชื่อธุรกิจในเว็บนั้น", "ตรวจว่าช่องเว็บไซต์ลิงก์มาถูก"],
        ),
        EN: dict(
            approval=Approval.MODERATED, effort="15-30 min",
            summary="List your business — a link plus real visibility.",
            prep=["Consistent name, address, phone (NAP)", "Logo and 3-5 real photos", "Opening hours"],
            steps=["Register with a company email", "Use Draft → directory for the field values",
                   "Fill it completely; keep NAP byte-identical to your other listings",
                   "Upload real photos, not stock"],
            pitfalls=["Inconsistent NAP across sites wastes most of the benefit"],
            verify=["Search your name there", "Confirm the website field points to you"],
        ),
    },

    OpportunityType.LOCAL_CITATION: {
        TH: dict(
            approval=Approval.VERIFICATION, effort="20–40 นาที + รอยืนยัน 3–14 วัน",
            summary="ลงข้อมูลธุรกิจแบบผูกพื้นที่ (ชื่อ-ที่อยู่-เบอร์) — สำคัญมากถ้ามีหน้าร้านหรือให้บริการเป็นพื้นที่",
            prep=[
                "ชื่อ-ที่อยู่-เบอร์โทร (NAP) ที่ถูกต้อง และต้องใช้ชุดเดียวกันทุกเว็บ",
                "เบอร์โทรที่รับสายได้จริง (บางเว็บโทรมายืนยัน)",
                "ที่อยู่ที่รับจดหมายได้ (Google อาจส่งไปรษณียบัตรมายืนยัน)",
            ],
            steps=[
                "สมัครบัญชีและกรอกข้อมูลธุรกิจให้ครบ",
                "เลือกหมวดธุรกิจที่ตรงที่สุด",
                "ทำขั้นตอนยืนยันตัวตนให้เสร็จ (SMS / โทรศัพท์ / ไปรษณียบัตร / วิดีโอ แล้วแต่เว็บ)",
                "ใส่ URL เว็บไซต์ในช่องเว็บไซต์",
                "อัปโหลดรูปจริงและใส่เวลาทำการ",
            ],
            pitfalls=[
                "ที่อยู่ปลอมหรือใช้ที่อยู่รับจดหมายชั่วคราว — เสี่ยงโดนระงับบัญชีถาวร",
                "ยังไม่ได้ยืนยันตัวตน = ข้อมูลอาจไม่แสดงและลิงก์ไม่มีผล",
                "ถ้าไม่มีที่ตั้งจริง ข้ามหมวดนี้ไปเลย ไปทำ Directory แทน",
            ],
            verify=["ค้นชื่อธุรกิจใน Google Maps / เว็บนั้น", "ตรวจสถานะว่า 'ยืนยันแล้ว'"],
        ),
        EN: dict(
            approval=Approval.VERIFICATION, effort="20-40 min + 3-14 days to verify",
            summary="A geo-tied listing (name, address, phone) — essential if you serve a physical area.",
            prep=["Accurate, consistent NAP", "A phone that answers", "An address that receives mail"],
            steps=["Register and complete the business profile", "Pick the closest category",
                   "Complete verification (SMS, call, postcard, or video)",
                   "Add your website URL", "Upload real photos and hours"],
            pitfalls=["A fake or mailbox address risks a permanent suspension",
                      "Unverified listings often do not display at all",
                      "No physical location? Skip this type and do directories instead"],
            verify=["Search your business there", "Confirm the listing shows as verified"],
        ),
    },

    OpportunityType.WEB2: {
        TH: dict(
            approval=Approval.INSTANT, effort="30–60 นาทีต่อบทความ",
            summary="บล็อกฟรีที่เราเป็นเจ้าของเอง — เราคุมเนื้อหาและลิงก์เองทั้งหมด โพสต์ขึ้นทันที",
            prep=["บทความ 500+ คำที่มีประโยชน์จริง", "บัญชีของแพลตฟอร์มนั้น"],
            steps=[
                "สมัครบัญชีและตั้งโปรไฟล์ให้ดูเป็นคนจริง (รูป, ชื่อ, คำอธิบายตัวเอง)",
                "ใส่ลิงก์เว็บเราในช่องเว็บไซต์ของโปรไฟล์",
                "เขียนบทความที่มีคุณค่าจริง ไม่ใช่บทความสั้น ๆ ที่มีแต่ลิงก์",
                "ใส่ลิงก์กลับมาเว็บเรา 1–2 จุดในบริบทที่เหมาะ",
                "เขียนต่อเนื่องอีก 2–3 ชิ้น — บัญชีที่มีบทความเดียวแล้วทิ้งดูเป็นสแปม",
            ],
            pitfalls=[
                "เขียนบทความ 200 คำยัดลิงก์แล้วทิ้ง = สแปม แพลตฟอร์มลบบัญชีได้และลิงก์หายทันที",
                "แพลตฟอร์มเหล่านี้ส่วนใหญ่ให้ลิงก์แบบ nofollow — คุณค่าอยู่ที่คนเห็นและทราฟฟิก ไม่ใช่พลัง SEO โดยตรง",
            ],
            verify=["เปิดบทความที่เผยแพร่แล้วคลิกลิงก์", "ตรวจ rel ด้วย View page source"],
        ),
        EN: dict(
            approval=Approval.INSTANT, effort="30-60 min per post",
            summary="A free blog you own — you control the content and the links, and it publishes instantly.",
            prep=["A genuinely useful 500+ word post", "An account on the platform"],
            steps=["Register and fill the profile out like a real person",
                   "Put your URL in the profile website field",
                   "Publish something worth reading, not a link wrapper",
                   "Link back once or twice in context",
                   "Publish 2-3 more over time — a one-post account reads as spam"],
            pitfalls=["Thin posts built around a link get accounts removed and the link with them",
                      "Most of these platforms nofollow outbound links; the value is traffic and reach"],
            verify=["Open the published post and click through", "Check rel in the source"],
        ),
    },

    OpportunityType.PROFILE: {
        TH: dict(
            approval=Approval.INSTANT, effort="5–10 นาที",
            summary="สร้างโปรไฟล์แล้วใส่ลิงก์เว็บเราในช่องเว็บไซต์ — ง่ายที่สุด แต่พลัง SEO ต่ำ",
            prep=["อีเมล", "รูปโปรไฟล์", "คำอธิบายตัวเอง/บริษัท 1–2 ประโยค"],
            steps=[
                "สมัครบัญชี (บางเว็บต้องยืนยันอีเมลก่อน)",
                "ไปที่หน้าแก้ไขโปรไฟล์ หาช่อง 'Website' / 'เว็บไซต์'",
                "ใส่ URL เว็บเราแบบเต็ม (มี https:// ด้วย)",
                "กรอกโปรไฟล์ให้ครบ ใส่รูป — โปรไฟล์ว่างเปล่ามักถูกลบว่าเป็นสแปม",
                "ตั้งค่าโปรไฟล์เป็นสาธารณะ ไม่งั้น Google มองไม่เห็น",
            ],
            pitfalls=[
                "สร้างโปรไฟล์เปล่า ๆ 50 เว็บรวดเดียว = สัญญาณสแปมชัดเจน ทำเฉพาะเว็บที่เราใช้งานจริง",
                "เกือบทั้งหมดเป็น nofollow — อย่าคาดหวังผลอันดับ ทำเพื่อความน่าเชื่อถือของแบรนด์",
            ],
            verify=["เปิดหน้าโปรไฟล์ตัวเองแบบไม่ล็อกอิน (โหมดไม่ระบุตัวตน) เพื่อดูว่าคนนอกเห็นลิงก์ไหม"],
        ),
        EN: dict(
            approval=Approval.INSTANT, effort="5-10 min",
            summary="Create a profile and put your URL in the website field — easiest, lowest SEO value.",
            prep=["Email", "Profile photo", "A one-line bio"],
            steps=["Register (some require email confirmation)",
                   "Open profile settings and find the Website field",
                   "Enter the full URL including https://",
                   "Complete the profile and add a photo — empty profiles get purged as spam",
                   "Make sure the profile is public"],
            pitfalls=["Fifty empty profiles in a day is an obvious spam signal — only do sites you actually use",
                      "Nearly all are nofollow; treat these as brand presence, not ranking power"],
            verify=["Open your profile in a private window to confirm outsiders see the link"],
        ),
    },

    OpportunityType.COMMUNITY: {
        TH: dict(
            approval=Approval.MODERATED, effort="ใช้เวลาสะสมหลายสัปดาห์",
            summary="ชุมชนออนไลน์ — ต้องมีส่วนร่วมจริงก่อน ห้ามเข้าไปโพสต์ลิงก์ทันที",
            prep=["บัญชีที่ดูเป็นคนจริง", "เวลาสำหรับตอบคำถามคนอื่นก่อน อย่างน้อย 1–2 สัปดาห์"],
            steps=[
                "อ่านกฎของกลุ่ม/subreddit นั้นก่อน — เกือบทุกที่มีกฎเรื่องการโปรโมตตัวเอง และหลายที่ห้ามเด็ดขาด",
                "ตอบคำถามคนอื่นให้เป็นประโยชน์ก่อน 5–10 ครั้ง โดยยังไม่ใส่ลิงก์เลย",
                "เมื่อมีคำถามที่เว็บเราตอบได้จริง ค่อยตอบพร้อมอ้างลิงก์เป็นข้อมูลประกอบ",
                "บอกให้ชัดว่าเราเกี่ยวข้องกับเว็บนั้น เช่น 'ผมเป็นคนทำเว็บนี้' — ชุมชนให้อภัยคนที่บอกตรง ๆ แต่ลงโทษคนที่แอบ",
            ],
            pitfalls=[
                "โพสต์ลิงก์ตั้งแต่วันแรก = โดนแบนถาวรและเสียบัญชีฟรี ๆ",
                "ลิงก์ในชุมชนส่วนใหญ่เป็น nofollow — คุณค่าคือคนคลิกเข้ามาจริง",
                "บางกลุ่มห้ามลิงก์ทุกกรณี อ่านกฎก่อนเสมอ",
            ],
            verify=["ดูว่าโพสต์ยังอยู่หลังผ่านไป 24 ชม.", "ดูยอดคลิกใน Google Analytics"],
        ),
        EN: dict(
            approval=Approval.MODERATED, effort="weeks of participation",
            summary="A community — you have to take part for real before any link is welcome.",
            prep=["A credible account", "One to two weeks of helping others first"],
            steps=["Read the rules — nearly every community restricts self-promotion, many ban it",
                   "Answer 5-10 questions helpfully with no links at all",
                   "Only then answer a question your page genuinely resolves, citing it",
                   "Disclose that it is your site — communities forgive disclosure and punish concealment"],
            pitfalls=["Dropping a link on day one gets a permanent ban",
                      "Community links are nofollow; the value is real click-through",
                      "Some groups forbid links outright"],
            verify=["Check the post still exists 24 hours later", "Watch referral traffic"],
        ),
    },

    OpportunityType.QA: {
        TH: dict(
            approval=Approval.MODERATED, effort="20–40 นาทีต่อคำตอบ",
            summary="เว็บถาม-ตอบ — ตอบคำถามให้ดีจริงแล้วอ้างลิงก์เราเป็นแหล่งข้อมูล",
            prep=["บัญชีที่มีโปรไฟล์ครบ", "หน้าเว็บเราที่ตอบคำถามนั้นได้จริง"],
            steps=[
                "หาคำถามที่เว็บเราตอบได้ดีจริง ๆ และยังไม่มีคำตอบที่ดี",
                "เขียนคำตอบให้สมบูรณ์ในตัวมันเอง — คนอ่านต้องได้คำตอบโดยไม่ต้องคลิกลิงก์",
                "ค่อยใส่ลิงก์ท้ายคำตอบเป็น 'อ่านรายละเอียดเพิ่มเติม' เมื่อลิงก์ให้ข้อมูลเพิ่มจริง",
                "เลือกคำถามที่มีคนดูเยอะและยังใหม่ (ไม่เกิน 1–2 ปี)",
            ],
            pitfalls=[
                "ตอบสั้น ๆ แล้วบอกให้ไปอ่านที่เว็บเรา = โดนลบและโดนรายงานว่าสแปม",
                "ตอบคำถามเก่า 5 ปีที่ไม่มีคนดูแล้ว เสียเวลาเปล่า",
                "ลิงก์เป็น nofollow เกือบทั้งหมด — คุณค่าคือทราฟฟิกระยะยาว",
            ],
            verify=["ดูว่าคำตอบยังอยู่หลัง 48 ชม.", "ดูยอดวิวของคำตอบ"],
        ),
        EN: dict(
            approval=Approval.MODERATED, effort="20-40 min per answer",
            summary="Answer questions well and cite your page as a source.",
            prep=["A complete profile", "A page that genuinely answers the question"],
            steps=["Find a question your page really answers that lacks a good answer",
                   "Write an answer complete on its own — no click required to get value",
                   "Then link at the end for further detail",
                   "Prefer questions with high views and recent activity"],
            pitfalls=["A stub answer pointing at your site gets deleted and reported",
                      "Answering five-year-old dead questions wastes your time",
                      "These links are nofollow; the value is durable traffic"],
            verify=["Check the answer survives 48 hours", "Watch its view count"],
        ),
    },

    OpportunityType.FORUM: {
        TH: dict(
            approval=Approval.MODERATED, effort="สะสมหลายสัปดาห์",
            summary="เว็บบอร์ด — ส่วนใหญ่ต้องโพสต์สะสมจำนวนหนึ่งก่อนถึงจะใส่ลิงก์ได้",
            prep=["บัญชีที่ยืนยันอีเมลแล้ว", "ความรู้จริงในหัวข้อนั้น"],
            steps=[
                "อ่านกฎของบอร์ด โดยเฉพาะเรื่องลายเซ็น (signature) และการโพสต์ลิงก์",
                "โพสต์ตอบกระทู้ที่เป็นประโยชน์ 10–20 ครั้งก่อน — หลายบอร์ดล็อกฟีเจอร์ลิงก์ไว้จนกว่าจะถึงจำนวนโพสต์ที่กำหนด",
                "ตั้งลายเซ็นให้มีลิงก์เว็บเรา (ถ้าบอร์ดอนุญาต)",
                "ตอบกระทู้ที่เกี่ยวกับหัวข้อเราแล้วอ้างลิงก์เมื่อมันช่วยคนถามจริง",
            ],
            pitfalls=[
                "สมัครแล้วโพสต์ลิงก์ทันที = โดนลบและแบน",
                "ลิงก์ในบอร์ดเกือบทั้งหมดเป็น nofollow",
                "บอร์ดที่ตายแล้ว (โพสต์ล่าสุดเป็นปี) ไม่มีค่าอะไรเลย ดูวันที่โพสต์ล่าสุดก่อน",
            ],
            verify=["ดูว่าโพสต์และลายเซ็นยังอยู่", "ตรวจ rel ด้วย View page source"],
        ),
        EN: dict(
            approval=Approval.MODERATED, effort="weeks of participation",
            summary="A forum — most gate link privileges behind a post count.",
            prep=["A confirmed account", "Real knowledge of the topic"],
            steps=["Read the rules, especially about signatures and links",
                   "Make 10-20 genuinely useful posts first — many boards lock links until then",
                   "Set a signature with your URL if allowed",
                   "Cite your page when it actually answers someone"],
            pitfalls=["Registering and posting a link immediately gets you banned",
                      "Forum links are almost always nofollow",
                      "A dead board with year-old posts is worth nothing — check the last post date"],
            verify=["Confirm your post and signature survive", "Check rel in the source"],
        ),
    },

    OpportunityType.BLOG_COMMENT: {
        TH: dict(
            approval=Approval.MODERATED, effort="10–15 นาทีต่อคอมเมนต์",
            summary="คอมเมนต์ใต้บทความ — ง่ายที่สุดแต่พลัง SEO ต่ำที่สุด ทำเพื่อสร้างความสัมพันธ์",
            prep=["อ่านบทความนั้นจริง ๆ ให้จบ", "ประเด็นที่อยากเสริมหรือคำถามจริง"],
            steps=[
                "อ่านบทความให้จบก่อน — คนดูแลเว็บดูออกว่าใครไม่ได้อ่าน",
                "กด 'ร่าง' ในเครื่องมือนี้ จะได้โครงคอมเมนต์ในภาษาเดียวกับเว็บนั้น",
                "แทนที่ส่วนในวงเล็บ [...] ด้วยความเห็นจริงของเรา 2–3 ประโยค อ้างถึงเนื้อหาในบทความให้ชัด",
                "ใส่ชื่อจริงหรือชื่อที่ใช้ประจำ ไม่ใช่ชื่อแบรนด์หรือคีย์เวิร์ด",
                "ช่อง 'Website' ในฟอร์มคอมเมนต์คือที่ที่ควรใส่ URL เรา ไม่ใช่ในเนื้อคอมเมนต์",
                "รอ 1–7 วัน คนดูแลเว็บจะอนุมัติหรือไม่อนุมัติ",
            ],
            pitfalls=[
                "คอมเมนต์แบบ 'ขอบคุณสำหรับข้อมูลดี ๆ ครับ' = ถูกลบทันที",
                "ยัดลิงก์ในเนื้อคอมเมนต์ = ถูกกรองเป็นสแปมอัตโนมัติ (Akismet)",
                "ใช้ชื่อเป็นคีย์เวิร์ด เช่น 'รับทำ SEO ราคาถูก' = ถูกลบแน่นอน",
                "คอมเมนต์เกือบทั้งหมดเป็น nofollow/ugc — ทำเพื่อให้เจ้าของเว็บรู้จักเรา แล้วต่อยอดเป็น guest post ทีหลัง",
            ],
            verify=["กลับมาดูหน้านั้นใน 3–7 วันว่าคอมเมนต์เราขึ้นไหม", "ถ้าไม่ขึ้นภายใน 2 สัปดาห์ ถือว่าไม่ผ่าน"],
        ),
        EN: dict(
            approval=Approval.MODERATED, effort="10-15 min each",
            summary="A comment under an article — easiest, weakest SEO value; do it to start a relationship.",
            prep=["Actually read the article", "One real point or question"],
            steps=["Read the post first — moderators can tell",
                   "Use Draft here for a scaffold in the site's own language",
                   "Replace the [bracketed] part with 2-3 real sentences referencing the article",
                   "Use your real name, never a brand or keyword",
                   "Put your URL in the form's Website field, not in the comment body",
                   "Wait 1-7 days for moderation"],
            pitfalls=["\"Thanks, great post!\" is deleted on sight",
                      "A URL in the body triggers the spam filter",
                      "Keyword names are always removed",
                      "These are nofollow/ugc — the point is that the owner learns who you are"],
            verify=["Recheck the page in 3-7 days", "Nothing after two weeks means rejected"],
        ),
    },

    OpportunityType.WIKI: {
        TH: dict(
            approval=Approval.EDITORIAL, effort="30 นาที–2 ชม. โอกาสสำเร็จต่ำ",
            summary="เพิ่มลิงก์ในส่วน External links ของวิกิ — เข้มงวดมาก ถูกลบง่าย",
            prep=["หน้าเว็บเราที่เป็นข้อมูลอ้างอิงได้จริง ไม่ใช่หน้าขายของ", "บัญชีวิกิที่มีประวัติแก้ไขบ้าง"],
            steps=[
                "อ่านกฎเรื่องลิงก์ภายนอกของวิกินั้นก่อน",
                "แก้ไขหน้าอื่น ๆ ที่เป็นประโยชน์ก่อน 5–10 ครั้ง สร้างประวัติบัญชีที่ดี",
                "เพิ่มลิงก์เฉพาะเมื่อมันเป็นแหล่งอ้างอิงที่ดีที่สุดสำหรับข้อความนั้นจริง ๆ",
                "เขียนสรุปการแก้ไขให้ชัดว่าทำไมถึงเพิ่ม",
            ],
            pitfalls=[
                "บัญชีใหม่ที่แก้ไขครั้งแรกคือการเพิ่มลิงก์ตัวเอง = ถูกย้อนกลับเกือบ 100%",
                "Wikipedia ใส่ nofollow ทุกลิงก์ภายนอก — ไม่มีผลต่ออันดับโดยตรง",
            ],
            verify=["ดูว่าการแก้ไขไม่ถูกย้อนกลับหลัง 1 สัปดาห์"],
        ),
        EN: dict(
            approval=Approval.EDITORIAL, effort="30 min - 2 h, low success rate",
            summary="Add a link to a wiki's external links — strict, and easily reverted.",
            prep=["A genuinely citable page", "An account with some edit history"],
            steps=["Read that wiki's external-link policy",
                   "Make 5-10 useful unrelated edits first",
                   "Only add the link where it is genuinely the best source",
                   "Write a clear edit summary"],
            pitfalls=["A new account whose first edit is its own link is reverted almost always",
                      "Wikipedia nofollows every external link"],
            verify=["Check the edit survives a week"],
        ),
    },

    OpportunityType.BOOKMARK: {
        TH: dict(
            approval=Approval.INSTANT, effort="5 นาที",
            summary="เว็บบุ๊กมาร์ก — บันทึกลิงก์ไว้ในคอลเลกชันสาธารณะ ค่าต่ำ ทำเป็นของแถม",
            prep=["บัญชี", "URL + คำอธิบายสั้น"],
            steps=["สมัครบัญชี", "สร้างคอลเลกชันตามหัวข้อ", "บันทึกลิงก์ของเราปนกับลิงก์ดี ๆ ของคนอื่น", "ตั้งค่าเป็นสาธารณะ"],
            pitfalls=["บันทึกแต่ลิงก์ตัวเอง = สแปมชัดเจน", "เกือบทั้งหมด nofollow และแทบไม่มีผลต่ออันดับ"],
            verify=["เปิดคอลเลกชันแบบไม่ล็อกอินเพื่อดูว่าสาธารณะจริง"],
        ),
        EN: dict(
            approval=Approval.INSTANT, effort="5 min",
            summary="Public bookmark collections — low value, do them as a bonus.",
            prep=["An account", "URL and a short description"],
            steps=["Register", "Make a topical collection", "Save your link among other good ones", "Make it public"],
            pitfalls=["Only ever saving your own links is obvious spam", "Nofollow, minimal ranking effect"],
            verify=["View the collection logged out"],
        ),
    },

    OpportunityType.EDITORIAL_MENTION: {
        TH: dict(
            approval=Approval.EDITORIAL, effort="ต่อเนื่อง ไม่ใช่งานครั้งเดียว",
            summary="ให้คนอื่นอ้างถึงเราเองในบทความเขา — ลิงก์ที่ดีที่สุดและควบคุมไม่ได้",
            prep=["ข้อมูล/งานวิจัย/เครื่องมือที่คนอยากอ้างถึง", "หน้า About ที่บอกว่าเราเป็นใครและเชี่ยวชาญอะไร"],
            steps=[
                "สร้างของที่คนอยากลิงก์หา: ผลสำรวจ ตัวเลขในวงการ เครื่องมือฟรี คู่มือที่ละเอียดที่สุด",
                "สมัครบริการที่นักข่าวใช้หาแหล่งข้อมูล แล้วตอบคำถามที่ตรงกับความเชี่ยวชาญเรา",
                "ตั้ง Google Alerts ชื่อแบรนด์เรา — ถ้าเจอคนพูดถึงแต่ไม่ได้ใส่ลิงก์ อีเมลไปขอสุภาพ ๆ",
            ],
            pitfalls=["คาดหวังผลเร็ว — วิธีนี้ใช้เวลาเป็นเดือน แต่ได้ลิงก์ที่คู่แข่งลอกไม่ได้"],
            verify=["ตั้ง Google Alerts", "ตรวจ backlink ใหม่ใน Google Search Console"],
        ),
        EN: dict(
            approval=Approval.EDITORIAL, effort="ongoing, not a one-off",
            summary="Someone cites you in their own article — the best links, and the ones you cannot directly place.",
            prep=["Something worth citing: data, a study, a free tool", "An About page establishing expertise"],
            steps=["Build the citable asset",
                   "Answer journalist source requests in your field",
                   "Set Google Alerts for your brand and politely ask for a link where you are mentioned unlinked"],
            pitfalls=["Expecting speed — this takes months, and produces links competitors cannot copy"],
            verify=["Google Alerts", "New referring domains in Search Console"],
        ),
    },

    OpportunityType.SOCIAL: {
        TH: dict(
            approval=Approval.INSTANT, effort="5 นาที",
            summary="ใส่ลิงก์ในไบโอโซเชียล — ไม่มีผล SEO โดยตรง แต่ทำให้แบรนด์ครบและมีคนคลิกจริง",
            prep=["บัญชีโซเชียล", "URL"],
            steps=["เข้าไปแก้ไขโปรไฟล์", "ใส่ URL ในช่องเว็บไซต์", "ตั้งโปรไฟล์เป็นสาธารณะ"],
            pitfalls=["ลิงก์โซเชียลเป็น nofollow ทั้งหมด อย่าคาดหวังผลอันดับ"],
            verify=["เปิดโปรไฟล์แบบไม่ล็อกอิน"],
        ),
        EN: dict(
            approval=Approval.INSTANT, effort="5 min",
            summary="A link in a social bio — no direct SEO value, but real clicks and brand completeness.",
            prep=["The account", "Your URL"],
            steps=["Edit the profile", "Add the URL", "Keep the profile public"],
            pitfalls=["All nofollow — no ranking effect"],
            verify=["View the profile logged out"],
        ),
    },

    OpportunityType.UNKNOWN: {
        TH: dict(
            approval=Approval.UNKNOWN, effort="10 นาทีเพื่อประเมิน",
            summary="ยังไม่รู้ว่าเว็บนี้ให้ลิงก์ได้ทางไหน — ต้องเปิดดูเอง",
            steps=[
                "เปิดเว็บแล้วมองหา: ช่องคอมเมนต์ / ปุ่ม Submit / หน้า Write for us / ฟอร์มสมัครสมาชิก",
                "ดูที่ท้ายเว็บ (footer) มักมีลิงก์ Contact, Submit, Advertise",
                "ถ้าไม่เจอช่องทางใด ๆ ให้ข้ามไป อย่าเสียเวลา",
                "ถ้าเจอ ให้กลับมาแก้ประเภทของเป้าหมายนี้ให้ถูก แล้วดูคู่มือของประเภทนั้น",
            ],
            pitfalls=["เสียเวลากับเว็บที่ไม่มีช่องทางให้วางลิงก์เลย"],
            verify=[],
        ),
        EN: dict(
            approval=Approval.UNKNOWN, effort="10 min to assess",
            summary="We could not tell how a link is obtained here — open it and look.",
            steps=["Look for a comment box, a Submit button, a Write-for-us page, or a signup form",
                   "Check the footer — Contact/Submit/Advertise usually live there",
                   "If there is no mechanism at all, skip it",
                   "If there is, set the right type and follow that playbook"],
            pitfalls=["Spending time on sites with no mechanism at all"],
            verify=[],
        ),
    },
}


# ---------------------------------------------------------------------------
# Layer 2 — domain overrides, where the generic steps would be wrong.
# ---------------------------------------------------------------------------
DOMAIN_GUIDES: dict[str, dict[str, dict]] = {

    "google.com": {   # Google Business Profile
        TH: dict(
            approval=Approval.VERIFICATION, effort="30 นาที + รอยืนยัน 5–14 วัน",
            summary="Google Business Profile — สิ่งสำคัญที่สุดสำหรับธุรกิจที่มีพื้นที่ให้บริการ",
            prep=["บัญชี Google", "ชื่อ-ที่อยู่-เบอร์ที่ถูกต้อง", "ที่อยู่ที่รับไปรษณีย์ได้", "รูปหน้าร้าน/ทีมงาน"],
            steps=[
                "ไปที่ google.com/business แล้วล็อกอินด้วยบัญชี Google",
                "ค้นชื่อธุรกิจก่อน — ถ้ามีคนสร้างไว้แล้วให้กด 'อ้างสิทธิ์' (Claim) แทนการสร้างใหม่",
                "กรอกข้อมูลให้ครบ เลือกหมวดหมู่หลักที่ตรงที่สุด",
                "ใส่ URL เว็บไซต์ในช่อง Website",
                "ทำการยืนยัน — Google อาจให้ยืนยันด้วยไปรษณียบัตร โทรศัพท์ อีเมล หรือวิดีโอ แล้วแต่ประเภทธุรกิจ",
                "หลังยืนยันผ่าน อัปโหลดรูป ใส่เวลาทำการ และตอบรีวิว",
            ],
            pitfalls=[
                "ที่อยู่ไม่จริงหรือใช้ที่อยู่รับจดหมาย = โดนระงับ และกู้คืนยากมาก",
                "ถ้าธุรกิจไม่มีที่ตั้งและไม่ได้ให้บริการตามพื้นที่ อาจไม่เข้าเกณฑ์ — อ่านเงื่อนไขก่อน",
                "ลิงก์จากที่นี่เป็น nofollow แต่ผลต่อการค้นหาแบบท้องถิ่นสูงมาก จึงคุ้มทำ",
            ],
            verify=["ค้นชื่อธุรกิจใน Google Maps", "ดูว่าสถานะขึ้นว่ายืนยันแล้ว"],
        ),
    },

    "medium.com": {
        TH: dict(
            approval=Approval.INSTANT, effort="45–90 นาทีต่อบทความ",
            summary="Medium — เขียนบทความเผยแพร่ได้ทันที ไม่ต้องรออนุมัติ",
            prep=["บัญชี Medium", "บทความ 800+ คำ", "รูปหน้าปก"],
            steps=[
                "สมัคร/ล็อกอิน แล้วตั้งโปรไฟล์: รูป ชื่อจริง คำอธิบายตัวเอง และใส่ลิงก์เว็บเราในโปรไฟล์",
                "กด Write เขียนบทความที่เป็นประโยชน์จริงในหัวข้อของเรา",
                "ใส่ลิงก์กลับเว็บเรา 1–2 จุดตรงที่ช่วยคนอ่านจริง",
                "ใส่ tag ที่เกี่ยวข้อง 5 tag เพื่อให้คนหาเจอ",
                "กด Publish — ขึ้นทันที",
                "ลองส่งบทความเข้า publication ที่เกี่ยวกับหัวข้อเรา จะมีคนอ่านมากขึ้น (อันนี้ต้องรอเขาอนุมัติ)",
            ],
            pitfalls=[
                "Medium ใส่ nofollow ให้ลิงก์ภายนอก — คุณค่าคือคนอ่านและทราฟฟิก ไม่ใช่พลังอันดับโดยตรง",
                "บทความสั้นที่มีแต่ลิงก์อาจถูกจำกัดการมองเห็นหรือถูกลบ",
                "อย่าเอาบทความจากเว็บเรามาลงซ้ำทั้งดุ้น เขียนใหม่หรือปรับให้ต่างออกไป",
            ],
            verify=["เปิดบทความในโหมดไม่ระบุตัวตนแล้วคลิกลิงก์"],
        ),
    },

    "reddit.com": {
        TH: dict(
            approval=Approval.MODERATED, effort="สะสมหลายสัปดาห์",
            summary="Reddit — แบนคนโปรโมตตัวเองเร็วมาก ต้องสร้างเครดิตก่อนจริงจัง",
            prep=["บัญชีที่มี karma พอสมควร", "หา subreddit ที่ตรงหัวข้อเรา"],
            steps=[
                "หา subreddit ที่ตรงกับหัวข้อของเรา แล้วอ่านกฎในแถบด้านข้างให้ครบ",
                "ตอบกระทู้คนอื่นให้เป็นประโยชน์จนได้ karma อย่างน้อยสัก 50–100 ก่อน",
                "อย่าโพสต์ลิงก์เว็บตัวเองในสัปดาห์แรก ๆ เด็ดขาด",
                "เมื่อมีคนถามเรื่องที่เว็บเราตอบได้ ให้ตอบเต็ม ๆ แล้วค่อยแนบลิงก์ พร้อมบอกว่าเป็นเว็บของเราเอง",
                "หลาย subreddit มีวันที่อนุญาตให้โปรโมตได้ (เช่น Self-promotion Saturday) ใช้ช่องทางนั้น",
            ],
            pitfalls=[
                "โพสต์ลิงก์ทันทีหลังสมัคร = โดนแบนถาวรทั้ง subreddit และอาจโดนแบนทั้งบัญชี",
                "ลิงก์ Reddit เป็น nofollow — ทำเพื่อทราฟฟิกและ feedback ไม่ใช่ SEO",
                "กฎแต่ละ subreddit ต่างกันมาก อ่านทุกครั้ง",
            ],
            verify=["ดูว่าโพสต์ยังอยู่หลัง 24 ชม. (mod ลบเงียบได้)", "เปิดลิงก์โพสต์ในโหมดไม่ระบุตัวตน"],
        ),
    },

    "quora.com": {
        TH: dict(
            approval=Approval.MODERATED, effort="30–45 นาทีต่อคำตอบ",
            summary="Quora — ตอบคำถามให้ดี ลิงก์ได้ แต่ระบบกรองสแปมเข้มงวด",
            prep=["โปรไฟล์ที่กรอกครบ ใส่ความเชี่ยวชาญ", "หน้าเว็บเราที่ตอบคำถามได้จริง"],
            steps=[
                "กรอกโปรไฟล์ให้ครบก่อน โดยเฉพาะ credential ที่บอกว่าเราเชี่ยวชาญเรื่องอะไร",
                "ค้นคำถามในหัวข้อเรา เลือกที่มีคนติดตามเยอะ",
                "เขียนคำตอบยาว ๆ ที่สมบูรณ์ในตัวเอง 200+ คำ",
                "ใส่ลิงก์ 1 จุดตรงที่ให้ข้อมูลเพิ่มเติมจริง ๆ",
                "ตอบสัก 3–5 คำถามก่อนที่จะเริ่มใส่ลิงก์",
            ],
            pitfalls=[
                "ใส่ลิงก์ในคำตอบแรก ๆ ของบัญชีใหม่ = ระบบมองเป็นสแปมและอาจระงับบัญชี",
                "ลิงก์เป็น nofollow",
                "คำตอบที่สั้นและมีลิงก์จะถูก collapse (ซ่อน) อัตโนมัติ",
            ],
            verify=["ดูว่าคำตอบไม่ถูก collapse", "ดูยอดวิวใน 1 สัปดาห์"],
        ),
    },

    "pantip.com": {
        TH: dict(
            approval=Approval.MODERATED, effort="สะสมหลายสัปดาห์",
            summary="Pantip — ชุมชนใหญ่ที่สุดในไทย แต่เข้มเรื่องโฆษณาแฝงมาก",
            prep=["บัญชี Pantip ที่ยืนยันตัวตนแล้ว", "ความรู้จริงในหัวข้อ"],
            steps=[
                "เลือกห้องที่ตรงหัวข้อ (เช่น ห้องสินธร สำหรับการเงิน/การลงทุน)",
                "ตอบกระทู้คนอื่นให้เป็นประโยชน์ก่อนหลายครั้ง โดยยังไม่ใส่ลิงก์",
                "ตั้งกระทู้ที่ให้ความรู้จริง ไม่ใช่กระทู้ขายของ",
                "ถ้าจะอ้างลิงก์ ให้บอกตรง ๆ ว่าเป็นเว็บของเราเอง — ชาว Pantip จับโฆษณาแฝงเก่งมากและจะรายงานทันที",
            ],
            pitfalls=[
                "โฆษณาแฝงถูกจับได้ง่ายและกระทู้จะถูกลบ พร้อมเสียชื่อเสียงแบรนด์",
                "ลิงก์เป็น nofollow — ทำเพื่อทราฟฟิกและการรับรู้แบรนด์",
                "อ่านกฎของแต่ละห้องก่อน บางห้องห้ามลิงก์เชิงพาณิชย์เด็ดขาด",
            ],
            verify=["ดูว่ากระทู้ยังอยู่หลัง 48 ชม.", "ดูทราฟฟิกที่มาจาก pantip.com"],
        ),
    },

    "github.com": {
        TH: dict(
            approval=Approval.INSTANT, effort="10 นาที",
            summary="GitHub — ใส่ลิงก์ในโปรไฟล์ได้ทันที และในหน้า README ของโปรเจกต์",
            prep=["บัญชี GitHub"],
            steps=[
                "ไปที่ Settings → Public profile",
                "ใส่ URL เว็บเราในช่อง Website",
                "ถ้ามีโปรเจกต์โอเพนซอร์ส ใส่ลิงก์ในไฟล์ README และในช่อง Website ของ repo ด้วย",
                "กรอกโปรไฟล์ให้ครบ ใส่รูปและ bio",
            ],
            pitfalls=["ลิงก์เป็น nofollow", "บัญชีเปล่าที่ไม่มีโปรเจกต์เลยแทบไม่มีน้ำหนัก"],
            verify=["เปิดหน้าโปรไฟล์แบบไม่ล็อกอิน"],
        ),
    },

    "trustpilot.com": {
        TH: dict(
            approval=Approval.VERIFICATION, effort="20–30 นาที",
            summary="Trustpilot — สร้างโปรไฟล์ธุรกิจ ต้องยืนยันความเป็นเจ้าของโดเมน",
            prep=["อีเมลบริษัท (ไม่ใช่ Gmail)", "สิทธิ์แก้ไข DNS หรือเข้าถึงเว็บได้ เพื่อยืนยันโดเมน"],
            steps=[
                "สมัครบัญชีธุรกิจด้วยอีเมลโดเมนบริษัท",
                "ทำขั้นตอนยืนยันความเป็นเจ้าของโดเมนตามที่ระบบแจ้ง",
                "กรอกโปรไฟล์ธุรกิจให้ครบ ใส่โลโก้และคำอธิบาย",
                "เริ่มขอรีวิวจากลูกค้าจริง",
            ],
            pitfalls=["ซื้อรีวิวปลอม = โดนลบโปรไฟล์และเสียชื่อเสียง", "ลิงก์เป็น nofollow"],
            verify=["เปิดหน้าโปรไฟล์ธุรกิจแบบไม่ล็อกอิน"],
        ),
    },
}

# Sites where the free tier accepts almost anything — worth a warning.
_LOW_BAR_PR = {"prlog.org", "openpr.com"}


def _lang_for(prospect: Prospect, cfg, profile=None) -> str:
    """Which language to write the GUIDE in.

    The guide is read by you, the operator — not by the target site — so it
    follows your own site's language, not the target's.
    """
    override = cfg.get("assist.guide_language") if cfg else None
    if override:
        return TH if str(override).lower().startswith("th") else EN
    if profile is not None and getattr(profile, "language", None) == "th":
        return TH
    langs = (cfg.get("site.languages", []) if cfg else []) or []
    if langs and str(langs[0]).lower().startswith("th"):
        return TH
    return EN


def _page_facts(prospect: Prospect, lang: str) -> list[str]:
    """What we actually observed on this page, phrased as things to act on."""
    a = prospect.analysis
    out: list[str] = []
    th = lang == TH

    if not a.fetched:
        out.append("เปิดหน้านี้ไม่ได้ตอนตรวจ — เปิดด้วยเบราว์เซอร์เองก่อนตัดสินใจ"
                   if th else
                   "We could not load this page — open it in a browser before deciding.")
        return out

    if a.has_comment_form:
        sysname = a.comment_system or ("native" if not th else "ของเว็บเอง")
        if a.comment_system == "disqus":
            out.append("หน้านี้ใช้ระบบคอมเมนต์ Disqus — ต้องมีบัญชี Disqus ก่อน และลิงก์ในคอมเมนต์มักถูกใส่ nofollow"
                       if th else
                       "Comments run on Disqus — you need a Disqus account, and links there are nofollowed.")
        elif a.comment_system == "facebook":
            out.append("หน้านี้ใช้คอมเมนต์ผ่าน Facebook — ลิงก์ที่โพสต์ไม่ส่งผลต่อ SEO เลย"
                       if th else
                       "Comments run through Facebook — links posted there carry no SEO value at all.")
        else:
            out.append("เจอช่องคอมเมนต์ในหน้านี้ ใช้ช่อง Website ในฟอร์มสำหรับใส่ URL เรา"
                       if th else
                       "This page has a comment form — put your URL in its Website field.")

    if a.has_submit_form:
        out.append("เจอข้อความเชิญให้ส่งบทความ/ลงทะเบียนในหน้านี้ — มองหาปุ่มหรือฟอร์มนั้น"
                   if th else
                   "This page invites submissions — look for that form or button.")

    if a.contact_email:
        out.append((f"อีเมลที่เจอในหน้านี้: {a.contact_email}" if th else
                    f"Contact email found on the page: {a.contact_email}"))

    if a.link_attribute in (LinkAttribute.NOFOLLOW, LinkAttribute.UGC):
        out.append("ลิงก์จากหน้านี้น่าจะเป็น nofollow — ไม่ส่งพลังอันดับ ทำต่อเมื่อหวังทราฟฟิกหรือความสัมพันธ์"
                   if th else
                   "Links here are likely nofollow — no ranking value; worth it only for traffic or a relationship.")
    elif a.link_attribute == LinkAttribute.DOFOLLOW:
        out.append("ลิงก์ในหน้านี้ส่วนใหญ่เป็น dofollow — ถ้าได้ลิงก์จะส่งพลังอันดับจริง"
                   if th else
                   "Most links on this page are dofollow — a link here would pass ranking value.")

    if a.content_lang:
        out.append((f"เว็บนี้เป็นภาษา {a.content_lang} — เขียนข้อความที่จะโพสต์เป็นภาษานี้ "
                    f"(ปุ่ม 'ร่าง' ทำให้อัตโนมัติแล้ว)") if th else
                   (f"This site is in '{a.content_lang}' — write in that language "
                    f"(the Draft button already does)."))

    if prospect.scores.match and prospect.scores.match < 25:
        out.append("คะแนน Match ต่ำ — เว็บนี้คนละหัวข้อกับเรา ลิงก์จะมีค่าน้อยแม้โดเมนจะแรง พิจารณาข้าม"
                   if th else
                   "Low match — this site is off-topic for you; the link is worth little even from a strong domain.")

    if prospect.domain in _LOW_BAR_PR:
        out.append("เว็บนี้รับข่าวแทบทุกอย่างโดยไม่คัดกรอง คุณค่าของลิงก์จึงต่ำ ใช้เป็นของแถมเท่านั้น"
                   if th else
                   "This outlet accepts almost anything, so the link is low value — treat it as a bonus.")

    return out


def guide_for(prospect: Prospect, cfg=None, profile=None) -> Guide:
    """The full how-to for one prospect."""
    lang = _lang_for(prospect, cfg, profile)

    # Domain override first, then the type playbook. Track which language we
    # actually rendered in: a domain override may only exist in one language,
    # and the page facts must match the body or the output reads as two
    # different documents stapled together.
    data = None
    used_lang = lang
    source = "type"
    dom = DOMAIN_GUIDES.get(prospect.domain)
    if dom:
        for candidate in (lang, TH, EN):
            if candidate in dom:
                data, used_lang = dom[candidate], candidate
                source = "domain"
                break
    if data is None:
        by_type = (TYPE_GUIDES.get(prospect.opportunity_type)
                   or TYPE_GUIDES[OpportunityType.UNKNOWN])
        for candidate in (lang, EN, TH):
            if candidate in by_type:
                data, used_lang = by_type[candidate], candidate
                break

    g = Guide(
        approval=data.get("approval", Approval.UNKNOWN),
        effort=data.get("effort", ""),
        summary=data.get("summary", ""),
        prep=list(data.get("prep", [])),
        steps=list(data.get("steps", [])),
        pitfalls=list(data.get("pitfalls", [])),
        verify=list(data.get("verify", [])),
        source=source,
        language=used_lang,
    )
    g.facts = _page_facts(prospect, used_lang)
    return g


def approval_for(prospect: Prospect) -> Approval:
    """Just the approval expectation — cheap enough to call per table row."""
    dom = DOMAIN_GUIDES.get(prospect.domain)
    if dom:
        data = next(iter(dom.values()))
        return data.get("approval", Approval.UNKNOWN)
    by_type = TYPE_GUIDES.get(prospect.opportunity_type)
    if not by_type:
        return Approval.UNKNOWN
    return next(iter(by_type.values())).get("approval", Approval.UNKNOWN)
