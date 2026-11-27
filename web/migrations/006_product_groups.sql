ALTER TABLE category ADD COLUMN group_code TEXT NOT NULL DEFAULT 'complementos'
  CHECK (group_code IN ('pisos', 'paredes', 'complementos'));

UPDATE category SET group_code = 'pisos' WHERE code IN ('pisos', 'ceramicas', 'porcelanatos');
UPDATE category SET name = 'Otros pisos' WHERE code = 'pisos';

INSERT INTO category (code, name, group_code)
SELECT 'revestimientos-muro', 'Revestimientos de pared', 'paredes'
WHERE EXISTS (SELECT 1 FROM category)
ON CONFLICT (code) DO NOTHING;
