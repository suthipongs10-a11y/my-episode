import "server-only";
import { env } from "./env";
import { dueReminders, markReminderSent, type RenewalRow } from "./queries";
import { configuredChannels, sendNotification } from "./notify";

export type ReminderRun = {
  due: number;
  sent: number;
  channels: string[];
  errors: string[];
  message: string | null;
};

const thb = new Intl.NumberFormat("th-TH-u-ca-gregory", { maximumFractionDigits: 0 });
const day = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Bangkok",
});

function line(r: RenewalRow): string {
  const money =
    r.renewal_price !== null ? ` · เก็บ ฿${thb.format(r.renewal_price)}` : " · ยังไม่ได้ตั้งราคาต่ออายุ";
  const contact = r.phone ? ` (${r.phone})` : "";
  return `• ${r.domain} — ${r.customer}${contact}\n  หมดอายุ ${day.format(new Date(r.expires_on))}${money}`;
}

export function buildMessage(rows: RenewalRow[]): string {
  const groups = new Map<number, RenewalRow[]>();
  for (const r of rows) {
    const list = groups.get(r.days_left) ?? [];
    list.push(r);
    groups.set(r.days_left, list);
  }

  const parts: string[] = ["JobDesk — ใกล้ถึงกำหนดต่ออายุ"];
  for (const days of [...groups.keys()].sort((a, b) => a - b)) {
    const when = days <= 0 ? "หมดอายุวันนี้" : `อีก ${days} วัน`;
    parts.push(`\n[${when}]`);
    for (const r of groups.get(days)!) parts.push(line(r));
  }
  return parts.join("\n");
}

/**
 * งานเตือนต่ออายุ — เรียกได้ทั้งจาก cron และจากปุ่มในหน้าเว็บ
 *
 * บันทึกว่า "ส่งแล้ว" ต่อเมื่อมีช่องทางไหนส่งสำเร็จจริงอย่างน้อยหนึ่งช่อง
 * ถ้าส่งไม่ออกเลย จะไม่บันทึกอะไร เพื่อให้รอบพรุ่งนี้ลองใหม่แทนที่จะเงียบหายไป
 */
export async function runRenewalReminders(): Promise<ReminderRun> {
  const rows = await dueReminders(env.reminderDays);
  if (rows.length === 0) {
    return { due: 0, sent: 0, channels: configuredChannels(), errors: [], message: null };
  }

  const message = buildMessage(rows);
  const results = await sendNotification(message);
  const okChannels = results.filter((r) => r.ok).map((r) => r.channel);
  const errors = results.filter((r) => !r.ok).map((r) => `${r.channel}: ${r.error}`);

  if (okChannels.length === 0) {
    return { due: rows.length, sent: 0, channels: configuredChannels(), errors, message };
  }

  for (const r of rows) {
    await markReminderSent(r.website_id, r.expires_on, r.days_left, okChannels.join("+"));
  }
  return { due: rows.length, sent: rows.length, channels: okChannels, errors, message };
}
