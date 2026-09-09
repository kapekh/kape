INSERT INTO translations (tenant_id, entity_type, entity_id, field, lang, value) SELECT tenant_id, 'term', id, 'label', (SELECT COALESCE((SELECT code FROM languages WHERE is_default = 1 LIMIT 1), 'en')), label FROM terms WHERE label IS NOT NULL AND trim(label) != '' ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE `terms` DROP COLUMN `label`;
