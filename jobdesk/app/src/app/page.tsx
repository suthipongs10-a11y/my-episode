import Link from "next/link";
import { requireSession } from "@/lib/auth";
import {
  getHomeSummary,
  leadSummary,
  listActiveJobs,
  upcomingRenewals,
  type JobRow,
} from "@/lib/queries";
import { LEAD_STALE_DAYS, OPEN_STATUSES } from "@/lib/status";
import { daysSince, daysUntil, fmtDay, stallLabel, thb } from "@/lib/format";
import { Shell } from "@/components/shell";
import { Chip, Empty, Kpi, Panel, Row } from "@/components/ui";
import { StatusSelect } from "@/components/status-select";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireSession();

  const [summary, leads, jobs, renewals] = await Promise.all([
    getHomeSummary(),
    leadSummary(LEAD_STALE_DAYS),
    listActiveJobs(),
    upcomingRenewals(30),
  ]);
  const open = jobs.filter((j) => (OPEN_STATUSES as string[]).includes(j.status));
  const mine = open.filter((j) => j.waiting_on === "us");
  const theirs = open
    .filter((j) => j.waiting_on === "client")
    .sort((a, b) => +new Date(a.status_since) - +new Date(b.status_since));

  return (
    <Shell>
      <div className="flex flex-col gap-5">
        {/* คนทักที่รอนานคืองานของ "วันนี้" พอ ๆ กับงานที่ค้าง — ขึ้นเฉพาะตอนที่มีจริง */}
        {leads.stale_count > 0 ? (
          <Link
            href="/leads"
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-crit bg-crit-tint px-3 py-2 text-sm hover:brightness-105"
          >
            <span>
              มีคนทัก <span className="num font-semibold">{leads.stale_count}</span> คน
              รอมาเกิน {LEAD_STALE_DAYS} วันแล้ว
            </span>
            <span className="text-xs text-muted">ยิ่งช้า ยิ่งปิดไม่ได้ →</span>
          </Link>
        ) : null}

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="ต้องทำ" value={String(summary.need_to_do)} unit="งาน" />
          <Kpi label="ต้องทวง" value={String(summary.need_to_chase)} unit="งาน" />
          <Kpi
            label="เลยกำหนดส่ง"
            value={String(summary.overdue)}
            unit="งาน"
            tone={summary.overdue > 0 ? "alert" : undefined}
          />
          <Kpi
            label="ค้างรับ"
            value={thb(summary.outstanding)}
            unit="฿"
            tone={summary.outstanding > 0 ? "alert" : undefined}
          />
          <Kpi label="รายรับเดือนนี้" value={thb(summary.revenue_month)} unit="฿" />
          <Kpi
            label="กำไรเดือนนี้"
            value={thb(summary.profit_month)}
            unit="฿"
            tone={summary.profit_month >= 0 ? "good" : "alert"}
          />
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="ต้องทำ"
            meta={<span className="num">{mine.length}</span>}
            action={
              <Link href="/jobs/new" className="btn btn-quiet text-xs">
                + งานใหม่
              </Link>
            }
          >
            {mine.length === 0 ? (
              <Empty>ไม่มีงานที่รอเราอยู่ — ดูกล่องต้องทวงข้าง ๆ</Empty>
            ) : (
              mine
                .sort((a, b) => rank(a) - rank(b))
                .map((j) => <JobLine key={j.id} job={j} mode="do" />)
            )}
          </Panel>

          <Panel title="ต้องทวง" meta={<span className="num">{theirs.length}</span>}>
            {theirs.length === 0 ? (
              <Empty>ไม่มีงานค้างที่ลูกค้า</Empty>
            ) : (
              theirs.map((j) => <JobLine key={j.id} job={j} mode="chase" />)
            )}
          </Panel>
        </div>

        {renewals.length > 0 ? (
          <Panel
            title="ใกล้หมดอายุ"
            meta={<span className="num">{renewals.length}</span>}
            action={
              <Link href="/renewals" className="btn btn-quiet text-xs">
                ดูทั้งหมด
              </Link>
            }
          >
            {renewals.map((r) => {
              const late = r.days_left <= 7;
              return (
                <Row key={r.website_id}>
                  <div className="min-w-0">
                    <Link
                      href={`/websites/${r.website_id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {r.domain}
                    </Link>
                    <div className="truncate text-xs text-muted">
                      {r.customer} · หมดอายุ {fmtDay(r.expires_on)}
                    </div>
                  </div>
                  <span className={`num shrink-0 text-xs ${late ? "text-crit" : "text-warn"}`}>
                    {r.days_left < 0
                      ? `เลยมา ${Math.abs(r.days_left)} วัน`
                      : r.days_left === 0
                        ? "วันนี้"
                        : `อีก ${r.days_left} วัน`}
                  </span>
                </Row>
              );
            })}
          </Panel>
        ) : null}
      </div>
    </Shell>
  );
}

/** งานเลยกำหนดขึ้นก่อน แล้วเรียงตามวันส่ง งานที่ไม่มีกำหนดส่งไปท้ายสุด */
function rank(j: JobRow): number {
  const left = daysUntil(j.due_on);
  return left === null ? 1e9 : left;
}

function JobLine({ job, mode }: { job: JobRow; mode: "do" | "chase" }) {
  const left = daysUntil(job.due_on);
  const overdue = left !== null && left < 0;
  const stalled = daysSince(job.status_since);

  return (
    <Row>
      <div className="min-w-0">
        <Link href={`/jobs/${job.id}`} className="block truncate font-medium hover:underline">
          {job.title}
        </Link>
        <div className="truncate text-xs text-muted">
          {job.customer}
          {job.due_on ? ` · ส่ง ${fmtDay(job.due_on)}` : " · ไม่ได้ตั้งกำหนดส่ง"}
          {overdue
            ? ` · เลยมา ${Math.abs(left!)} วัน`
            : mode === "chase" && stalled !== null && stalled > 0
              ? ` · ค้าง ${stallLabel(stalled)}`
              : ""}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {mode === "chase" && job.outstanding > 0 ? (
          <span className="num text-xs whitespace-nowrap text-crit">฿{thb(job.outstanding)}</span>
        ) : null}
        {overdue ? <Chip tone="late">เลยกำหนด</Chip> : null}
        <StatusSelect jobId={job.id} status={job.status} />
      </div>
    </Row>
  );
}
