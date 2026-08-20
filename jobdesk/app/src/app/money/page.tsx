import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { expensesByKind, listOutstanding, monthlySeries } from "@/lib/queries";
import { EXPENSE_KINDS } from "@/lib/status";
import { thb } from "@/lib/format";
import { Shell } from "@/components/shell";
import { Chip, Empty, Panel, Row } from "@/components/ui";
import { MoneyChart, type ChartPoint } from "@/components/money-chart";

export const dynamic = "force-dynamic";

const monthLabel = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  month: "short",
  year: "2-digit",
  timeZone: "Asia/Bangkok",
});
const monthLong = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Bangkok",
});

function monthKey(d: string): string {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

function lastDayOf(month: string): string {
  const d = new Date(month);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString("en-CA");
}

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  await requireSession();

  const months = await monthlySeries(12);
  const { m } = await searchParams;
  const selected =
    months.find((row) => monthKey(row.month) === m) ?? months[months.length - 1];
  const selectedKey = monthKey(selected.month);

  const [slices, outstanding] = await Promise.all([
    expensesByKind(selectedKey),
    listOutstanding(),
  ]);

  const chart: ChartPoint[] = months.map((row) => ({
    label: monthLabel.format(new Date(row.month)),
    month: monthKey(row.month),
    revenue: row.revenue,
    cost: row.cost,
  }));

  const margin = selected.revenue > 0 ? (selected.profit / selected.revenue) * 100 : null;
  const owed = outstanding.reduce((sum, r) => sum + r.outstanding, 0);
  const owedDue = outstanding.filter((r) => r.due).reduce((sum, r) => sum + r.outstanding, 0);
  const yearStart = `${new Date(selected.month).getFullYear()}-01-01`;

  return (
    <Shell>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">การเงิน</h1>
          <p className="text-sm text-muted">
            ตัวเลขนับตามวันที่รับเงินและวันที่จ่ายจริง ไม่ใช่วันที่ส่งมอบงาน
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form action="/money" className="flex items-end gap-2">
            <label className="block">
              <span className="label">เดือน</span>
              <select className="field w-auto" name="m" defaultValue={selectedKey}>
                {[...months].reverse().map((row) => (
                  <option key={monthKey(row.month)} value={monthKey(row.month)}>
                    {monthLong.format(new Date(row.month))}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn" type="submit">
              ดู
            </button>
          </form>
          <a
            className="btn"
            href={`/api/export?from=${selectedKey}&to=${lastDayOf(selected.month)}`}
          >
            ส่งออกเดือนนี้
          </a>
          <a className="btn" href={`/api/export?from=${yearStart}&to=${lastDayOf(selected.month)}`}>
            ทั้งปี
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* --------------------------------------------- เดือนที่เลือก */}
        <section className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-muted">กำไรสุทธิ {monthLong.format(new Date(selected.month))}</p>
          <p
            className={`num text-4xl font-medium ${
              selected.profit >= 0 ? "text-accent" : "text-crit"
            }`}
          >
            ฿{thb(selected.profit)}
          </p>
          <p className="mt-1 text-sm text-muted">
            รายรับ <span className="num text-ink">฿{thb(selected.revenue)}</span> · รายจ่าย{" "}
            <span className="num text-ink">฿{thb(selected.cost)}</span>
            {margin !== null ? (
              <>
                {" · อัตรากำไร "}
                <span className="num text-ink">{margin.toFixed(0)}%</span>
              </>
            ) : null}
            {selected.jobs_delivered > 0 ? (
              <>
                {" · ส่งมอบ "}
                <span className="num text-ink">{selected.jobs_delivered}</span> งาน
              </>
            ) : null}
          </p>
        </section>

        {/* ----------------------------------------------------- กราฟ */}
        <Panel title="รายรับและรายจ่าย 12 เดือน">
          <MoneyChart data={chart} />
          <div className="flex flex-wrap gap-4 border-t border-line-soft px-3 py-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-[3px]"
                style={{ background: "var(--chart-revenue)" }}
              />
              รายรับ
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-[3px]"
                style={{ background: "var(--chart-cost)" }}
              />
              รายจ่าย
            </span>
            <span>กำไรคือช่องว่างระหว่างสองแท่ง ตัวเลขเต็มอยู่ในตารางข้างล่าง</span>
          </div>
        </Panel>

        {/* --------------------------------------------------- ตาราง */}
        <Panel title="แยกรายเดือน">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-xs text-muted">
                  <th className="px-3 py-2 text-left font-medium">เดือน</th>
                  {/* กำไรมาก่อน เพราะบนมือถือคอลัมน์ท้าย ๆ ต้องเลื่อนถึงจะเห็น
                      และกำไรคือคำตอบของทั้งหน้านี้ */}
                  <th className="px-3 py-2 text-right font-medium">กำไร</th>
                  <th className="px-3 py-2 text-right font-medium">รายรับ</th>
                  <th className="px-3 py-2 text-right font-medium">รายจ่าย</th>
                  <th className="px-3 py-2 text-right font-medium">ส่งมอบ</th>
                </tr>
              </thead>
              <tbody>
                {[...months].reverse().map((row) => {
                  const key = monthKey(row.month);
                  const isSelected = key === selectedKey;
                  return (
                    <tr
                      key={key}
                      className={`border-b border-line-soft last:border-b-0 ${
                        isSelected ? "bg-accent-tint" : ""
                      }`}
                    >
                      <td className="px-3 py-1.5">
                        <Link href={`/money?m=${key}`} className="hover:underline">
                          {monthLong.format(new Date(row.month))}
                        </Link>
                      </td>
                      <td
                        className={`num px-3 py-1.5 text-right font-medium ${
                          row.profit >= 0 ? "text-accent" : "text-crit"
                        }`}
                      >
                        ฿{thb(row.profit)}
                      </td>
                      <td className="num px-3 py-1.5 text-right">฿{thb(row.revenue)}</td>
                      <td className="num px-3 py-1.5 text-right">฿{thb(row.cost)}</td>
                      <td className="num px-3 py-1.5 text-right text-muted">
                        {row.jobs_delivered || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* ------------------------------------------------ ค้างรับ */}
          <Panel
            title="ค้างรับ"
            meta={
              <span className="num">
                ฿{thb(owed)}
                {owedDue !== owed ? (
                  <span className="ml-1 text-muted">(ถึงกำหนดแล้ว ฿{thb(owedDue)})</span>
                ) : null}
              </span>
            }
          >
            {outstanding.length === 0 ? (
              <Empty>ไม่มีใครค้างเงินอยู่</Empty>
            ) : (
              outstanding.map((r) => (
                <Row key={r.job_id}>
                  <div className="min-w-0">
                    <Link href={`/jobs/${r.job_id}`} className="block truncate font-medium hover:underline">
                      {r.title}
                    </Link>
                    <div className="truncate text-xs text-muted">
                      {r.customer}
                      {r.phone ? (
                        <>
                          {" · "}
                          <a href={`tel:${r.phone}`} className="hover:underline">
                            {r.phone}
                          </a>
                        </>
                      ) : null}
                      {r.due ? ` · ค้างมา ${r.waiting_days} วัน` : " · ยังไม่ถึงกำหนดเก็บ"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.due && r.waiting_days >= 14 ? <Chip tone="late">เกิน 14 วัน</Chip> : null}
                    <span className="num text-sm text-crit">฿{thb(r.outstanding)}</span>
                  </div>
                </Row>
              ))
            )}
          </Panel>

          {/* --------------------------------------- ค่าใช้จ่ายแยกหมวด */}
          <Panel
            title="รายจ่ายแยกหมวด"
            meta={<span className="num">฿{thb(selected.cost)}</span>}
          >
            {slices.length === 0 ? (
              <Empty>เดือนนี้ยังไม่มีรายจ่าย</Empty>
            ) : (
              slices.map((s) => {
                const share = selected.cost > 0 ? (s.total / selected.cost) * 100 : 0;
                return (
                  <div key={s.kind} className="border-b border-line-soft px-3 py-2 last:border-b-0">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span>{EXPENSE_KINDS[s.kind as keyof typeof EXPENSE_KINDS] ?? s.kind}</span>
                      <span className="num shrink-0">
                        ฿{thb(s.total)}
                        <span className="ml-2 text-xs text-muted">{share.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${share}%`, background: "var(--chart-cost)" }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </Panel>
        </div>
      </div>
    </Shell>
  );
}
