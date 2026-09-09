INSERT INTO translations (tenant_id, entity_type, entity_id, field, lang, value) SELECT tenant_id, 'person', id, 'position', (SELECT COALESCE((SELECT code FROM languages WHERE is_default = 1 LIMIT 1), 'en')), position FROM people WHERE position IS NOT NULL AND trim(position) != '' ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE `people` DROP COLUMN `position`;
