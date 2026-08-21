-- Phase 3: remember which renewal reminders have already gone out.
--
-- The row is keyed on the expiry date it was sent for, not just the website.
-- That is what makes the ladder self-arming: renewing a domain pushes
-- expires_on forward a year, which makes every rung — 30, 14, 7, 1 — eligible
-- again for the new cycle without anything having to reset it. It also makes
-- the cron job idempotent, so running it twice in a day sends nothing twice.

BEGIN;

CREATE TABLE IF NOT EXISTS renewal_reminders (
    id          bigserial PRIMARY KEY,
    website_id  bigint NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    expires_on  date NOT NULL,
    days_before integer NOT NULL,
    channel     text NOT NULL,
    sent_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (website_id, expires_on, days_before)
);

CREATE INDEX IF NOT EXISTS renewal_reminders_website_idx ON renewal_reminders (website_id);

COMMIT;
