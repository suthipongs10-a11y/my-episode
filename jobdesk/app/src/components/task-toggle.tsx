"use client";

import { useRef, useTransition } from "react";
import { toggleTaskAction } from "@/lib/actions";

/** ติ๊กแล้วบันทึกทันที ไม่มีปุ่ม save */
export function TaskToggle({
  jobId,
  taskId,
  done,
  title,
}: {
  jobId: number;
  taskId: number;
  done: boolean;
  title: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  return (
    <form ref={form} action={toggleTaskAction} className="min-w-0 flex-1">
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="task_id" value={taskId} />
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          defaultChecked={done}
          disabled={pending}
          onChange={() => start(() => form.current?.requestSubmit())}
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
        />
        <span className={done ? "text-muted line-through" : ""}>{title}</span>
      </label>
    </form>
  );
}
