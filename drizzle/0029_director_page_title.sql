UPDATE translations SET value = 'Welcome Message from the Executive Director'
WHERE entity_type = 'page' AND field = 'title' AND lang = 'en' AND value = 'Executive Director''s Speech'
	AND entity_id = (SELECT id FROM pages WHERE slug = 'who-we-are/director-speech');--> statement-breakpoint
UPDATE translations SET value = 'សារស្វាគមន៍ពីនាយកប្រតិបត្តិ'
WHERE entity_type = 'page' AND field = 'title' AND lang = 'km' AND value = 'សុន្ទរកថានាយកប្រតិបត្តិ'
	AND entity_id = (SELECT id FROM pages WHERE slug = 'who-we-are/director-speech');--> statement-breakpoint
INSERT INTO translations (tenant_id, entity_type, entity_id, field, lang, value)
SELECT p.tenant_id, 'page', p.id, 'excerpt', l.code, l.lead
FROM pages p
JOIN (SELECT 'en' AS code, 'Welcome message from Mr. Sao Vanna, Executive Director of Kampuchea Action to Promote Education (KAPE).' AS lead
	UNION ALL SELECT 'km', 'សារស្វាគមន៍ពីលោក សៅ វណ្ណា នាយកប្រតិបត្តិនៃអង្គការសកម្មភាពសម្រាប់ការអប់រំនៅកម្ពុជា (ខេប)។') l
	ON EXISTS (SELECT 1 FROM languages WHERE code = l.code)
WHERE p.slug = 'who-we-are/director-speech'
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE pages SET sections = json_remove(sections, '$[0].props.eyebrow', '$[0].props.i18n.km.eyebrow')
WHERE slug = 'who-we-are/director-speech'
	AND json_extract(sections, '$[0].type') = 'split'
	AND json_extract(sections, '$[0].props.eyebrow') = 'Welcome Message from the Executive Director';--> statement-breakpoint
DELETE FROM render_cache;
