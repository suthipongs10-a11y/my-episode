-- JobDesk — database schema for Phases 1-4
-- PostgreSQL 14+ / Supabase. See README.md for the design rationale.
--
-- Design rules this schema enforces:
--   * every expense answers "which job?" (job_id) or is explicitly overhead (NULL)
--   * every enquiry is recorded, not just the ones that converted (leads)
--   * a status change is an event with a timestamp, so stalling is measurable
--   * customer credentials are NEVER stored as plaintext (websites.credential_ref)

BEGIN;

-- ---------------------------------------------------------------- enums ----

CREATE TYPE lead_status AS ENUM (
    'new',            -- ทักมา
    'talking',        -- คุยอยู่
    'quoted',         -- เสนอราคาแล้ว
    'awaiting_deposit',
    'won',
    'ghosted',        -- ไม่ตอบแล้ว
    'lost'            -- ไม่เอา
);

CREATE TYPE lead_lost_reason AS ENUM (
    'too_expensive', 'diy', 'chose_competitor', 'not_ready', 'wrong_fit', 'other'
);

CREATE TYPE job_status AS ENUM (
    'awaiting_brief', -- รอข้อมูลลูกค้า
    'in_progress',    -- กำลังทำ
    'client_review',  -- รอลูกค้าตรวจ
    'revising',       -- แก้ไข
    'awaiting_final_payment',
    'delivered',
    'maintaining',    -- ดูแลอยู่
    'cancelled'
);

-- Which side the ball is on. README §4.3 — the whole home screen splits on this.
CREATE TYPE waiting_on AS ENUM ('us', 'client', 'nobody');

CREATE TYPE payment_kind AS ENUM ('deposit', 'installment', 'full', 'renewal', 'extra');
CREATE TYPE payment_status AS ENUM ('pending', 'received', 'refunded');

CREATE TYPE expense_kind AS ENUM (
    'ads', 'domain', 'hosting', 'theme_plugin', 'stock_media',
    'subcontractor', 'transaction_fee', 'software', 'other'
);

CREATE TYPE ad_spend_source AS ENUM ('manual', 'csv', 'api');

CREATE TYPE renewal_status AS ENUM ('upcoming', 'notified', 'paid', 'declined', 'lapsed');

-- ------------------------------------------------------------ customers ----

CREATE TABLE customers (
    id              bigserial PRIMARY KEY,
    display_name    text NOT NULL,              -- ชื่อที่เรียก
    business_name   text,                       -- ชื่อร้าน/กิจการ
    phone           text,
    line_id         text,
    facebook_url    text,
    email           text,
    address         text,                       -- สำหรับออกใบเสร็จ
    tax_id          text,
    note            text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz                 -- PDPA: soft delete, README §11
);

CREATE INDEX ON customers (display_name);
CREATE INDEX ON customers (phone);

-- -------------------------------------------------------- ad campaigns -----

CREATE TABLE ad_campaigns (
    id              bigserial PRIMARY KEY,
    name            text NOT NULL,
    ref_code        text UNIQUE,                -- ใช้ใน m.me/<page>?ref=<ref_code>
    meta_campaign_id text UNIQUE,               -- filled in only when the API is wired (Phase 5)
    objective       text,
    started_on      date,
    ended_on        date,
    is_active       boolean NOT NULL DEFAULT true,
    note            text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- One row per campaign per day. Shape is identical whether the numbers were
-- typed in, imported from CSV, or pulled from the Marketing API — README §7.1.
CREATE TABLE ad_spend_daily (
    id              bigserial PRIMARY KEY,
    campaign_id     bigint REFERENCES ad_campaigns(id) ON DELETE SET NULL,
    spend_on        date NOT NULL,
    spend_thb       numeric(12,2) NOT NULL CHECK (spend_thb >= 0),
    impressions     integer,
    clicks          integer,
    reported_results integer,                   -- what Meta calls a result; advisory only (§7.3)
    source          ad_spend_source NOT NULL DEFAULT 'manual',
    imported_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (campaign_id, spend_on, source)
);

CREATE INDEX ON ad_spend_daily (spend_on);

-- ----------------------------------------------------------------- leads ----

CREATE TABLE leads (
    id              bigserial PRIMARY KEY,
    customer_id     bigint REFERENCES customers(id) ON DELETE SET NULL,
    contact_name    text NOT NULL,              -- ก่อนกลายเป็นลูกค้าจริงยังไม่มี customer row
    channel         text NOT NULL DEFAULT 'facebook_message',
    campaign_id     bigint REFERENCES ad_campaigns(id) ON DELETE SET NULL,
    ref_code        text,                       -- raw ref from the m.me link, if any
    enquiry         text,
    status          lead_status NOT NULL DEFAULT 'new',
    lost_reason     lead_lost_reason,
    contacted_at    timestamptz NOT NULL DEFAULT now(),
    closed_at       timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT lost_needs_reason
        CHECK (status <> 'lost' OR lost_reason IS NOT NULL)
);

CREATE INDEX ON leads (status);
CREATE INDEX ON leads (contacted_at);
CREATE INDEX ON leads (campaign_id);

-- ------------------------------------------------------------------ jobs ----

CREATE TABLE jobs (
    id              bigserial PRIMARY KEY,
    customer_id     bigint NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    lead_id         bigint UNIQUE REFERENCES leads(id) ON DELETE SET NULL,
    title           text NOT NULL,
    package         text,                       -- 'เว็บ 990', 'แก้ไข', 'ต่ออายุ'
    price_thb       numeric(12,2) NOT NULL CHECK (price_thb >= 0),
    status          job_status NOT NULL DEFAULT 'awaiting_brief',
    waiting_on      waiting_on NOT NULL DEFAULT 'client',
    status_since    timestamptz NOT NULL DEFAULT now(),  -- drives the aging badge, §5.2
    due_on          date,
    started_on      date,
    delivered_on    date,
    revisions_used  integer NOT NULL DEFAULT 0,
    revisions_included integer NOT NULL DEFAULT 2,       -- §12.3
    hours_spent     numeric(6,2),                        -- rough, filled in at delivery §12.4
    note            text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON jobs (status);
CREATE INDEX ON jobs (customer_id);
CREATE INDEX ON jobs (due_on);
CREATE INDEX ON jobs (waiting_on, status_since);

CREATE TABLE job_tasks (
    id              bigserial PRIMARY KEY,
    job_id          bigint NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    title           text NOT NULL,
    position        integer NOT NULL DEFAULT 0,
    done_at         timestamptz
);

CREATE INDEX ON job_tasks (job_id, position);

-- -------------------------------------------------------------- websites ----

-- A website outlives the job that created it: build (990) -> edits -> renewal.
CREATE TABLE websites (
    id              bigserial PRIMARY KEY,
    customer_id     bigint NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    origin_job_id   bigint REFERENCES jobs(id) ON DELETE SET NULL,
    domain          text NOT NULL,
    url             text,
    admin_url       text,
    platform        text,                       -- 'wordpress', 'static', ...
    registrar       text,
    hosting_provider text,
    domain_expires_on   date,
    hosting_expires_on  date,
    renewal_cost_thb    numeric(12,2),          -- what we pay
    renewal_price_thb   numeric(12,2),          -- what the customer pays
    renewal_status  renewal_status NOT NULL DEFAULT 'upcoming',
    -- NEVER a plaintext password. Points at the password manager entry. README §11.
    credential_ref  text,
    note            text,
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON websites (domain_expires_on);
CREATE INDEX ON websites (hosting_expires_on);
CREATE INDEX ON websites (customer_id);

-- -------------------------------------------------------- money in / out ----

CREATE TABLE payments (
    id              bigserial PRIMARY KEY,
    job_id          bigint REFERENCES jobs(id) ON DELETE SET NULL,
    website_id      bigint REFERENCES websites(id) ON DELETE SET NULL,  -- renewals
    customer_id     bigint NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    kind            payment_kind NOT NULL,
    amount_thb      numeric(12,2) NOT NULL CHECK (amount_thb > 0),
    status          payment_status NOT NULL DEFAULT 'received',
    method          text,                       -- 'promptpay', 'transfer', ...
    slip_url        text,
    paid_on         date,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON payments (job_id);
CREATE INDEX ON payments (paid_on);

-- Ad money lives in ad_spend_daily, which is the source of truth for every
-- report. An expenses row of kind 'ads' is only for filing a lump-sum receipt,
-- and v_monthly_summary excludes it so the same baht is never counted twice.
CREATE TABLE expenses (
    id              bigserial PRIMARY KEY,
    job_id          bigint REFERENCES jobs(id) ON DELETE SET NULL,  -- NULL = overhead
    website_id      bigint REFERENCES websites(id) ON DELETE SET NULL,
    campaign_id     bigint REFERENCES ad_campaigns(id) ON DELETE SET NULL,
    kind            expense_kind NOT NULL,
    description     text,
    amount_thb      numeric(12,2) NOT NULL CHECK (amount_thb >= 0),
    vendor          text,
    receipt_url     text,
    spent_on        date NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON expenses (job_id);
CREATE INDEX ON expenses (spent_on);
CREATE INDEX ON expenses (kind);

-- การเตือนต่ออายุที่ส่งไปแล้ว คีย์ด้วยวันหมดอายุของรอบนั้น พอต่ออายุแล้ววันขยับ
-- ชุดเตือน 30/14/7/1 ของรอบใหม่ก็กลับมาพร้อมส่งเองโดยไม่ต้องล้างอะไร (migrations/002)
CREATE TABLE renewal_reminders (
    id          bigserial PRIMARY KEY,
    website_id  bigint NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    expires_on  date NOT NULL,
    days_before integer NOT NULL,
    channel     text NOT NULL,
    sent_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (website_id, expires_on, days_before)
);

CREATE INDEX ON renewal_reminders (website_id);

-- ----------------------------------------------------- notes & audit log ----

CREATE TABLE notes (
    id              bigserial PRIMARY KEY,
    job_id          bigint REFERENCES jobs(id) ON DELETE CASCADE,
    customer_id     bigint REFERENCES customers(id) ON DELETE CASCADE,
    body            text,
    file_url        text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT note_needs_a_parent
        CHECK (job_id IS NOT NULL OR customer_id IS NOT NULL)
);

CREATE INDEX ON notes (job_id);

-- ไฟล์ที่อัปโหลดเข้ามาในระบบ เก็บเป็น bytea เพื่อให้ Postgres ที่รันเองกับ
-- Supabase ทำงานเหมือนกันโดยไม่ต้องตั้งค่า object storage เพิ่ม (migrations/001)
CREATE TABLE attachments (
    id          bigserial PRIMARY KEY,
    note_id     bigint NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    filename    text NOT NULL,
    mime_type   text NOT NULL,
    byte_size   integer NOT NULL CHECK (byte_size > 0),
    data        bytea NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON attachments (note_id);

CREATE TABLE activity_log (
    id              bigserial PRIMARY KEY,
    entity_type     text NOT NULL,              -- 'job', 'lead', 'website'
    entity_id       bigint NOT NULL,
    action          text NOT NULL,              -- 'status_changed', 'payment_added'
    from_value      text,
    to_value        text,
    actor           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON activity_log (entity_type, entity_id, created_at DESC);

-- ----------------------------------------------------------------- views ----

-- Direct profit per job. Allocated ad cost is deliberately NOT in here — it is
-- a monthly figure (README §6.1) and is joined on in the reporting layer.
CREATE VIEW v_job_profit AS
SELECT
    j.id                AS job_id,
    j.customer_id,
    c.display_name      AS customer,
    j.title,
    j.status,
    j.price_thb,
    COALESCE(p.received, 0)          AS received_thb,
    j.price_thb - COALESCE(p.received, 0) AS outstanding_thb,
    COALESCE(e.direct_cost, 0)       AS direct_cost_thb,
    j.price_thb - COALESCE(e.direct_cost, 0) AS gross_profit_thb,
    j.hours_spent,
    CASE WHEN j.hours_spent > 0
         THEN round((j.price_thb - COALESCE(e.direct_cost, 0)) / j.hours_spent, 2)
    END                              AS gross_per_hour_thb,
    j.delivered_on
FROM jobs j
JOIN customers c ON c.id = j.customer_id
LEFT JOIN LATERAL (
    SELECT sum(amount_thb) AS received
    FROM payments WHERE job_id = j.id AND status = 'received'
) p ON true
LEFT JOIN LATERAL (
    SELECT sum(amount_thb) AS direct_cost
    FROM expenses WHERE job_id = j.id
) e ON true;

-- The monthly picture: ad spend allocated across the jobs actually won that
-- month. This is the number README §6.3 tells the app to put a ceiling on.
CREATE VIEW v_monthly_summary AS
WITH months AS (
    SELECT date_trunc('month', spent_on)::date AS month FROM expenses
    UNION SELECT date_trunc('month', paid_on)::date FROM payments WHERE paid_on IS NOT NULL
    UNION SELECT date_trunc('month', spend_on)::date FROM ad_spend_daily
    UNION SELECT date_trunc('month', contacted_at)::date FROM leads
),
rev AS (
    SELECT date_trunc('month', paid_on)::date AS month, sum(amount_thb) AS revenue
    FROM payments WHERE status = 'received' AND paid_on IS NOT NULL GROUP BY 1
),
-- ค่าโฆษณาลงได้สองที่ ห้ามนับซ้ำ: เดือนไหนมีรายวันรายแคมเปญให้ใช้อันนั้น
-- เดือนไหนไม่มีค่อยใช้ expenses kind='ads' — ตรงกับ adSpendBetween() ใน queries.ts
ads_daily AS (
    SELECT date_trunc('month', spend_on)::date AS month, sum(spend_thb) AS thb
    FROM ad_spend_daily GROUP BY 1
),
ads_expense AS (
    SELECT date_trunc('month', spent_on)::date AS month, sum(amount_thb) AS thb
    FROM expenses WHERE kind = 'ads' GROUP BY 1
),
ads AS (
    SELECT m.month, COALESCE(d.thb, e.thb, 0) AS ad_spend
    FROM (SELECT month FROM ads_daily UNION SELECT month FROM ads_expense) m
    LEFT JOIN ads_daily d ON d.month = m.month
    LEFT JOIN ads_expense e ON e.month = m.month
),
cost AS (
    SELECT date_trunc('month', spent_on)::date AS month, sum(amount_thb) AS other_cost
    FROM expenses WHERE kind <> 'ads' GROUP BY 1
),
-- ปิดได้ในเดือนนั้น — ฐานเงินสด ใช้กับ CAC
closed AS (
    SELECT date_trunc('month', closed_at)::date AS month, count(*) AS jobs_won
    FROM leads WHERE status = 'won' AND closed_at IS NOT NULL GROUP BY 1
),
-- คนที่ทักมาเดือนนั้น และในนั้นปิดได้กี่คน — กลุ่มเดียวกัน ใช้กับอัตราปิด
cohort AS (
    SELECT date_trunc('month', contacted_at)::date AS month,
           count(*) AS leads_in,
           count(*) FILTER (WHERE status = 'won') AS cohort_won
    FROM leads GROUP BY 1
)
SELECT
    m.month,
    COALESCE(rev.revenue, 0)                    AS revenue_thb,
    COALESCE(ads.ad_spend, 0)                   AS ad_spend_thb,
    COALESCE(cost.other_cost, 0)                AS other_cost_thb,
    COALESCE(rev.revenue, 0) - COALESCE(ads.ad_spend, 0) - COALESCE(cost.other_cost, 0)
                                                AS net_profit_thb,
    COALESCE(cohort.leads_in, 0)                AS leads_in,
    COALESCE(cohort.cohort_won, 0)              AS cohort_won,
    COALESCE(closed.jobs_won, 0)                AS jobs_won,
    CASE WHEN cohort.leads_in > 0
         THEN round(COALESCE(ads.ad_spend, 0) / cohort.leads_in, 2) END AS cpl_thb,
    CASE WHEN closed.jobs_won > 0
         THEN round(COALESCE(ads.ad_spend, 0) / closed.jobs_won, 2)  END AS cac_thb,
    CASE WHEN cohort.leads_in > 0
         THEN round(100.0 * cohort.cohort_won / cohort.leads_in, 1) END AS win_rate_pct
FROM months m
LEFT JOIN rev    ON rev.month    = m.month
LEFT JOIN ads    ON ads.month    = m.month
LEFT JOIN cost   ON cost.month   = m.month
LEFT JOIN closed ON closed.month = m.month
LEFT JOIN cohort ON cohort.month = m.month
ORDER BY m.month DESC;

-- Feeds the renewals screen (§5.7) and the 30/14/7/1-day reminders (§8).
-- Both the page and the reminder job read this, so there is exactly one place
-- that decides an expiry is the earlier of the domain's and the host's.
CREATE VIEW v_renewals_due AS
SELECT
    w.id            AS website_id,
    w.customer_id,
    c.display_name  AS customer,
    c.phone,
    c.line_id,
    w.domain,
    w.url,
    w.note,
    least(
        COALESCE(w.domain_expires_on,  'infinity'::date),
        COALESCE(w.hosting_expires_on, 'infinity'::date)
    ) AS expires_on,
    least(
        COALESCE(w.domain_expires_on,  'infinity'::date),
        COALESCE(w.hosting_expires_on, 'infinity'::date)
    ) - CURRENT_DATE AS days_left,
    w.domain_expires_on,
    w.hosting_expires_on,
    w.renewal_cost_thb,
    w.renewal_price_thb,
    COALESCE(w.renewal_price_thb, 0) - COALESCE(w.renewal_cost_thb, 0) AS renewal_profit_thb,
    w.renewal_status
FROM websites w
JOIN customers c ON c.id = w.customer_id
WHERE w.is_active
  AND (w.domain_expires_on IS NOT NULL OR w.hosting_expires_on IS NOT NULL)
ORDER BY expires_on;

COMMIT;
