import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/auth";
import { ledger } from "@/lib/queries";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** รายรับรายจ่ายทั้งช่วงเป็น CSV — เอาไปเปิด Excel หรือส่งให้คนทำบัญชีได้เลย */
export async function GET(request: Request) {
  if (!(await isSignedIn())) {
    return new NextResponse("ต้องล็อกอินก่อน", { status: 401 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "1900-01-01";
  const to = url.searchParams.get("to") ?? "2999-12-31";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return new NextResponse("ช่วงวันที่ไม่ถูกต้อง", { status: 400 });
  }

  const rows = await ledger(from, to);
  const header = ["วันที่", "ประเภท", "หมวด", "รายละเอียด", "ลูกค้า", "งาน", "จำนวน"];
  const body = rows.map((r) =>
    [r.entry_date, r.direction, r.kind, r.description, r.customer, r.job, r.amount]
      .map(csvCell)
      .join(","),
  );

  // BOM นำหน้า มิฉะนั้น Excel บนวินโดวส์จะอ่านภาษาไทยเป็นตัวยึกยือ
  const csv = "﻿" + [header.join(","), ...body].join("\r\n") + "\r\n";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jobdesk-${from}-${to}.csv"`,
    },
  });
}
