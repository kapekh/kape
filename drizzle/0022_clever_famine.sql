INSERT INTO translations (tenant_id, entity_type, entity_id, field, lang, value) SELECT tenant_id, 'school', id, 'name', (SELECT COALESCE((SELECT code FROM languages WHERE is_default = 1 LIMIT 1), 'en')), name FROM schools WHERE name IS NOT NULL AND trim(name) != '' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO translations (tenant_id, entity_type, entity_id, field, lang, value) SELECT tenant_id, 'school', id, 'address', (SELECT COALESCE((SELECT code FROM languages WHERE is_default = 1 LIMIT 1), 'en')), address FROM schools WHERE address IS NOT NULL AND trim(address) != '' ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE `schools` DROP COLUMN `name`;--> statement-breakpoint
ALTER TABLE `schools` DROP COLUMN `address`;
