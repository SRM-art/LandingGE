-- Current schema for fresh D1 databases. The Node development database keeps its own migration history.

CREATE TABLE category(id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, group_code TEXT NOT NULL DEFAULT 'complementos'
  CHECK (group_code IN ('pisos', 'paredes', 'complementos')), parent_id INTEGER REFERENCES category(id), position INTEGER NOT NULL DEFAULT 0, deleted_at TEXT);

CREATE TABLE commercial_unit(code TEXT PRIMARY KEY, name TEXT NOT NULL);

CREATE TABLE presentation(code TEXT PRIMARY KEY, name TEXT NOT NULL, commercial_unit TEXT NOT NULL REFERENCES commercial_unit(code));

CREATE TABLE measure_unit(code TEXT PRIMARY KEY, name TEXT NOT NULL, symbol TEXT NOT NULL, dimension TEXT NOT NULL);

CREATE TABLE product(
 id TEXT PRIMARY KEY, sku TEXT NOT NULL UNIQUE COLLATE NOCASE, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '', category_id INTEGER NOT NULL REFERENCES category(id), presentation_code TEXT NOT NULL REFERENCES presentation(code),
 price_cents INTEGER CHECK(price_cents IS NULL OR price_cents>0), state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','published')),
 featured INTEGER NOT NULL DEFAULT 0, deleted_at TEXT, revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
, discount_price_cents INTEGER NOT NULL DEFAULT 0
CHECK (
  discount_price_cents = 0 OR
  (discount_price_cents > 0 AND price_cents IS NOT NULL AND discount_price_cents < price_cents)
), tone TEXT CHECK (tone IN ('claro', 'medio', 'oscuro')), environment TEXT CHECK (environment IN ('seco', 'humedo', 'ambos')), slip_resistant INTEGER NOT NULL DEFAULT 0 CHECK (slip_resistant IN (0, 1)), wall_finish TEXT CHECK (wall_finish IN ('mate','satinado','brillante','mixto')), wall_surface TEXT CHECK (wall_surface IN ('lisa','relieve')), profile_use TEXT CHECK (profile_use IN ('zocalo','transicion','remate')), adhesive_materials TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(adhesive_materials) AND json_type(adhesive_materials)='array'), overlay INTEGER NOT NULL DEFAULT 0 CHECK (overlay IN (0,1)), is_floor INTEGER NOT NULL DEFAULT 0 CHECK (is_floor IN (0, 1)));

CREATE TABLE product_private(product_id TEXT PRIMARY KEY REFERENCES product(id), external_sku TEXT);

CREATE TABLE measure(product_id TEXT REFERENCES product(id), unit_code TEXT REFERENCES measure_unit(code), amount INTEGER NOT NULL CHECK(amount>0), deleted_at TEXT, PRIMARY KEY(product_id,unit_code));

CREATE TABLE technical_sheet(product_id TEXT PRIMARY KEY REFERENCES product(id), length_mm TEXT, width_mm TEXT, thickness_mm TEXT, warranty TEXT, recommendations TEXT, advantages TEXT);

CREATE TABLE facet(id INTEGER PRIMARY KEY, type TEXT NOT NULL CHECK(type IN ('color','finish','use','area')), name TEXT NOT NULL, UNIQUE(type,name));

CREATE TABLE product_facet(product_id TEXT REFERENCES product(id), facet_id INTEGER REFERENCES facet(id), deleted_at TEXT, PRIMARY KEY(product_id,facet_id));

CREATE TABLE country(code TEXT PRIMARY KEY, name TEXT NOT NULL);

CREATE TABLE region(id INTEGER PRIMARY KEY, name TEXT NOT NULL, country_code TEXT REFERENCES country(code));

CREATE TABLE city(id INTEGER PRIMARY KEY, name TEXT NOT NULL, region_id INTEGER REFERENCES region(id), deleted_at TEXT, UNIQUE(name,region_id));

CREATE TABLE sector(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);

CREATE TABLE project(
 id TEXT PRIMARY KEY, sku TEXT NOT NULL UNIQUE COLLATE NOCASE, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
 city_id INTEGER NOT NULL REFERENCES city(id), sector_id INTEGER NOT NULL REFERENCES sector(id), state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','published')),
 featured INTEGER NOT NULL DEFAULT 0, deleted_at TEXT, revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE project_product(project_id TEXT REFERENCES project(id), product_id TEXT REFERENCES product(id), position INTEGER NOT NULL, deleted_at TEXT, PRIMARY KEY(project_id,product_id));

CREATE TABLE media(id TEXT PRIMARY KEY, storage_key TEXT NOT NULL UNIQUE, original_name TEXT NOT NULL, mime TEXT NOT NULL DEFAULT 'image/webp', width INTEGER, height INTEGER, created_at TEXT NOT NULL);

CREATE TABLE product_image(product_id TEXT REFERENCES product(id), media_id TEXT REFERENCES media(id), position INTEGER NOT NULL, alt TEXT NOT NULL DEFAULT '', deleted_at TEXT, PRIMARY KEY(product_id,media_id));

CREATE TABLE project_image(project_id TEXT REFERENCES project(id), media_id TEXT REFERENCES media(id), position INTEGER NOT NULL, alt TEXT NOT NULL DEFAULT '', deleted_at TEXT, PRIMARY KEY(project_id,media_id));

CREATE TABLE site_settings(id INTEGER PRIMARY KEY CHECK(id=1), whatsapp TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', hours TEXT NOT NULL DEFAULT '', about_title TEXT NOT NULL, about_text TEXT NOT NULL, about_media_id TEXT REFERENCES media(id), revision INTEGER NOT NULL DEFAULT 1);

CREATE TABLE slide(id INTEGER PRIMARY KEY, title TEXT NOT NULL, subtitle TEXT NOT NULL, description TEXT NOT NULL, button_text TEXT NOT NULL, button_href TEXT NOT NULL, media_id TEXT REFERENCES media(id), position INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1, deleted_at TEXT, revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT);

CREATE TABLE service(id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, position INTEGER NOT NULL);

CREATE TABLE audit(id TEXT PRIMARY KEY, product_id TEXT REFERENCES product(id), project_id TEXT REFERENCES project(id), action TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL, actor_user_id TEXT REFERENCES auth_user(id));

CREATE TABLE session(token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);

CREATE TABLE auth_role(code TEXT PRIMARY KEY);
INSERT INTO auth_role VALUES('owner'),('admin');

CREATE TABLE auth_user(
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 role TEXT NOT NULL REFERENCES auth_role(code), state TEXT NOT NULL CHECK(state IN ('pending','active','disabled')),
 security_version INTEGER NOT NULL DEFAULT 1, verified_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);

CREATE TABLE auth_credential(user_id TEXT PRIMARY KEY REFERENCES auth_user(id), password_hash TEXT NOT NULL, changed_at INTEGER NOT NULL);

CREATE TABLE auth_session(
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES auth_user(id), token_hash TEXT NOT NULL UNIQUE,
 security_version INTEGER NOT NULL, created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL, idle_expires_at INTEGER NOT NULL, reauthenticated_at INTEGER NOT NULL,
 revoked_at INTEGER, client_label TEXT NOT NULL
);

CREATE TABLE auth_token(
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES auth_user(id), token_hash TEXT NOT NULL UNIQUE,
 purpose TEXT NOT NULL CHECK(purpose IN ('invite','reset','email')), security_version INTEGER NOT NULL,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER, revoked_at INTEGER, target_email TEXT
);

CREATE TABLE auth_event(id TEXT PRIMARY KEY, actor_id TEXT REFERENCES auth_user(id), target_id TEXT REFERENCES auth_user(id), action TEXT NOT NULL, created_at INTEGER NOT NULL);

CREATE TABLE auth_limit(key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);

CREATE INDEX idx_product_public ON product(deleted_at,state,category_id);

CREATE INDEX idx_project_public ON project(deleted_at,state,city_id);

CREATE INDEX idx_project_product_reverse ON project_product(product_id,deleted_at);

CREATE INDEX idx_product_image_reverse ON product_image(media_id,deleted_at);

CREATE INDEX idx_project_image_reverse ON project_image(media_id,deleted_at);

CREATE INDEX idx_slide_public ON slide(deleted_at,active,position);

CREATE UNIQUE INDEX auth_single_owner ON auth_user(role) WHERE role='owner';

CREATE INDEX auth_session_user ON auth_session(user_id);

CREATE INDEX auth_token_user ON auth_token(user_id);

CREATE INDEX idx_category_parent ON category(parent_id, deleted_at, position);

CREATE INDEX idx_product_category_state ON product(category_id, state, deleted_at);

CREATE TABLE application_revision (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL CONSTRAINT ge_revision_guard CHECK(revision>=0));

INSERT INTO application_revision(id,revision) VALUES(1,0);
