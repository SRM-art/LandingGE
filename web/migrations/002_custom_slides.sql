ALTER TABLE slide ADD COLUMN deleted_at TEXT;
ALTER TABLE slide ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE slide ADD COLUMN updated_at TEXT;
CREATE INDEX IF NOT EXISTS idx_slide_public ON slide(deleted_at,active,position);
UPDATE slide SET active=1 WHERE id IN (1,2,3);
