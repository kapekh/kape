/**
 * The KAPE fixture: the client's whole site as data — languages, UI strings, the
 * full nav tree, every page, project, record and staff-portal entry.
 *
 * This is not what a fresh install gets (see src/server/install.ts). It exists so
 * the site can be stood up from nothing whenever we need to be KAPE again.
 *
 * Modules are composed in the order the foreign keys require (nav before pages,
 * media before the sections that use it).
 *
 * Run: `bun run seed:kape`  (db.ts applies migrations on import first)
 */
import { db } from "../db";
import { applyTreeMigrations } from "../migrate-tree";
import { seedBase } from "./base";
import { alreadySeeded } from "./helpers";
import {
	seedDocuments,
	seedEvents,
	seedInternalNews,
	seedStaffRoster,
} from "./internal";
import { seedHeroSlides } from "./media";
import { seedNav } from "./nav";
import { seedWhatWeDoPages } from "./pages-what-we-do";
import { seedWhoWeArePages } from "./pages-who-we-are";
import {
	seedDonors,
	seedProjectLocations,
	seedProjects,
	seedSchools,
} from "./projects";
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
} from "./records";
import { seedRoles } from "./roles";
import { seedOffices, seedSiteSettings, seedStats } from "./site";
import { seedAdminUser, seedStaffUser } from "./users";

export async function seedKape() {
	await seedBase();
	await seedNav();
	await seedWhoWeArePages();
	await seedWhatWeDoPages();

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
	// Roles before users: a user's `role` column points at a role key.
	await seedRoles(db);
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

	return adminEmail;
}

if (import.meta.main) {
	if (await alreadySeeded()) {
		console.log("Already seeded — skipping.");
	} else {
		const adminEmail = await seedKape();
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
	process.exit(0);
}
