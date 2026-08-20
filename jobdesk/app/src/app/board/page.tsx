import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listActiveJobs, type JobRow } from "@/lib/queries";
import { BOARD_COLUMNS, JOB_STATUS } from "@/lib/status";
import { daysSince, daysUntil, fmtDay, stallLabel, thb } from "@/lib/format";
import { Shell } from "@/components/shell";
import { Chip } from "@/components/ui";
import { StatusSelect } from "@/components/status-select";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  await requireSession();
  const jobs = await listActiveJobs();

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">บอร์ดงาน</h1>
          <p className="text-sm text-muted">
            สีของคอลัมน์บอกว่ารอใครอยู่ — เขียวคือรอเรา เหลืองคือรอลูกค้า
          </p>
        </div>
        <Link href="/jobs/new" className="btn btn-primary">
          + งานใหม่
        </Link>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex min-w-max gap-3">
          {BOARD_COLUMNS.map((status) => {
            const column = jobs.filter((j) => j.status === status);
            const meta = JOB_STATUS[status];
            const accent =
              meta.waiting === "us"
                ? "bg-accent"
                : meta.waiting === "client"
                  ? "bg-warn"
                  : "bg-line";
            return (
              <section key={status} className="w-64 shrink-0">
                <header className="mb-2 rounded-lg border border-line bg-surface">
                  <div className={`h-1 rounded-t-lg ${accent}`} />
                  <div className="flex items-baseline justify-between px-3 py-2">
                    <h2 className="text-sm font-semibold">{meta.label}</h2>
                    <span className="num text-xs text-muted">{column.length}</span>
                  </div>
                  {meta.hint ? (
                    <p className="px-3 pb-2 text-[11px] leading-snug text-muted">{meta.hint}</p>
                  ) : null}
                </header>

                <div className="flex flex-col gap-2">
                  {column.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-line px-3 py-5 text-center text-xs text-muted">
                      ว่าง
                    </p>
                  ) : (
                    column.map((job) => <Card key={job.id} job={job} />)
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

function Card({ job }: { job: JobRow }) {
  const left = daysUntil(job.due_on);
  const overdue = left !== null && left < 0;
  const stalled = daysSince(job.status_since) ?? 0;

  return (
    <article className="rounded-lg border border-line bg-surface p-3">
      <Link href={`/jobs/${job.id}`} className="block font-medium hover:underline">
        {job.title}
      </Link>
      <p className="truncate text-xs text-muted">
        {job.customer}
        {job.package ? ` · ${job.package}` : ""}
      </p>

      <dl className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <div className="flex gap-1">
          <dt className="text-muted">ส่ง</dt>
          <dd className={overdue ? "num text-crit" : "num"}>{fmtDay(job.due_on)}</dd>
        </div>
        {job.outstanding > 0 ? (
          <div className="flex gap-1">
            <dt className="text-muted">ค้างรับ</dt>
            <dd className="num text-crit">฿{thb(job.outstanding)}</dd>
          </div>
        ) : (
          <div className="flex gap-1">
            <dt className="text-muted">รับครบแล้ว</dt>
            <dd className="num text-accent">฿{thb(job.price)}</dd>
          </div>
        )}
        {job.task_total > 0 ? (
          <div className="flex gap-1">
            <dt className="text-muted">เช็กลิสต์</dt>
            <dd className="num">
              {job.task_done}/{job.task_total}
            </dd>
          </div>
        ) : null}
      </dl>

      {job.task_total > 0 ? (
        <div className="mt-2 h-1 rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${Math.round((job.task_done / job.task_total) * 100)}%` }}
          />
        </div>
      ) : null}

      <div className="mt-2 flex flex-col gap-2">
        <div>
          {stalled >= 7 ? (
            <Chip tone="late">ค้างมา {stallLabel(stalled)}</Chip>
          ) : (
            <span className="text-[11px] whitespace-nowrap text-muted">
              {stalled <= 0 ? "เข้าสถานะนี้วันนี้" : `ค้างมา ${stallLabel(stalled)}`}
            </span>
          )}
        </div>
        <StatusSelect jobId={job.id} status={job.status} block />
      </div>
    </article>
  );
}
