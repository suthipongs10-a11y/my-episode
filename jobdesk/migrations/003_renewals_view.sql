-- Phase 3: the renewals view is now the app's definition of "when does this
-- expire", not just a convenience for poking at the database by hand. Both the
-- renewals page and the reminder job read it, so there is one place that
-- decides an expiry date is the earlier of the domain's and the host's.
--
-- Adds the columns the UI needs (customer_id to link, url to open, note) and
-- drops websites whose renewal the customer already declined — those are not
-- work waiting to happen.

BEGIN;

DROP VIEW IF EXISTS v_renewals_due;

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
