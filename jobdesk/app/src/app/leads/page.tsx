import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { campaignOptions, leadSummary, listLeads, lostReasonBreakdown } from "@/lib/queries";
import { createLeadAction, deleteLeadAction } from "@/lib/actions";
import { LEAD_CHANNELS, LEAD_LOST_REASON, LEAD_STATUS, type LeadStatus } from "@/lib/status";
import { daysSince, fmtDay, thb } from "@/lib/format";
import { Shell } from "@/components/shell";
import { Chip, Empty, Field, Kpi, Panel, Row } from "@/components/ui";
import { LeadStatusSelect } from "@/components/lead-status-select";
import { Submit } from "@/components/submit";

export const dynamic = "force-dynamic";

/** ทักมาแล้วเกินกี่วันถือว่าช้าเกินไป — คู่มือแชทบอกให้ตอบใน 5 นาที นี่คือเส้นที่ปล่อยไม่ได้แล้ว */
const STALE_DAYS = 2;

export default async function LeadsPage() {
  await requireSession();
  const [leads, summary, campaigns, lostReasons] = await Promise.all([
    listLeads(),
    leadSummary(STALE_DAYS),
    campaignOptions(),
    lostReasonBreakdown(),
  ]);

  const open = leads.filter((l) => LEAD_STATUS[l.status as LeadStatus]?.open);
  const closed = leads
    .filter((l) => !LEAD_STATUS[l.status as LeadStatus]?.open)
    .sort((a, b) => +new Date(b.closed_at ?? b.contacted_at) - +new Date(a.closed_at ?? a.contacted_at));
  const lostTotal = lostReasons.reduce((n, r) => n + r.n, 0);

  return (
    <Shell>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-semibold">คนทัก</h1>
          <p className="text-xs text-muted">
            บันทึกทุกคนที่ทักมา ไม่ใช่เฉพาะคนที่ซื้อ — คนที่ไม่ซื้อคือตัวหารของอัตราปิด
          </p>
        </div>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="ยังต้องตามต่อ" value={String(summary.open_count)} unit="คน" />
          <Kpi
            label={`ค้างเกิน ${STALE_DAYS} วัน`}
            value={String(summary.stale_count)}
            unit="คน"
            tone={summary.stale_count > 0 ? "alert" : undefined}
          />
          <Kpi label="ทักมาเดือนนี้" value={String(summary.month_in)} unit="คน" />
          <Kpi label="ปิดได้เดือนนี้" value={String(summary.month_won)} unit="งาน" />
          <Kpi
            label="อัตราปิด"
            value={summary.close_rate === null ? "—" : String(summary.close_rate)}
            unit={summary.close_rate === null ? undefined : "%"}
            tone={summary.close_rate !== null && summary.close_rate >= 20 ? "good" : undefined}
          />
          <Kpi
            label="ต้นทุนต่อคนทัก"
            value={summary.cpl === null ? "—" : thb(summary.cpl)}
            unit={summary.cpl === null ? undefined : "฿"}
          />
        </section>

        <Panel title="เพิ่มคนที่ทักมา">
          <form action={createLeadAction} className="grid gap-3 px-3 py-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="ชื่อ / ชื่อเพจที่ทักมา">
              <input className="field" name="contact_name" required placeholder="เช่น คุณเอ ร้านกาแฟบ้านสวน" />
            </Field>
            <Field label="ช่องทาง">
              <select className="field" name="channel" defaultValue="facebook_message">
                {Object.entries(LEAD_CHANNELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="แคมเปญที่พามา" hint={campaigns.length === 0 ? "ยังไม่มีแคมเปญในระบบ" : undefined}>
              <select className="field" name="campaign_id" defaultValue="">
                <option value="">ไม่ทราบ</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.ref_code ? ` (${c.ref_code})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="รหัสอ้างอิง (ref)" hint="จากลิงก์ m.me/…?ref=">
              <input className="field" name="ref_code" placeholder="camp_a1" />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="ถามเรื่องอะไร">
                <input className="field" name="enquiry" placeholder="เช่น ร้านอาหาร อยากได้สองภาษา ถามราคา" />
              </Field>
            </div>
            <div className="flex items-end">
              <Submit>บันทึก</Submit>
            </div>
          </form>
        </Panel>

        <Panel
          title="ยังต้องตามต่อ"
          meta={<span className="num">{open.length}</span>}
        >
          {open.length === 0 ? (
            <Empty>ไม่มีใครค้างอยู่ — ตามครบแล้ว</Empty>
          ) : (
            open.map((l) => <LeadLine key={l.id} lead={l} />)
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="ปิดไปแล้ว" meta={<span className="num">{closed.length}</span>}>
            {closed.length === 0 ? (
              <Empty>ยังไม่มีรายการที่ปิด</Empty>
            ) : (
              closed.slice(0, 20).map((l) => <LeadLine key={l.id} lead={l} closed />)
            )}
          </Panel>

          <Panel title="เหตุผลที่ไม่ซื้อ" meta={<span className="num">{lostTotal}</span>}>
            {lostReasons.length === 0 ? (
              <Empty>ยังไม่มีข้อมูล — บันทึกเหตุผลทุกครั้งที่ปิดไม่ได้</Empty>
            ) : (
              <>
                {lostReasons.map((r) => (
                  <Row key={r.reason}>
                    <span>{LEAD_LOST_REASON[r.reason as keyof typeof LEAD_LOST_REASON] ?? r.reason}</span>
                    <span className="num text-sm">
                      {r.n}
                      <span className="ml-1 text-xs text-muted">
                        ({Math.round((100 * r.n) / lostTotal)}%)
                      </span>
                    </span>
                  </Row>
                ))}
                {lostReasons[0]?.reason === "too_expensive" &&
                lostReasons[0].n * 2 > lostTotal ? (
                  <p className="border-t border-line-soft px-3 py-2 text-xs text-warn">
                    “แพงไป” เกินครึ่ง — แปลว่าโฆษณาดึงคนผิดกลุ่ม ไม่ใช่ราคาผิด
                    ต้องแก้ที่โฆษณาให้พูดราคาและคำว่าสองภาษาชัดขึ้น
                  </p>
                ) : null}
              </>
            )}
          </Panel>
        </div>
      </div>
    </Shell>
  );
}

function LeadLine({
  lead,
  closed = false,
}: {
  lead: Awaited<ReturnType<typeof listLeads>>[number];
  closed?: boolean;
}) {
  const waited = daysSince(lead.contacted_at);
  const stale = !closed && waited !== null && waited >= STALE_DAYS;

  return (
    <Row id={`lead-${lead.id}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{lead.contact_name}</span>
          {stale ? <Chip tone="late">รอมา {waited} วัน</Chip> : null}
          {lead.lost_reason ? (
            <Chip>{LEAD_LOST_REASON[lead.lost_reason as keyof typeof LEAD_LOST_REASON]}</Chip>
          ) : null}
          {lead.job_id ? (
            <Link href={`/jobs/${lead.job_id}`} className="text-xs text-accent hover:underline">
              ดูงาน →
            </Link>
          ) : null}
        </div>
        <div className="truncate text-xs text-muted">
          {LEAD_CHANNELS[lead.channel as keyof typeof LEAD_CHANNELS] ?? lead.channel}
          {` · ${fmtDay(lead.contacted_at)}`}
          {lead.campaign_name ? ` · ${lead.campaign_name}` : ""}
          {lead.ref_code ? ` · ${lead.ref_code}` : ""}
          {lead.enquiry ? ` · ${lead.enquiry}` : ""}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {lead.job_id ? (
          // เปิดงานไปแล้ว สถานะล็อกไว้ — เปลี่ยนได้ที่หน้างาน ไม่ใช่ที่นี่
          <Chip tone="us">{LEAD_STATUS[lead.status as LeadStatus]?.label ?? lead.status}</Chip>
        ) : (
          <LeadStatusSelect leadId={lead.id} status={lead.status} />
        )}
        {!lead.job_id ? (
          <>
            <Link
              href={`/jobs/new?lead=${lead.id}&name=${encodeURIComponent(lead.contact_name)}`}
              className="btn btn-quiet py-1 text-xs"
            >
              เปิดงาน
            </Link>
            <form action={deleteLeadAction}>
              <input type="hidden" name="lead_id" value={lead.id} />
              <button className="btn btn-quiet px-2 py-0.5 text-xs" aria-label="ลบรายการนี้">
                ลบ
              </button>
            </form>
          </>
        ) : null}
      </div>
    </Row>
  );
}
