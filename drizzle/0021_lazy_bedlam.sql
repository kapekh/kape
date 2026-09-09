INSERT INTO translations (tenant_id, entity_type, entity_id, field, lang, value) SELECT tenant_id, 'office', id, 'name', (SELECT COALESCE((SELECT code FROM languages WHERE is_default = 1 LIMIT 1), 'en')), name FROM offices WHERE name IS NOT NULL AND trim(name) != '' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO translations (tenant_id, entity_type, entity_id, field, lang, value) SELECT tenant_id, 'office', id, 'address', (SELECT COALESCE((SELECT code FROM languages WHERE is_default = 1 LIMIT 1), 'en')), address FROM offices WHERE address IS NOT NULL AND trim(address) != '' ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE `offices` DROP COLUMN `name`;--> statement-breakpoint
ALTER TABLE `offices` DROP COLUMN `address`;
