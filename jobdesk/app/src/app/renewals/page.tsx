import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listRenewals, renewalSummary, type RenewalRow } from "@/lib/queries";
import { configuredChannels } from "@/lib/notify";
import { env } from "@/lib/env";
import { recordRenewalAction, runRemindersAction, sendTestNotificationAction } from "@/lib/actions";
import { EXPENSE_KINDS, RENEWAL_STATUS } from "@/lib/status";
import { fmtDate, thb, todayInputValue } from "@/lib/format";
import { Shell } from "@/components/shell";
import { Chip, Empty, Field, Kpi, Panel, type Tone } from "@/components/ui";
import { RenewalStatusSelect } from "@/components/renewal-status-select";
import { Submit } from "@/components/submit";

export const dynamic = "force-dynamic";

/** ความเร่งด่วนของแถว — ใกล้หมดอายุเท่าไหร่ยิ่งแดง */
function urgency(days: number): { tone: Tone; label: string } {
  if (days < 0) return { tone: "late", label: `เลยมา ${Math.abs(days)} วัน` };
  if (days === 0) return { tone: "late", label: "หมดอายุวันนี้" };
  if (days <= 7) return { tone: "late", label: `อีก ${days} วัน` };
  if (days <= 30) return { tone: "client", label: `อีก ${days} วัน` };
  return { tone: "quiet", label: `อีก ${days} วัน` };
}

export default async function RenewalsPage({
  searchParams,
}: {
  searchParams: Promise<{ due?: string; sent?: string; test?: string; err?: string }>;
}) {
  await requireSession();
  const [rows, summary, params] = await Promise.all([
    listRenewals(),
    renewalSummary(),
    searchParams,
  ]);
  const channels = configuredChannels();

  return (
    <Shell>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">ต่ออายุ</h1>
          <p className="text-sm text-muted">
            วันที่ใช้เตือนคือวันที่หมดก่อนระหว่างโดเมนกับโฮสต์
          </p>
        </div>
        <Link href="/websites/new" className="btn btn-primary">
          + เพิ่มเว็บ
        </Link>
      </div>

      {/* ------------------------------------------------ ผลการรันงานเตือน */}
      {params.sent !== undefined ? (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            Number(params.sent) > 0
              ? "border-accent bg-accent-tint text-ink"
              : "border-line bg-surface text-ink"
          }`}
          role="status"
        >
          ถึงคิวเตือน <span className="num">{params.due}</span> เว็บ · ส่งแล้ว{" "}
          <span className="num">{params.sent}</span>
          {params.err ? <span className="block text-crit">{params.err}</span> : null}
        </div>
      ) : null}
      {params.test ? (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            params.test === "ok" ? "border-accent bg-accent-tint" : "border-crit bg-crit-tint"
          }`}
          role="status"
        >
          {params.test === "ok" ? "ส่งข้อความทดสอบแล้ว ไปดูในแอปที่ตั้งไว้" : "ส่งไม่สำเร็จ"}
          {params.err ? <span className="block text-crit">{params.err}</span> : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="เว็บที่ดูแล" value={String(summary.active_sites)} unit="เว็บ" />
          <Kpi
            label="หมดใน 30 วัน"
            value={String(summary.due_30)}
            unit="เว็บ"
            tone={summary.due_30 > 0 ? "alert" : undefined}
          />
          <Kpi
            label="เลยกำหนดแล้ว"
            value={String(summary.overdue)}
            unit="เว็บ"
            tone={summary.overdue > 0 ? "alert" : undefined}
          />
          <Kpi label="ค่าต่ออายุต่อปี" value={thb(summary.yearly_price)} unit="฿" />
          <Kpi label="กำไรต่อปี" value={thb(summary.yearly_profit)} unit="฿" tone="good" />
          <Kpi label="เก็บได้ปีนี้" value={thb(summary.collected_this_year)} unit="฿" tone="good" />
        </section>

        <div className="rounded-r-lg border-l-[3px] border-accent bg-accent-tint px-4 py-3 text-sm">
          กำไรจากการต่ออายุไม่ต้องจ่ายค่าโฆษณาเพื่อให้ได้มา ต่างจากงานใหม่
          <strong> ราคาต่ออายุจึงเป็นสิ่งที่ควรพิจารณาขึ้นก่อนราคางานใหม่</strong> —
          และเว็บที่ปล่อยให้หมดอายุคือรายได้ก้อนนี้ที่หายไปทั้งก้อน พร้อมกับลูกค้าคนนั้น
        </div>

        {/* ------------------------------------------------- ช่องทางแจ้งเตือน */}
        <Panel
          title="การแจ้งเตือน"
          meta={
            channels.length ? (
              <span>ส่งทาง {channels.join(", ")}</span>
            ) : (
              <Chip tone="late">ยังไม่ได้ตั้งค่า</Chip>
            )
          }
        >
          <div className="flex flex-col gap-3 px-3 py-3">
            <p className="text-sm text-muted">
              เตือนล่วงหน้า <span className="num">{env.reminderDays.join(" / ")}</span> วัน
              {channels.length === 0
                ? " — ตั้งค่า TELEGRAM_BOT_TOKEN หรือ LINE_CHANNEL_ACCESS_TOKEN ใน .env.local ก่อน"
                : " · Vercel Cron เรียกทุกวัน 09:00 น. ตามเวลาไทย"}
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={sendTestNotificationAction}>
                <Submit variant="outline">ส่งข้อความทดสอบ</Submit>
              </form>
              <form action={runRemindersAction}>
                <Submit variant="outline">รันงานเตือนตอนนี้</Submit>
              </form>
            </div>
          </div>
        </Panel>

        {/* ------------------------------------------------------ รายการเว็บ */}
        <Panel title="เว็บที่ดูแลอยู่" meta={<span className="num">{rows.length}</span>}>
          {rows.length === 0 ? (
            <Empty>
              ยังไม่มีเว็บในระบบ — เพิ่มเว็บที่ส่งมอบไปแล้วเข้ามา แล้วระบบจะเตือนให้เองก่อนหมดอายุ
            </Empty>
          ) : (
            rows.map((r) => <RenewalItem key={r.website_id} row={r} />)
          )}
        </Panel>
      </div>
    </Shell>
  );
}

function RenewalItem({ row }: { row: RenewalRow }) {
  const u = urgency(row.days_left);
  const declined = row.renewal_status === "declined";

  return (
    // id ทำให้ลิงก์ /renewals#renew-12 พาไปที่เว็บนั้นตรง ๆ ได้
    <div id={`renew-${row.website_id}`} className="scroll-mt-4 border-b border-line-soft last:border-b-0">
      <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <Link href={`/websites/${row.website_id}`} className="font-medium hover:underline">
            {row.domain}
          </Link>
          {/* ปล่อยให้ขึ้นบรรทัดใหม่แทนการตัด — บนมือถือบรรทัดนี้ยาวเกินหนึ่งบรรทัดเสมอ */}
          <div className="text-xs text-muted">
            <Link href={`/customers/${row.customer_id}`} className="hover:underline">
              {row.customer}
            </Link>
            {row.phone ? (
              <>
                {" · "}
                <a href={`tel:${row.phone}`} className="hover:underline">
                  {row.phone}
                </a>
              </>
            ) : null}
            {` · หมดอายุ ${fmtDate(row.expires_on)}`}
            {row.renewal_price !== null
              ? ` · เก็บ ฿${thb(row.renewal_price)} · กำไร ฿${thb(row.renewal_profit)}`
              : " · ยังไม่ได้ตั้งราคาต่ออายุ"}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {declined ? (
            <Chip tone="quiet">{RENEWAL_STATUS.declined}</Chip>
          ) : (
            <Chip tone={u.tone}>{u.label}</Chip>
          )}
          <RenewalStatusSelect websiteId={row.website_id} status={row.renewal_status} />
        </div>
      </div>

      <details className="px-3 pb-3">
        <summary className="cursor-pointer text-xs text-accent">บันทึกการต่ออายุ</summary>
        <form
          action={recordRenewalAction}
          className="mt-2 grid gap-2 rounded-lg border border-line bg-surface-2 p-3 sm:grid-cols-3"
        >
          <input type="hidden" name="website_id" value={row.website_id} />
          <Field label="เก็บจากลูกค้า (฿)">
            <input
              className="field num"
              name="amount_thb"
              inputMode="decimal"
              required
              defaultValue={row.renewal_price ?? ""}
            />
          </Field>
          <Field label="ต้นทุนที่จ่าย (฿)">
            <input
              className="field num"
              name="cost_thb"
              inputMode="decimal"
              defaultValue={row.renewal_cost ?? ""}
            />
          </Field>
          <Field label="หมวดต้นทุน">
            <select className="field" name="cost_kind" defaultValue="domain">
              {Object.entries(EXPENSE_KINDS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="วันที่">
            <input className="field" type="date" name="paid_on" defaultValue={todayInputValue()} />
          </Field>
          <Field label="ต่อไปกี่ปี">
            <input className="field num" name="years" inputMode="numeric" defaultValue="1" />
          </Field>
          <div className="flex items-end">
            <Submit>บันทึกและเลื่อนวันหมดอายุ</Submit>
          </div>
          <p className="text-xs text-muted sm:col-span-3">
            เงินที่เก็บได้จะไปโผล่ในหน้าการเงิน ต้นทุนก็เช่นกัน และ
            <strong>วันหมดอายุทั้งโดเมนและโฮสต์จะขยับไปพร้อมกัน</strong> ตามจำนวนปีที่ใส่
            ทำให้ชุดเตือนของรอบหน้ากลับมาเองอัตโนมัติ — ถ้าต่อแค่อย่างใดอย่างหนึ่ง
            ให้ไปแก้วันในหน้าเว็บนั้นอีกที
          </p>
        </form>
      </details>
    </div>
  );
}
