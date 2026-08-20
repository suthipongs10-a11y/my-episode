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
};
