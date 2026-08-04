/**
 * Idempotent dev seed: default tenant, languages (en default + km), content types,
 * a starter nav tree, and a sample page + post with EN/KH translations.
 *
 * Split by IA area under ./seed/ — this file only composes them, in the order the
 * foreign keys require (nav before pages, media before the sections that use it).
 *
 * Run: `bun run db:seed`  (db.ts applies migrations on import first)
 */
import { db } from "./db";
import { applyTreeMigrations } from "./migrate-tree";
import { seedBase } from "./seed/base";
import { alreadySeeded } from "./seed/helpers";
import {
	seedDocuments,
	seedEvents,
	seedInternalNews,
	seedStaffRoster,
} from "./seed/internal";
import { seedHeroSlides } from "./seed/media";
import { seedNav } from "./seed/nav";
import { seedWhoWeArePages } from "./seed/pages-who-we-are";
import {
	seedDonors,
	seedProjectLocations,
	seedProjects,
	seedSchools,
} from "./seed/projects";
import {
	seedAlbums,
	seedAnnouncements,
	seedJobs,
	seedLeadership,
	seedNews,
	seedPartners,
	seedPublications,
	seedStories,
	seedTerms,
	seedVideos,
} from "./seed/records";
import { seedOffices, seedSiteSettings, seedStats } from "./seed/site";
import { seedAdminUser, seedStaffUser } from "./seed/users";

export { MEDIA_GROUPS, NAV_META } from "./seed/nav";

async function main() {
	if (await alreadySeeded()) {
		console.log("Already seeded — skipping.");
		return;
	}

	await seedBase();
	await seedNav();
	await seedWhoWeArePages();

	await seedNews();
	await seedStories();
	await seedTerms();
	await seedPublications();
	await seedAlbums();
	await seedJobs();
	await seedVideos();
	await seedLeadership();

	// ---- Internal staff-portal content ----
	await seedInternalNews();
	await seedEvents();
	await seedDocuments();
	await seedStaffRoster();
	await seedStaffUser();

	// ---- Structured entities (replace hardcoded UI content) ----
	await seedSiteSettings();
	await seedStats();
	const donorIds = await seedDonors();
	const projectIds = await seedProjects(donorIds);
	await seedProjectLocations(projectIds);
	await seedSchools(projectIds);
	await seedPartners();
	await seedOffices();
	await seedHeroSlides();
	await seedAnnouncements();

	const adminEmail = await seedAdminUser();

	// Transform the base content into the page-tree + flat-collection model:
	// landing pages, migrated static section pages, the section-built home page,
	// the parent/segment tree, and flattened nav targets.
	await applyTreeMigrations(db);

	console.log(
		"Seed complete: 2 languages, UI strings, content types, full nav tree, page tree + collections, home page, 3 news, 2 stories.",
	);
	// Never print passwords (logs get archived). Show the email only; if a password
	// wasn't supplied via env, note that the documented dev default was used.
	console.log(
		`Admin user: ${adminEmail}${process.env.ADMIN_PASSWORD ? "" : " (default dev password — change it before go-live)"}`,
	);
	console.log("Staff user: staff@kapekh.org");
}

await main();
