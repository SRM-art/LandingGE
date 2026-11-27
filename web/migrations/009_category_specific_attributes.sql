ALTER TABLE product ADD COLUMN wall_finish TEXT CHECK (wall_finish IN ('mate','satinado','brillante','mixto'));
ALTER TABLE product ADD COLUMN wall_surface TEXT CHECK (wall_surface IN ('lisa','relieve'));
ALTER TABLE product ADD COLUMN profile_use TEXT CHECK (profile_use IN ('zocalo','transicion','remate'));
ALTER TABLE product ADD COLUMN adhesive_materials TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(adhesive_materials) AND json_type(adhesive_materials)='array');
ALTER TABLE product ADD COLUMN overlay INTEGER NOT NULL DEFAULT 0 CHECK (overlay IN (0,1));

UPDATE product SET wall_finish=(
  SELECT lower(f.name) FROM product_facet pf JOIN facet f ON f.id=pf.facet_id
  WHERE pf.product_id=product.id AND pf.deleted_at IS NULL AND f.type='finish'
    AND f.name IN ('Mate','Satinado','Brillante')
  GROUP BY pf.product_id HAVING count(*)=1
)
WHERE category_id IN (SELECT id FROM category WHERE group_code='paredes');
