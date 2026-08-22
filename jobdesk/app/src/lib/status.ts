export const JOB_STATUSES = [
  "awaiting_brief",
  "in_progress",
  "client_review",
  "revising",
  "awaiting_final_payment",
  "delivered",
  "maintaining",
  "cancelled",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];
export type WaitingOn = "us" | "client" | "nobody";

type StatusMeta = { label: string; waiting: WaitingOn; hint: string };

/**
 * ธง waiting บอกว่าสถานะนี้ "รอเรา" หรือ "รอลูกค้า"
 * นี่คือกติกาที่หน้าแรกใช้แยกกล่อง "ต้องทำ" ออกจาก "ต้องทวง"
 */
export const JOB_STATUS: Record<JobStatus, StatusMeta> = {
  awaiting_brief: { label: "รอข้อมูลลูกค้า", waiting: "client", hint: "ต้องทวงข้อมูล ไม่ใช่ต้องทำ" },
  in_progress: { label: "กำลังทำ", waiting: "us", hint: "ถ้าค้างนาน แปลว่ารับงานเกินตัว" },
  client_review: { label: "รอลูกค้าตรวจ", waiting: "client", hint: "ต้องทวงให้ตรวจ" },
  revising: { label: "แก้ไข", waiting: "us", hint: "ระวังแก้ไม่จบ ดูจำนวนรอบแก้" },
  awaiting_final_payment: { label: "รอชำระส่วนที่เหลือ", waiting: "client", hint: "ทวงเงิน — เร่งด่วนที่สุด" },
  delivered: { label: "ส่งมอบแล้ว", waiting: "nobody", hint: "เข้าคิวต่ออายุปีหน้า" },
  maintaining: { label: "ดูแลอยู่", waiting: "nobody", hint: "" },
  cancelled: { label: "ยกเลิก", waiting: "nobody", hint: "" },
};

/** คอลัมน์บนบอร์ด เรียงตามลำดับที่งานเดินจริง งานยกเลิกไม่ขึ้นบอร์ด */
export const BOARD_COLUMNS: JobStatus[] = [
  "awaiting_brief",
  "in_progress",
  "client_review",
  "revising",
  "awaiting_final_payment",
  "delivered",
  "maintaining",
];

export const OPEN_STATUSES: JobStatus[] = [
  "awaiting_brief",
  "in_progress",
  "client_review",
  "revising",
  "awaiting_final_payment",
];

export function isJobStatus(v: unknown): v is JobStatus {
  return typeof v === "string" && (JOB_STATUSES as readonly string[]).includes(v);
}

export const PAYMENT_KINDS = {
  deposit: "มัดจำ",
  installment: "งวด",
  full: "เต็มจำนวน",
  renewal: "ค่าต่ออายุ",
  extra: "งานเพิ่ม",
} as const;

export const EXPENSE_KINDS = {
  ads: "ค่าโฆษณา",
  domain: "โดเมน",
  hosting: "โฮสติ้ง",
  theme_plugin: "ธีม / ปลั๊กอิน",
  stock_media: "รูป / ฟอนต์",
  subcontractor: "จ้างช่วง",
  transaction_fee: "ค่าธรรมเนียม",
  software: "ซอฟต์แวร์",
  other: "อื่น ๆ",
} as const;

export type PaymentKind = keyof typeof PAYMENT_KINDS;
export type ExpenseKind = keyof typeof EXPENSE_KINDS;

export const RENEWAL_STATUS = {
  upcoming: "รอถึงกำหนด",
  notified: "แจ้งลูกค้าแล้ว",
  paid: "ลูกค้าจ่ายแล้ว",
  declined: "ลูกค้าไม่ต่อ",
  lapsed: "ปล่อยหมดอายุ",
} as const;

export type RenewalStatus = keyof typeof RENEWAL_STATUS;

/* ------------------------------------------------------------------ leads */

export const LEAD_STATUSES = [
  "new",
  "talking",
  "quoted",
  "awaiting_deposit",
  "won",
  "ghosted",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS: Record<LeadStatus, { label: string; open: boolean }> = {
  new: { label: "ทักมา ยังไม่ตอบ", open: true },
  talking: { label: "คุยอยู่", open: true },
  quoted: { label: "เสนอราคาแล้ว", open: true },
  awaiting_deposit: { label: "รอโอนมัดจำ", open: true },
  won: { label: "ปิดได้", open: false },
  ghosted: { label: "เงียบหายไป", open: false },
  lost: { label: "ไม่เอา", open: false },
};

/** สถานะที่ยังต้องตามต่อ — ใช้แยกกล่องในหน้าคนทัก และนับบนหน้าแรก */
export const OPEN_LEAD_STATUSES: LeadStatus[] = LEAD_STATUSES.filter(
  (s) => LEAD_STATUS[s].open,
);

export const LEAD_LOST_REASON = {
  too_expensive: "แพงไป",
  diy: "ทำเอง",
  chose_competitor: "ไปเจ้าอื่น",
  not_ready: "ยังไม่พร้อม",
  wrong_fit: "ไม่ตรงกับที่ต้องการ",
  other: "อื่น ๆ",
} as const;

export type LeadLostReason = keyof typeof LEAD_LOST_REASON;

/** ช่องทางที่ทักเข้ามา — เก็บเป็น text ในฐานข้อมูล ตรงนี้คือรายการที่เลือกได้ */
export const LEAD_CHANNELS = {
  facebook_message: "ทักเพจ Facebook",
  facebook_comment: "คอมเมนต์ใต้โฆษณา",
  line: "LINE",
  phone: "โทรเข้า",
  referral: "คนแนะนำ",
  other: "อื่น ๆ",
} as const;

export type LeadChannel = keyof typeof LEAD_CHANNELS;

export function isLeadStatus(v: unknown): v is LeadStatus {
  return typeof v === "string" && (LEAD_STATUSES as readonly string[]).includes(v);
}

export function isLostReason(v: unknown): v is LeadLostReason {
  return typeof v === "string" && Object.hasOwn(LEAD_LOST_REASON, v);
}
