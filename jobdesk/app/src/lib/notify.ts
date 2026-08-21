import "server-only";
import { env } from "./env";

export type SendResult = { channel: string; ok: boolean; error?: string };

const TIMEOUT_MS = 10_000;

async function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${detail.slice(0, 200)}`);
  }
}

async function sendTelegram(text: string): Promise<SendResult> {
  const cfg = env.telegram!;
  try {
    await post(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
      chat_id: cfg.chatId,
      text,
      disable_web_page_preview: true,
    });
    return { channel: "telegram", ok: true };
  } catch (e) {
    return { channel: "telegram", ok: false, error: String(e instanceof Error ? e.message : e) };
  }
}

async function sendLine(text: string): Promise<SendResult> {
  const cfg = env.line!;
  try {
    await post(
      "https://api.line.me/v2/bot/message/push",
      { to: cfg.to, messages: [{ type: "text", text }] },
      { Authorization: `Bearer ${cfg.token}` },
    );
    return { channel: "line", ok: true };
  } catch (e) {
    return { channel: "line", ok: false, error: String(e instanceof Error ? e.message : e) };
  }
}

/** ช่องทางที่ตั้งค่าไว้แล้ว — หน้าเว็บใช้บอกผู้ใช้ว่ายังไม่ได้ตั้งอะไรเลย */
export function configuredChannels(): string[] {
  const list: string[] = [];
  if (env.telegram) list.push("telegram");
  if (env.line) list.push("line");
  return list;
}

/**
 * ส่งข้อความออกทุกช่องทางที่ตั้งค่าไว้
 *
 * ไม่โยน error ออกไปโดยตั้งใจ — การเตือนล้มเหลวต้องไม่ทำให้งาน cron ทั้งชุดตาย
 * และต้องไม่ทำให้ระบบคิดว่าส่งไปแล้วทั้งที่ยังไม่ได้ส่ง ตัวเรียกดูผลจาก ok เอง
 */
export async function sendNotification(text: string): Promise<SendResult[]> {
  const jobs: Promise<SendResult>[] = [];
  if (env.telegram) jobs.push(sendTelegram(text));
  if (env.line) jobs.push(sendLine(text));

  if (jobs.length === 0) {
    return [{ channel: "none", ok: false, error: "ยังไม่ได้ตั้งค่าช่องทางแจ้งเตือน" }];
  }
  return Promise.all(jobs);
}
