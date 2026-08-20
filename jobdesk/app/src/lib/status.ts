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
