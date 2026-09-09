WITH km(en, value) AS (VALUES
	('Chairman', 'ប្រធានក្រុមប្រឹក្សាភិបាល'),
	('Vice Chairman', 'អនុប្រធានក្រុមប្រឹក្សាភិបាល'),
	('Member', 'សមាជិក'),
	('Executive Director', 'នាយកប្រតិបត្តិ'),
	('Vice Executive Director', 'នាយករងប្រតិបត្តិ'),
	('Admin & Human Resource Manager', 'ប្រធានរដ្ឋបាល និងធនធានមនុស្ស'),
	('IEP Coordinator', 'ប្រធានសម្របសម្រួលកម្មវិធីអប់រំបរិយាបន្ន (IEP)'),
	('ទឹកប្រឹក្សាបច្ចេកទេសជាន់ខ្ពស់', 'ទីប្រឹក្សាបច្ចេកទេសជាន់ខ្ពស់'),
	('Senior Technical Adviser', 'ទីប្រឹក្សាបច្ចេកទេសជាន់ខ្ពស់'),
	('BMZ/EYE/CLASS Program Manager', 'អ្នកគ្រប់គ្រងកម្មវិធី BMZ/EYE/CLASS'),
	('Child Protection & Gender Officer', 'មន្ត្រីការពារកុមារ និងយេនឌ័រ'),
	('Finance Director', 'នាយកហិរញ្ញវត្ថុ'),
	('Finance Manager', 'អ្នកគ្រប់គ្រងហិរញ្ញវត្ថុ'),
	('Gender Leadership Advisor', 'ទីប្រឹក្សាភាពជាអ្នកដឹកនាំយេនឌ័រ'),
	('Grant Manager', 'អ្នកគ្រប់គ្រងជំនួយឧបត្ថម្ភ'),
	('Literacy Coordinator', 'អ្នកសម្របសម្រួលអក្ខរកម្ម'),
	('Master Mentor', 'អ្នកណែនាំមេ'),
	('Media & Communications Manager (M&CM)', 'អ្នកគ្រប់គ្រងប្រព័ន្ធផ្សព្វផ្សាយ និងទំនាក់ទំនង'),
	('NGPRC (NGPRD)', 'NGPRC (NGPRD)'),
	('NGPRC Training Coordinator', 'អ្នកសម្របសម្រួលបណ្ដុះបណ្ដាល NGPRC'),
	('NGS Accreditation Coordinator', 'អ្នកសម្របសម្រួលការទទួលស្គាល់គុណភាព NGS'),
	('NGS Area Coordinator', 'អ្នកសម្របសម្រួលតំបន់ NGS'),
	('NGS Operation Manager / Senior National Adviser', 'អ្នកគ្រប់គ្រងប្រតិបត្តិការ NGS / ទីប្រឹក្សាជាតិជាន់ខ្ពស់'),
	('NGS Secondary Education Coordinator', 'អ្នកសម្របសម្រួលអប់រំមធ្យមសិក្សា NGS'),
	('Program Manager', 'អ្នកគ្រប់គ្រងកម្មវិធី'),
	('Project Coordinator', 'អ្នកសម្របសម្រួលគម្រោង'),
	('Project Manager', 'អ្នកគ្រប់គ្រងគម្រោង'),
	('Project Techical Coordinator', 'អ្នកសម្របសម្រួលបច្ចេកទេសគម្រោង'),
	('School-Based Animator and Library Advisor', 'អ្នកជម្រុញសកម្មភាពនៅសាលារៀន និងទីប្រឹក្សាបណ្ណាល័យ'),
	('Senior Menter', 'អ្នកណែនាំជាន់ខ្ពស់')
)
INSERT INTO translations (tenant_id, entity_type, entity_id, field, lang, value)
SELECT en.tenant_id, 'person', en.entity_id, 'position', 'km', km.value
FROM translations en
JOIN km ON km.en = trim(replace(replace(en.value, char(8203), ' '), '  ', ' '))
WHERE en.entity_type = 'person' AND en.field = 'position' AND en.lang = 'en'
	AND EXISTS (SELECT 1 FROM languages WHERE code = 'km')
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE translations SET value = 'Senior Technical Adviser'
WHERE entity_type = 'person' AND field = 'position' AND lang = 'en' AND value = 'ទឹកប្រឹក្សាបច្ចេកទេសជាន់ខ្ពស់';--> statement-breakpoint
UPDATE pages SET sections = json_set(sections,
	'$[0].type', 'split',
	'$[0].layout', 'media-right',
	'$[0].props.personId', 'person-exec-director')
WHERE slug = 'who-we-are/director-speech'
	AND json_extract(sections, '$[0].type') = 'richtext'
	AND json_extract(sections, '$[0].props.personId') IS NULL
	AND EXISTS (SELECT 1 FROM people WHERE slug = 'person-exec-director');--> statement-breakpoint
DELETE FROM render_cache;
