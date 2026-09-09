INSERT INTO translations (tenant_id, entity_type, entity_id, field, lang, value) SELECT tenant_id, 'person', id, 'name', 'km', name_km FROM people WHERE name_km IS NOT NULL AND trim(name_km) != '' AND EXISTS (SELECT 1 FROM languages WHERE code = 'km') ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO translations (tenant_id, entity_type, entity_id, field, lang, value) SELECT tenant_id, 'person', id, 'name', (SELECT COALESCE((SELECT code FROM languages WHERE code = 'en'), (SELECT code FROM languages WHERE is_default = 1 LIMIT 1), 'en')), name_en FROM people WHERE name_en IS NOT NULL AND trim(name_en) != '' ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE `people` DROP COLUMN `name_en`;--> statement-breakpoint
ALTER TABLE `people` DROP COLUMN `name_km`;
