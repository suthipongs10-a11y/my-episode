-- Phase 2: real file attachments.
--
-- Files live in the database as bytea rather than in object storage. That keeps
-- a local Postgres and a Supabase project behaving identically with no extra
-- configuration, and it survives a host with an ephemeral filesystem. The cost
-- is database size: at a 5 MB cap per file (enforced in the upload action),
-- a few hundred slips and screenshots a year is tens of megabytes. If the store
-- ever outgrows that, move the payload to object storage and keep this table as
-- the index — the columns already describe everything a bucket key would need.

BEGIN;

CREATE TABLE IF NOT EXISTS attachments (
    id          bigserial PRIMARY KEY,
    note_id     bigint NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    filename    text NOT NULL,
    mime_type   text NOT NULL,
    byte_size   integer NOT NULL CHECK (byte_size > 0),
    data        bytea NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attachments_note_id_idx ON attachments (note_id);

-- notes.file_url stays for pasting a link to something hosted elsewhere;
-- attachments is for files uploaded into JobDesk itself.

COMMIT;
