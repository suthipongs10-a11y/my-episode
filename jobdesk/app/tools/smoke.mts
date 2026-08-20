#!/usr/bin/env tsx
/**
 * ตรวจว่าชั้น query คิดเลขถูก โดยเรียกโค้ดตัวจริงที่หน้าเว็บใช้ ไม่ใช่ SQL ที่เขียนซ้ำ
 * รันกับฐานข้อมูล dev เท่านั้น — มันสร้างและลบข้อมูลของตัวเอง
 *   npm run smoke
 */
for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch { /* optional */ }
}

const { sql } = await import("../src/lib/db.js");
const q = await import("../src/lib/queries.js");
const { JOB_STATUS } = await import("../src/lib/status.js");

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${ok ? "" : `  — ได้ ${actual} ควรเป็น ${expected}`}`);
}

const tag = `smoke-${process.pid}`;
let customerId: number | undefined;
let jobId: number | undefined;

try {
  [{ id: customerId }] = await sql<{ id: number }[]>`
    INSERT INTO customers (display_name, note) VALUES (${tag}, 'smoke test') RETURNING id::int`;
  [{ id: jobId }] = await sql<{ id: number }[]>`
    INSERT INTO jobs (customer_id, title, package, price_thb, status, waiting_on, due_on)
    VALUES (${customerId}, ${tag}, 'เว็บ 990', 990, 'awaiting_brief', 'client', CURRENT_DATE + 3)
    RETURNING id::int`;

  console.log("\nงานเปล่า");
  let job = (await q.getJob(jobId))!;
  check("ราคาขาย 990", job.price, 990);
  check("ยังไม่ได้รับเงิน", job.received, 0);
  check("ค้างรับเท่าราคาขาย", job.outstanding, 990);
  check("กำไรขั้นต้นเท่าราคาขาย", job.gross_profit, 990);

  console.log("\nรับมัดจำ 500 และลงต้นทุน 60 + 10");
  await sql`INSERT INTO payments (job_id, customer_id, kind, amount_thb, paid_on, status)
            VALUES (${jobId}, ${customerId}, 'deposit', 500, CURRENT_DATE, 'received')`;
  await sql`INSERT INTO expenses (job_id, kind, amount_thb, spent_on)
            VALUES (${jobId}, 'theme_plugin', 60, CURRENT_DATE),
                   (${jobId}, 'transaction_fee', 10, CURRENT_DATE)`;
  job = (await q.getJob(jobId))!;
  check("รับแล้ว 500", job.received, 500);
  check("ค้างรับ 490", job.outstanding, 490);
  check("ต้นทุนตรง 70", job.direct_cost, 70);
  check("กำไรขั้นต้น 920", job.gross_profit, 920);

  console.log("\nรายการที่ยกเลิกไม่ควรถูกนับเป็นค้างรับ");
  const before = (await q.getHomeSummary()).outstanding;
  await sql`UPDATE jobs SET status = 'cancelled' WHERE id = ${jobId}`;
  const after = (await q.getHomeSummary()).outstanding;
  check("ค้างรับลดลง 490", Math.round(before - after), 490);
  await sql`UPDATE jobs SET status = 'awaiting_brief' WHERE id = ${jobId}`;

  console.log("\nธง waiting ตรงกับสถานะทุกตัว");
  for (const [status, meta] of Object.entries(JOB_STATUS)) {
    await sql`UPDATE jobs SET status = ${status}::job_status,
                              waiting_on = ${meta.waiting}::waiting_on WHERE id = ${jobId}`;
    const row = (await q.getJob(jobId))!;
    check(`${meta.label} → รอ${meta.waiting}`, row.waiting_on, meta.waiting);
  }

  console.log("\nรายชื่อลูกค้ารวมยอดที่จ่ายมาแล้ว");
  const found = (await q.listCustomers(tag)).find((c) => c.id === customerId);
  check("ค้นหาเจอ", found?.display_name, tag);
  check("จ่ายมาแล้ว 500", found?.paid_total, 500);
  check("มี 1 งาน", found?.job_count, 1);
} finally {
  if (jobId) {
    await sql`DELETE FROM payments WHERE job_id = ${jobId}`;
    await sql`DELETE FROM expenses WHERE job_id = ${jobId}`;
    await sql`DELETE FROM jobs WHERE id = ${jobId}`;
  }
  if (customerId) await sql`DELETE FROM customers WHERE id = ${customerId}`;
  await sql.end();
}

console.log(failures === 0 ? "\nผ่านทั้งหมด" : `\nไม่ผ่าน ${failures} ข้อ`);
process.exit(failures === 0 ? 0 : 1);
