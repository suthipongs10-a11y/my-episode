"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "./db";
import { signIn, signOut, requireSession } from "./auth";
import { JOB_STATUS, isJobStatus, type JobStatus } from "./status";
import { templateFor } from "./templates";

/* ------------------------------------------------------------------ utils */

function text(fd: FormData, name: string): string | null {
  const v = fd.get(name);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function required(fd: FormData, name: string, label: string): string {
  const v = text(fd, name);
  if (!v) throw new Error(`กรุณากรอก${label}`);
  return v;
}

function money(fd: FormData, name: string, label: string): number {
  const raw = text(fd, name);
  const n = Number(raw?.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) throw new Error(`${label}ต้องเป็นตัวเลขไม่ติดลบ`);
  return n;
}

function optionalNumber(fd: FormData, name: string): number | null {
  const raw = text(fd, name);
  if (raw === null) return null;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function id(fd: FormData, name: string): number {
  const n = Number(text(fd, name));
  if (!Number.isInteger(n) || n <= 0) throw new Error("อ้างอิงรายการไม่ถูกต้อง");
  return n;
}

async function log(
  entityType: string,
  entityId: number,
  action: string,
  from: string | null = null,
  to: string | null = null,
) {
  await sql`
    INSERT INTO activity_log (entity_type, entity_id, action, from_value, to_value, actor)
    VALUES (${entityType}, ${entityId}, ${action}, ${from}, ${to}, 'owner')
  `;
}

function refreshJobViews(jobId?: number) {
  revalidatePath("/");
  revalidatePath("/board");
  revalidatePath("/customers");
  if (jobId) revalidatePath(`/jobs/${jobId}`);
}

/* ------------------------------------------------------------------- auth */

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const password = fd.get("password");
  if (typeof password !== "string" || !(await signIn(password))) {
    return { error: "รหัสผ่านไม่ถูกต้อง" };
  }
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect("/login");
}

/* -------------------------------------------------------------- customers */

export async function createCustomerAction(fd: FormData): Promise<void> {
  await requireSession();
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO customers (display_name, business_name, phone, line_id, facebook_url, note)
    VALUES (
      ${required(fd, "display_name", "ชื่อลูกค้า")},
      ${text(fd, "business_name")},
      ${text(fd, "phone")},
      ${text(fd, "line_id")},
      ${text(fd, "facebook_url")},
      ${text(fd, "note")}
    )
    RETURNING id::int
  `;
  await log("customer", row.id, "created");
  revalidatePath("/customers");
  redirect(`/customers/${row.id}`);
}

export async function updateCustomerAction(fd: FormData): Promise<void> {
  await requireSession();
  const customerId = id(fd, "customer_id");
  await sql`
    UPDATE customers SET
      display_name  = ${required(fd, "display_name", "ชื่อลูกค้า")},
      business_name = ${text(fd, "business_name")},
      phone         = ${text(fd, "phone")},
      line_id       = ${text(fd, "line_id")},
      facebook_url  = ${text(fd, "facebook_url")},
      note          = ${text(fd, "note")},
      updated_at    = now()
    WHERE id = ${customerId}
  `;
  await log("customer", customerId, "updated");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

/* ------------------------------------------------------------------- jobs */

export async function createJobAction(fd: FormData): Promise<void> {
  await requireSession();

  let customerId: number;
  const existing = text(fd, "customer_id");
  if (existing && existing !== "new") {
    customerId = Number(existing);
  } else {
    const [c] = await sql<{ id: number }[]>`
      INSERT INTO customers (display_name, business_name, phone)
      VALUES (
        ${required(fd, "new_customer_name", "ชื่อลูกค้า")},
        ${text(fd, "new_customer_business")},
        ${text(fd, "new_customer_phone")}
      )
      RETURNING id::int
    `;
    customerId = c.id;
    await log("customer", customerId, "created");
  }

  const [job] = await sql<{ id: number }[]>`
    INSERT INTO jobs (customer_id, title, package, price_thb, due_on, note,
                      revisions_included, status, waiting_on, status_since)
    VALUES (
      ${customerId},
      ${required(fd, "title", "ชื่องาน")},
      ${text(fd, "package")},
      ${money(fd, "price_thb", "ราคาขาย")},
      ${text(fd, "due_on")},
      ${text(fd, "note")},
      ${optionalNumber(fd, "revisions_included") ?? 2},
      'awaiting_brief', 'client', now()
    )
    RETURNING id::int
  `;
  await insertTemplateTasks(job.id, text(fd, "package"));
  await log("job", job.id, "created", null, "awaiting_brief");
  refreshJobViews(job.id);
  redirect(`/jobs/${job.id}`);
}

export async function setJobStatusAction(fd: FormData): Promise<void> {
  await requireSession();
  const jobId = id(fd, "job_id");
  const next = text(fd, "status");
  if (!isJobStatus(next)) throw new Error("สถานะไม่ถูกต้อง");

  const [current] = await sql<{ status: JobStatus }[]>`
    SELECT status::text FROM jobs WHERE id = ${jobId}
  `;
  if (!current) throw new Error("ไม่พบงานนี้");
  if (current.status === next) return;

  await sql`
    UPDATE jobs SET
      status       = ${next}::job_status,
      waiting_on   = ${JOB_STATUS[next].waiting}::waiting_on,
      status_since = now(),
      started_on   = CASE WHEN started_on IS NULL AND ${next} = 'in_progress'
                          THEN CURRENT_DATE ELSE started_on END,
      delivered_on = CASE WHEN delivered_on IS NULL AND ${next} = 'delivered'
                          THEN CURRENT_DATE ELSE delivered_on END,
      updated_at   = now()
    WHERE id = ${jobId}
  `;
  await log("job", jobId, "status_changed", current.status, next);
  refreshJobViews(jobId);
}

export async function updateJobAction(fd: FormData): Promise<void> {
  await requireSession();
  const jobId = id(fd, "job_id");
  await sql`
    UPDATE jobs SET
      title              = ${required(fd, "title", "ชื่องาน")},
      package            = ${text(fd, "package")},
      price_thb          = ${money(fd, "price_thb", "ราคาขาย")},
      due_on             = ${text(fd, "due_on")},
      revisions_used     = ${optionalNumber(fd, "revisions_used") ?? 0},
      revisions_included = ${optionalNumber(fd, "revisions_included") ?? 2},
      hours_spent        = ${optionalNumber(fd, "hours_spent")},
      note               = ${text(fd, "note")},
      updated_at         = now()
    WHERE id = ${jobId}
  `;
  await log("job", jobId, "updated");
  refreshJobViews(jobId);
  redirect(`/jobs/${jobId}`);
}

/* ----------------------------------------------------------------- money */

export async function addPaymentAction(fd: FormData): Promise<void> {
  await requireSession();
  const jobId = id(fd, "job_id");
  const [job] = await sql<{ customer_id: number }[]>`
    SELECT customer_id::int FROM jobs WHERE id = ${jobId}
  `;
  if (!job) throw new Error("ไม่พบงานนี้");

  const amount = money(fd, "amount_thb", "จำนวนเงิน");
  await sql`
    INSERT INTO payments (job_id, customer_id, kind, amount_thb, method, paid_on, status)
    VALUES (
      ${jobId}, ${job.customer_id},
      ${required(fd, "kind", "ประเภท")}::payment_kind,
      ${amount},
      ${text(fd, "method")},
      ${text(fd, "paid_on")},
      'received'
    )
  `;
  await log("job", jobId, "payment_added", null, String(amount));
  refreshJobViews(jobId);
  redirect(`/jobs/${jobId}`);
}

export async function addExpenseAction(fd: FormData): Promise<void> {
  await requireSession();
  const jobId = id(fd, "job_id");
  const amount = money(fd, "amount_thb", "จำนวนเงิน");
  await sql`
    INSERT INTO expenses (job_id, kind, description, amount_thb, vendor, spent_on)
    VALUES (
      ${jobId},
      ${required(fd, "kind", "ประเภท")}::expense_kind,
      ${text(fd, "description")},
      ${amount},
      ${text(fd, "vendor")},
      ${text(fd, "spent_on") ?? new Date().toISOString().slice(0, 10)}
    )
  `;
  await log("job", jobId, "expense_added", null, String(amount));
  refreshJobViews(jobId);
  redirect(`/jobs/${jobId}`);
}

export async function deletePaymentAction(fd: FormData): Promise<void> {
  await requireSession();
  const jobId = id(fd, "job_id");
  await sql`DELETE FROM payments WHERE id = ${id(fd, "payment_id")} AND job_id = ${jobId}`;
  await log("job", jobId, "payment_removed");
  refreshJobViews(jobId);
  redirect(`/jobs/${jobId}`);
}

export async function deleteExpenseAction(fd: FormData): Promise<void> {
  await requireSession();
  const jobId = id(fd, "job_id");
  await sql`DELETE FROM expenses WHERE id = ${id(fd, "expense_id")} AND job_id = ${jobId}`;
  await log("job", jobId, "expense_removed");
  refreshJobViews(jobId);
  redirect(`/jobs/${jobId}`);
}

/* ------------------------------------------------------------- เช็กลิสต์ */

async function insertTemplateTasks(jobId: number, packageName: string | null): Promise<number> {
  const titles = templateFor(packageName);
  if (titles.length === 0) return 0;
  await sql`
    INSERT INTO job_tasks ${sql(
      titles.map((title, i) => ({ job_id: jobId, title, position: i })),
      "job_id",
      "title",
      "position",
    )}
  `;
  return titles.length;
}

export async function applyTemplateAction(fd: FormData): Promise<void> {
  await requireSession();
  const jobId = id(fd, "job_id");
  const [job] = await sql<{ package: string | null }[]>`
    SELECT package FROM jobs WHERE id = ${jobId}
  `;
  if (!job) throw new Error("ไม่พบงานนี้");

  const [{ count }] = await sql<{ count: number }[]>`
    SELECT count(*)::int FROM job_tasks WHERE job_id = ${jobId}
  `;
  if (count > 0) throw new Error("งานนี้มีเช็กลิสต์อยู่แล้ว");

  const added = await insertTemplateTasks(jobId, job.package);
  if (added > 0) await log("job", jobId, "checklist_added", null, String(added));
  refreshJobViews(jobId);
  redirect(`/jobs/${jobId}`);
}

export async function toggleTaskAction(fd: FormData): Promise<void> {
  await requireSession();
  const jobId = id(fd, "job_id");
  const taskId = id(fd, "task_id");
  await sql`
    UPDATE job_tasks
       SET done_at = CASE WHEN done_at IS NULL THEN now() ELSE NULL END
     WHERE id = ${taskId} AND job_id = ${jobId}
  `;
  refreshJobViews(jobId);
}

export async function addTaskAction(fd: FormData): Promise<void> {
  await requireSession();
  const jobId = id(fd, "job_id");
  await sql`
    INSERT INTO job_tasks (job_id, title, position)
    SELECT ${jobId}, ${required(fd, "title", "ชื่อรายการ")},
           COALESCE(max(position) + 1, 0)
      FROM job_tasks WHERE job_id = ${jobId}
  `;
  refreshJobViews(jobId);
  redirect(`/jobs/${jobId}`);
}

export async function deleteTaskAction(fd: FormData): Promise<void> {
  await requireSession();
  const jobId = id(fd, "job_id");
  await sql`DELETE FROM job_tasks WHERE id = ${id(fd, "task_id")} AND job_id = ${jobId}`;
  refreshJobViews(jobId);
}

/* -------------------------------------------------------- บันทึกและไฟล์ */

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "application/pdf",
];

export async function addNoteAction(fd: FormData): Promise<void> {
  await requireSession();
  const jobId = id(fd, "job_id");
  const body = text(fd, "body");
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  if (!body && files.length === 0) throw new Error("ใส่ข้อความหรือแนบไฟล์อย่างน้อยหนึ่งอย่าง");

  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`ไฟล์ "${file.name}" ใหญ่เกิน 5MB`);
    }
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
      throw new Error(`ไฟล์ "${file.name}" เป็นชนิดที่ยังไม่รองรับ — รับเฉพาะรูปภาพและ PDF`);
    }
  }

  const [note] = await sql<{ id: number }[]>`
    INSERT INTO notes (job_id, body, file_url)
    VALUES (${jobId}, ${body}, ${text(fd, "file_url")})
    RETURNING id::int
  `;

  for (const file of files) {
    const data = Buffer.from(await file.arrayBuffer());
    await sql`
      INSERT INTO attachments (note_id, filename, mime_type, byte_size, data)
      VALUES (${note.id}, ${file.name}, ${file.type}, ${data.byteLength}, ${data})
    `;
  }

  await log("job", jobId, "note_added", null, files.length ? `${files.length} ไฟล์` : null);
  refreshJobViews(jobId);
  redirect(`/jobs/${jobId}`);
}

export async function deleteNoteAction(fd: FormData): Promise<void> {
  await requireSession();
  const jobId = id(fd, "job_id");
  // ไฟล์แนบถูกลบตาม note ไปเองด้วย ON DELETE CASCADE
  await sql`DELETE FROM notes WHERE id = ${id(fd, "note_id")} AND job_id = ${jobId}`;
  await log("job", jobId, "note_removed");
  refreshJobViews(jobId);
  redirect(`/jobs/${jobId}`);
}
