/**
 * Default UI chrome strings (EN + KH), seeded into the `ui_strings` table.
 *
 * This is the *bootstrap* dictionary for the two seed languages. At runtime the
 * app reads UI strings from the DB, so adding a new language is pure data
 * (INSERT rows) — no code change. Keep keys stable; components reference them.
 */
export const defaultUiStrings: Record<string, { en: string; km?: string }> = {
	// top bar
	"top.contact": { en: "Tel: 042-941-481 · kape@kapekh.org", km: "ទូរស័ព្ទ: 042-941-481 · kape@kapekh.org" },
	"top.search": { en: "Search", km: "ស្វែងរក" },
	"top.sitemap": { en: "Site Map", km: "ផែនទីគេហទំព័រ" },
	"lang.english": { en: "English", km: "English" },
	"lang.khmer": { en: "ខ្មែរ", km: "ខ្មែរ" },

	// nav top-level
	"nav.home": { en: "Home", km: "ទំព័រដើម" },
	"nav.who": { en: "Who We Are", km: "អំពីយើង" },
	"nav.what": { en: "What We Do", km: "សកម្មភាពយើង" },
	"nav.media": { en: "Media & Publications", km: "ប្រព័ន្ធផ្សព្វផ្សាយ" },
	"nav.opps": { en: "Opportunities", km: "ឱកាស" },
	"nav.contact": { en: "Contact", km: "ទំនាក់ទំនង" },
	"nav.donate": { en: "♡ Donate", km: "♡ បរិច្ចាគ" },
	"nav.menu": { en: "Menu", km: "ម៉ឺនុយ" },

	// forms
	"forms.send": { en: "Send message", km: "ផ្ញើសារ" },
	"forms.sending": { en: "Sending…", km: "កំពុងផ្ញើ…" },

	// who we are submenu
	"nav.who.about": { en: "About KAPE", km: "អំពី KAPE" },
	"nav.who.news": { en: "News and Events", km: "ព័ត៌មាន និងព្រឹត្តិការណ៍" },
	"nav.who.fact": { en: "Fact Sheet", km: "ឯកសារពិត" },
	"nav.who.vision": { en: "Vision, Mission & Core Values", km: "ចក្ខុវិស័យ បេសកកម្ម និងតម្លៃស្នូល" },
	"nav.who.speech": { en: "Executive Director's Speech", km: "សុន្ទរកថានាយកប្រតិបត្តិ" },
	"nav.who.leader": { en: "Leadership Team & Organizational Chart", km: "ក្រុមដឹកនាំ និងគ្រោងស្ថាប័ន" },
	"nav.who.partners": { en: "Our Partners", km: "ដៃគូរបស់យើង" },

	// what we do
	"nav.what.current": { en: "Current Projects", km: "គម្រោងបច្ចុប្បន្ន" },
	"nav.what.past": { en: "Past Projects", km: "គម្រោងពីមុន" },
	"nav.what.impact": { en: "Impact / Success Stories", km: "រឿងរ៉ាវជោគជ័យ" },
	"nav.what.ict": { en: "ICT Innovation", km: "បច្ចេកវិទ្យាព័ត៌មាន" },
	"nav.what.apps": { en: "Learning Applications", km: "កម្មវិធីសិក្សា" },

	// media
	"nav.media.annual": { en: "Annual Report", km: "របាយការណ៍ប្រចាំឆ្នាំ" },
	"nav.media.newsletter": { en: "E-Newsletter", km: "ព្រឹត្តិបត្រអេឡិចត្រូនិក" },
	"nav.media.brochure": { en: "Program Brochure", km: "ប័ណ្ណកម្មវិធី" },
	"nav.media.report": { en: "Program Report", km: "របាយការណ៍កម្មវិធី" },
	"nav.media.photo": { en: "Photo Gallery", km: "វិចិត្រសាលរូបភាព" },
	"nav.media.video": { en: "Video Gallery", km: "វិចិត្រសាលវីដេអូ" },
	"nav.media.research": { en: "Paper Research", km: "ឯកសារស្រាវជ្រាវ" },
	"nav.media.other": { en: "Other Publications", km: "ឯកសារផ្សេងៗ" },
	"nav.media.escup": { en: "ESCUP Sources", km: "ប្រភព ESCUP" },
	"nav.media.life": { en: "Life Skills Education", km: "ការអប់រំជំនាញជីវិត" },
	"nav.media.ai": { en: "AI and Digital Education", km: "AI និងការអប់រំឌីជីថល" },
	"nav.media.policies": { en: "Policies and Regulations", km: "គោលនយោបាយ និងបទបញ្ជា" },

	// opportunities
	"nav.opps.partner": { en: "Partner with KAPE", km: "ភាពជាដៃគូជាមួយ KAPE" },
	"nav.opps.careers": { en: "Job Vacancies & Careers", km: "មុខតំណែងការងារ" },
	"nav.opps.alumni": { en: "Alumni Network", km: "បណ្តាញនិស្សិតចាស់" },
	"nav.opps.scholarship": { en: "Scholarship Program", km: "កម្មវិធីអាហារូបករណ៍" },
	"nav.opps.volunteer": { en: "Volunteer with KAPE", km: "ស្ម័គ្រចិត្តជាមួយ KAPE" },

	// homepage hero
	"home.badge": { en: "Three decades of impact · 1994 — 2026", km: "បីទសវត្សរ៍នៃផលប៉ះពាល់ · ១៩៩៤ — ២០២៦" },
	"home.hero.1": { en: "Where every Cambodian child", km: "កន្លែងដែលកុមារកម្ពុជាគ្រប់រូប" },
	"home.hero.learns": { en: "learns,", km: "រៀន," },
	"home.hero.dreams": { en: "dreams,", km: "សុបិន," },
	"home.hero.rises": { en: "and rises.", km: "និងរីកចម្រើន។" },
	"home.hero.lead": {
		en: "For more than thirty years, KAPE has walked alongside teachers, children and communities across 15 provinces of Cambodia — turning classrooms into places of hope, equity and transformation.",
		km: "ជាង៣០ឆ្នាំមកហើយ KAPE បានដើររួមជាមួយគ្រូបង្រៀន កុមារ និងសហគមន៍នៅ១៥ខេត្តក្នុងប្រទេសកម្ពុជា — បំប្លែងថ្នាក់រៀនទៅជាកន្លែងនៃក្តីសង្ឃឹម សមធម៌ និងការផ្លាស់ប្តូរ។",
	},
	"home.cta.stories": { en: "Read Impact Stories →", km: "អានរឿងរ៉ាវផលប៉ះពាល់ →" },
	"home.cta.who": { en: "Who we are", km: "យើងជានរណា" },
	"home.stat.schools": { en: "Schools served", km: "សាលាដែលផ្តល់សេវា" },
	"home.stat.provinces": { en: "Provinces", km: "ខេត្ត" },
	"home.stat.children": { en: "Children", km: "កុមារ" },

	// sections
	"home.news.kicker": { en: "Stories from the field", km: "រឿងរ៉ាវពីសហគមន៍" },
	"home.news.title.a": { en: "Latest news", km: "ព័ត៌មានថ្មីៗ" },
	"home.news.title.amp": { en: "&", km: "និង" },
	"home.news.title.b": { en: "events", km: "ព្រឹត្តិការណ៍" },
	"home.news.all": { en: "See all news →", km: "មើលព័ត៌មានទាំងអស់ →" },
	"home.news.readmore": { en: "Read more →", km: "អានបន្ថែម →" },

	"home.impact.kicker": { en: "Lives transformed", km: "ជីវិតបានផ្លាស់ប្តូរ" },
	"home.impact.title.a": { en: "Impact", km: "ផលប៉ះពាល់" },
	"home.impact.title.b": { en: "stories", km: "រឿងរ៉ាវ" },
	"home.impact.lead": {
		en: "Behind every statistic is a child, a teacher, a community whose lives changed because someone believed in them.",
		km: "នៅពីក្រោយរាល់ស្ថិតិមានកុមារ គ្រូ និងសហគមន៍ ដែលជីវិតផ្លាស់ប្តូរដោយសារមាននរណាម្នាក់ជឿជាក់លើពួកគេ។",
	},
	"home.impact.readfull": { en: "Read full story →", km: "អានរឿងពេញ →" },

	"home.video.kicker": { en: "Watch", km: "មើល" },
	"home.video.title": { en: "From the classroom", km: "ពីថ្នាក់រៀន" },
	"home.video.all": { en: "All videos →", km: "វីដេអូទាំងអស់ →" },
	"home.video.more": { en: "Watch more →", km: "មើលបន្ថែម →" },

	"home.reach.kicker": { en: "Our reach", km: "វិសាលភាពរបស់យើង" },
	"home.reach.title.a": { en: "Three decades.", km: "បីទសវត្សរ៍។" },
	"home.reach.title.b": { en: "Countless beginnings.", km: "ការចាប់ផ្តើមរាប់មិនអស់។" },

	"home.about.kicker": { en: "About KAPE", km: "អំពី KAPE" },
	"home.about.title": {
		en: "A local NGO with a national heartbeat for education.",
		km: "អង្គការមិនរកប្រាក់ចំណេញក្នុងស្រុក ដែលមានចង្វាក់បេះដូងថ្នាក់ជាតិសម្រាប់ការអប់រំ។",
	},
	"home.about.p1": {
		en: "KAPE is a local non-profit working primarily in the formal education sector across 15 provinces in Cambodia. We implement projects at every level of the learning journey — from preschools and primary classrooms to secondary schools, tertiary programs and a Master's Degree in Mentoring.",
		km: "KAPE គឺជាអង្គការមិនរកប្រាក់ចំណេញក្នុងស្រុក ដែលធ្វើការសំខាន់ក្នុងវិស័យអប់រំផ្លូវការនៅ១៥ខេត្តក្នុងប្រទេសកម្ពុជា។ យើងអនុវត្តគម្រោងនៅគ្រប់កម្រិតនៃដំណើរសិក្សា — ពីសាលាមត្តេយ្យ និងបឋមសិក្សា ដល់មធ្យមសិក្សា កម្មវិធីឧត្តមសិក្សា និងបរិញ្ញាបត្រអនុបណ្ឌិតផ្នែកការណែនាំ។",
	},
	"home.about.p2.pre": { en: "Direct beneficiaries number well over", km: "អ្នកទទួលផលផ្ទាល់មានច្រើនជាង" },
	"home.about.p2.mid": { en: "children and several hundred teachers, at more than", km: "កុមារ និងគ្រូបង្រៀនរាប់រយនាក់ នៅសាលាជាង" },
	"home.about.p2.suf": {
		en: "schools. Together with partners, we build the conditions for every child to thrive.",
		km: "សាលា។ ជាមួយដៃគូ យើងបង្កើតលក្ខខណ្ឌឱ្យកុមារគ្រប់រូបអាចរីកចម្រើន។",
	},

	"home.donate.kicker": { en: "Stand with us", km: "ឈរជាមួយយើង" },
	"home.donate.title.a": { en: "Be part of the", km: "ចូលរួមជាផ្នែកនៃ" },
	"home.donate.title.b": { en: "next chapter.", km: "ជំពូកបន្ទាប់។" },
	"home.donate.lead": {
		en: "Your gift becomes a textbook, a teacher's training, a girl's scholarship, a community's library. Every contribution writes a future.",
		km: "អំណោយរបស់អ្នកក្លាយជាសៀវភៅសិក្សា វគ្គបណ្តុះបណ្តាលគ្រូ អាហារូបករណ៍ក្មេងស្រី បណ្ណាល័យសហគមន៍។ រាល់ការរួមចំណែកសរសេរអនាគត។",
	},
	"home.donate.now": { en: "♡ Donate now", km: "♡ បរិច្ចាគឥឡូវ" },
	"home.donate.partner": { en: "Partner with KAPE", km: "ភាពជាដៃគូជាមួយ KAPE" },

	// footer
	"footer.about": {
		en: "KAPE works at every level of formal education across 15 provinces in Cambodia — from preschools to Master's programs in Mentoring.",
		km: "KAPE ធ្វើការនៅគ្រប់កម្រិតនៃការអប់រំផ្លូវការនៅ១៥ខេត្តក្នុងប្រទេសកម្ពុជា — ពីសាលាមត្តេយ្យដល់កម្មវិធីអនុបណ្ឌិតផ្នែកការណែនាំ។",
	},
	"footer.explore": { en: "Explore", km: "រុករក" },
	"footer.newsletter": { en: "Newsletter", km: "ព្រឹត្តិបត្រ" },
	"footer.newsletter.lead": { en: "Subscribe to receive our e-newsletter.", km: "ជាវដើម្បីទទួលព្រឹត្តិបត្ររបស់យើង។" },
	"footer.copyright": { en: "© 2026 Kampuchea Action to Promote Education", km: "© ២០២៦ Kampuchea Action to Promote Education" },

	// subpage chrome
	"sub.home": { en: "Home", km: "ទំព័រដើម" },
};
