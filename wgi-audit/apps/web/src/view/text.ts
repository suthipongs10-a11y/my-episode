/**
 * Thai text for the dashboard.
 *
 * Separate from `core/i18n/th.ts` on purpose: that file is the *product's*
 * wording — finding titles and fixes, which end up in front of a customer and
 * must not be edited casually. This one is UI chrome, changed freely.
 *
 * Two audiences are mixed in this file and the distinction matters:
 * `verdict` and `categories` are read by the client on a printed report;
 * everything else is read only by the operator.
 */
export const thWeb = {
  app: "WGI Audit",
  tagline: "ตรวจเว็บลูกค้า แล้วรู้ว่าจะขายอะไรได้",

  nav: {
    back: "← กลับหน้ารายการ",
    openReport: "เปิดรายงานสำหรับลูกค้า →",
    print: "พิมพ์ / บันทึกเป็น PDF",
    operatorView: "← กลับไปหน้าของเรา",
  },

  form: {
    domain: "โดเมนของลูกค้า",
    domainHint: "เช่น phuketmaidservice.com",
    area: "พื้นที่ให้บริการ",
    areaHint: "เช่น ภูเก็ต",
    scope: "ขอบเขต",
    scopeProvince: "เจาะจังหวัด",
    scopeDistrict: "เจาะอำเภอ/ตำบล",
    scopeNationwide: "ทั่วประเทศ",
    submit: "เริ่มตรวจ",
    errorDomain: "ต้องใส่โดเมน",
    errorArea: "ต้องใส่พื้นที่ หรือเลือก “ทั่วประเทศ”",
  },

  list: {
    title: "งานตรวจทั้งหมด",
    empty: "ยังไม่มีงานตรวจ — ใส่โดเมนด้านบนแล้วกดเริ่มตรวจได้เลย",
    colDomain: "โดเมน",
    colArea: "พื้นที่",
    colWhen: "เมื่อ",
    colScore: "คะแนน",
    colFindings: "ที่ต้องแก้",
    colCritical: "วิกฤต",
    colCost: "ต้นทุน",
    colStatus: "สถานะ",
  },

  status: {
    queued: "รอคิว",
    running: "กำลังตรวจ",
    done: "เสร็จแล้ว",
    failed: "ไม่สำเร็จ",
  },

  severity: {
    critical: "วิกฤต",
    high: "สูง",
    medium: "กลาง",
    low: "ต่ำ",
  },

  categories: {
    overall: "คะแนนรวม",
    conversion: "เปลี่ยนคนดูเป็นคนทัก",
    local: "การมองเห็นในพื้นที่",
    content: "เนื้อหา",
    visibility: "อันดับใน Google",
    onpage: "โครงสร้างหน้าเว็บ",
    technical: "เทคนิคและความเร็ว",
  } as Record<string, string>,

  notMeasured: "ยังไม่ได้วัด",
  notMeasuredWhy: {
    local: "ต้องต่อ Google Places ก่อน",
    visibility: "ต้องต่อ DataForSEO ก่อน",
    content: "ต้องมีข้อมูลคู่แข่งก่อน",
  } as Record<string, string>,

  run: {
    progress: "ความคืบหน้า",
    waiting: "รอ worker หยิบงาน…",
    workerHint: "ถ้าค้างอยู่ตรงนี้นาน แปลว่ายังไม่มี worker รันอยู่",
    failed: "การตรวจไม่สำเร็จ",
    scoreTitle: "คะแนน",
    findingsTitle: "สิ่งที่ต้องแก้ เรียงตามความคุ้มค่า",
    findingsNote: "เรียงจากผลกระทบต่อชั่วโมงที่ต้องลงแรง — แก้จากบนลงล่างได้เลย",
    evidence: "ดูหลักฐาน",
    pagesTitle: "หน้าที่ตรวจ",
    keywordsTitle: "คำค้นหา",
    competitorsTitle: "คู่แข่ง",
    spendTitle: "ต้นทุนของงานนี้",
    noFindings: "ไม่พบปัญหา — ตรวจสอบว่า crawl ได้จริงหรือเปล่า",
    noKeywords: "ยังไม่มีคำค้นหา",
    noCompetitors: "ยังไม่พบคู่แข่ง — ต้องต่อ DataForSEO ก่อน",
    effort: "แรงที่ต้องใช้",
    hours: "ชม.",
    pageTypes: {
      home: "หน้าแรก", service: "หน้าบริการ", location: "หน้าพื้นที่",
      article: "บทความ", faq: "คำถามที่พบบ่อย", contact: "ติดต่อ",
      about: "เกี่ยวกับเรา", other: "อื่น ๆ",
    } as Record<string, string>,
    colTerm: "คำค้นหา",
    colVolume: "ค้นหา/เดือน",
    colPosition: "อันดับเรา",
    colIntent: "เจตนา",
    notRanking: "ไม่ติด 100 อันดับ",
    notChecked: "ยังไม่ได้เช็ค",
    colProvider: "บริการ",
    colCalls: "เรียก",
    colCached: "ใช้แคช",
    colCost: "บาท",
    freeRun: "งานนี้ไม่มีค่าใช้จ่าย — ยังไม่ได้ต่อ API ที่เสียเงิน",
  },

  report: {
    title: (domain: string) => `รายงานตรวจเว็บไซต์ ${domain}`,
    forClient: "รายงานสำหรับ",
    preparedOn: "วันที่ตรวจ",
    summary: "สรุป",
    whatToFix: "สิ่งที่ควรแก้ก่อน",
    andMore: (n: number) => `และอีก ${n} รายการที่พบ แต่ยังไม่เร่งด่วนเท่านี้`,
    disclaimer:
      "รายงานนี้วิเคราะห์จากข้อมูลสาธารณะที่เข้าถึงได้ ณ วันที่ตรวจ "
      + "เป็นการประเมินโอกาส ไม่ใช่การรับประกันอันดับใน Google",
  },

  verdict: {
    bad: "เว็บนี้กำลังเสียลูกค้าอยู่ทุกวัน",
    weak: "เว็บใช้งานได้ แต่ยังไม่ทำงานแทนคุณ",
    ok: "พื้นฐานดีแล้ว เหลือจุดที่ทำให้ดีขึ้นได้อีก",
    good: "เว็บอยู่ในเกณฑ์ดี",
  },
  verdictNote: (critical: number, total: number) =>
    critical > 0
      ? `พบเรื่องระดับวิกฤต ${critical} เรื่อง จากทั้งหมด ${total} เรื่อง — เริ่มจากรายการแรกก่อน`
      : `พบสิ่งที่ควรปรับ ${total} เรื่อง ไม่มีเรื่องระดับวิกฤต`,
} as const;
