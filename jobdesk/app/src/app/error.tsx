"use client";

import { useEffect } from "react";

/**
 * Server Action ที่โยน error ออกมาจะทำให้ทั้งหน้าพัง และผู้ใช้เห็นแค่รหัส error
 * หน้านี้เปลี่ยนให้เป็นข้อความที่อ่านรู้เรื่องและกดต่อได้ — ข้อความจริงจาก action
 * จะโผล่เฉพาะตอน dev ส่วน production Next.js จะซ่อนไว้ จึงบอกทางออกไว้ให้แทน
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-3 px-4">
      <h1 className="text-xl font-semibold">ทำรายการนี้ไม่สำเร็จ</h1>
      <p className="text-sm text-muted">
        {error.message && !error.message.startsWith("An error occurred")
          ? error.message
          : "อาจเป็นเพราะข้อมูลไม่ครบ หรือรายการนี้ถูกแก้ไปแล้วจากอีกหน้าจอหนึ่ง ลองใหม่อีกครั้งได้เลย"}
      </p>
      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={reset}>
          ลองใหม่
        </button>
        <a className="btn" href="/">
          กลับหน้าแรก
        </a>
      </div>
      {error.digest ? (
        <p className="text-xs text-muted">
          รหัสอ้างอิง <code>{error.digest}</code>
        </p>
      ) : null}
    </main>
  );
}
