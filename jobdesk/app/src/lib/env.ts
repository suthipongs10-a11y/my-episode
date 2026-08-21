/**
 * ทุกค่าที่ผูกกับเครื่อง/บัญชี มาจาก environment variable เท่านั้น
 * ย้ายโฮสต์ = แก้ .env ไม่ใช่แก้โค้ด
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `ไม่ได้ตั้งค่า ${name} — คัดลอก .env.example เป็น .env.local แล้วใส่ค่าให้ครบ`,
    );
  }
  return v;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get appPassword() {
    return required("APP_PASSWORD");
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  get cacCeilingThb() {
    return Number(process.env.CAC_CEILING_THB ?? 300);
  },

  /** จำนวนวันก่อนหมดอายุที่จะเตือน เรียงจากไกลไปใกล้ */
  get reminderDays(): number[] {
    const raw = process.env.RENEWAL_REMINDER_DAYS ?? "30,14,7,1";
    const days = raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 0);
    return [...new Set(days)].sort((a, b) => b - a);
  },

  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },

  get telegram() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    return token && chatId ? { token, chatId } : null;
  },

  get line() {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const to = process.env.LINE_USER_ID;
    return token && to ? { token, to } : null;
  },
};
