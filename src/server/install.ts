/**
 * Fresh install: the smallest database an administrator can log into and start
 * building on. No site content — see `bun run seed:kape` for the KAPE fixture.
 *
 * Configuration-driven and non-interactive, because the Docker entrypoint has no
 * terminal. Run: `bun run db:seed` (db.ts applies migrations on import first).
 */
import { HEADER_DEFAULTS } from "#/lib/header-defaults";
import { LANGS } from "#/lib/i18n-config";
import { defaultUiStrings } from "#/lib/ui-strings.default";
import { hashPassword } from "./auth";
import { db } from "./db";
import { normalizeTree, upsertPage } from "./page-tree";
import {
	contentTypes,
	languages,
	siteSettings,
	tenants,
	uiStrings,
	users,
} from "./schema";
import { alreadySeeded, TENANT } from "./seed/helpers";
import { seedRoles } from "./seed/roles";

const DEV_PASSWORD = "install-dev-password";

export type InstallConfig = {
	siteName: string;
	lang: string;
	adminEmail: string;
	adminPassword: string;
	/** True when the password came from the environment, so it must not be printed. */
	passwordSupplied: boolean;
};

const randomPassword = () =>
	Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) =>
		b.toString(16).padStart(2, "0"),
	).join("");

export function readConfig(
	env: NodeJS.ProcessEnv,
	dev: boolean,
): InstallConfig {
	const lang = env.SITE_DEFAULT_LANG?.trim() || "en";
	if (!LANGS.includes(lang))
		throw new Error(
			`SITE_DEFAULT_LANG=${lang} is not a routable language. src/lib/i18n-config.ts serves ${LANGS.join(", ")}; add the code to LANGS there first.`,
		);
	const supplied = Boolean(env.ADMIN_PASSWORD);
	return {
		siteName: env.SITE_NAME?.trim() || "My Site",
		lang,
		adminEmail: env.ADMIN_EMAIL?.trim() || "admin@localhost",
		adminPassword:
			env.ADMIN_PASSWORD || (dev ? DEV_PASSWORD : randomPassword()),
		passwordSupplied: supplied,
	};
}

const slugify = (s: string) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "") || "site";

export async function install(config: InstallConfig) {
	const { siteName, lang, adminEmail, adminPassword } = config;

	await db
		.insert(tenants)
		.values({ id: TENANT, slug: slugify(siteName), name: siteName });

	const native =
		new Intl.DisplayNames([lang], { type: "language" }).of(lang) ?? lang;
	await db.insert(languages).values({
		code: lang,
		name: new Intl.DisplayNames(["en"], { type: "language" }).of(lang) ?? lang,
		nativeName: native,
		isDefault: true,
		enabled: true,
		sort: 0,
	});

	await db.insert(uiStrings).values(
		Object.entries(defaultUiStrings).map(([key, v]) => ({
			tenantId: TENANT,
			key,
			lang,
			value: (v as Record<string, string | undefined>)[lang] ?? v.en,
		})),
	);

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

	await seedRoles(db);

	await db.insert(users).values({
		tenantId: TENANT,
		email: adminEmail,
		passwordHash: await hashPassword(adminPassword),
		name: "Administrator",
		role: "admin",
	});

	// The header and footer components fall back to their *-defaults.ts when a key
	// is unset, so only the site's own identity needs a row here.
	await db.insert(siteSettings).values(
		Object.entries({
			...HEADER_DEFAULTS,
			site_name_en: siteName,
			copyright: `© ${new Date().getFullYear()} ${siteName}`,
		}).map(([key, value]) => ({ tenantId: TENANT, key, value })),
	);

	// `/` resolves the slug `home`; without this row a working install 404s on its
	// own front page. It gets one richtext section, the only kind that needs no
	// other content behind it: a page with no sections at all falls through to the
	// sub-page layout and greets the owner with "this section is being updated".
	await upsertPage(
		db,
		"home",
		siteName,
		[
			{
				id: "welcome",
				type: "richtext",
				layout: "default",
				props: {
					title: `Welcome to ${siteName}`,
					body: JSON.stringify({
						type: "doc",
						content: [
							{
								type: "paragraph",
								content: [
									{
										type: "text",
										text: "This is your new site. Sign in at /admin to edit this page, build your menu and publish your first content.",
									},
								],
							},
						],
					}),
				},
			},
		],
		lang,
	);
	await normalizeTree(db);
}

if (import.meta.main) {
	if (await alreadySeeded()) {
		console.log("Already installed — skipping.");
	} else {
		const dev =
			process.argv.includes("--dev") || process.env.INSTALL_DEV === "1";
		const config = readConfig(process.env, dev);
		await install(config);
		console.log(`Installed "${config.siteName}" (${config.lang}).`);
		console.log(`Administrator: ${config.adminEmail}`);
		if (!config.passwordSupplied)
			console.log(
				`Password: ${config.adminPassword}  ← shown once, not stored anywhere else. Set ADMIN_PASSWORD to choose your own.`,
			);
	}
	process.exit(0);
}
