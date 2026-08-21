import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runRenewalReminders } from "@/lib/renewal-notify";

export const dynamic = "force-dynamic";

/**
 * ให้ Vercel Cron เรียกวันละครั้งตอนเช้า (ดู vercel.json)
 * ป้องกันด้วย CRON_SECRET — ถ้าไม่ได้ตั้ง ปลายทางนี้จะปิดตาย ไม่ใช่เปิดให้ใครก็เรียกได้
 */
export async function GET(request: Request) {
  const secret = env.cronSecret;
  if (!secret) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้ง CRON_SECRET — ปลายทางนี้ถูกปิดไว้" },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const run = await runRenewalReminders();
  return NextResponse.json(run, { status: run.errors.length && !run.sent ? 500 : 200 });
}
