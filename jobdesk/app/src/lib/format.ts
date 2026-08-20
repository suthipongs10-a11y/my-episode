/**
 * วันที่ใช้ปี ค.ศ. ให้ตรงกับเอกสารออกแบบ
 * ถ้าอยากได้ พ.ศ. เปลี่ยน locale เป็น "th-TH" (ปฏิทินพุทธเป็นค่าตั้งต้นของ th-TH)
 */
const LOCALE = "th-TH-u-ca-gregory";
const TZ = "Asia/Bangkok";

const baht = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const bahtExact = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortDate = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone: TZ });
const fullDate = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
const dateTime = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ,
});

export function thb(n: number | null | undefined, exact = false): string {
  if (n === null || n === undefined) return "—";
  return (exact ? bahtExact : baht).format(n);
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return fullDate.format(new Date(d));
}

export function fmtDay(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return shortDate.format(new Date(d));
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateTime.format(new Date(d));
}

/** จำนวนวันเต็มจาก d ถึงวันนี้ — บวกคือผ่านมาแล้ว */
export function daysSince(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const then = new Date(d).getTime();
  return Math.floor((Date.now() - then) / 86_400_000);
}

/** จำนวนวันจากวันนี้ถึง d — ลบคือเลยกำหนดแล้ว */
export function daysUntil(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  return -(daysSince(d) ?? 0);
}

export function stallLabel(days: number | null): string {
  if (days === null) return "";
  if (days <= 0) return "วันนี้";
  if (days === 1) return "1 วัน";
  return `${days} วัน`;
}

/** ค่าที่ input type=date ต้องการ (YYYY-MM-DD) ตามเวลาไทย */
export function dateInputValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });
}

export function todayInputValue(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}
