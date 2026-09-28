CREATE TABLE users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 profile TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE logins (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires BIGINT NOT NULL
);
CREATE TABLE projects (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name TEXT NOT NULL, industry TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE TABLE sessions (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 project_id TEXT NOT NULL REFERENCES projects(id), status TEXT NOT NULL DEFAULT 'draft',
 data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX one_draft_per_user ON sessions(user_id) WHERE status='draft';
CREATE TABLE assets (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, mime TEXT NOT NULL, bytes INTEGER NOT NULL, path TEXT NOT NULL
);
CREATE TABLE imports (
 user_id TEXT NOT NULL REFERENCES users(id), source_id TEXT NOT NULL, data TEXT NOT NULL,
 PRIMARY KEY(user_id, source_id)
);
CREATE INDEX sessions_owner ON sessions(user_id, updated_at);
CREATE INDEX assets_owner ON assets(user_id);
CREATE INDEX logins_owner ON logins(user_id);
