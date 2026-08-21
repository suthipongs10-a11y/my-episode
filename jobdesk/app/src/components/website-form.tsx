import { createWebsiteAction, updateWebsiteAction } from "@/lib/actions";
import { dateInputValue } from "@/lib/format";
import type { CustomerOption, WebsiteRow } from "@/lib/queries";
import { Field, Panel } from "./ui";
import { Submit } from "./submit";

export function WebsiteForm({
  site,
  customers,
  fixedCustomerId,
  originJobId,
  back,
}: {
  site?: WebsiteRow;
  customers?: CustomerOption[];
  fixedCustomerId?: number;
  originJobId?: number;
  back?: string;
}) {
  const editing = Boolean(site);

  return (
    <Panel title={editing ? "แก้ไขข้อมูลเว็บ" : "เว็บใหม่"}>
      <form action={editing ? updateWebsiteAction : createWebsiteAction} className="grid gap-3 p-3">
        {editing ? <input type="hidden" name="website_id" value={site!.id} /> : null}
        {originJobId ? <input type="hidden" name="origin_job_id" value={originJobId} /> : null}
        {back ? <input type="hidden" name="back" value={back} /> : null}

        {!editing ? (
          fixedCustomerId ? (
            <input type="hidden" name="customer_id" value={fixedCustomerId} />
          ) : (
            <Field label="ลูกค้า">
              <select className="field" name="customer_id" required>
                {(customers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          )
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="โดเมน">
            <input
              className="field"
              name="domain"
              required
              placeholder="baansuancoffee.com"
              defaultValue={site?.domain ?? ""}
            />
          </Field>
          <Field label="ที่อยู่เว็บ">
            <input
              className="field"
              name="url"
              inputMode="url"
              placeholder="https://baansuancoffee.com"
              defaultValue={site?.url ?? ""}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="หน้าจัดการ (admin)">
            <input className="field" name="admin_url" defaultValue={site?.admin_url ?? ""} />
          </Field>
          <Field label="ระบบที่ใช้">
            <input
              className="field"
              name="platform"
              placeholder="wordpress"
              defaultValue={site?.platform ?? ""}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ผู้ให้บริการโดเมน">
            <input className="field" name="registrar" defaultValue={site?.registrar ?? ""} />
          </Field>
          <Field label="ผู้ให้บริการโฮสต์">
            <input
              className="field"
              name="hosting_provider"
              defaultValue={site?.hosting_provider ?? ""}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="โดเมนหมดอายุ" hint="วันที่เร็วกว่าในสองอันนี้คือวันที่ระบบใช้เตือน">
            <input
              className="field"
              type="date"
              name="domain_expires_on"
              defaultValue={dateInputValue(site?.domain_expires_on)}
            />
          </Field>
          <Field label="โฮสต์หมดอายุ">
            <input
              className="field"
              type="date"
              name="hosting_expires_on"
              defaultValue={dateInputValue(site?.hosting_expires_on)}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ต้นทุนต่ออายุต่อปี (฿)" hint="ที่เราจ่ายผู้ให้บริการ">
            <input
              className="field num"
              name="renewal_cost"
              inputMode="decimal"
              defaultValue={site?.renewal_cost ?? ""}
            />
          </Field>
          <Field label="ราคาที่เก็บลูกค้าต่อปี (฿)" hint="ส่วนต่างคือกำไรที่ไม่ต้องจ่ายค่าโฆษณาเพื่อให้ได้มา">
            <input
              className="field num"
              name="renewal_price"
              inputMode="decimal"
              defaultValue={site?.renewal_price ?? ""}
            />
          </Field>
        </div>

        <Field
          label="รหัสผ่านอยู่ที่ไหน"
          hint="ใส่แค่ชื่อรายการใน password manager เช่น “Bitwarden: อู่ช่างเอก” — ห้ามใส่รหัสจริง"
        >
          <input
            className="field"
            name="credential_ref"
            placeholder="Bitwarden: baansuancoffee"
            defaultValue={site?.credential_ref ?? ""}
          />
        </Field>

        <Field label="บันทึก">
          <textarea className="field" name="note" rows={3} defaultValue={site?.note ?? ""} />
        </Field>

        <div>
          <Submit>{editing ? "บันทึกการแก้ไข" : "เพิ่มเว็บ"}</Submit>
        </div>
      </form>
    </Panel>
  );
}
