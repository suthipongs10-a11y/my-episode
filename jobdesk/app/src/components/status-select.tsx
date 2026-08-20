"use client";

import { useRef, useTransition } from "react";
import { setJobStatusAction } from "@/lib/actions";
import { BOARD_COLUMNS, JOB_STATUS, type JobStatus } from "@/lib/status";

const TONE = {
  us: "border-accent text-accent",
  client: "border-warn text-warn",
  nobody: "border-line text-muted",
} as const;

/**
 * เปลี่ยนสถานะจากในลิสต์ได้เลย ไม่ต้องเปิดหน้างาน — ส่งฟอร์มทันทีที่เลือก
 * ตัวเลือกนี้ทำหน้าที่เป็นทั้งตัวแสดงสถานะและตัวเปลี่ยน จึงระบายสีตามฝั่งที่รออยู่
 */
export function StatusSelect({
  jobId,
  status,
  block = false,
}: {
  jobId: number;
  status: JobStatus;
  block?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const tone = TONE[JOB_STATUS[status].waiting];

  return (
    <form ref={form} action={setJobStatusAction} className={block ? "block" : "contents"}>
      <input type="hidden" name="job_id" value={jobId} />
      <select
        name="status"
        defaultValue={status}
        disabled={pending}
        aria-label="สถานะงาน — เลือกเพื่อเปลี่ยน"
        onChange={() => start(() => form.current?.requestSubmit())}
        className={`field py-1 text-xs font-medium ${tone} ${block ? "w-full" : "w-auto"}`}
      >
        {BOARD_COLUMNS.concat("cancelled").map((s) => (
          <option key={s} value={s}>
            {JOB_STATUS[s].label}
          </option>
        ))}
      </select>
    </form>
  );
}
