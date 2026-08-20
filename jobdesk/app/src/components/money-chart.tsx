"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartPoint = { label: string; month: string; revenue: number; cost: number };

const baht = new Intl.NumberFormat("th-TH-u-ca-gregory", { maximumFractionDigits: 0 });

/**
 * Recharts วาง tick ที่ค่าอย่าง 1,500 หรือ 4,500 ได้ การปัดเป็นจำนวนเต็ม "k"
 * จะทำให้ป้ายบนแกนไม่ตรงกับความสูงของแท่ง — เก็บทศนิยมไว้หนึ่งตำแหน่งเมื่อจำเป็น
 */
function axisMoney(v: number): string {
  if (Math.abs(v) < 1000) return String(v);
  const k = v / 1000;
  return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
}

type TipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ dataKey?: string | number; value?: number }>;
};

function Tip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((p) => p.dataKey === "revenue")?.value ?? 0;
  const cost = payload.find((p) => p.dataKey === "cost")?.value ?? 0;
  const profit = revenue - cost;

  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <dt className="flex items-center gap-1.5 text-muted">
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-[2px]"
            style={{ background: "var(--chart-revenue)" }}
          />
          รายรับ
        </dt>
        <dd className="num text-right text-ink">฿{baht.format(revenue)}</dd>
        <dt className="flex items-center gap-1.5 text-muted">
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-[2px]"
            style={{ background: "var(--chart-cost)" }}
          />
          รายจ่าย
        </dt>
        <dd className="num text-right text-ink">฿{baht.format(cost)}</dd>
        <dt className="border-t border-line-soft pt-0.5 text-muted">กำไร</dt>
        <dd
          className={`num border-t border-line-soft pt-0.5 text-right ${
            profit >= 0 ? "text-accent" : "text-crit"
          }`}
        >
          ฿{baht.format(profit)}
        </dd>
      </dl>
    </div>
  );
}

/**
 * รายรับกับรายจ่ายอยู่แกนเดียวกันเพราะเป็นบาททั้งคู่ — กำไรไม่ได้วาดเป็นแท่งที่สาม
 * เพราะมันคือผลต่างของสองแท่งนี้ อ่านจากช่องว่างได้อยู่แล้ว และมีตัวเลขในตารางข้างล่าง
 */
export function MoneyChart({ data }: { data: ChartPoint[] }) {
  return (
    <div className="h-64 w-full px-1 pt-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "var(--chart-grid)" }}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
          />
          <YAxis
            tickFormatter={axisMoney}
            tickLine={false}
            axisLine={false}
            width={44}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
          />
          <Tooltip content={<Tip />} cursor={{ fill: "var(--surface-2)" }} />
          <Bar dataKey="revenue" name="รายรับ" fill="var(--chart-revenue)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="cost" name="รายจ่าย" fill="var(--chart-cost)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
