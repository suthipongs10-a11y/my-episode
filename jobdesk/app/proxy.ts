import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * ชั้นกันแรก: ไม่มี cookie ที่เซ็นถูกต้อง = เด้งไปหน้า login
 * ชั้นที่สองคือ requireSession() ในแต่ละหน้า ซึ่งเป็นชั้นที่เชื่อถือได้จริง
 */
export async function proxy(request: NextRequest) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return NextResponse.next();

  const ok = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, secret);
  if (ok) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // ทุกหน้ายกเว้นหน้า login เอง ไฟล์ static และ favicon
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
