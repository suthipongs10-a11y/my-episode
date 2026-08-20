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
  // ลูปข้างบนจบที่ 'cancelled' — คืนสถานะก่อน มิฉะนั้นการตรวจข้างล่างจะเห็นงานที่ถูกยกเลิก
  await sql`UPDATE jobs SET status = 'awaiting_brief', waiting_on = 'client' WHERE id = ${jobId}`;

  console.log("\nรายชื่อลูกค้ารวมยอดที่จ่ายมาแล้ว");
  const found = (await q.listCustomers(tag)).find((c) => c.id === customerId);
  check("ค้นหาเจอ", found?.display_name, tag);
  check("จ่ายมาแล้ว 500", found?.paid_total, 500);
  check("มี 1 งาน", found?.job_count, 1);

  console.log("\nเช็กลิสต์");
  await sql`INSERT INTO job_tasks (job_id, title, position) VALUES
    (${jobId}, 'ข้อหนึ่ง', 0), (${jobId}, 'ข้อสอง', 1), (${jobId}, 'ข้อสาม', 2)`;
  let tasks = await q.listTasks(jobId);
  check("มี 3 ข้อ เรียงตาม position", tasks.map((t) => t.title).join(","), "ข้อหนึ่ง,ข้อสอง,ข้อสาม");
  await sql`UPDATE job_tasks SET done_at = now() WHERE job_id = ${jobId} AND position < 2`;
  job = (await q.getJob(jobId))!;
  check("ความคืบหน้าติดมากับงาน 2/3", `${job.task_done}/${job.task_total}`, "2/3");

  console.log("\nบันทึกและไฟล์แนบ");
  const [note] = await sql<{ id: number }[]>`
    INSERT INTO notes (job_id, body) VALUES (${jobId}, 'ลูกค้าขอเปลี่ยนสี') RETURNING id::int`;
  const bytes = Buffer.from("ไฟล์ทดสอบ", "utf8");
  await sql`INSERT INTO attachments (note_id, filename, mime_type, byte_size, data)
            VALUES (${note.id}, 'slip.png', 'image/png', ${bytes.byteLength}, ${bytes})`;
  const notes = await q.listNotes(jobId);
  check("มี 1 บันทึก", notes.length, 1);
  check("บันทึกพกไฟล์แนบมาด้วย", notes[0]?.files.length, 1);
  check("ชื่อไฟล์ถูกต้อง", notes[0]?.files[0]?.filename, "slip.png");
  const fetched = await q.getAttachment(notes[0].files[0].id);
  check("อ่านไฟล์กลับมาได้ตรงกับที่เก็บ", fetched?.data.toString("utf8"), "ไฟล์ทดสอบ");
  await sql`DELETE FROM notes WHERE id = ${note.id}`;
  const [{ orphans }] = await sql<{ orphans: number }[]>`
    SELECT count(*)::int AS orphans FROM attachments WHERE note_id = ${note.id}`;
  check("ลบบันทึกแล้วไฟล์แนบหายตามไปด้วย", orphans, 0);

  console.log("\nหน้าการเงิน");
  const series = await q.monthlySeries(12);
  check("ได้ครบ 12 เดือน", series.length, 12);
  const thisMonth = series[series.length - 1];
  check("กำไร = รายรับ − รายจ่าย", Math.round(thisMonth.profit),
        Math.round(thisMonth.revenue - thisMonth.cost));
  const owed = await q.listOutstanding();
  const mine = owed.find((r) => r.job_id === jobId);
  check("งานนี้อยู่ในรายการค้างรับ 490", mine?.outstanding, 490);
  await sql`UPDATE jobs SET status = 'cancelled' WHERE id = ${jobId}`;
  check("ยกเลิกแล้วหลุดจากรายการค้างรับ",
        (await q.listOutstanding()).some((r) => r.job_id === jobId), false);
  await sql`UPDATE jobs SET status = 'awaiting_brief' WHERE id = ${jobId}`;

  const rows = await q.ledger("1900-01-01", "2999-12-31");
  check("ledger มีทั้งรายรับและรายจ่าย",
        new Set(rows.map((r) => r.direction)).size, 2);
  check("รายจ่ายใน ledger ติดลบ", rows.every((r) => r.direction !== "รายจ่าย" || r.amount < 0), true);
} finally {
  if (jobId) {
    await sql`DELETE FROM job_tasks WHERE job_id = ${jobId}`;
    await sql`DELETE FROM notes WHERE job_id = ${jobId}`;
    await sql`DELETE FROM payments WHERE job_id = ${jobId}`;
    await sql`DELETE FROM expenses WHERE job_id = ${jobId}`;
    await sql`DELETE FROM jobs WHERE id = ${jobId}`;
  }
  if (customerId) await sql`DELETE FROM customers WHERE id = ${customerId}`;
  await sql.end();
}

console.log(failures === 0 ? "\nผ่านทั้งหมด" : `\nไม่ผ่าน ${failures} ข้อ`);
process.exit(failures === 0 ? 0 : 1);
