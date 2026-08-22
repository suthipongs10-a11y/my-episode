import type { ReactNode } from "react";
import { JOB_STATUS, type JobStatus, type WaitingOn } from "@/lib/status";

/* --------------------------------------------------------------- chips */

const TONE = {
  us: "text-accent bg-accent-tint border-accent",
  client: "text-warn bg-warn-tint border-warn",
  late: "text-crit bg-crit-tint border-crit",
  quiet: "text-muted bg-surface-2 border-line",
  info: "text-info bg-info-tint border-info",
} as const;

export type Tone = keyof typeof TONE;

export function Chip({ tone = "quiet", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${TONE[tone]}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

const WAITING_TONE: Record<WaitingOn, Tone> = { us: "us", client: "client", nobody: "quiet" };

/** สีของ chip มาจากธง waiting ของสถานะ — งานเลยกำหนดจะกลายเป็นสีเตือนเสมอ */
export function StatusChip({ status, overdue = false }: { status: JobStatus; overdue?: boolean }) {
  const meta = JOB_STATUS[status];
  return <Chip tone={overdue ? "late" : WAITING_TONE[meta.waiting]}>{meta.label}</Chip>;
}

/* -------------------------------------------------------------- panels */

export function Panel({
  title,
  meta,
  children,
  action,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-surface-2 px-3 py-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <div className="flex items-center gap-2 text-xs text-muted">
          {meta}
          {action}
        </div>
      </header>
      {children}
    </section>
  );
}

export function Row({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <div
      id={id}
      className="flex scroll-mt-4 flex-col gap-2 border-b border-line-soft px-3 py-2 text-sm last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
    >
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-3 py-6 text-center text-sm text-muted">{children}</p>;
}

/* ---------------------------------------------------------------- tiles */

export function Kpi({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "good" | "alert";
}) {
  const color = tone === "good" ? "text-accent" : tone === "alert" ? "text-crit" : "text-ink";
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className={`num text-2xl leading-tight font-medium ${color}`}>
        {value}
        {unit ? <span className="ml-1 text-sm text-muted">{unit}</span> : null}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- fields */

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
