import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createCustomerAction } from "@/lib/actions";
import { Shell } from "@/components/shell";
import { Field, Panel } from "@/components/ui";
import { Submit } from "@/components/submit";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  await requireSession();

  return (
    <Shell>
      <div className="mx-auto max-w-xl">
        <Link href="/customers" className="text-xs text-muted hover:underline">
          ← กลับไปรายชื่อลูกค้า
        </Link>
        <h1 className="mt-1 mb-4 text-xl font-semibold">ลูกค้าใหม่</h1>

        <Panel title="ข้อมูลติดต่อ">
          <form action={createCustomerAction} className="grid gap-3 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="ชื่อลูกค้า">
                <input className="field" name="display_name" required autoFocus />
              </Field>
              <Field label="ชื่อร้าน / กิจการ">
                <input className="field" name="business_name" />
              </Field>
              <Field label="เบอร์โทร">
                <input className="field" name="phone" inputMode="tel" />
              </Field>
              <Field label="LINE ID">
                <input className="field" name="line_id" />
              </Field>
            </div>
            <Field label="ลิงก์เฟซบุ๊ก">
              <input className="field" name="facebook_url" inputMode="url" />
            </Field>
            <Field label="บันทึก">
              <textarea className="field" name="note" rows={3} />
            </Field>
            <p className="text-xs text-muted">
              เก็บเท่าที่จำเป็น — ข้อมูลเหล่านี้เป็นข้อมูลส่วนบุคคลตาม PDPA
              และห้ามเก็บรหัสผ่านของลูกค้าไว้ที่นี่
            </p>
            <div>
              <Submit>บันทึก</Submit>
            </div>
          </form>
        </Panel>
      </div>
    </Shell>
  );
}
