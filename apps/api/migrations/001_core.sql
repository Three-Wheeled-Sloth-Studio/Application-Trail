CREATE TABLE IF NOT EXISTS app_user (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company (
  id uuid PRIMARY KEY,
  canonical_key text NOT NULL UNIQUE,
  canonical_name text NOT NULL,
  aliases jsonb NOT NULL DEFAULT '[]'::jsonb,
  website text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS resume_artifact (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  base_resume_id text,
  variant_id text,
  filename text NOT NULL,
  storage_reference text NOT NULL,
  content_hash text NOT NULL,
  rendered_title text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS opportunity (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  company_id uuid REFERENCES company(id),
  normalized_title text NOT NULL,
  current_status text NOT NULL CHECK (current_status IN ('saved', 'applied', 'passed')),
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS opportunity_user_id_idx ON opportunity(user_id);

CREATE TABLE IF NOT EXISTS listing_observation (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES opportunity(id) ON DELETE CASCADE,
  source_site text NOT NULL,
  source_url text NOT NULL,
  external_job_id text,
  published_title text NOT NULL,
  published_company_name text NOT NULL,
  observed_at timestamptz NOT NULL,
  observed_location_text text,
  listing_state text NOT NULL CHECK (listing_state IN ('open', 'closed', 'unknown')) DEFAULT 'unknown'
);
CREATE INDEX IF NOT EXISTS listing_observation_user_opportunity_idx
  ON listing_observation(user_id, opportunity_id);
CREATE INDEX IF NOT EXISTS listing_observation_source_url_idx
  ON listing_observation(user_id, source_url);

CREATE TABLE IF NOT EXISTS listing_snapshot (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  listing_observation_id uuid NOT NULL UNIQUE REFERENCES listing_observation(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL,
  page_title text NOT NULL,
  source_text text NOT NULL,
  structured_metadata jsonb,
  content_fingerprint text,
  parser_version text NOT NULL
);
CREATE INDEX IF NOT EXISTS listing_snapshot_user_id_idx ON listing_snapshot(user_id);

CREATE TABLE IF NOT EXISTS application (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES opportunity(id) ON DELETE CASCADE,
  current_status text NOT NULL CHECK (current_status IN ('applied', 'passed')),
  applied_at timestamptz,
  submitted_resume_artifact_id uuid REFERENCES resume_artifact(id),
  notes text,
  outcome text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (user_id, opportunity_id)
);

CREATE TABLE IF NOT EXISTS application_event (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES application(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  source text NOT NULL CHECK (source IN ('user', 'system', 'integration', 'ai')),
  source_reference text,
  payload jsonb,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS application_event_user_application_idx
  ON application_event(user_id, application_id, occurred_at);
