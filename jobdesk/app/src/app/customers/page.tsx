import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listCustomers } from "@/lib/queries";
import { thb } from "@/lib/format";
import { Shell } from "@/components/shell";
import { Chip, Empty, Panel, Row } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSession();
  const { q } = await searchParams;
  const customers = await listCustomers(q);

  return (
    <Shell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">ลูกค้า</h1>
        <div className="flex items-center gap-2">
          <form action="/customers" className="flex gap-2">
            <input
              className="field w-48"
              name="q"
              defaultValue={q ?? ""}
              placeholder="ค้นชื่อ ร้าน หรือเบอร์"
              aria-label="ค้นหาลูกค้า"
            />
            <button className="btn" type="submit">
              ค้นหา
            </button>
          </form>
          <Link href="/customers/new" className="btn btn-primary">
            + ลูกค้าใหม่
          </Link>
        </div>
      </div>

      <Panel title="รายชื่อ" meta={<span className="num">{customers.length}</span>}>
        {customers.length === 0 ? (
          <Empty>{q ? `ไม่พบลูกค้าที่ตรงกับ “${q}”` : "ยังไม่มีลูกค้าในระบบ"}</Empty>
        ) : (
          customers.map((c) => (
            <Row key={c.id}>
              <div className="min-w-0">
                <Link href={`/customers/${c.id}`} className="block truncate font-medium hover:underline">
                  {c.display_name}
                  {c.business_name ? <span className="text-muted"> · {c.business_name}</span> : null}
                </Link>
                <div className="truncate text-xs text-muted">
                  {c.phone ?? "ไม่มีเบอร์"}
                  {c.line_id ? ` · LINE ${c.line_id}` : ""}
                  {` · ${c.job_count} งาน`}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {c.open_count > 0 ? <Chip tone="us">งานเปิด {c.open_count}</Chip> : null}
                <span className="num text-sm">฿{thb(c.paid_total)}</span>
              </div>
            </Row>
          ))
        )}
      </Panel>
    </Shell>
  );
}
