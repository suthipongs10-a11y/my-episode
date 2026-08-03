# Rules Catalog

รหัส `XXX-nnn` · metadata (severity, impact_score, effort_hours, ข้อความไทย, วิธีแก้)
อยู่ใน `rules/catalog.ts` · ข้อความไทยอยู่ใน `i18n/th.ts`

**ทุก rule เป็น pure function** ไม่มี network ไม่มี LLM ไม่มี random
ทุก finding ต้องมี `evidence` ที่ชี้ได้ว่ามาจาก URL ไหน ค่าอะไร

## ONP — On-page (M1)
| code | เงื่อนไข | severity |
|---|---|---|
| ONP-001 | ไม่มี H1 หรือมี H1 > 1 | high |
| ONP-002 | title ซ้ำกัน ≥ 2 หน้า | high |
| ONP-003 | title > 60 หรือ < 20 ตัวอักษร | medium |
| ONP-004 | ไม่มี meta description | medium |
| ONP-005 | หน้าบริการเนื้อหา < 300 คำ | high |
| ONP-006 | รูปไม่มี alt > 50% | low |
| ONP-007 | internal link ขาออก < 3 ในหน้าบริการ | medium |
| ONP-008 | ไม่มี schema LocalBusiness ในหน้าแรก | high |
| ONP-009 | ไม่มี FAQ schema ทั้งเว็บ | medium |

## TEC — Technical (M1)
| code | เงื่อนไข | severity |
|---|---|---|
| TEC-001 | ไม่มี HTTPS หรือ mixed content | critical |
| TEC-002 | mobile performance < 50 | high |
| TEC-003 | LCP > 4 วิ (mobile) | high |
| TEC-004 | ไม่มี sitemap.xml | medium |
| TEC-005 | robots.txt บล็อกหน้าสำคัญ | critical |
| TEC-006 | หน้าที่ index < 50% ของหน้าที่มี | high |
| TEC-007 | ไม่มี viewport meta / ไม่ responsive | critical |
| TEC-008 | พบ 404 จาก internal link ≥ 1 | medium |

## CVR — Conversion (M2) — หมวดที่ทำให้เราต่างจากคนอื่น
| code | เงื่อนไข | severity |
|---|---|---|
| CVR-001 | เบอร์โทรไม่ได้เป็น `tel:` link | critical |
| CVR-002 | ไม่มีปุ่ม LINE OA | high |
| CVR-003 | ไม่มี sticky CTA บนมือถือ | high |
| CVR-004 | ฟอร์มมีช่องกรอก > 4 ช่อง | high |
| CVR-005 | ไม่มี CTA ในหน้าจอแรก | critical |
| CVR-006 | ไม่แสดงราคาเลย | medium |
| CVR-007 | ไม่มีรีวิว/testimonial | high |
| CVR-008 | ใช้ภาพ stock ล้วน | medium |
| CVR-009 | ไม่มีสัญญาณความน่าเชื่อถือ | medium |
| CVR-010 | NAP บนเว็บไม่ตรงกับ GBP | high |

## LOC — Local / GBP (M4)
LOC-001 ไม่มี GBP (critical) · LOC-002 ยังไม่ verified (critical) · LOC-003 หมวดผิด (high)
LOC-004 รีวิวน้อยกว่าคู่แข่ง 50%+ (high) · LOC-005 ตอบรีวิว < 50% (high)
LOC-006 ไม่มีรูปใหม่ 90 วัน (medium) · LOC-007 ไม่มีโพสต์ 30 วัน (medium)
LOC-008 เวลาทำการไม่ครบ (medium) · LOC-009 ไม่มีหน้าเจาะพื้นที่ (high)

## CON — Content (M3)
CON-001 หน้าบริการน้อยกว่าคู่แข่ง 50%+ (high) · CON-002 ไม่มีหน้าพื้นที่เลยทั้งที่เจาะจังหวัด (critical)
CON-003 บทความน้อยกว่าคู่แข่ง 50%+ (medium) · CON-004 ไม่มี FAQ (medium)
CON-005 มีคีย์เวิร์ด transactional ที่ไม่มีหน้ารองรับ (high)

## CMP — Competitor (M3)
CMP-001 คู่แข่งติด top10 ในคำที่เราไม่ติด ≥ 5 คำ (high) · CMP-002 คู่แข่งมีหน้าบริการที่เราไม่มี (high)
CMP-003 คู่แข่งยิง Ads แต่เราไม่ (medium)
