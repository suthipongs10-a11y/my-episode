import { addTaskAction, applyTemplateAction, deleteTaskAction } from "@/lib/actions";
import { templateFor } from "@/lib/templates";
import type { TaskRow } from "@/lib/queries";
import { Panel } from "./ui";
import { TaskToggle } from "./task-toggle";
import { Submit } from "./submit";

export function Checklist({
  jobId,
  packageName,
  tasks,
}: {
  jobId: number;
  packageName: string | null;
  tasks: TaskRow[];
}) {
  const done = tasks.filter((t) => t.done_at).length;
  const template = templateFor(packageName);

  return (
    <Panel
      title="เช็กลิสต์"
      meta={tasks.length > 0 ? <span className="num">{done}/{tasks.length}</span> : undefined}
    >
      {tasks.length > 0 ? (
        <div
          className="h-1 bg-surface-2"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={tasks.length}
          aria-label={`ทำไปแล้ว ${done} จาก ${tasks.length} รายการ`}
        >
          <div
            className="h-full bg-accent transition-[width]"
            style={{ width: `${Math.round((done / tasks.length) * 100)}%` }}
          />
        </div>
      ) : null}

      {tasks.length === 0 ? (
        <div className="px-3 py-6 text-center">
          <p className="text-sm text-muted">ยังไม่มีเช็กลิสต์</p>
          {template.length > 0 ? (
            <form action={applyTemplateAction} className="mt-2">
              <input type="hidden" name="job_id" value={jobId} />
              <Submit>ใส่เช็กลิสต์ของ “{packageName}” ({template.length} ข้อ)</Submit>
            </form>
          ) : (
            <p className="mt-1 text-xs text-muted">แพ็กเกจนี้ยังไม่มีแม่แบบ เพิ่มเองข้างล่างได้</p>
          )}
        </div>
      ) : (
        <ul>
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-start gap-2 border-b border-line-soft px-3 py-1.5 text-sm last:border-b-0"
            >
              <TaskToggle jobId={jobId} taskId={t.id} done={Boolean(t.done_at)} title={t.title} />
              <form action={deleteTaskAction}>
                <input type="hidden" name="job_id" value={jobId} />
                <input type="hidden" name="task_id" value={t.id} />
                <button className="btn btn-quiet px-2 py-0 text-xs" aria-label={`ลบ ${t.title}`}>
                  ลบ
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={addTaskAction} className="flex gap-2 border-t border-line bg-surface-2 p-3">
        <input type="hidden" name="job_id" value={jobId} />
        <input
          className="field"
          name="title"
          required
          placeholder="เพิ่มรายการ เช่น ใส่รูปหน้าร้าน"
          aria-label="รายการใหม่"
        />
        <Submit variant="quiet">เพิ่ม</Submit>
      </form>
    </Panel>
  );
}
