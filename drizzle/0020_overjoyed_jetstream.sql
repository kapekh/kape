INSERT INTO translations (tenant_id, entity_type, entity_id, field, lang, value) SELECT tenant_id, 'org_node', id, 'name', (SELECT COALESCE((SELECT code FROM languages WHERE is_default = 1 LIMIT 1), 'en')), name FROM org_nodes WHERE name IS NOT NULL AND trim(name) != '' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO translations (tenant_id, entity_type, entity_id, field, lang, value) SELECT tenant_id, 'org_node', id, 'title', (SELECT COALESCE((SELECT code FROM languages WHERE is_default = 1 LIMIT 1), 'en')), title FROM org_nodes WHERE title IS NOT NULL AND trim(title) != '' ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE `org_nodes` DROP COLUMN `name`;--> statement-breakpoint
ALTER TABLE `org_nodes` DROP COLUMN `title`;
