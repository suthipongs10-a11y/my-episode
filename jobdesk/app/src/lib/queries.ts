import "server-only";
import { sql } from "./db";
import { OPEN_LEAD_STATUSES, OPEN_STATUSES, type JobStatus, type WaitingOn } from "./status";

/**
 * เงินคำนวณด้วย numeric ใน SQL เสมอ แล้วค่อย cast เป็น float8 ตอนส่งออกมาแสดงผล
 * เพื่อไม่ให้เกิดการปัดเศษระหว่างทาง
 */

export type JobRow = {
  id: number;
  title: string;
  package: string | null;
  price: number;
  status: JobStatus;
  waiting_on: WaitingOn;
  status_since: string;
  due_on: string | null;
  started_on: string | null;
  delivered_on: string | null;
  revisions_used: number;
  revisions_included: number;
  task_total: number;
  task_done: number;
  hours_spent: number | null;
  note: string | null;
  customer_id: number;
  customer: string;
  business_name: string | null;
  phone: string | null;
  line_id: string | null;
  received: number;
  outstanding: number;
  direct_cost: number;
  gross_profit: number;
};

const JOB_SELECT = sql`
  SELECT
    j.id::int, j.title, j.package, j.price_thb::float8 AS price,
    j.status::text, j.waiting_on::text, j.status_since,
    j.due_on, j.started_on, j.delivered_on,
    j.revisions_used, j.revisions_included, j.hours_spent::float8,
    j.note, j.customer_id::int,
    c.display_name AS customer, c.business_name, c.phone, c.line_id,
    COALESCE(p.received, 0)::float8                          AS received,
    (j.price_thb - COALESCE(p.received, 0))::float8           AS outstanding,
    COALESCE(e.direct_cost, 0)::float8                        AS direct_cost,
    (j.price_thb - COALESCE(e.direct_cost, 0))::float8        AS gross_profit,
    COALESCE(t.total, 0)::int                                 AS task_total,
    COALESCE(t.done, 0)::int                                  AS task_done
  FROM jobs j
  JOIN customers c ON c.id = j.customer_id
  LEFT JOIN LATERAL (
    SELECT sum(amount_thb) AS received FROM payments
    WHERE job_id = j.id AND status = 'received'
  ) p ON true
  LEFT JOIN LATERAL (
    SELECT sum(amount_thb) AS direct_cost FROM expenses WHERE job_id = j.id
  ) e ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS total, count(done_at) AS done FROM job_tasks WHERE job_id = j.id
  ) t ON true
`;

export type HomeSummary = {
  need_to_do: number;
  need_to_chase: number;
  overdue: number;
  outstanding: number;
  revenue_month: number;
  cost_month: number;
  profit_month: number;
};

export async function getHomeSummary(): Promise<HomeSummary> {
  const open = OPEN_STATUSES as string[];
  const [row] = await sql<HomeSummary[]>`
    SELECT
      (SELECT count(*) FROM jobs
        WHERE status::text = ANY(${open}) AND waiting_on = 'us')::int      AS need_to_do,
      (SELECT count(*) FROM jobs
        WHERE status::text = ANY(${open}) AND waiting_on = 'client')::int  AS need_to_chase,
      (SELECT count(*) FROM jobs
        WHERE status::text = ANY(${open}) AND due_on < CURRENT_DATE)::int  AS overdue,
      (SELECT COALESCE(sum(j.price_thb - COALESCE(p.received, 0)), 0)
         FROM jobs j
         LEFT JOIN LATERAL (
           SELECT sum(amount_thb) AS received FROM payments
           WHERE job_id = j.id AND status = 'received'
         ) p ON true
        WHERE j.status <> 'cancelled')::float8                             AS outstanding,
      (SELECT COALESCE(sum(amount_thb), 0) FROM payments
        WHERE status = 'received'
          AND paid_on >= date_trunc('month', CURRENT_DATE))::float8        AS revenue_month,
      (SELECT COALESCE(sum(amount_thb), 0) FROM expenses
        WHERE spent_on >= date_trunc('month', CURRENT_DATE))::float8       AS cost_month,
      (
        (SELECT COALESCE(sum(amount_thb), 0) FROM payments
          WHERE status = 'received' AND paid_on >= date_trunc('month', CURRENT_DATE))
        -
        (SELECT COALESCE(sum(amount_thb), 0) FROM expenses
          WHERE spent_on >= date_trunc('month', CURRENT_DATE))
      )::float8                                                            AS profit_month
  `;
  return row;
}

/** งานทั้งหมดที่ยังไม่ถูกยกเลิก — ใช้ทั้งหน้าแรกและบอร์ด จึงยิงครั้งเดียว */
export async function listActiveJobs(): Promise<JobRow[]> {
  return sql<JobRow[]>`
    ${JOB_SELECT}
    WHERE j.status <> 'cancelled'
    ORDER BY j.due_on NULLS LAST, j.status_since
  `;
}

export async function getJob(id: number): Promise<JobRow | null> {
  const rows = await sql<JobRow[]>`${JOB_SELECT} WHERE j.id = ${id}`;
  return rows[0] ?? null;
}

export type PaymentRow = {
  id: number;
  kind: string;
  amount: number;
  status: string;
  method: string | null;
  paid_on: string | null;
};

export async function listPayments(jobId: number): Promise<PaymentRow[]> {
  return sql<PaymentRow[]>`
    SELECT id::int, kind::text, amount_thb::float8 AS amount, status::text, method, paid_on
    FROM payments WHERE job_id = ${jobId}
    ORDER BY paid_on NULLS LAST, id
  `;
}

export type ExpenseRow = {
  id: number;
  kind: string;
  description: string | null;
  amount: number;
  vendor: string | null;
  spent_on: string;
};

export async function listExpenses(jobId: number): Promise<ExpenseRow[]> {
  return sql<ExpenseRow[]>`
    SELECT id::int, kind::text, description, amount_thb::float8 AS amount, vendor, spent_on
    FROM expenses WHERE job_id = ${jobId}
    ORDER BY spent_on, id
  `;
}

export type ActivityRow = {
  id: number;
  action: string;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
};

export async function listActivity(entityType: string, entityId: number): Promise<ActivityRow[]> {
  return sql<ActivityRow[]>`
    SELECT id::int, action, from_value, to_value, created_at
    FROM activity_log
    WHERE entity_type = ${entityType} AND entity_id = ${entityId}
    ORDER BY created_at DESC, id DESC
    LIMIT 50
  `;
}

export type CustomerRow = {
  id: number;
  display_name: string;
  business_name: string | null;
  phone: string | null;
  line_id: string | null;
  facebook_url: string | null;
  note: string | null;
  job_count: number;
  paid_total: number;
  open_count: number;
};

export async function listCustomers(query?: string): Promise<CustomerRow[]> {
  const q = query?.trim();
  const like = q ? `%${q}%` : null;
  return sql<CustomerRow[]>`
    SELECT
      c.id::int, c.display_name, c.business_name, c.phone, c.line_id, c.facebook_url, c.note,
      (SELECT count(*) FROM jobs WHERE customer_id = c.id)::int              AS job_count,
      (SELECT count(*) FROM jobs
        WHERE customer_id = c.id AND status::text = ANY(${OPEN_STATUSES as string[]}))::int AS open_count,
      (SELECT COALESCE(sum(amount_thb), 0) FROM payments
        WHERE customer_id = c.id AND status = 'received')::float8            AS paid_total
    FROM customers c
    WHERE c.deleted_at IS NULL
      ${like ? sql`AND (c.display_name ILIKE ${like} OR c.business_name ILIKE ${like} OR c.phone ILIKE ${like})` : sql``}
    ORDER BY c.display_name
  `;
}

export async function getCustomer(id: number): Promise<CustomerRow | null> {
  const rows = await listCustomers();
  return rows.find((c) => c.id === id) ?? null;
}

export async function listJobsForCustomer(customerId: number): Promise<JobRow[]> {
  return sql<JobRow[]>`
    ${JOB_SELECT}
    WHERE j.customer_id = ${customerId}
    ORDER BY j.created_at DESC
  `;
}

export type CustomerOption = { id: number; label: string };

export async function customerOptions(): Promise<CustomerOption[]> {
  return sql<CustomerOption[]>`
    SELECT id::int,
           display_name || COALESCE(' · ' || business_name, '') AS label
    FROM customers WHERE deleted_at IS NULL ORDER BY display_name
  `;
}

/* ------------------------------------------------------- Phase 2: เช็กลิสต์ */

export type TaskRow = { id: number; title: string; position: number; done_at: string | null };

export async function listTasks(jobId: number): Promise<TaskRow[]> {
  return sql<TaskRow[]>`
    SELECT id::int, title, position, done_at
    FROM job_tasks WHERE job_id = ${jobId}
    ORDER BY position, id
  `;
}

/* ------------------------------------------- Phase 2: บันทึกและไฟล์แนบ */

export type AttachmentMeta = { id: number; filename: string; mime_type: string; byte_size: number };
export type NoteRow = {
  id: number;
  body: string | null;
  file_url: string | null;
  created_at: string;
  files: AttachmentMeta[];
};

export async function listNotes(jobId: number): Promise<NoteRow[]> {
  return sql<NoteRow[]>`
    SELECT
      n.id::int, n.body, n.file_url, n.created_at,
      COALESCE(a.files, '[]'::json) AS files
    FROM notes n
    LEFT JOIN LATERAL (
      SELECT json_agg(
               json_build_object('id', id::int, 'filename', filename,
                                 'mime_type', mime_type, 'byte_size', byte_size)
               ORDER BY id
             ) AS files
      FROM attachments WHERE note_id = n.id
    ) a ON true
    WHERE n.job_id = ${jobId}
    ORDER BY n.created_at DESC, n.id DESC
  `;
}

export type AttachmentFile = { filename: string; mime_type: string; data: Buffer };

export async function getAttachment(id: number): Promise<AttachmentFile | null> {
  const [row] = await sql<AttachmentFile[]>`
    SELECT filename, mime_type, data FROM attachments WHERE id = ${id}
  `;
  return row ?? null;
}

/* --------------------------------------------------- Phase 2: หน้าการเงิน */

export type MonthRow = {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  jobs_delivered: number;
};

/** ทุกเดือนย้อนหลัง n เดือน รวมเดือนที่ไม่มีอะไรเกิดขึ้นด้วย กราฟจะได้ไม่ขาดช่วง */
export async function monthlySeries(n = 12): Promise<MonthRow[]> {
  return sql<MonthRow[]>`
    SELECT
      m::date AS month,
      COALESCE((SELECT sum(amount_thb) FROM payments
                 WHERE status = 'received' AND paid_on >= m
                   AND paid_on < m + interval '1 month'), 0)::float8 AS revenue,
      COALESCE((SELECT sum(amount_thb) FROM expenses
                 WHERE spent_on >= m AND spent_on < m + interval '1 month'), 0)::float8 AS cost,
      (
        COALESCE((SELECT sum(amount_thb) FROM payments
                   WHERE status = 'received' AND paid_on >= m
                     AND paid_on < m + interval '1 month'), 0)
        -
        COALESCE((SELECT sum(amount_thb) FROM expenses
                   WHERE spent_on >= m AND spent_on < m + interval '1 month'), 0)
      )::float8 AS profit,
      (SELECT count(*) FROM jobs
        WHERE delivered_on >= m AND delivered_on < m + interval '1 month')::int AS jobs_delivered
    FROM generate_series(
      date_trunc('month', CURRENT_DATE) - ${`${n - 1} months`}::interval,
      date_trunc('month', CURRENT_DATE),
      interval '1 month'
    ) AS m
    ORDER BY m
  `;
}

export type ExpenseSlice = { kind: string; total: number };

export async function expensesByKind(month: string): Promise<ExpenseSlice[]> {
  return sql<ExpenseSlice[]>`
    SELECT kind::text, sum(amount_thb)::float8 AS total
    FROM expenses
    WHERE spent_on >= ${month}::date AND spent_on < ${month}::date + interval '1 month'
    GROUP BY kind
    ORDER BY total DESC
  `;
}

export type OutstandingRow = {
  job_id: number;
  title: string;
  customer_id: number;
  customer: string;
  phone: string | null;
  line_id: string | null;
  status: JobStatus;
  outstanding: number;
  waiting_days: number;
  /** ถึงกำหนดเก็บแล้วหรือยัง — งานที่ยังทำอยู่ก็ค้างรับ แต่ยังไม่ใช่เงินที่ต้องไปทวง */
  due: boolean;
};

/** ใครค้างเงินเราอยู่ เรียงจากที่ค้างนานที่สุด */
export async function listOutstanding(): Promise<OutstandingRow[]> {
  return sql<OutstandingRow[]>`
    SELECT
      j.id::int AS job_id, j.title, j.customer_id::int, c.display_name AS customer,
      c.phone, c.line_id, j.status::text,
      (j.price_thb - COALESCE(p.received, 0))::float8 AS outstanding,
      (CURRENT_DATE - COALESCE(j.delivered_on, j.started_on, j.created_at::date))::int AS waiting_days,
      (j.status IN ('awaiting_final_payment', 'delivered', 'maintaining')) AS due
    FROM jobs j
    JOIN customers c ON c.id = j.customer_id
    LEFT JOIN LATERAL (
      SELECT sum(amount_thb) AS received FROM payments
      WHERE job_id = j.id AND status = 'received'
    ) p ON true
    WHERE j.status <> 'cancelled'
      AND j.price_thb - COALESCE(p.received, 0) > 0
    ORDER BY due DESC, waiting_days DESC, outstanding DESC
  `;
}

/** ทุกแถวของรายรับรายจ่ายในช่วงหนึ่ง สำหรับส่งออก CSV ไปทำภาษี */
export type LedgerRow = {
  entry_date: string;
  direction: string;
  kind: string;
  description: string | null;
  customer: string | null;
  job: string | null;
  amount: number;
};

export async function ledger(from: string, to: string): Promise<LedgerRow[]> {
  return sql<LedgerRow[]>`
    SELECT p.paid_on AS entry_date, 'รายรับ' AS direction, p.kind::text,
           p.method AS description, c.display_name AS customer, j.title AS job,
           p.amount_thb::float8 AS amount
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      LEFT JOIN jobs j ON j.id = p.job_id
     WHERE p.status = 'received' AND p.paid_on >= ${from}::date AND p.paid_on <= ${to}::date
    UNION ALL
    SELECT e.spent_on, 'รายจ่าย', e.kind::text, e.description,
           c.display_name, j.title, -e.amount_thb::float8
      FROM expenses e
      LEFT JOIN jobs j ON j.id = e.job_id
      LEFT JOIN customers c ON c.id = j.customer_id
     WHERE e.spent_on >= ${from}::date AND e.spent_on <= ${to}::date
    ORDER BY entry_date, direction
  `;
}

/* ------------------------------------------------- Phase 3: ต่ออายุ */

export type RenewalRow = {
  website_id: number;
  customer_id: number;
  customer: string;
  phone: string | null;
  line_id: string | null;
  domain: string;
  url: string | null;
  note: string | null;
  expires_on: string;
  days_left: number;
  domain_expires_on: string | null;
  hosting_expires_on: string | null;
  renewal_cost: number | null;
  renewal_price: number | null;
  renewal_profit: number;
  renewal_status: string;
};

/** ทุกอย่างมาจาก v_renewals_due — มีที่เดียวที่ตัดสินว่า "หมดอายุเมื่อไหร่" */
const RENEWAL_SELECT = sql`
  SELECT
    website_id::int, customer_id::int, customer, phone, line_id, domain, url, note,
    expires_on, days_left::int, domain_expires_on, hosting_expires_on,
    renewal_cost_thb::float8   AS renewal_cost,
    renewal_price_thb::float8  AS renewal_price,
    renewal_profit_thb::float8 AS renewal_profit,
    renewal_status::text
  FROM v_renewals_due
`;

export async function listRenewals(): Promise<RenewalRow[]> {
  return sql<RenewalRow[]>`${RENEWAL_SELECT}`;
}

export async function upcomingRenewals(withinDays = 30): Promise<RenewalRow[]> {
  return sql<RenewalRow[]>`
    ${RENEWAL_SELECT}
    WHERE days_left <= ${withinDays} AND renewal_status <> 'declined'
  `;
}

/**
 * เว็บที่ถึงคิวเตือนพอดีวันนี้และยังไม่เคยเตือนสำหรับรอบนี้
 * คีย์ที่ expires_on ทำให้พอต่ออายุแล้ววันขยับ ชุดเตือนของปีถัดไปกลับมาเองอัตโนมัติ
 */
export async function dueReminders(days: number[]): Promise<RenewalRow[]> {
  if (days.length === 0) return [];
  return sql<RenewalRow[]>`
    ${RENEWAL_SELECT}
    WHERE renewal_status <> 'declined'
      AND days_left = ANY(${days})
      AND NOT EXISTS (
        SELECT 1 FROM renewal_reminders r
        WHERE r.website_id  = v_renewals_due.website_id
          AND r.expires_on  = v_renewals_due.expires_on
          AND r.days_before = v_renewals_due.days_left
      )
  `;
}

export async function markReminderSent(
  websiteId: number,
  expiresOn: string,
  daysBefore: number,
  channel: string,
): Promise<void> {
  await sql`
    INSERT INTO renewal_reminders (website_id, expires_on, days_before, channel)
    VALUES (${websiteId}, ${expiresOn}, ${daysBefore}, ${channel})
    ON CONFLICT (website_id, expires_on, days_before) DO NOTHING
  `;
}

export type RenewalSummary = {
  active_sites: number;
  due_30: number;
  overdue: number;
  /** รายได้ต่ออายุต่อปีถ้าทุกเว็บต่อครบ กับกำไรที่เหลือจริงหลังหักต้นทุน */
  yearly_price: number;
  yearly_profit: number;
  collected_this_year: number;
};

export async function renewalSummary(): Promise<RenewalSummary> {
  const [row] = await sql<RenewalSummary[]>`
    SELECT
      (SELECT count(*) FROM v_renewals_due)::int                                   AS active_sites,
      (SELECT count(*) FROM v_renewals_due
        WHERE days_left BETWEEN 0 AND 30 AND renewal_status <> 'declined')::int    AS due_30,
      (SELECT count(*) FROM v_renewals_due
        WHERE days_left < 0 AND renewal_status <> 'declined')::int                 AS overdue,
      (SELECT COALESCE(sum(renewal_price_thb), 0) FROM v_renewals_due
        WHERE renewal_status <> 'declined')::float8                                AS yearly_price,
      (SELECT COALESCE(sum(renewal_profit_thb), 0) FROM v_renewals_due
        WHERE renewal_status <> 'declined')::float8                                AS yearly_profit,
      (SELECT COALESCE(sum(amount_thb), 0) FROM payments
        WHERE kind = 'renewal' AND status = 'received'
          AND paid_on >= date_trunc('year', CURRENT_DATE))::float8                 AS collected_this_year
  `;
  return row;
}

export type WebsiteRow = {
  id: number;
  customer_id: number;
  customer: string;
  origin_job_id: number | null;
  domain: string;
  url: string | null;
  admin_url: string | null;
  platform: string | null;
  registrar: string | null;
  hosting_provider: string | null;
  domain_expires_on: string | null;
  hosting_expires_on: string | null;
  renewal_cost: number | null;
  renewal_price: number | null;
  renewal_status: string;
  credential_ref: string | null;
  note: string | null;
  is_active: boolean;
};

const WEBSITE_SELECT = sql`
  SELECT
    w.id::int, w.customer_id::int, c.display_name AS customer, w.origin_job_id::int,
    w.domain, w.url, w.admin_url, w.platform, w.registrar, w.hosting_provider,
    w.domain_expires_on, w.hosting_expires_on,
    w.renewal_cost_thb::float8  AS renewal_cost,
    w.renewal_price_thb::float8 AS renewal_price,
    w.renewal_status::text, w.credential_ref, w.note, w.is_active
  FROM websites w
  JOIN customers c ON c.id = w.customer_id
`;

export async function getWebsite(id: number): Promise<WebsiteRow | null> {
  const [row] = await sql<WebsiteRow[]>`${WEBSITE_SELECT} WHERE w.id = ${id}`;
  return row ?? null;
}

export async function listWebsitesForCustomer(customerId: number): Promise<WebsiteRow[]> {
  return sql<WebsiteRow[]>`
    ${WEBSITE_SELECT} WHERE w.customer_id = ${customerId} ORDER BY w.domain
  `;
}

export async function listWebsitesForJob(jobId: number): Promise<WebsiteRow[]> {
  return sql<WebsiteRow[]>`
    ${WEBSITE_SELECT} WHERE w.origin_job_id = ${jobId} ORDER BY w.domain
  `;
}

/* ------------------------------------------------------------------ leads */

export type LeadRow = {
  id: number;
  contact_name: string;
  channel: string;
  campaign_id: number | null;
  campaign_name: string | null;
  ref_code: string | null;
  enquiry: string | null;
  status: string;
  lost_reason: string | null;
  contacted_at: string;
  closed_at: string | null;
  customer_id: number | null;
  job_id: number | null;
};

const LEAD_SELECT = sql`
  SELECT l.id::int, l.contact_name, l.channel, l.campaign_id::int, c.name AS campaign_name,
         l.ref_code, l.enquiry, l.status::text, l.lost_reason::text,
         l.contacted_at, l.closed_at, l.customer_id::int, j.id::int AS job_id
  FROM leads l
  LEFT JOIN ad_campaigns c ON c.id = l.campaign_id
  LEFT JOIN jobs j ON j.lead_id = l.id
`;

/** เรียงจากคนที่ทักมานานที่สุดก่อน — คนที่รอนานที่สุดคือคนที่กำลังจะหายไป */
export async function listLeads(): Promise<LeadRow[]> {
  return sql<LeadRow[]>`${LEAD_SELECT} ORDER BY l.contacted_at`;
}

export async function getLead(id: number): Promise<LeadRow | null> {
  const rows = await sql<LeadRow[]>`${LEAD_SELECT} WHERE l.id = ${id}`;
  return rows[0] ?? null;
}

export type LeadSummary = {
  open_count: number;
  stale_count: number;
  month_in: number;
  month_won: number;
  close_rate: number | null;
  cpl: number | null;
  cac: number | null;
};

/**
 * อัตราปิดคิดจากคนที่ทักมา "เดือนนี้" ไม่ใช่คนที่ปิดได้เดือนนี้
 * เพราะคนที่ทักมาเดือนที่แล้วแล้วเพิ่งปิดได้ ไม่ได้บอกว่าโฆษณาเดือนนี้ดีแค่ไหน
 */
export async function leadSummary(staleDays = 2): Promise<LeadSummary> {
  const open = OPEN_LEAD_STATUSES as string[];
  const [row] = await sql<LeadSummary[]>`
    WITH month_leads AS (
      SELECT status::text FROM leads
      WHERE contacted_at >= date_trunc('month', CURRENT_DATE)
    ),
    spend AS (
      SELECT COALESCE(sum(spend_thb), 0) AS thb FROM ad_spend_daily
      WHERE spend_on >= date_trunc('month', CURRENT_DATE)
    )
    SELECT
      (SELECT count(*) FROM leads WHERE status::text = ANY(${open}))::int   AS open_count,
      (SELECT count(*) FROM leads
        WHERE status::text = ANY(${open})
          AND contacted_at < now() - make_interval(days => ${staleDays}))::int AS stale_count,
      (SELECT count(*) FROM month_leads)::int                               AS month_in,
      (SELECT count(*) FROM month_leads WHERE status = 'won')::int          AS month_won,
      CASE WHEN (SELECT count(*) FROM month_leads) > 0
           THEN round(100.0 * (SELECT count(*) FROM month_leads WHERE status = 'won')
                            / (SELECT count(*) FROM month_leads), 1)::float8 END AS close_rate,
      CASE WHEN (SELECT count(*) FROM month_leads) > 0
           THEN round((SELECT thb FROM spend)
                      / (SELECT count(*) FROM month_leads), 2)::float8 END  AS cpl,
      CASE WHEN (SELECT count(*) FROM month_leads WHERE status = 'won') > 0
           THEN round((SELECT thb FROM spend)
                      / (SELECT count(*) FROM month_leads WHERE status = 'won'), 2)::float8 END AS cac
  `;
  return row;
}

/** เหตุผลที่ไม่ซื้อ นับรวมทั้งหมด — ตารางนี้คือสิ่งที่บอกว่าต้องแก้โฆษณาหรือแก้ราคา */
export async function lostReasonBreakdown(): Promise<{ reason: string; n: number }[]> {
  return sql<{ reason: string; n: number }[]>`
    SELECT lost_reason::text AS reason, count(*)::int AS n
    FROM leads WHERE lost_reason IS NOT NULL
    GROUP BY 1 ORDER BY n DESC
  `;
}

export type CampaignOption = { id: number; name: string; ref_code: string | null };

export async function campaignOptions(): Promise<CampaignOption[]> {
  return sql<CampaignOption[]>`
    SELECT id::int, name, ref_code FROM ad_campaigns
    WHERE is_active ORDER BY name
  `;
}
