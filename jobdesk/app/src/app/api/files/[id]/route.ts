import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/auth";
import { getAttachment } from "@/lib/queries";

/** ส่งไฟล์แนบออกไป — เช็คสิทธิ์ซ้ำที่นี่ ไม่พึ่ง proxy อย่างเดียว */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isSignedIn())) {
    return new NextResponse("ต้องล็อกอินก่อน", { status: 401 });
  }

  const { id } = await ctx.params;
  const fileId = Number(id);
  if (!Number.isInteger(fileId)) return new NextResponse("ไม่พบไฟล์", { status: 404 });

  const file = await getAttachment(fileId);
  if (!file) return new NextResponse("ไม่พบไฟล์", { status: 404 });

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime_type,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      // ไฟล์ของลูกค้า อย่าให้ตัวกลางไหนเก็บไว้
      "Cache-Control": "private, max-age=3600",
    },
  });
}
