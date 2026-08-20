#!/usr/bin/env node
/**
 * jobdesk db helper — ใช้ schema.sql เดียวกับที่ Supabase จะใช้
 *   node tools/db.mjs init    สร้างตารางทั้งหมด
 *   node tools/db.mjs seed    ใส่ข้อมูลตัวอย่างไว้ลองใช้
 *   node tools/db.mjs reset   ล้างแล้วสร้างใหม่ (ข้อมูลหายหมด)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

for (const f of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(f);
  } catch {
    /* ไม่มีไฟล์ก็ไม่เป็นไร — อาจตั้งค่าผ่าน environment โดยตรง */
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ไม่ได้ตั้งค่า DATABASE_URL — คัดลอก .env.example เป็น .env.local ก่อน");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, "..", "..", "schema.sql");
const command = process.argv[2] ?? "init";
const sql = postgres(url, { max: 1 });

const SEED = `
INSERT INTO customers (display_name, business_name, phone, line_id) VALUES
  ('คุณนก','ร้านกาแฟบ้านสวน','081-111-1111','baansuan'),
  ('ช่างเอก','อู่ช่างเอก','082-222-2222',NULL),
  ('หมอฟ้า','คลินิกทันตกรรมใจดี','083-333-3333','jaidee'),
  ('เฮียตี๋','ร้านอะไหล่ตี๋ยนต์','084-444-4444',NULL);

INSERT INTO jobs (customer_id, title, package, price_thb, status, waiting_on, status_since, due_on, delivered_on, hours_spent, revisions_used)
SELECT id, 'เว็บร้านกาแฟบ้านสวน', 'เว็บ 990', 990, 'delivered', 'nobody',
       now() - interval '10 days', CURRENT_DATE - 12, CURRENT_DATE - 10, 5, 1
  FROM customers WHERE display_name = 'คุณนก';

INSERT INTO jobs (customer_id, title, package, price_thb, status, waiting_on, status_since, due_on)
SELECT id, 'เว็บอู่ช่างเอก', 'เว็บ 990', 990, 'in_progress', 'us',
       now() - interval '2 days', CURRENT_DATE + 1
  FROM customers WHERE display_name = 'ช่างเอก';

INSERT INTO jobs (customer_id, title, package, price_thb, status, waiting_on, status_since, due_on)
SELECT id, 'เว็บคลินิกใจดี', 'เว็บ 990', 1490, 'client_review', 'client',
       now() - interval '6 days', CURRENT_DATE + 2
  FROM customers WHERE display_name = 'หมอฟ้า';

INSERT INTO jobs (customer_id, title, package, price_thb, status, waiting_on, status_since, due_on)
SELECT id, 'เว็บร้านอะไหล่ตี๋ยนต์', 'เว็บ 990', 990, 'awaiting_brief', 'client',
       now() - interval '9 days', CURRENT_DATE - 2
  FROM customers WHERE display_name = 'เฮียตี๋';

INSERT INTO payments (job_id, customer_id, kind, amount_thb, method, paid_on, status)
SELECT j.id, j.customer_id, 'full', 990, 'promptpay', CURRENT_DATE - 10, 'received'
  FROM jobs j WHERE j.title = 'เว็บร้านกาแฟบ้านสวน';

INSERT INTO payments (job_id, customer_id, kind, amount_thb, method, paid_on, status)
SELECT j.id, j.customer_id, 'deposit', 500, 'promptpay', CURRENT_DATE - 3, 'received'
  FROM jobs j WHERE j.title = 'เว็บอู่ช่างเอก';

INSERT INTO expenses (job_id, kind, description, amount_thb, spent_on)
SELECT j.id, 'theme_plugin', 'ธีม', 60, CURRENT_DATE - 11 FROM jobs j WHERE j.title = 'เว็บร้านกาแฟบ้านสวน';
INSERT INTO expenses (job_id, kind, description, amount_thb, spent_on)
SELECT j.id, 'transaction_fee', 'ค่าธรรมเนียมโอน', 10, CURRENT_DATE - 10 FROM jobs j WHERE j.title = 'เว็บร้านกาแฟบ้านสวน';
INSERT INTO expenses (kind, description, amount_thb, spent_on)
VALUES ('ads', 'ค่าโฆษณาเพจ', 3000, date_trunc('month', CURRENT_DATE)::date);

INSERT INTO activity_log (entity_type, entity_id, action, to_value, actor)
SELECT 'job', id, 'created', 'awaiting_brief', 'seed' FROM jobs;
`;

try {
  if (command === "reset") {
    await sql.unsafe("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    console.log("ล้างฐานข้อมูลแล้ว");
  }
  if (command === "init" || command === "reset") {
    await sql.unsafe(readFileSync(schemaPath, "utf8"));
    console.log("สร้างตารางจาก schema.sql แล้ว");
  }
  if (command === "seed") {
    await sql.unsafe(SEED);
    console.log("ใส่ข้อมูลตัวอย่างแล้ว");
  }
  if (!["init", "reset", "seed"].includes(command)) {
    console.error(`ไม่รู้จักคำสั่ง "${command}" — ใช้ init | seed | reset`);
    process.exitCode = 1;
  }
} finally {
  await sql.end();
}
