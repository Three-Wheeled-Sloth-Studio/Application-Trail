CREATE TABLE IF NOT EXISTS user_identity (
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_subject text NOT NULL,
  email_snapshot text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_authenticated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_subject),
  UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS user_session (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  session_type text NOT NULL CHECK (session_type IN ('web', 'extension')),
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS user_session_user_id_idx ON user_session(user_id);
CREATE INDEX IF NOT EXISTS user_session_expires_at_idx ON user_session(expires_at);

CREATE TABLE IF NOT EXISTS auth_grant (
  id uuid PRIMARY KEY,
  grant_secret_hash text NOT NULL,
  user_id uuid REFERENCES app_user(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  authorized_at timestamptz,
  consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS auth_grant_expires_at_idx ON auth_grant(expires_at);
