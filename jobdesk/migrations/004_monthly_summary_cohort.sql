-- v_monthly_summary หารข้ามกลุ่มกัน: ตัวเศษเป็นคนที่ "ปิดได้ในเดือนนี้"
-- แต่ตัวหารเป็นคนที่ "ทักมาในเดือนนี้" ซึ่งเป็นคนละกลุ่ม
-- คนที่ทักมา 31 ส.ค. แล้วปิดได้ 2 ก.ย. จะไปอยู่ในตัวหารของ ส.ค. และตัวเศษของ ก.ย.
-- เดือนที่เคลียร์งานค้างจึงทำให้อัตราปิดเกิน 100% ได้
--
-- แก้เป็น: อัตราปิดใช้กลุ่มเดียวกัน (คนที่ทักมาเดือนนั้น ปิดได้กี่คน)
-- ส่วน CAC ยังใช้ฐานเงินสด (ค่าโฆษณาเดือนนั้น ÷ งานที่ปิดได้เดือนนั้น) ซึ่งถูกต้องอยู่แล้ว
-- จึงแยกสองตัวเลขนี้ออกจากกันให้ชัด

DROP VIEW IF EXISTS v_monthly_summary;

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
