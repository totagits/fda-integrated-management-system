CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  sent_at timestamptz,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX password_reset_tokens_user_idx
  ON password_reset_tokens(user_id, created_at DESC);

CREATE INDEX password_reset_tokens_pending_idx
  ON password_reset_tokens(expires_at)
  WHERE used_at IS NULL AND revoked_at IS NULL;
