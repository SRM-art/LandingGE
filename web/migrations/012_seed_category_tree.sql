INSERT INTO category (code, name, group_code, position) VALUES
  ('catalogo-pisos', 'Pisos', 'pisos', 10),
  ('catalogo-paredes', 'Paredes', 'paredes', 20),
  ('catalogo-complementos', 'Complementos', 'complementos', 30);

UPDATE category
SET parent_id = (SELECT root.id FROM category root WHERE root.code = 'catalogo-' || category.group_code)
WHERE code NOT IN ('catalogo-pisos', 'catalogo-paredes', 'catalogo-complementos');

UPDATE product SET is_floor = 1
WHERE category_id IN (SELECT id FROM category WHERE group_code = 'pisos');

-- Classify the demo references using their existing catalog families and appearance.
INSERT INTO category (code, name, group_code, parent_id)
SELECT sample.code, sample.name, parent.group_code, parent.id
FROM (
  SELECT 'aspecto-madera' AS code, 'Aspecto madera' AS name, 'pisos' AS parent_code
  UNION ALL SELECT 'porcelanato-claros', 'Tonos claros', 'porcelanatos'
  UNION ALL SELECT 'porcelanato-piedra', 'Aspecto piedra', 'porcelanatos'
  UNION ALL SELECT 'ceramica-clara', 'Tonos claros', 'ceramicas'
  UNION ALL SELECT 'ceramica-oscura', 'Tonos oscuros', 'ceramicas'
  UNION ALL SELECT 'pegante-porcelanato', 'Para porcelanato', 'adhesivos'
) sample
JOIN category parent ON parent.code = sample.parent_code;

WITH samples(sku, code) AS (VALUES
  ('GE-001', 'aspecto-madera'), ('GE-006', 'aspecto-madera'), ('GE-008', 'aspecto-madera'),
  ('GE-002', 'porcelanato-claros'), ('GE-005', 'porcelanato-claros'), ('GE-007', 'porcelanato-piedra'),
  ('GE-003', 'ceramica-clara'), ('GE-004', 'ceramica-oscura'), ('GE-010', 'pegante-porcelanato')
)
UPDATE product
SET category_id = (
  SELECT child.id FROM samples JOIN category child ON child.code = samples.code
  WHERE samples.sku = product.sku AND child.parent_id = product.category_id
)
WHERE EXISTS (
  SELECT 1 FROM samples JOIN category child ON child.code = samples.code
  WHERE samples.sku = product.sku AND child.parent_id = product.category_id
);
