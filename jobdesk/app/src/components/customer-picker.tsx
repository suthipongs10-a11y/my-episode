"use client";

import { useState } from "react";
import type { CustomerOption } from "@/lib/queries";
import { Field } from "./ui";

/** เลือกลูกค้าเดิม หรือพิมพ์ลูกค้าใหม่ตรงนี้เลย — งานราคานี้ต้องเปิดงานได้ใน 30 วินาที */
export function CustomerPicker({ options }: { options: CustomerOption[] }) {
  const [value, setValue] = useState(options.length ? String(options[0].id) : "new");
  const isNew = value === "new";

  return (
    <>
      <Field label="ลูกค้า">
        <select
          className="field"
          name="customer_id"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
          <option value="new">+ ลูกค้าใหม่</option>
        </select>
      </Field>

      {isNew ? (
        <div className="grid gap-3 rounded-lg border border-line bg-surface-2 p-3 sm:grid-cols-3">
          <Field label="ชื่อลูกค้า">
            <input className="field" name="new_customer_name" required={isNew} autoFocus />
          </Field>
          <Field label="ชื่อร้าน / กิจการ">
            <input className="field" name="new_customer_business" />
          </Field>
          <Field label="เบอร์โทร">
            <input className="field" name="new_customer_phone" inputMode="tel" />
          </Field>
        </div>
      ) : null}
    </>
  );
}
