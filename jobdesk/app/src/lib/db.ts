import postgres from "postgres";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __jobdeskSql: postgres.Sql | undefined;
}

/**
 * ตัวเชื่อมฐานข้อมูลตัวเดียวทั้งแอป — เก็บไว้บน globalThis เพราะ dev server
 * โหลดโมดูลซ้ำทุกครั้งที่แก้ไฟล์ ถ้าไม่เก็บจะเปิด connection ทิ้งไว้เรื่อย ๆ
 */
export const sql: postgres.Sql =
  globalThis.__jobdeskSql ??
  postgres(env.databaseUrl, {
    max: 5,
    idle_timeout: 20,
    // เวลาในระบบเป็นเวลาไทยทั้งหมด
    connection: { timezone: "Asia/Bangkok" },
  });

if (process.env.NODE_ENV !== "production") globalThis.__jobdeskSql = sql;
