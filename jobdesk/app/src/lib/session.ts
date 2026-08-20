/**
 * Cookie ล็อกอินแบบเซ็นด้วย HMAC — ใช้ Web Crypto อย่างเดียว
 * เพื่อให้ทำงานได้ทั้งใน proxy.ts (edge) และใน server action (node)
 */
const encoder = new TextEncoder();

export const SESSION_COOKIE = "jobdesk_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 วัน

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signSession(secret: string): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = String(expires);
  const mac = await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(payload));
  return `${payload}.${toHex(mac)}`;
}

export async function verifySession(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expires = Number(payload);
  if (!Number.isFinite(expires) || expires * 1000 < Date.now()) return false;

  const bytes = signature.match(/../g);
  if (!bytes || bytes.length !== 32) return false;

  return crypto.subtle.verify(
    "HMAC",
    await key(secret),
    Uint8Array.from(bytes.map((h) => parseInt(h, 16))),
    encoder.encode(payload),
  );
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
  secure: process.env.NODE_ENV === "production",
} as const;
