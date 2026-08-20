import { addNoteAction, deleteNoteAction } from "@/lib/actions";
import type { NoteRow } from "@/lib/queries";
import { fmtDateTime } from "@/lib/format";
import { Empty, Field, Panel } from "./ui";
import { Submit } from "./submit";

function sizeLabel(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function Notes({ jobId, notes }: { jobId: number; notes: NoteRow[] }) {
  const fileCount = notes.reduce((n, x) => n + x.files.length, 0);

  return (
    <Panel
      title="บันทึกและไฟล์"
      meta={
        <span className="num">
          {notes.length}
          {fileCount > 0 ? ` · ${fileCount} ไฟล์` : ""}
        </span>
      }
    >
      {notes.length === 0 ? (
        <Empty>ยังไม่มีบันทึก — ที่นี่คือที่เก็บสิ่งที่ลูกค้าสั่ง แทนที่จะปล่อยไว้ในแชท</Empty>
      ) : (
        <ul>
          {notes.map((n) => (
            <li key={n.id} className="border-b border-line-soft px-3 py-2 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {n.body ? <p className="text-sm whitespace-pre-wrap">{n.body}</p> : null}

                  {n.files.length > 0 ? (
                    <ul className="mt-1.5 flex flex-wrap gap-2">
                      {n.files.map((f) => (
                        <li key={f.id}>
                          <a
                            href={`/api/files/${f.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2 py-1 text-xs hover:bg-surface"
                          >
                            {f.mime_type.startsWith("image/") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`/api/files/${f.id}`}
                                alt=""
                                className="h-8 w-8 rounded object-cover"
                              />
                            ) : (
                              <span aria-hidden className="text-muted">
                                PDF
                              </span>
                            )}
                            <span className="max-w-40 truncate">{f.filename}</span>
                            <span className="num text-muted">{sizeLabel(f.byte_size)}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {n.file_url ? (
                    <a
                      href={n.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-accent hover:underline"
                    >
                      {n.file_url}
                    </a>
                  ) : null}

                  <p className="num mt-1 text-[11px] text-muted">{fmtDateTime(n.created_at)}</p>
                </div>

                <form action={deleteNoteAction}>
                  <input type="hidden" name="job_id" value={jobId} />
                  <input type="hidden" name="note_id" value={n.id} />
                  <button className="btn btn-quiet px-2 py-0.5 text-xs" aria-label="ลบบันทึกนี้">
                    ลบ
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={addNoteAction} className="grid gap-2 border-t border-line bg-surface-2 p-3">
        <input type="hidden" name="job_id" value={jobId} />
        <Field label="บันทึกใหม่">
          <textarea
            className="field"
            name="body"
            rows={2}
            placeholder="เช่น ลูกค้าขอเปลี่ยนสีปุ่มเป็นเขียว และเพิ่มรูปหน้าร้าน"
          />
        </Field>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Field label="แนบไฟล์" hint="รูปหรือ PDF ไม่เกิน 5MB ต่อไฟล์ เลือกได้หลายไฟล์">
            <input className="field" type="file" name="files" multiple accept="image/*,application/pdf" />
          </Field>
          <div className="flex items-end">
            <Submit>บันทึก</Submit>
          </div>
        </div>
      </form>
    </Panel>
  );
}
