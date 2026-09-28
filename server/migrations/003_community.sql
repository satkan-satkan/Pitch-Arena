CREATE TABLE teams (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id),
 data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE team_members (
 team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id), role TEXT NOT NULL CHECK(role IN ('owner','editor','member')),
 PRIMARY KEY(team_id,user_id)
);
CREATE TABLE team_invitations (
 id TEXT PRIMARY KEY, team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
 email TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('editor','member')),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','cancelled')),
 created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX team_pending_invite ON team_invitations(team_id,email) WHERE status='pending';
CREATE TABLE startups (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id),
 team_id TEXT REFERENCES teams(id), created_at TEXT NOT NULL
);
CREATE TABLE startup_listings (
 startup_id TEXT PRIMARY KEY REFERENCES startups(id) ON DELETE CASCADE,
 data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','published','changes_requested')),
 published_data TEXT, published_at TEXT, moderation_note TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL
);
CREATE INDEX team_members_user ON team_members(user_id);
CREATE INDEX invitation_recipient ON team_invitations(email,status);
CREATE INDEX startups_team ON startups(team_id);
CREATE INDEX listings_status ON startup_listings(status);
