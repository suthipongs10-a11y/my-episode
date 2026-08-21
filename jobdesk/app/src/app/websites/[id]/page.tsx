import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getWebsite, listActivity } from "@/lib/queries";
import { archiveWebsiteAction } from "@/lib/actions";
import { fmtDate, fmtDateTime, thb } from "@/lib/format";
import { Shell } from "@/components/shell";
import { Empty, Panel, Row } from "@/components/ui";
import { WebsiteForm } from "@/components/website-form";
import { Submit } from "@/components/submit";

export const dynamic = "force-dynamic";

export default async function WebsitePage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const websiteId = Number(id);
  if (!Number.isInteger(websiteId)) notFound();

  const site = await getWebsite(websiteId);
  if (!site) notFound();
  const activity = await listActivity("website", websiteId);

  return (
    <Shell>
      <div className="mb-4">
        <Link href="/renewals" className="text-xs text-muted hover:underline">
          ← กลับไปหน้าต่ออายุ
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{site.domain}</h1>
        <p className="text-sm text-muted">
          <Link href={`/customers/${site.customer_id}`} className="hover:underline">
            {site.customer}
          </Link>
          {site.is_active ? "" : " · เลิกดูแลแล้ว"}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <WebsiteForm site={site} />

        <div className="flex flex-col gap-4">
          <Panel title="ลิงก์และเงิน">
            <Row>
              <span className="text-muted">เว็บ</span>
              {site.url ? (
                <a href={site.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  เปิดเว็บ
                </a>
              ) : (
                <span className="text-muted">—</span>
              )}
            </Row>
            <Row>
              <span className="text-muted">หน้าจัดการ</span>
              {site.admin_url ? (
                <a href={site.admin_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  เปิดหน้า admin
                </a>
              ) : (
                <span className="text-muted">—</span>
              )}
            </Row>
            <Row>
              <span className="text-muted">รหัสผ่านอยู่ที่</span>
              <span>{site.credential_ref ?? "—"}</span>
            </Row>
            <Row>
              <span className="text-muted">โดเมนหมดอายุ</span>
              <span className="num">{fmtDate(site.domain_expires_on)}</span>
            </Row>
            <Row>
              <span className="text-muted">โฮสต์หมดอายุ</span>
              <span className="num">{fmtDate(site.hosting_expires_on)}</span>
            </Row>
            <Row>
              <span className="text-muted">กำไรต่ออายุต่อปี</span>
              <span className="num text-accent">
                ฿{thb((site.renewal_price ?? 0) - (site.renewal_cost ?? 0))}
              </span>
            </Row>
          </Panel>

          <Panel title="ไทม์ไลน์" meta={<span className="num">{activity.length}</span>}>
            {activity.length === 0 ? (
              <Empty>ยังไม่มีความเคลื่อนไหว</Empty>
            ) : (
              <ol className="divide-y divide-line-soft">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-baseline justify-between gap-3 px-3 py-1.5 text-xs">
                    <span>{describe(a.action, a.to_value)}</span>
                    <span className="num shrink-0 text-muted">{fmtDateTime(a.created_at)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          {site.is_active ? (
            <form action={archiveWebsiteAction} className="rounded-lg border border-line bg-surface p-3">
              <input type="hidden" name="website_id" value={site.id} />
              <p className="mb-2 text-xs text-muted">
                เลิกดูแลเว็บนี้ — จะหายจากหน้าต่ออายุและไม่เตือนอีก ข้อมูลยังอยู่ครบ
              </p>
              <Submit variant="quiet">เลิกดูแล</Submit>
            </form>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}

const LABELS: Record<string, string> = {
  created: "เพิ่มเข้าระบบ",
  updated: "แก้ไขข้อมูล",
  archived: "เลิกดูแล",
  renewal_status_changed: "เปลี่ยนสถานะต่ออายุ",
  renewed: "ต่ออายุแล้ว",
};

function describe(action: string, to: string | null): string {
  if (action === "renewed" && to) return `ต่ออายุแล้ว เก็บได้ ฿${thb(Number(to))}`;
  if (action === "renewal_status_changed" && to) return `${LABELS[action]} → ${to}`;
  return LABELS[action] ?? action;
}
