-- WGI Audit Engine — schema v1
-- One migration file, applied by `pnpm db:push`. No ORM migration tool.
--
-- Two rules this schema exists to enforce:
--   * raw data is kept forever (`snapshots`), scores are computed at read time
--   * facts (`findings`) and generated prose (`narratives`) never share a table

-- ---------------------------------------------------------------------------
-- Clients and their competitors
-- ---------------------------------------------------------------------------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text,
  domain text not null,
  business_type text,                    -- guessed from the site, confirmed by a human
  business_type_confirmed boolean default false,
  area_scope text not null,              -- 'nationwide' | 'province' | 'district'
  areas text[] default '{}',
  contact_phone text,
  contact_line text,
  contact_email text,
  lead_source text,
  created_at timestamptz default now()
);

create table if not exists competitors (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  domain text not null,
  name text,
  place_id text,
  source text not null,                  -- 'manual' | 'serp' | 'maps'
  is_primary boolean default false
);

-- ---------------------------------------------------------------------------
-- One run of the pipeline
-- ---------------------------------------------------------------------------
create table if not exists audit_runs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  status text not null default 'queued', -- queued|running|done|failed
  stage text,                            -- last stage that completed; enables resume
  scoring_version int not null default 1,
  cost_thb numeric(10,2) default 0,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- RAW DATA — the heart of the system. Never delete, never transform on write.
-- ---------------------------------------------------------------------------
create table if not exists snapshots (
  id uuid primary key default gen_random_uuid(),
  audit_run_id uuid references audit_runs(id) on delete cascade,
  kind text not null,        -- site|page|psi|serp|gbp|grid|presence|competitor
  target text not null,      -- url / keyword / place_id
  data jsonb not null,
  collected_at timestamptz default now()
);
create index if not exists snapshots_run_kind_idx on snapshots (audit_run_id, kind);

-- ---------------------------------------------------------------------------
-- Crawled pages, ours and competitors'
-- ---------------------------------------------------------------------------
create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  audit_run_id uuid references audit_runs(id) on delete cascade,
  domain text not null,
  is_competitor boolean default false,
  url text not null,
  status_code int,
  page_type text,            -- home|service|location|article|faq|contact|about|other
  title text, title_len int,
  meta_desc text, meta_desc_len int,
  h1 text[], h1_count int,
  word_count int,
  internal_links int, external_links int,
  images_total int, images_no_alt int,
  schema_types text[],
  has_tel_link boolean, has_line_link boolean, has_form boolean,
  form_field_count int,
  has_price boolean, has_review boolean,
  lang text,
  raw_html_path text         -- object storage key; the HTML itself is not in the DB
);
create index if not exists pages_run_idx on pages (audit_run_id, is_competitor);

-- ---------------------------------------------------------------------------
-- Keywords and rankings. `volume` comes from DataForSEO only — never an LLM.
-- ---------------------------------------------------------------------------
create table if not exists keywords (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  term text not null,
  area text,
  intent text,               -- transactional|informational|navigational
  source text,               -- generated|manual
  volume int,
  volume_source text
);

create table if not exists rankings (
  id uuid primary key default gen_random_uuid(),
  audit_run_id uuid references audit_runs(id) on delete cascade,
  keyword_id uuid references keywords(id) on delete cascade,
  engine text not null,      -- google_web | google_maps
  domain text not null,
  position int,              -- null = outside the top 100
  url_found text,
  grid_lat numeric, grid_lng numeric
);

-- ---------------------------------------------------------------------------
-- Findings come from the rules engine only. Every one carries its evidence.
-- ---------------------------------------------------------------------------
create table if not exists findings (
  id uuid primary key default gen_random_uuid(),
  audit_run_id uuid references audit_runs(id) on delete cascade,
  code text not null,        -- e.g. ONP-001
  category text not null,    -- onpage|technical|conversion|local|content|competitor
  severity text not null,    -- critical|high|medium|low
  evidence jsonb not null,
  affected_urls text[],
  effort_hours numeric,
  impact_score int,
  priority_rank int
);
create index if not exists findings_run_idx on findings (audit_run_id, severity);

-- ---------------------------------------------------------------------------
-- LLM prose, kept apart from facts so the two can never be confused
-- ---------------------------------------------------------------------------
create table if not exists narratives (
  id uuid primary key default gen_random_uuid(),
  audit_run_id uuid references audit_runs(id) on delete cascade,
  section text not null,     -- headline|why_no_customers|competitor|action_plan
  model text, prompt_hash text,
  text_th text not null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Cost ledger. Every external call lands here, cache hits included.
-- ---------------------------------------------------------------------------
create table if not exists api_calls (
  id bigserial primary key,
  audit_run_id uuid references audit_runs(id) on delete cascade,
  provider text, endpoint text,
  units numeric, cost_thb numeric(10,4),
  cache_hit boolean default false,
  created_at timestamptz default now()
);
create index if not exists api_calls_run_idx on api_calls (audit_run_id);

-- ---------------------------------------------------------------------------
-- Job queue. A table and a poller, deliberately: the volume does not justify
-- Redis, and this survives a restart without extra infrastructure.
-- ---------------------------------------------------------------------------
create table if not exists jobs (
  id bigserial primary key,
  audit_run_id uuid references audit_runs(id) on delete cascade,
  status text default 'pending',   -- pending|running|done|failed
  attempts int default 0,
  locked_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists jobs_pending_idx on jobs (status, created_at);

-- NOTE: there is deliberately no `scores` table. Scores are derived from raw
-- data at read time by scoring/v{n}.ts, so changing the formula cannot corrupt
-- historical runs.
