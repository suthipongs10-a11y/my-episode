import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { customerOptions } from "@/lib/queries";
import { createJobAction } from "@/lib/actions";
import { todayInputValue } from "@/lib/format";
import { Shell } from "@/components/shell";
import { Field, Panel } from "@/components/ui";
import { CustomerPicker } from "@/components/customer-picker";
import { Submit } from "@/components/submit";

export const dynamic = "force-dynamic";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; name?: string }>;
}) {
  await requireSession();
  const [options, params] = await Promise.all([customerOptions(), searchParams]);
  const leadId = Number(params.lead);
  const fromLead = Number.isInteger(leadId) && leadId > 0 ? leadId : null;

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <Link href={fromLead ? "/leads" : "/board"} className="text-xs text-muted hover:underline">
          {fromLead ? "← กลับไปหน้าคนทัก" : "← กลับไปบอร์ดงาน"}
        </Link>
        <h1 className="mt-1 mb-4 text-xl font-semibold">งานใหม่</h1>

        {fromLead ? (
          <p className="mb-3 rounded-lg border border-line bg-accent-tint px-3 py-2 text-xs text-ink">
            เปิดงานจากคนที่ทักมา — พอกดเปิดงาน รายการนี้จะถูกนับเป็น “ปิดได้” ให้เอง
          </p>
        ) : null}

        <Panel title="รายละเอียด">
          <form action={createJobAction} className="grid gap-3 p-3">
            {fromLead ? <input type="hidden" name="lead_id" value={fromLead} /> : null}
            <CustomerPicker options={options} defaultNewName={fromLead ? params.name : undefined} />

            <Field label="ชื่องาน">
              <input className="field" name="title" required placeholder="เช่น เว็บร้านกาแฟบ้านสวน" />
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="แพ็กเกจ">
                <input className="field" name="package" defaultValue="เว็บ 1990 สองภาษา" />
              </Field>
              <Field label="ราคาขาย (฿)">
                <input
                  className="field num"
                  name="price_thb"
                  inputMode="decimal"
                  defaultValue="1990"
                  required
                />
              </Field>
              <Field label="รอบแก้ที่รวมในแพ็ก">
                <input className="field num" name="revisions_included" inputMode="numeric" defaultValue="2" />
              </Field>
            </div>

            <Field label="กำหนดส่ง" hint="เว้นว่างได้ แต่งานที่ไม่มีกำหนดส่งคืองานที่ค้างนานที่สุด">
              <input className="field" type="date" name="due_on" defaultValue={todayInputValue()} />
            </Field>

            <Field label="บันทึก" hint="ลูกค้าอยากได้อะไร ต้องขอข้อมูลอะไรบ้าง">
              <textarea className="field" name="note" rows={3} />
            </Field>

            <p className="text-xs text-muted">
              งานใหม่จะเริ่มที่สถานะ “รอข้อมูลลูกค้า” ซึ่งนับเป็นงานที่ต้องทวง ไม่ใช่งานที่ต้องทำ
            </p>

            <div>
              <Submit>เปิดงาน</Submit>
            </div>
          </form>
        </Panel>
      </div>
    </Shell>
  );
}
