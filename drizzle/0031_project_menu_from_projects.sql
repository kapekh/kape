-- The Current Projects and Past Projects menu groups now list the projects table by
-- status, so a project added in the admin is in the What We Do menu at once. The
-- hand-kept links under them go, and their translations with them.
UPDATE nav_items
SET target_kind = 'project_list', target_ref = 'current', updated_at = datetime('now')
WHERE target_kind = 'none'
  AND id IN (SELECT entity_id FROM translations
             WHERE entity_type = 'nav_item' AND field = 'label' AND lang = 'en' AND value = 'Current Projects');--> statement-breakpoint
UPDATE nav_items
SET target_kind = 'project_list', target_ref = 'past', updated_at = datetime('now')
WHERE target_kind = 'none'
  AND id IN (SELECT entity_id FROM translations
             WHERE entity_type = 'nav_item' AND field = 'label' AND lang = 'en' AND value = 'Past Projects');--> statement-breakpoint
DELETE FROM translations
WHERE entity_type = 'nav_item'
  AND entity_id IN (
    WITH RECURSIVE sub(id) AS (
      SELECT id FROM nav_items WHERE parent_id IN (SELECT id FROM nav_items WHERE target_kind = 'project_list')
      UNION ALL
      SELECT n.id FROM nav_items n JOIN sub ON n.parent_id = sub.id
    )
    SELECT id FROM sub);--> statement-breakpoint
DELETE FROM nav_items
WHERE id IN (
  WITH RECURSIVE sub(id) AS (
    SELECT id FROM nav_items WHERE parent_id IN (SELECT id FROM nav_items WHERE target_kind = 'project_list')
    UNION ALL
    SELECT n.id FROM nav_items n JOIN sub ON n.parent_id = sub.id
  )
  SELECT id FROM sub);
