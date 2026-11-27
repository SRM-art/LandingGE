-- Keep the existing public slides first and retain any surplus in the history.
UPDATE slide
SET deleted_at = CURRENT_TIMESTAMP,
    active = 0,
    updated_at = CURRENT_TIMESTAMP,
    revision = revision + 1
WHERE id IN (
  SELECT id FROM slide
  WHERE id > 3 AND deleted_at IS NULL
  ORDER BY active DESC, position, id
  LIMIT -1 OFFSET ?
);
