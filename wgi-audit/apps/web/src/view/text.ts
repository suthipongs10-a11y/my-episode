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
    home: "งานตรวจ",
    newAudit: "ตรวจเว็บใหม่",
    back: "← กลับหน้ารายการ",
    openReport: "เปิดรายงานสำหรับลูกค้า",
    print: "พิมพ์ / บันทึกเป็น PDF",
    operatorView: "← กลับไปหน้าของเรา",
    brandSub: "เครื่องมือหาลูกค้าจากเว็บที่ยังไม่ทำงาน",
    signedIn: "ล็อกอินอยู่",
  },

  login: {
    title: "เข้าสู่ระบบ",
    password: "รหัสผ่าน",
    submit: "เข้าสู่ระบบ",
    wrong: "รหัสผ่านไม่ถูกต้อง",
    throttled: "ใส่ผิดหลายครั้งเกินไป รอสักครู่แล้วลองใหม่",
    logout: "ออกจากระบบ",
  },

  form: {
    title: "ตรวจเว็บใหม่",
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

  kpi: {
    total: "งานตรวจทั้งหมด",
    running: "กำลังตรวจ",
    hot: "โอกาสสูง",
    hotSub: "โอกาส ≥ 70",
    spend: "ต้นทุนรวม",
    baht: "บาท",
    findings: "ที่ต้องแก้",
    critical: "วิกฤต",
    quickWins: "Quick wins",
    effort: "ชั่วโมงงานรวม",
    pages: "จำนวนหน้า",
    cost: "ต้นทุนงานนี้",
  },

  list: {
    title: "งานตรวจทั้งหมด",
    count: (n: number) => `${n} งาน`,
    search: "ค้นหาโดเมนหรือพื้นที่…",
    sortHint: "กดหัวตารางเพื่อเรียง",
    empty: "ยังไม่มีงานตรวจ — ใส่โดเมนด้านบนแล้วกดเริ่มตรวจได้เลย",
    noMatch: "ไม่มีงานที่ตรงกับคำค้น",
    colDomain: "โดเมน",
    colArea: "พื้นที่",
    colWhen: "เมื่อ",
    colScore: "คะแนนเว็บ",
    colOpportunity: "โอกาส",
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
  coverageNote: (pct: number) =>
    pct >= 100
      ? "วัดครบทุกหมวดแล้ว"
      : `คะแนนรวมคิดจากหมวดที่วัดได้จริงเท่านั้น (${pct}% ของน้ำหนัก) — ที่เหลือต้องต่อ API ก่อน`,
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
    scoreTitle: "คะแนนเว็บ",
    scoreNote: "มุมของลูกค้า — ตัวเลขนี้อยู่ในรายงาน",
    findingsTitle: "สิ่งที่ต้องแก้ เรียงตามความคุ้มค่า",
    findingsNote: "เรียงจากผลกระทบต่อชั่วโมงที่ต้องลงแรง — แก้จากบนลงล่างได้เลย",
    evidence: "ดูหลักฐาน",
    pagesTitle: "หน้าที่ตรวจ",
    keywordsTitle: "คำค้นหา",
    competitorsTitle: "คู่แข่ง",
    spendTitle: "ต้นทุนของงานนี้",
    noFindings: "ไม่พบปัญหา — ตรวจสอบว่า crawl ได้จริงหรือเปล่า",
    byCategoryTitle: "ปัญหาอยู่ตรงไหนบ้าง",
    byCategoryNote: "แท่งยาวที่สุดคือหมวดที่ควรเสนอขายก่อน",
    totalEffort: "ชั่วโมงงานรวม",
    pagesCrawled: "จำนวนหน้า",
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
    checkedOn: "ตรวจเมื่อ",
  },

  opportunity: {
    title: "โอกาสในการขาย",
    note: "มุมของเรา ไม่ใช่ของลูกค้า — ตัวเลขนี้ไม่ไปโผล่ในรายงาน",
    /** The nine rows, worded exactly as the operator scores them by hand. */
    signals: {
      ads: "กำลังยิง Ads",
      conversion: "Website มีปัญหา Conversion",
      mobile: "Mobile มีปัญหา",
      seo: "SEO อ่อน",
      landing: "ไม่มี Landing Page",
      gbp: "GBP Active",
      facebook: "Facebook Active",
      reviews: "มี Review จำนวนมาก",
      branches: "มีหลายสาขา",
    } as Record<string, string>,
    signalHead: "Signal",
    pointsHead: "คะแนน",
    total: "รวม",
    status: {
      hit: "พบ",
      partial: "พบบางส่วน",
      miss: "ไม่พบ",
      unmeasured: "ยังไม่ได้วัด",
    } as Record<string, string>,
    coverageNote: (max: number) =>
      max >= 100
        ? "ให้คะแนนครบทั้งตาราง"
        : `แถวที่ยังไม่ได้วัดไม่ถูกนับ — คะแนนคิดเทียบจาก ${max} ไม่ใช่ 100`,
    open: "เปิดดู",
    pitch: {
      ads_leak: "ยิง Ads อยู่แต่เว็บรับไม่ได้ — เงินรั่วทุกวัน",
      cannot_be_contacted: "ลูกค้าอยากทักแต่ไม่มีทางติดต่อ",
      invisible: "Google มองไม่เห็นธุรกิจนี้",
      fix_list: "มีรายการแก้ชัดเจน เสนอเป็นแพ็กเกจได้",
      not_a_lead: "ไม่ใช่ลูกค้าเป้าหมาย",
    } as Record<string, string>,
    pitchLabel: "มุมที่ควรเปิดเรื่อง",
    band: {
      hot: "น่าติดต่อ",
      warm: "พอมีโอกาส",
      cold: "ยังไม่น่าลงแรง",
    },
    quickWins: "Quick wins — แก้ได้ในสัปดาห์นี้",
    quickWinsNote: "ผลกระทบสูง ใช้เวลาน้อย เรียงตามผลต่อชั่วโมง",
    noQuickWins: "ไม่มีข้อไหนที่ทั้งผลสูงและใช้เวลาน้อย",
    leverage: "ผล/ชม.",
    adsYes: "ยิง Ads อยู่",
    adsMaybe: "อาจยิง Ads (มี GTM)",
    adsNo: "ไม่พบสัญญาณโฆษณา",
    socialTitle: "ช่องทางอื่นที่พบ",
    activity: {
      parked: "โดเมนว่าง / หน้า placeholder",
      stale: (year: number) => `ปีลิขสิทธิ์ท้ายเว็บ ${year}`,
    },
    oldSnapshot: "งานนี้ให้คะแนนด้วยสูตรเก่า — รันใหม่เพื่อดูตารางสัญญาณ",
  },

  brief: {
    title: "สรุปสำหรับส่งต่อ",
    note: "รวบรวมไว้ให้ก็อปไปใส่อีเมลหรือ LINE เอง — ระบบไม่ส่งให้ใครทั้งนั้น (กฎข้อ 8)",
    copy: "คัดลอกทั้งหมด",
    copied: "คัดลอกแล้ว",
    heading: (domain: string, date: string) => `${domain} — สรุปจาก WGI Audit (${date})`,
    pitchLine: "มุมเปิดเรื่อง",
    scoreLine: (opportunity: number, overall: number | null, findings: number, critical: number) =>
      `โอกาส ${opportunity}/100 · คะแนนเว็บ ${overall === null ? "—" : `${overall}/100`} · ปัญหา ${findings} เรื่อง (วิกฤต ${critical})`,
    signalsFound: "สัญญาณที่พบ",
    signalsNone: "ไม่พบสัญญาณที่ให้คะแนนได้",
    quickWinsTitle: "Quick wins (แก้ได้ในสัปดาห์นี้)",
    quickWinsNone: "ไม่มีข้อที่แก้เร็วและได้ผลมาก",
    contactFound: "ช่องทางติดต่อที่พบบนเว็บ",
    tel: "โทร",
    line: "LINE",
    facebook: "Facebook",
    yes: "มี",
    no: "ไม่มี",
    attach: "รายงานฉบับลูกค้า: เปิดหน้ารายงาน แล้วกด “พิมพ์ / บันทึกเป็น PDF” เพื่อแนบ",
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
