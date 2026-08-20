import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { env } from "./env";
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySession } from "./session";

export async function isSignedIn(): Promise<boolean> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value, env.sessionSecret);
}

/** เรียกที่หัวทุกหน้าที่ต้องล็อกอิน — proxy กันชั้นแรก อันนี้คือชั้นที่เชื่อถือได้ */
export async function requireSession(): Promise<void> {
  if (!(await isSignedIn())) redirect("/login");
}

function samePassword(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // เทียบความยาวก่อน เพราะ timingSafeEqual โยน error ถ้าความยาวไม่เท่ากัน
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function signIn(password: string): Promise<boolean> {
  if (!samePassword(password, env.appPassword)) return false;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(env.sessionSecret), sessionCookieOptions);
  return true;
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
