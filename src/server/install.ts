/**
 * Fresh install: the smallest database an administrator can log into and start
 * building on. No editorial content of any kind, only the structure the shipped
 * content types need to be reachable — see `bun run seed:kape` for a full site.
 *
 * Configuration-driven and non-interactive, because the Docker entrypoint has no
 * terminal. Run: `bun run db:seed` (db.ts applies migrations on import first).
 *
 * The entrypoint runs this on every boot, so two things matter as much as what
 * it writes: it writes all of it or none of it, and it can tell a finished
 * install from an abandoned one.
 */
import { and, count, eq, sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

import { HEADER_DEFAULTS } from "#/lib/header-defaults";
import { LANGS } from "#/lib/i18n-config";
import { moduleDef, MODULES_SETTING } from "#/lib/modules";
import { defaultUiStrings } from "#/lib/ui-strings.default";
import { hashPassword } from "./auth";
import { db } from "./db";
import { normalizeTree, upsertPage } from "./page-tree";
import {
	contentTypes,
	languages,
	media,
	pages,
	posts,
	roles,
	siteSettings,
	tenants,
	uiStrings,
	users,
} from "./schema";
import { backfillModules } from "./repo/modules";
import { TENANT } from "./seed/helpers";
import { LANDINGS } from "./seed/landings";
import { seedRoles } from "./seed/roles";

const DEV_PASSWORD = "install-dev-password";

/** Written last, inside the transaction, so its presence means all of it landed. */
const INSTALL_MARKER = "install_completed_at";

/** Raised for conditions an operator can act on; main prints these without a stack. */
export class InstallError extends Error {}

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
		throw new InstallError(
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

const setting = (key: string) =>
	db
		.select({ value: siteSettings.value })
		.from(siteSettings)
		.where(and(eq(siteSettings.tenantId, TENANT), eq(siteSettings.key, key)))
		.limit(1);

export type InstallState = {
	state: "empty" | "complete" | "partial";
	/** Foundations a finished install leaves that this database does not have. */
	missing: string[];
	/** Foundations it does have. */
	present: string[];
	/** Wrong, but repairable by an administrator who can log in. Never blocks a boot. */
	warnings: string[];
	/** Work in the file, as `12 pages`. Empty means deleting it costs nothing. */
	holds: string[];
	/** When a finished install last recorded itself, if it ever did. */
	installedAt?: string;
};

const rows = (t: SQLiteTable) =>
	db.select({ x: sql<number>`1` }).from(t).limit(1);

/**
 * The rows a site cannot run without and an administrator cannot remove through
 * the admin: the tenant, a default language, the string dictionary, the content
 * types, the roles and an account that can log in and repair everything else.
 *
 * Deliberately not: the site name, or a page at `home`. Both are ordinary things
 * an operator edits or renames, and a site missing them is wrong but reachable,
 * so refusing to boot over one would destroy more than it protects. They are
 * reported as warnings instead.
 *
 * The guard this replaced keyed on `languages`, the second of eight writes, so a
 * database abandoned anywhere after it reported itself healthy for ever.
 */
export async function installState(): Promise<InstallState> {
	const foundations = [
		["tenant", rows(tenants)],
		["default language", rows(languages)],
		["UI strings", rows(uiStrings)],
		["content types", rows(contentTypes)],
		["roles", rows(roles)],
		[
			"administrator",
			db
				.select({ x: users.id })
				.from(users)
				.where(eq(users.role, "admin"))
				.limit(1),
		],
	] as const;

	const soft = [
		[
			"no site name is set, so the header and page titles fall back to a placeholder. Set site_name_en in /admin/settings.",
			setting("site_name_en"),
		],
		[
			'no page answers at the slug "home", so / will 404. Create one in /admin/pages.',
			db
				.select({ x: pages.id })
				.from(pages)
				.where(and(eq(pages.tenantId, TENANT), eq(pages.slug, "home")))
				.limit(1),
		],
	] as const;

	const [marker, anyUser, ...found] = await Promise.all([
		setting(INSTALL_MARKER),
		rows(users),
		...foundations.map(([, q]) => q),
		...soft.map(([, q]) => q),
	]);
	const hit = (i: number) => found[i].length > 0;

	const missing = foundations.filter((_, i) => !hit(i)).map(([n]) => n);
	const present = foundations.filter((_, i) => hit(i)).map(([n]) => n);
	const warnings = soft
		.filter((_, i) => !hit(foundations.length + i))
		.map(([n]) => n);

	const counted = await Promise.all(
		(
			[
				["page", pages],
				["post", posts],
				["media item", media],
			] as const
		).map(
			async ([label, t]) =>
				[label, (await db.select({ c: count() }).from(t))[0]?.c ?? 0] as const,
		),
	);
	const holds = counted
		.filter(([, c]) => c > 0)
		.map(([label, c]) => `${c} ${label}${c === 1 ? "" : "s"}`);

	// The marker is a diagnostic, never the verdict: a database holding nothing but
	// that row is empty, and one an operator has deleted it from is still complete.
	const installedAt = marker[0]?.value ?? undefined;
	if (!missing.length)
		return {
			state: "complete",
			missing,
			present,
			warnings,
			holds,
			installedAt,
		};
	if (
		missing.length === foundations.length &&
		!anyUser.length &&
		warnings.length === soft.length &&
		!holds.length
	)
		return { state: "empty", missing, present, warnings, holds, installedAt };
	return { state: "partial", missing, present, warnings, holds, installedAt };
}

const markInstalled = () =>
	db
		.insert(siteSettings)
		.values({
			tenantId: TENANT,
			key: INSTALL_MARKER,
			value: new Date().toISOString(),
		})
		.onConflictDoUpdate({
			target: [siteSettings.tenantId, siteSettings.key],
			set: { value: new Date().toISOString() },
		});

const adminEmailTaken = async (email: string) =>
	(
		await db
			.select({ email: users.email })
			.from(users)
			.where(and(eq(users.tenantId, TENANT), eq(users.email, email)))
			.limit(1)
	).length > 0;

/**
 * Diagnose, then prescribe. An earlier version of this message offered "delete the
 * file" as the recovery whatever the file turned out to hold, which is advice that
 * destroys a working site the moment the state check is wrong about one.
 */
async function halfInstalled(
	s: InstallState,
	adminEmail: string,
): Promise<string> {
	const file = db.$client.filename;
	const lines = [
		`Refusing to install: ${file} is missing rows this site cannot run without.`,
		`Missing: ${s.missing.join(", ")}.`,
	];
	if (s.present.length) lines.push(`Present: ${s.present.join(", ")}.`);
	if (s.installedAt)
		lines.push(
			`It records a finished install on ${s.installedAt}, so these rows were removed after that, rather than never written.`,
		);
	if (s.holds.length) lines.push(`It also holds ${s.holds.join(", ")}.`);
	if (await adminEmailTaken(adminEmail))
		lines.push(
			`ADMIN_EMAIL=${adminEmail} already has an account here, so a fresh install cannot claim that address.`,
		);
	lines.push("Nothing has been changed by this run.");
	lines.push(
		s.holds.length
			? `Recover by restoring the most recent backup, or by putting the missing rows back by hand. Do NOT delete ${file}: the content listed above is in it and this installer cannot rebuild it.`
			: `This file holds no pages, posts or media. If there is nothing in it you need, stop the container, delete ${file} along with its -wal and -shm files, and start again for a fresh install.`,
	);
	return lines.join("\n");
}

async function writeInstall(config: InstallConfig, passwordHash: string) {
	const { siteName, lang, adminEmail } = config;

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
		passwordHash,
		name: "Administrator",
		role: "admin",
	});

	// The header and footer components fall back to their *-defaults.ts when a key
	// is unset, so only the site's own identity needs a row here.
	//
	// `enabled_modules` is the exception: it is written empty rather than left out.
	// A missing row means "this database predates modules, keep everything on", so
	// a fresh install has to answer "none of them" out loud or a law firm comes up
	// holding a school register.
	await db.insert(siteSettings).values(
		Object.entries({
			...HEADER_DEFAULTS,
			site_name_en: siteName,
			copyright: `© ${new Date().getFullYear()} ${siteName}`,
			[MODULES_SETTING]: "",
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

	for (const l of LANDINGS)
		await upsertPage(db, l.slug, l.title, [l.section], lang);

	await normalizeTree(db);

	await markInstalled();
}

/**
 * Every write or none of them. drizzle's bun-sqlite `transaction()` commits
 * an async callback even when it throws, so the transaction is driven on the raw
 * connection instead; that also covers the process being killed mid-install,
 * because SQLite discards an uncommitted transaction when the file is reopened.
 */
export async function install(config: InstallConfig) {
	if (await adminEmailTaken(config.adminEmail))
		throw new InstallError(
			`ADMIN_EMAIL=${config.adminEmail} already has an account in ${db.$client.filename}, so this is not an empty database and there is nothing to install. Set ADMIN_EMAIL to an address that is not already in use, or point DATABASE_PATH at a new file. Nothing has been changed.`,
		);

	// Outside the transaction: hashing is the one slow step and holds no lock.
	const passwordHash = await hashPassword(config.adminPassword);

	db.$client.exec("BEGIN IMMEDIATE");
	try {
		await writeInstall(config, passwordHash);
		db.$client.exec("COMMIT");
	} catch (err) {
		if (db.$client.inTransaction) db.$client.exec("ROLLBACK");
		throw err;
	}
}

if (import.meta.main) {
	const dev = process.argv.includes("--dev") || process.env.INSTALL_DEV === "1";
	let config: InstallConfig;
	try {
		config = readConfig(process.env, dev);
	} catch (err) {
		console.error(err instanceof InstallError ? err.message : err);
		process.exit(1);
	}

	const state = await installState();
	if (state.state === "partial") {
		console.error(await halfInstalled(state, config.adminEmail));
		process.exit(1);
	}
	if (state.state === "complete") {
		console.log("Already installed - skipping.");
		// A database from before modules existed answers nothing about them, and the
		// safe reading of silence is "keep everything". Settle it once, from the rows
		// the site actually holds, and say so: the operator is about to see an admin
		// with fewer screens in it than the one they had yesterday.
		const filled = await backfillModules(db);
		if (filled.state === "written") {
			const names = filled.enabled.map((id) => moduleDef(id)?.label ?? id);
			console.log(
				names.length
					? `Modules: this database predates the module setting. Enabled ${names.join(", ")}, because it holds records for them. Change this at /admin/modules.`
					: "Modules: this database predates the module setting, and holds no records for any of them, so all are off. Turn any on at /admin/modules.",
			);
		}
		// Wrong but reachable: an administrator can log in and put these back, so
		// say so and start the server rather than holding the whole site down.
		for (const w of state.warnings) console.warn(`Warning: ${w}`);
		process.exit(0);
	}

	try {
		await install(config);
	} catch (err) {
		if (err instanceof InstallError) {
			console.error(err.message);
			process.exit(1);
		}
		console.error(
			"Install failed. The database was rolled back and is unchanged.",
		);
		throw err;
	}
	console.log(`Installed "${config.siteName}" (${config.lang}).`);
	console.log(`Administrator: ${config.adminEmail}`);
	if (!config.passwordSupplied)
		console.log(
			`Password: ${config.adminPassword}  ← shown once, not stored anywhere else. Set ADMIN_PASSWORD to choose your own.`,
		);
	process.exit(0);
}
