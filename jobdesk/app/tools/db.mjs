#!/usr/bin/env node
/**
 * jobdesk db helper — ใช้ schema.sql เดียวกับที่ Supabase จะใช้
 *   node tools/db.mjs init      สร้างตารางทั้งหมด แล้วมาร์ค migration ว่ารันแล้ว
 *   node tools/db.mjs migrate   รันเฉพาะ migration ที่ยังไม่เคยรัน
 *   node tools/db.mjs seed      ใส่ข้อมูลตัวอย่างไว้ลองใช้
 *   node tools/db.mjs reset     ล้างแล้วสร้างใหม่ (ข้อมูลหายหมด)
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
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
const root = join(here, "..", "..");
const schemaPath = join(root, "schema.sql");
const migrationsDir = join(root, "migrations");
const command = process.argv[2] ?? "init";
const sql = postgres(url, { max: 1, onnotice: () => {} });

function migrationFiles() {
  if (!existsSync(migrationsDir)) return [];
  return readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
}

async function ensureMigrationTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}

async function applied() {
  const rows = await sql`SELECT filename FROM schema_migrations`;
  return new Set(rows.map((r) => r.filename));
}

const SEED = `
INSERT INTO customers (display_name, business_name, phone, line_id) VALUES
  ('คุณนก','ร้านกาแฟบ้านสวน','081-111-1111','baansuan'),
  ('ช่างเอก','อู่ช่างเอก','082-222-2222',NULL),
  ('หมอฟ้า','คลินิกทันตกรรมใจดี','083-333-3333','jaidee'),
  ('เฮียตี๋','ร้านอะไหล่ตี๋ยนต์','084-444-4444',NULL);

INSERT INTO jobs (customer_id, title, package, price_thb, status, waiting_on, status_since, due_on, delivered_on, hours_spent, revisions_used)
SELECT id, 'เว็บร้านกาแฟบ้านสวน', 'เว็บ 1990 สองภาษา', 1990, 'delivered', 'nobody',
       now() - interval '10 days', CURRENT_DATE - 12, CURRENT_DATE - 10, 5, 1
  FROM customers WHERE display_name = 'คุณนก';

INSERT INTO jobs (customer_id, title, package, price_thb, status, waiting_on, status_since, due_on)
SELECT id, 'เว็บอู่ช่างเอก', 'เว็บ 1990 สองภาษา', 1990, 'in_progress', 'us',
       now() - interval '2 days', CURRENT_DATE + 1
  FROM customers WHERE display_name = 'ช่างเอก';

INSERT INTO jobs (customer_id, title, package, price_thb, status, waiting_on, status_since, due_on)
SELECT id, 'เว็บคลินิกใจดี', 'เว็บ 1990 สองภาษา', 2490, 'client_review', 'client',
       now() - interval '6 days', CURRENT_DATE + 2
  FROM customers WHERE display_name = 'หมอฟ้า';

INSERT INTO jobs (customer_id, title, package, price_thb, status, waiting_on, status_since, due_on)
SELECT id, 'เว็บร้านอะไหล่ตี๋ยนต์', 'เว็บ 1990 สองภาษา', 1990, 'awaiting_brief', 'client',
       now() - interval '9 days', CURRENT_DATE - 2
  FROM customers WHERE display_name = 'เฮียตี๋';

INSERT INTO payments (job_id, customer_id, kind, amount_thb, method, paid_on, status)
SELECT j.id, j.customer_id, 'full', 1990, 'promptpay', CURRENT_DATE - 10, 'received'
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

-- เดือนก่อน ๆ ไว้ให้กราฟในหน้าการเงินมีอะไรให้ดู
INSERT INTO payments (customer_id, kind, amount_thb, method, paid_on, status)
SELECT (SELECT id FROM customers WHERE display_name = 'คุณนก'), 'full', v.amount, 'promptpay',
       (date_trunc('month', CURRENT_DATE) - (v.months || ' months')::interval)::date + 12, 'received'
  FROM (VALUES (1, 4470), (2, 2980), (3, 5460), (4, 1980), (5, 3970)) AS v(months, amount);
INSERT INTO expenses (kind, description, amount_thb, spent_on)
SELECT 'ads', 'ค่าโฆษณาเพจ', v.amount,
       (date_trunc('month', CURRENT_DATE) - (v.months || ' months')::interval)::date
  FROM (VALUES (1, 2400), (2, 1800), (3, 2600), (4, 1500), (5, 2100)) AS v(months, amount);

-- เว็บที่ดูแลอยู่ วันหมดอายุตั้งให้ตรงกับขั้นเตือน 7 และ 30 วัน เพื่อให้ทดลองงานเตือนได้
INSERT INTO websites (customer_id, origin_job_id, domain, url, registrar, hosting_provider,
                      domain_expires_on, hosting_expires_on, renewal_cost_thb, renewal_price_thb,
                      credential_ref)
SELECT c.id, j.id, 'baansuancoffee.com', 'https://baansuancoffee.com', 'Namecheap', 'Hostinger',
       CURRENT_DATE + 7, CURRENT_DATE + 40, 450, 990, 'Bitwarden: baansuancoffee'
  FROM customers c LEFT JOIN jobs j ON j.customer_id = c.id
 WHERE c.display_name = 'คุณนก' LIMIT 1;

INSERT INTO websites (customer_id, domain, registrar, domain_expires_on, hosting_expires_on,
                      renewal_cost_thb, renewal_price_thb)
SELECT id, 'changek-garage.com', 'Namecheap', CURRENT_DATE + 30, CURRENT_DATE + 30, 450, 990
  FROM customers WHERE display_name = 'ช่างเอก';

INSERT INTO websites (customer_id, domain, registrar, domain_expires_on, hosting_expires_on,
                      renewal_cost_thb, renewal_price_thb)
SELECT id, 'jaidee-dental.com', 'Cloudflare', CURRENT_DATE + 120, CURRENT_DATE + 150, 380, 1290
  FROM customers WHERE display_name = 'หมอฟ้า';

INSERT INTO websites (customer_id, domain, registrar, domain_expires_on,
                      renewal_cost_thb, renewal_price_thb)
SELECT id, 'teeyon-parts.com', 'Namecheap', CURRENT_DATE - 3, 450, 990
  FROM customers WHERE display_name = 'เฮียตี๋';

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
    await ensureMigrationTable();
    // schema.sql มีทุกอย่างที่ migration ทำไปแล้ว จึงมาร์คว่ารันแล้วเลย
    for (const f of migrationFiles()) {
      await sql`INSERT INTO schema_migrations (filename) VALUES (${f}) ON CONFLICT DO NOTHING`;
    }
    console.log("สร้างตารางจาก schema.sql แล้ว");
  }

  if (command === "migrate") {
    await ensureMigrationTable();
    const done = await applied();
    const pending = migrationFiles().filter((f) => !done.has(f));
    if (pending.length === 0) {
      console.log("ไม่มี migration ค้าง");
    }
    for (const f of pending) {
      await sql.unsafe(readFileSync(join(migrationsDir, f), "utf8"));
      await sql`INSERT INTO schema_migrations (filename) VALUES (${f})`;
      console.log(`รัน ${f} แล้ว`);
    }
  }

  if (command === "seed") {
    await sql.unsafe(SEED);
    console.log("ใส่ข้อมูลตัวอย่างแล้ว");
  }

  if (!["init", "reset", "seed", "migrate"].includes(command)) {
    console.error(`ไม่รู้จักคำสั่ง "${command}" — ใช้ init | migrate | seed | reset`);
    process.exitCode = 1;
  }
} finally {
  await sql.end();
}
