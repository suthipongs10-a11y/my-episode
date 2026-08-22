"use client";

import { useState } from "react";
import type { CustomerOption } from "@/lib/queries";
import { Field } from "./ui";

/** เลือกลูกค้าเดิม หรือพิมพ์ลูกค้าใหม่ตรงนี้เลย — งานราคานี้ต้องเปิดงานได้ใน 30 วินาที */
export function CustomerPicker({
  options,
  defaultNewName,
}: {
  options: CustomerOption[];
  /** มาจากคนที่ทักมา — ถ้ามีชื่อมาแล้วให้เปิดโหมด "ลูกค้าใหม่" พร้อมชื่อเลย */
  defaultNewName?: string;
}) {
  const [value, setValue] = useState(
    defaultNewName || options.length === 0 ? "new" : String(options[0].id),
  );
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
            <input
              className="field"
              name="new_customer_name"
              required={isNew}
              defaultValue={defaultNewName}
              autoFocus
            />
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
