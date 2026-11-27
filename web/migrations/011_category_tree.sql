ALTER TABLE category ADD COLUMN parent_id INTEGER REFERENCES category(id);
ALTER TABLE category ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE category ADD COLUMN deleted_at TEXT;
ALTER TABLE product ADD COLUMN is_floor INTEGER NOT NULL DEFAULT 0 CHECK (is_floor IN (0, 1));

CREATE INDEX IF NOT EXISTS idx_category_parent ON category(parent_id, deleted_at, position);
CREATE INDEX IF NOT EXISTS idx_product_category_state ON product(category_id, state, deleted_at);
