ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin'));
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked'));
CREATE TABLE catalog (
 kind TEXT NOT NULL CHECK(kind IN ('arena','investor')), id TEXT NOT NULL,
 data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL, PRIMARY KEY(kind,id)
);
CREATE TABLE audit_events (
 id TEXT PRIMARY KEY, actor_id TEXT REFERENCES users(id), action TEXT NOT NULL,
 target_type TEXT NOT NULL, target_id TEXT NOT NULL, details TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX audit_chronology ON audit_events(created_at);
CREATE TABLE data_imports (
 source_hash TEXT PRIMARY KEY, counts TEXT NOT NULL, created_at TEXT NOT NULL
);
