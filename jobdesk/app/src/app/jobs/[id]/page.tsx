import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import {
  getJob,
  listActivity,
  listExpenses,
  listNotes,
  listPayments,
  listTasks,
  listWebsitesForJob,
} from "@/lib/queries";
import { EXPENSE_KINDS, JOB_STATUS, PAYMENT_KINDS } from "@/lib/status";
import { daysSince, daysUntil, dateInputValue, fmtDate, fmtDateTime, stallLabel, thb, todayInputValue } from "@/lib/format";
import {
  addExpenseAction,
  addPaymentAction,
  deleteExpenseAction,
  deletePaymentAction,
  updateJobAction,
} from "@/lib/actions";
import { Shell } from "@/components/shell";
import { Chip, Empty, Field, Panel, Row } from "@/components/ui";
import { StatusSelect } from "@/components/status-select";
import { Submit } from "@/components/submit";
import { Checklist } from "@/components/checklist";
import { Notes } from "@/components/notes";

export const dynamic = "force-dynamic";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isInteger(jobId)) notFound();

  const job = await getJob(jobId);
  if (!job) notFound();

  const [payments, expenses, activity, tasks, notes, websites] = await Promise.all([
    listPayments(jobId),
    listExpenses(jobId),
    listActivity("job", jobId),
    listTasks(jobId),
    listNotes(jobId),
    listWebsitesForJob(jobId),
  ]);

  const left = daysUntil(job.due_on);
  const overdue = left !== null && left < 0 && job.status !== "delivered";
  const stalled = daysSince(job.status_since) ?? 0;
  const perHour = job.hours_spent ? job.gross_profit / job.hours_spent : null;
  const revisionsOver = job.revisions_used > job.revisions_included;

  return (
    <Shell>
      <div className="mb-4">
        <Link href="/board" className="text-xs text-muted hover:underline">
          ← กลับไปบอร์ดงาน
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{job.title}</h1>
            <p className="text-sm text-muted">
              <Link href={`/customers/${job.customer_id}`} className="hover:underline">
                {job.customer}
                {job.business_name ? ` · ${job.business_name}` : ""}
              </Link>
              {job.phone ? (
                <>
                  {" · "}
                  <a href={`tel:${job.phone}`} className="hover:underline">
                    {job.phone}
                  </a>
                </>
              ) : null}
              {job.line_id ? ` · LINE ${job.line_id}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {overdue ? <Chip tone="late">เลยกำหนด {Math.abs(left!)} วัน</Chip> : null}
            <StatusSelect jobId={job.id} status={job.status} />
          </div>
        </div>
        <p className="mt-1 text-xs text-muted">
          {stalled <= 0 ? "เข้าสถานะนี้วันนี้" : `อยู่สถานะนี้มา ${stallLabel(stalled)}แล้ว`}
          {JOB_STATUS[job.status].hint ? ` — ${JOB_STATUS[job.status].hint}` : ""}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <Checklist jobId={job.id} packageName={job.package} tasks={tasks} />

          {/* ---------------------------------------------------- money */}
          <Panel title="การเงินของงานนี้">
            <dl className="grid grid-cols-2 gap-px bg-line-soft sm:grid-cols-3">
              <Stat label="ราคาขาย" value={thb(job.price)} />
              <Stat label="รับแล้ว" value={thb(job.received)} tone="good" />
              <Stat
                label="ค้างรับ"
                value={thb(job.outstanding)}
                tone={job.outstanding > 0 ? "bad" : undefined}
              />
              <Stat label="ต้นทุนตรง" value={thb(job.direct_cost)} />
              <Stat label="กำไรขั้นต้น" value={thb(job.gross_profit)} tone="good" />
              <Stat
                label="กำไรต่อชั่วโมง"
                value={perHour === null ? "—" : thb(perHour)}
                hint={perHour === null ? "ใส่ชั่วโมงที่ใช้ด้านขวา" : `${job.hours_spent} ชม.`}
              />
            </dl>
            <p className="border-t border-line-soft px-3 py-2 text-xs text-muted">
              ยังไม่รวมค่าโฆษณาปันส่วน — ค่านั้นเป็นตัวเลขรายเดือนและจะมาใน Phase 4
            </p>
          </Panel>

          {/* ------------------------------------------------- payments */}
          <Panel title="เงินเข้า" meta={<span className="num">฿{thb(job.received)}</span>}>
            {payments.length === 0 ? (
              <Empty>ยังไม่ได้รับเงินสำหรับงานนี้</Empty>
            ) : (
              payments.map((p) => (
                <Row key={p.id}>
                  <div>
                    <span className="font-medium">
                      {PAYMENT_KINDS[p.kind as keyof typeof PAYMENT_KINDS] ?? p.kind}
                    </span>
                    <span className="ml-2 text-xs text-muted">
                      {fmtDate(p.paid_on)}
                      {p.method ? ` · ${p.method}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="num text-sm text-accent">฿{thb(p.amount, true)}</span>
                    <form action={deletePaymentAction}>
                      <input type="hidden" name="job_id" value={job.id} />
                      <input type="hidden" name="payment_id" value={p.id} />
                      <button className="btn btn-quiet px-2 py-0.5 text-xs" aria-label="ลบรายการนี้">
                        ลบ
                      </button>
                    </form>
                  </div>
                </Row>
              ))
            )}
            <form
              action={addPaymentAction}
              className="grid gap-2 border-t border-line bg-surface-2 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <input type="hidden" name="job_id" value={job.id} />
              <Field label="ประเภท">
                <select name="kind" className="field" defaultValue="deposit">
                  {Object.entries(PAYMENT_KINDS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="จำนวน (฿)">
                <input
                  className="field num"
                  name="amount_thb"
                  inputMode="decimal"
                  required
                  defaultValue={job.outstanding > 0 ? String(job.outstanding) : ""}
                />
              </Field>
              <Field label="วันที่รับ">
                <input className="field" type="date" name="paid_on" defaultValue={todayInputValue()} />
              </Field>
              <div className="flex items-end">
                <Submit>บันทึก</Submit>
              </div>
            </form>
          </Panel>

          {/* ------------------------------------------------- expenses */}
          <Panel title="เงินออก" meta={<span className="num">฿{thb(job.direct_cost)}</span>}>
            {expenses.length === 0 ? (
              <Empty>ยังไม่มีต้นทุนของงานนี้</Empty>
            ) : (
              expenses.map((e) => (
                <Row key={e.id}>
                  <div className="min-w-0">
                    <span className="font-medium">
                      {EXPENSE_KINDS[e.kind as keyof typeof EXPENSE_KINDS] ?? e.kind}
                    </span>
                    <span className="ml-2 text-xs text-muted">
                      {e.description ? `${e.description} · ` : ""}
                      {fmtDate(e.spent_on)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="num text-sm text-crit">−฿{thb(e.amount, true)}</span>
                    <form action={deleteExpenseAction}>
                      <input type="hidden" name="job_id" value={job.id} />
                      <input type="hidden" name="expense_id" value={e.id} />
                      <button className="btn btn-quiet px-2 py-0.5 text-xs" aria-label="ลบรายการนี้">
                        ลบ
                      </button>
                    </form>
                  </div>
                </Row>
              ))
            )}
            <form
              action={addExpenseAction}
              className="grid gap-2 border-t border-line bg-surface-2 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <input type="hidden" name="job_id" value={job.id} />
              <Field label="ประเภท">
                <select name="kind" className="field" defaultValue="theme_plugin">
                  {Object.entries(EXPENSE_KINDS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="จำนวน (฿)">
                <input className="field num" name="amount_thb" inputMode="decimal" required />
              </Field>
              <Field label="รายละเอียด">
                <input className="field" name="description" placeholder="เช่น ธีม Astra Pro" />
              </Field>
              <div className="flex items-end">
                <Submit>บันทึก</Submit>
              </div>
            </form>
          </Panel>
        </div>

        {/* --------------------------------------------------- sidebar */}
        <div className="flex flex-col gap-4">
          <Panel title="รายละเอียดงาน">
            <form action={updateJobAction} className="grid gap-3 p-3">
              <input type="hidden" name="job_id" value={job.id} />
              <Field label="ชื่องาน">
                <input className="field" name="title" defaultValue={job.title} required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="แพ็กเกจ">
                  <input className="field" name="package" defaultValue={job.package ?? ""} />
                </Field>
                <Field label="ราคาขาย (฿)">
                  <input
                    className="field num"
                    name="price_thb"
                    inputMode="decimal"
                    defaultValue={String(job.price)}
                    required
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="กำหนดส่ง">
                  <input
                    className="field"
                    type="date"
                    name="due_on"
                    defaultValue={dateInputValue(job.due_on)}
                  />
                </Field>
                <Field label="ชั่วโมงที่ใช้" hint="ประมาณตอนปิดงานก็พอ">
                  <input
                    className="field num"
                    name="hours_spent"
                    inputMode="decimal"
                    defaultValue={job.hours_spent === null ? "" : String(job.hours_spent)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="รอบแก้ที่ใช้ไป">
                  <input
                    className="field num"
                    name="revisions_used"
                    inputMode="numeric"
                    defaultValue={String(job.revisions_used)}
                  />
                </Field>
                <Field label="รวมในแพ็ก">
                  <input
                    className="field num"
                    name="revisions_included"
                    inputMode="numeric"
                    defaultValue={String(job.revisions_included)}
                  />
                </Field>
              </div>
              {revisionsOver ? (
                <p className="text-xs text-crit">
                  แก้เกินที่รวมในแพ็กแล้ว — งานนี้กำลังกินกำไร ถึงเวลาคิดเพิ่มหรือปิดงาน
                </p>
              ) : null}
              <Field label="บันทึก">
                <textarea className="field" name="note" rows={4} defaultValue={job.note ?? ""} />
              </Field>
              <div>
                <Submit>บันทึกการแก้ไข</Submit>
              </div>
            </form>
          </Panel>

          <Panel
            title="เว็บที่ส่งมอบ"
            action={
              <Link
                href={`/websites/new?customer=${job.customer_id}&job=${job.id}`}
                className="btn btn-quiet text-xs"
              >
                + เพิ่มเว็บ
              </Link>
            }
          >
            {websites.length === 0 ? (
              <Empty>
                ยังไม่ได้ผูกเว็บกับงานนี้ — ผูกไว้แล้วระบบจะเตือนก่อนโดเมนหมดอายุให้เอง
              </Empty>
            ) : (
              websites.map((w) => (
                <Row key={w.id}>
                  <div className="min-w-0">
                    <Link href={`/websites/${w.id}`} className="block truncate font-medium hover:underline">
                      {w.domain}
                    </Link>
                    <div className="truncate text-xs text-muted">
                      หมดอายุ {fmtDate(w.domain_expires_on ?? w.hosting_expires_on)}
                      {w.renewal_price !== null ? ` · ต่ออายุ ฿${thb(w.renewal_price)}/ปี` : ""}
                    </div>
                  </div>
                </Row>
              ))
            )}
          </Panel>

          <Notes jobId={job.id} notes={notes} />

          <Panel title="ไทม์ไลน์" meta={<span className="num">{activity.length}</span>}>
            {activity.length === 0 ? (
              <Empty>ยังไม่มีความเคลื่อนไหว</Empty>
            ) : (
              <ol className="divide-y divide-line-soft">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-baseline justify-between gap-3 px-3 py-1.5 text-xs">
                    <span>{describe(a.action, a.from_value, a.to_value)}</span>
                    <span className="num shrink-0 text-muted">{fmtDateTime(a.created_at)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </Shell>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad";
}) {
  const color = tone === "good" ? "text-accent" : tone === "bad" ? "text-crit" : "text-ink";
  const empty = value === "—";
  return (
    <div className="bg-surface px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`num text-lg font-medium ${empty ? "text-muted" : color}`}>
        {empty ? "—" : `฿${value}`}
      </dd>
      {hint ? <dd className="text-[11px] text-muted">{hint}</dd> : null}
    </div>
  );
}

const LABELS: Record<string, string> = {
  created: "เปิดงาน",
  updated: "แก้ไขรายละเอียด",
  payment_added: "รับเงิน",
  payment_removed: "ลบรายการเงินเข้า",
  expense_added: "บันทึกต้นทุน",
  expense_removed: "ลบรายการต้นทุน",
  note_added: "เพิ่มบันทึก",
  note_removed: "ลบบันทึก",
  checklist_added: "ใส่เช็กลิสต์",
};

function describe(action: string, from: string | null, to: string | null): string {
  if (action === "status_changed") {
    const a = from && from in JOB_STATUS ? JOB_STATUS[from as keyof typeof JOB_STATUS].label : from;
    const b = to && to in JOB_STATUS ? JOB_STATUS[to as keyof typeof JOB_STATUS].label : to;
    return `เปลี่ยนสถานะ ${a} → ${b}`;
  }
  if ((action === "payment_added" || action === "expense_added") && to) {
    return `${LABELS[action]} ฿${thb(Number(to))}`;
  }
  if (action === "checklist_added" && to) return `${LABELS[action]} ${to} ข้อ`;
  if (action === "note_added" && to) return `${LABELS[action]} (${to})`;
  return LABELS[action] ?? action;
}
