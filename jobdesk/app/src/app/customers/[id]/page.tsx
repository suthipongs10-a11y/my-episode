import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getCustomer, listJobsForCustomer, listWebsitesForCustomer } from "@/lib/queries";
import { updateCustomerAction } from "@/lib/actions";
import { fmtDay, thb } from "@/lib/format";
import { Shell } from "@/components/shell";
import { Empty, Field, Panel, Row, StatusChip } from "@/components/ui";
import { Submit } from "@/components/submit";

export const dynamic = "force-dynamic";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId)) notFound();

  const customer = await getCustomer(customerId);
  if (!customer) notFound();
  const [jobs, websites] = await Promise.all([
    listJobsForCustomer(customerId),
    listWebsitesForCustomer(customerId),
  ]);
  const outstanding = jobs.reduce((sum, j) => sum + (j.status === "cancelled" ? 0 : j.outstanding), 0);

  return (
    <Shell>
      <div className="mb-4">
        <Link href="/customers" className="text-xs text-muted hover:underline">
          ← กลับไปรายชื่อลูกค้า
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          {customer.display_name}
          {customer.business_name ? (
            <span className="font-normal text-muted"> · {customer.business_name}</span>
          ) : null}
        </h1>
        <p className="text-sm text-muted">
          {jobs.length} งาน · จ่ายมาแล้ว <span className="num">฿{thb(customer.paid_total)}</span>
          {outstanding > 0 ? (
            <>
              {" · ค้างรับ "}
              <span className="num text-crit">฿{thb(outstanding)}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Panel
          title="งานของลูกค้ารายนี้"
          action={
            <Link href="/jobs/new" className="btn btn-quiet text-xs">
              + งานใหม่
            </Link>
          }
        >
          {jobs.length === 0 ? (
            <Empty>ยังไม่มีงาน</Empty>
          ) : (
            jobs.map((j) => (
              <Row key={j.id}>
                <div className="min-w-0">
                  <Link href={`/jobs/${j.id}`} className="block truncate font-medium hover:underline">
                    {j.title}
                  </Link>
                  <div className="text-xs text-muted">
                    {j.package ?? "—"} · ฿{thb(j.price)}
                    {j.delivered_on ? ` · ส่งมอบ ${fmtDay(j.delivered_on)}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {j.outstanding > 0 ? (
                    <span className="num text-xs text-crit">ค้าง ฿{thb(j.outstanding)}</span>
                  ) : null}
                  <StatusChip status={j.status} />
                </div>
              </Row>
            ))
          )}
        </Panel>

        <div className="flex flex-col gap-4">
        <Panel
          title="เว็บที่ดูแล"
          meta={<span className="num">{websites.length}</span>}
          action={
            <Link href={`/websites/new?customer=${customer.id}`} className="btn btn-quiet text-xs">
              + เพิ่มเว็บ
            </Link>
          }
        >
          {websites.length === 0 ? (
            <Empty>ยังไม่มีเว็บในระบบ</Empty>
          ) : (
            websites.map((w) => (
              <Row key={w.id}>
                <div className="min-w-0">
                  <Link href={`/websites/${w.id}`} className="block truncate font-medium hover:underline">
                    {w.domain}
                  </Link>
                  <div className="truncate text-xs text-muted">
                    หมดอายุ {fmtDay(w.domain_expires_on ?? w.hosting_expires_on)}
                    {w.renewal_price !== null ? ` · ต่ออายุ ฿${thb(w.renewal_price)}/ปี` : ""}
                  </div>
                </div>
              </Row>
            ))
          )}
        </Panel>

        <Panel title="ข้อมูลติดต่อ">
          <form action={updateCustomerAction} className="grid gap-3 p-3">
            <input type="hidden" name="customer_id" value={customer.id} />
            <Field label="ชื่อลูกค้า">
              <input className="field" name="display_name" defaultValue={customer.display_name} required />
            </Field>
            <Field label="ชื่อร้าน / กิจการ">
              <input className="field" name="business_name" defaultValue={customer.business_name ?? ""} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="เบอร์โทร">
                <input className="field" name="phone" defaultValue={customer.phone ?? ""} inputMode="tel" />
              </Field>
              <Field label="LINE ID">
                <input className="field" name="line_id" defaultValue={customer.line_id ?? ""} />
              </Field>
            </div>
            <Field label="ลิงก์เฟซบุ๊ก">
              <input className="field" name="facebook_url" defaultValue={customer.facebook_url ?? ""} />
            </Field>
            <Field label="บันทึก">
              <textarea className="field" name="note" rows={3} defaultValue={customer.note ?? ""} />
            </Field>
            <div>
              <Submit>บันทึก</Submit>
            </div>
          </form>
        </Panel>
        </div>
      </div>
    </Shell>
  );
}
