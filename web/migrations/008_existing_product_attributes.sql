-- Carry forward explicit labels only. Existing texture and installation-area tags
-- do not establish wet-area suitability.
UPDATE product
SET tone = CASE
  WHEN EXISTS (SELECT 1 FROM product_facet pf JOIN facet f ON f.id=pf.facet_id
    WHERE pf.product_id=product.id AND pf.deleted_at IS NULL AND f.type='color' AND f.name='Blanco') THEN 'claro'
  WHEN EXISTS (SELECT 1 FROM product_facet pf JOIN facet f ON f.id=pf.facet_id
    WHERE pf.product_id=product.id AND pf.deleted_at IS NULL AND f.type='color' AND f.name='Negro') THEN 'oscuro'
END
WHERE category_id IN (SELECT id FROM category WHERE group_code IN ('pisos','paredes') OR code='zocalos')
  AND 1=(SELECT COUNT(*) FROM product_facet pf JOIN facet f ON f.id=pf.facet_id
    WHERE pf.product_id=product.id AND pf.deleted_at IS NULL AND f.type='color');

UPDATE product SET slip_resistant=1
WHERE category_id IN (SELECT id FROM category WHERE group_code='pisos')
  AND EXISTS (SELECT 1 FROM product_facet pf JOIN facet f ON f.id=pf.facet_id
    WHERE pf.product_id=product.id AND pf.deleted_at IS NULL AND f.type='finish' AND f.name='Antideslizante');
