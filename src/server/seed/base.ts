import { db } from "../db";
import { contentTypes, languages, tenants, uiStrings } from "../schema";
import { TENANT } from "./helpers";
import { kapeUiStrings } from "./ui-strings.kape";

export async function seedBase() {
	await db.insert(tenants).values({ id: TENANT, slug: "kape", name: "KAPE" });

	await db.insert(languages).values([
		{
			code: "en",
			name: "English",
			nativeName: "English",
			isDefault: true,
			enabled: true,
			sort: 0,
		},
		{
			code: "km",
			name: "Khmer",
			nativeName: "ខ្មែរ",
			isDefault: false,
			enabled: true,
			sort: 1,
		},
	]);

	// UI chrome strings (en + km) for the default tenant.
	const uiRows: {
		tenantId: number;
		key: string;
		lang: string;
		value: string;
	}[] = [];
	for (const [key, v] of Object.entries(kapeUiStrings)) {
		uiRows.push({ tenantId: TENANT, key, lang: "en", value: v.en });
		if (v.km) uiRows.push({ tenantId: TENANT, key, lang: "km", value: v.km });
	}
	await db.insert(uiStrings).values(uiRows);

	await db.insert(contentTypes).values(
		[
			["news", "News & Events"],
			["story", "Impact / Success Story"],
			["announcement", "Announcement"],
			["job", "Job Vacancy"],
			["document", "Document"],
			["album", "Photo Album"],
			["video", "Video"],
			["event", "Calendar Event"],
			["internal_news", "Internal News"],
			["publication", "Publication"],
		].map(([key, name], i) => ({ key, name, isSystem: true, sort: i })),
	);
}
