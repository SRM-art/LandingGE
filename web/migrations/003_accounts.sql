CREATE TABLE auth_role(code TEXT PRIMARY KEY);
INSERT INTO auth_role VALUES('owner'),('admin');
CREATE TABLE auth_user(
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 role TEXT NOT NULL REFERENCES auth_role(code), state TEXT NOT NULL CHECK(state IN ('pending','active','disabled')),
 security_version INTEGER NOT NULL DEFAULT 1, verified_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX auth_single_owner ON auth_user(role) WHERE role='owner';
CREATE TABLE auth_credential(user_id TEXT PRIMARY KEY REFERENCES auth_user(id), password_hash TEXT NOT NULL, changed_at INTEGER NOT NULL);
CREATE TABLE auth_session(
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES auth_user(id), token_hash TEXT NOT NULL UNIQUE,
 security_version INTEGER NOT NULL, created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL, idle_expires_at INTEGER NOT NULL, reauthenticated_at INTEGER NOT NULL,
 revoked_at INTEGER, client_label TEXT NOT NULL
);
CREATE INDEX auth_session_user ON auth_session(user_id);
CREATE TABLE auth_token(
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES auth_user(id), token_hash TEXT NOT NULL UNIQUE,
 purpose TEXT NOT NULL CHECK(purpose IN ('invite','reset','email')), security_version INTEGER NOT NULL,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER, revoked_at INTEGER, target_email TEXT
);
CREATE INDEX auth_token_user ON auth_token(user_id);
CREATE TABLE auth_event(id TEXT PRIMARY KEY, actor_id TEXT REFERENCES auth_user(id), target_id TEXT REFERENCES auth_user(id), action TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE auth_limit(key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
ALTER TABLE audit ADD COLUMN actor_user_id TEXT REFERENCES auth_user(id);
UPDATE session SET expires_at=0;
