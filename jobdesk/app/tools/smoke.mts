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
const { buildMessage } = await import("../src/lib/renewal-notify.js");

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${ok ? "" : `  — ได้ ${actual} ควรเป็น ${expected}`}`);
}

const tag = `smoke-${process.pid}`;
let customerId: number | undefined;
let jobId: number | undefined;
let websiteId: number | undefined;

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

  console.log("\nต่ออายุ");
  const [site] = await sql<{ id: number }[]>`
    INSERT INTO websites (customer_id, domain, domain_expires_on, hosting_expires_on,
                          renewal_cost_thb, renewal_price_thb)
    VALUES (${customerId!}, ${`${tag}.com`}, CURRENT_DATE + 7, CURRENT_DATE + 40, 450, 990)
    RETURNING id::int`;
  websiteId = site.id;

  const renewal = (await q.listRenewals()).find((r) => r.website_id === websiteId);
  check("วันหมดอายุใช้อันที่มาก่อนระหว่างโดเมนกับโฮสต์", renewal?.days_left, 7);
  check("กำไรต่ออายุ = ราคา − ต้นทุน", renewal?.renewal_profit, 540);

  const ladder = [30, 14, 7, 1];
  const isDue = async () =>
    (await q.dueReminders(ladder)).some((r) => r.website_id === websiteId);
  check("ถึงคิวเตือนที่ 7 วัน", await isDue(), true);
  check("ไม่ถึงคิวถ้าไม่มีขั้นที่ตรง", (await q.dueReminders([2, 3])).some((r) => r.website_id === websiteId), false);

  await q.markReminderSent(websiteId, renewal!.expires_on, 7, "test");
  check("เตือนแล้วไม่ถูกหยิบซ้ำ", await isDue(), false);

  // ต่ออายุ = วันหมดอายุขยับ ชุดเตือนของรอบใหม่ต้องกลับมาเอง
  await sql`UPDATE websites
              SET domain_expires_on = domain_expires_on + interval '1 year',
                  hosting_expires_on = hosting_expires_on + interval '1 year'
            WHERE id = ${websiteId}`;
  check("ต่ออายุแล้วรอบเตือนใหม่ยังไม่ถึงคิว (อีก 372 วัน)", await isDue(), false);
  await sql`UPDATE websites SET domain_expires_on = CURRENT_DATE + 14 WHERE id = ${websiteId}`;
  check("พอถึงขั้น 14 วันของรอบใหม่ กลับมาถูกหยิบอีกครั้ง", await isDue(), true);

  const declined = await sql`UPDATE websites SET renewal_status = 'declined' WHERE id = ${websiteId}`;
  void declined;
  check("ลูกค้าไม่ต่อแล้วไม่ต้องเตือน", await isDue(), false);
  await sql`UPDATE websites SET renewal_status = 'upcoming' WHERE id = ${websiteId}`;

  const rows2 = await q.dueReminders(ladder);
  const msg = buildMessage(rows2);
  check("ข้อความเตือนมีชื่อโดเมน", msg.includes(`${tag}.com`), true);
  check("ข้อความเตือนบอกจำนวนวัน", /อีก 14 วัน/.test(msg), true);

  const summary = await q.renewalSummary();
  check("สรุปนับเว็บนี้ด้วย", summary.active_sites >= 1, true);

  /* ---- ค่าโฆษณาต้องมีนิยามเดียว ไม่ว่าจะกรอกทางไหน ---------------------- */
  // เดือนนี้ในข้อมูลตัวอย่างมีแต่ ad_spend_daily — CPL กับกำไรต้องอ่านก้อนเดียวกัน
  const home = await q.getHomeSummary();
  const adSeries = await q.monthlySeries(2);
  const curMonth = adSeries[adSeries.length - 1];
  check("หน้าแรกกับหน้าการเงินคิดต้นทุนเดือนนี้ตรงกัน", home.cost_month, curMonth.cost);
  check("หน้าแรกกับหน้าการเงินคิดกำไรเดือนนี้ตรงกัน", home.profit_month, curMonth.profit);

  const [{ daily, viaExpense }] = await sql<{ daily: number; viaExpense: number }[]>`
    SELECT (SELECT COALESCE(sum(spend_thb),0) FROM ad_spend_daily
             WHERE spend_on >= date_trunc('month', CURRENT_DATE))::float8 AS daily,
           (SELECT COALESCE(sum(amount_thb),0) FROM expenses
             WHERE kind = 'ads' AND spent_on >= date_trunc('month', CURRENT_DATE))::float8 AS "viaExpense"
  `;
  const lead = await q.leadSummary();
  const expectedSpend = daily > 0 ? daily : viaExpense;
  check("CPL ใช้ค่าโฆษณาก้อนเดียวกับที่หักออกจากกำไร",
        lead.cpl, lead.month_in > 0 ? Number((expectedSpend / lead.month_in).toFixed(2)) : null);

  // ลงค่าโฆษณาเป็นรายจ่ายทับเดือนที่มีรายวันอยู่แล้ว ต้องไม่ถูกนับซ้ำ
  const [dup] = await sql<{ id: number }[]>`
    INSERT INTO expenses (kind, description, amount_thb, spent_on)
    VALUES ('ads', ${tag}, 999, date_trunc('month', CURRENT_DATE)::date) RETURNING id::int`;
  const afterDup = await q.getHomeSummary();
  check("ลงค่าโฆษณาซ้ำอีกทางแล้วต้นทุนไม่บวกเพิ่ม", afterDup.cost_month, home.cost_month);
  await sql`DELETE FROM expenses WHERE id = ${dup.id}`;

  // เดือนที่ไม่มีรายวันเลย ต้องถอยไปใช้รายจ่ายที่กรอกมือ
  const [{ prevAds }] = await sql<{ prevAds: number }[]>`
    SELECT COALESCE(sum(amount_thb),0)::float8 AS "prevAds" FROM expenses
     WHERE kind = 'ads' AND spent_on >= date_trunc('month', CURRENT_DATE) - interval '1 month'
       AND spent_on < date_trunc('month', CURRENT_DATE)`;
  const prevMonth = adSeries[adSeries.length - 2];
  check("เดือนที่ไม่มีข้อมูลรายแคมเปญ ยังนับค่าโฆษณาที่กรอกมือ",
        prevMonth.cost >= prevAds && prevAds > 0, true);

  const rows = await q.ledger("1900-01-01", "2999-12-31");
  check("ledger มีทั้งรายรับและรายจ่าย",
        new Set(rows.map((r) => r.direction)).size, 2);
  check("รายจ่ายใน ledger ติดลบ", rows.every((r) => r.direction !== "รายจ่าย" || r.amount < 0), true);

  // ยอดรวมในไฟล์ส่งออกต้องตรงกับหน้าการเงิน ไม่งั้นกระทบยอดไม่ได้
  const monthKey = new Date().toISOString().slice(0, 8) + "01";
  const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    .toISOString().slice(0, 10);
  const monthRows = await q.ledger(monthKey, lastDay);
  const ledgerCost = -monthRows
    .filter((r) => r.direction === "รายจ่าย")
    .reduce((n, r) => n + r.amount, 0);
  check("ยอดรายจ่ายในไฟล์ส่งออกตรงกับหน้าการเงิน",
        Math.round(ledgerCost), Math.round(curMonth.cost));
  check("ไฟล์ส่งออกมีรายการค่าโฆษณาจากแคมเปญด้วย",
        monthRows.some((r) => r.kind === "ads" && r.amount < 0), true);
} finally {
  if (websiteId) {
    await sql`DELETE FROM payments WHERE website_id = ${websiteId}`;
    await sql`DELETE FROM expenses WHERE website_id = ${websiteId}`;
    await sql`DELETE FROM websites WHERE id = ${websiteId}`;
  }
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
