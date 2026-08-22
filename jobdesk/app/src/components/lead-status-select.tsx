"use client";

import { useRef, useState, useTransition } from "react";
import { setLeadStatusAction } from "@/lib/actions";
import { LEAD_LOST_REASON, LEAD_STATUS, LEAD_STATUSES } from "@/lib/status";

/**
 * เลือก "ไม่เอา" แล้วต้องบอกเหตุผลก่อนถึงจะบันทึก — ฐานข้อมูลบังคับอยู่แล้ว
 * แต่บังคับที่หน้าจอด้วย จะได้ไม่เจอ error ทีหลังตอนที่ลืมไปแล้วว่าคุยอะไรกัน
 */
export function LeadStatusSelect({ leadId, status }: { leadId: number; status: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [value, setValue] = useState(status);
  // ถามเหตุผลเฉพาะตอนที่ "เพิ่งเปลี่ยน" มาเป็นไม่เอา — รายการที่บันทึกเหตุผลไว้แล้ว
  // ไม่ต้องถามซ้ำ (เหตุผลเดิมแสดงอยู่ในบรรทัดรายละเอียดของแถวอยู่แล้ว)
  const needsReason = value === "lost" && status !== "lost";

  return (
    <form ref={form} action={setLeadStatusAction} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="lead_id" value={leadId} />
      <select
        name="status"
        value={value}
        disabled={pending}
        aria-label="สถานะคนทัก"
        onChange={(e) => {
          setValue(e.target.value);
          if (e.target.value !== "lost") start(() => form.current?.requestSubmit());
        }}
        className="field w-auto py-1 text-xs"
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {LEAD_STATUS[s].label}
          </option>
        ))}
      </select>

      {needsReason ? (
        <>
          <select
            name="lost_reason"
            required
            defaultValue=""
            aria-label="เหตุผลที่ไม่ซื้อ"
            className="field w-auto py-1 text-xs"
          >
            <option value="" disabled>
              เพราะอะไร…
            </option>
            {Object.entries(LEAD_LOST_REASON).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <button className="btn btn-quiet py-1 text-xs" type="submit" disabled={pending}>
            บันทึก
          </button>
        </>
      ) : null}
    </form>
  );
}
