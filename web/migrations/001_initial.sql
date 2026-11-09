PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS category(id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS commercial_unit(code TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS presentation(code TEXT PRIMARY KEY, name TEXT NOT NULL, commercial_unit TEXT NOT NULL REFERENCES commercial_unit(code));
CREATE TABLE IF NOT EXISTS measure_unit(code TEXT PRIMARY KEY, name TEXT NOT NULL, symbol TEXT NOT NULL, dimension TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS product(
 id TEXT PRIMARY KEY, sku TEXT NOT NULL UNIQUE COLLATE NOCASE, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '', category_id INTEGER NOT NULL REFERENCES category(id), presentation_code TEXT NOT NULL REFERENCES presentation(code),
 price_cents INTEGER CHECK(price_cents IS NULL OR price_cents>0), state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','published')),
 featured INTEGER NOT NULL DEFAULT 0, deleted_at TEXT, revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS product_private(product_id TEXT PRIMARY KEY REFERENCES product(id), external_sku TEXT);
CREATE TABLE IF NOT EXISTS measure(product_id TEXT REFERENCES product(id), unit_code TEXT REFERENCES measure_unit(code), amount INTEGER NOT NULL CHECK(amount>0), deleted_at TEXT, PRIMARY KEY(product_id,unit_code));
CREATE TABLE IF NOT EXISTS technical_sheet(product_id TEXT PRIMARY KEY REFERENCES product(id), length_mm TEXT, width_mm TEXT, thickness_mm TEXT, warranty TEXT, recommendations TEXT, advantages TEXT);
CREATE TABLE IF NOT EXISTS facet(id INTEGER PRIMARY KEY, type TEXT NOT NULL CHECK(type IN ('color','finish','use','area')), name TEXT NOT NULL, UNIQUE(type,name));
CREATE TABLE IF NOT EXISTS product_facet(product_id TEXT REFERENCES product(id), facet_id INTEGER REFERENCES facet(id), deleted_at TEXT, PRIMARY KEY(product_id,facet_id));
CREATE TABLE IF NOT EXISTS country(code TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS region(id INTEGER PRIMARY KEY, name TEXT NOT NULL, country_code TEXT REFERENCES country(code));
CREATE TABLE IF NOT EXISTS city(id INTEGER PRIMARY KEY, name TEXT NOT NULL, region_id INTEGER REFERENCES region(id), UNIQUE(name,region_id));
CREATE TABLE IF NOT EXISTS sector(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS project(
 id TEXT PRIMARY KEY, sku TEXT NOT NULL UNIQUE COLLATE NOCASE, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
 city_id INTEGER NOT NULL REFERENCES city(id), sector_id INTEGER NOT NULL REFERENCES sector(id), state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','published')),
 featured INTEGER NOT NULL DEFAULT 0, deleted_at TEXT, revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS project_product(project_id TEXT REFERENCES project(id), product_id TEXT REFERENCES product(id), position INTEGER NOT NULL, deleted_at TEXT, PRIMARY KEY(project_id,product_id));
CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY, storage_key TEXT NOT NULL UNIQUE, original_name TEXT NOT NULL, mime TEXT NOT NULL DEFAULT 'image/webp', width INTEGER, height INTEGER, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS product_image(product_id TEXT REFERENCES product(id), media_id TEXT REFERENCES media(id), position INTEGER NOT NULL, alt TEXT NOT NULL DEFAULT '', deleted_at TEXT, PRIMARY KEY(product_id,media_id));
CREATE TABLE IF NOT EXISTS project_image(project_id TEXT REFERENCES project(id), media_id TEXT REFERENCES media(id), position INTEGER NOT NULL, alt TEXT NOT NULL DEFAULT '', deleted_at TEXT, PRIMARY KEY(project_id,media_id));
CREATE TABLE IF NOT EXISTS site_settings(id INTEGER PRIMARY KEY CHECK(id=1), whatsapp TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', hours TEXT NOT NULL DEFAULT '', about_title TEXT NOT NULL, about_text TEXT NOT NULL, about_media_id TEXT REFERENCES media(id), revision INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS slide(id INTEGER PRIMARY KEY, title TEXT NOT NULL, subtitle TEXT NOT NULL, description TEXT NOT NULL, button_text TEXT NOT NULL, button_href TEXT NOT NULL, media_id TEXT REFERENCES media(id), position INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS service(id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, position INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY, product_id TEXT REFERENCES product(id), project_id TEXT REFERENCES project(id), action TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS session(token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_product_public ON product(deleted_at,state,category_id);
CREATE INDEX IF NOT EXISTS idx_project_public ON project(deleted_at,state,city_id);
CREATE INDEX IF NOT EXISTS idx_project_product_reverse ON project_product(product_id,deleted_at);
CREATE INDEX IF NOT EXISTS idx_product_image_reverse ON product_image(media_id,deleted_at);
CREATE INDEX IF NOT EXISTS idx_project_image_reverse ON project_image(media_id,deleted_at);


