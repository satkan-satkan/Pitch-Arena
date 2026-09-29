ALTER TABLE users ADD COLUMN email_verified_at TEXT;
CREATE TABLE account_tokens (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')),
 expires BIGINT NOT NULL,
 UNIQUE(user_id,purpose)
);
CREATE INDEX account_tokens_expiry ON account_tokens(expires);
CREATE TABLE auth_mail_limits (
 bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires BIGINT NOT NULL
);
