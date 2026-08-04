import { and, asc, eq, sql } from "drizzle-orm";

import type { DB } from "../db";
import {
	heroSlides,
	media,
	offices,
	partners,
	posts,
	siteSettings,
	stats,
	visitorDaily,
} from "../schema";
import { resolveTranslations } from "./i18n";
import { attachMediaUrl } from "./media-util";

const TENANT = 1;

/** Site settings as a key→value map (contact, socials, copyright, …). */
export async function getSettings(db: DB): Promise<Record<string, string>> {
	const rows = await db
		.select()
		.from(siteSettings)
		.where(eq(siteSettings.tenantId, TENANT));
	const o: Record<string, string> = {};
	for (const r of rows) o[r.key] = r.value;
	return o;
}

export async function listStats(db: DB, lang: string) {
	const rows = await db
		.select()
		.from(stats)
		.where(eq(stats.tenantId, TENANT))
		.orderBy(asc(stats.sort));
	const f = await resolveTranslations(
		db,
		"stat",
		rows.map((r) => r.id),
		lang,
	);
	return rows.map((r) => ({
		id: r.id,
		value: r.value,
		label: f.get(r.id)?.label ?? "",
	}));
}

export async function listHeroSlides(db: DB, lang: string) {
	const rows = await db
		.select({
			id: heroSlides.id,
			url: media.url,
			kind: heroSlides.kind,
			videoUrl: heroSlides.videoUrl,
		})
		.from(heroSlides)
		.leftJoin(media, eq(heroSlides.mediaId, media.id))
		.where(eq(heroSlides.tenantId, TENANT))
		.orderBy(asc(heroSlides.sort));
	const f = await resolveTranslations(
		db,
		"hero_slide",
		rows.map((r) => r.id),
		lang,
	);
	return rows.map((r) => ({
		id: r.id,
		url: r.url ?? "",
		kind: r.kind,
		videoUrl: r.videoUrl,
		kicker: f.get(r.id)?.kicker ?? "",
		title: f.get(r.id)?.title ?? "",
		caption: f.get(r.id)?.caption ?? "",
	}));
}

/**
 * The homepage pop-up: announcements are `posts` of type `announcement`. Every
 * notice still open is returned — deadline ones soonest first, then evergreen
 * ones newest first. Past-deadline announcements are hidden.
 */
export async function listActiveAnnouncements(db: DB, lang: string) {
	const rows = await db
		.select({ id: posts.id, meta: posts.meta, publishedAt: posts.publishedAt })
		.from(posts)
		.where(
			and(
				eq(posts.tenantId, TENANT),
				eq(posts.contentType, "announcement"),
				eq(posts.status, "published"),
			),
		);
	const today = new Date().toISOString().slice(0, 10);
	const items = rows.map((r) => {
		const m = (r.meta ?? {}) as Record<string, unknown>;
		return {
			id: r.id,
			deadline: String(m.deadline ?? ""),
			link: String(m.link ?? ""),
			publishedAt: r.publishedAt ?? "",
		};
	});
	const dated = items
		.filter((r) => r.deadline && r.deadline >= today)
		.sort((a, b) => a.deadline.localeCompare(b.deadline));
	const evergreen = items
		.filter((r) => !r.deadline)
		.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
	const active = [...dated, ...evergreen];
	const f = await resolveTranslations(
		db,
		"post",
		active.map((r) => r.id),
		lang,
	);
	return active.map((r) => ({
		id: r.id,
		title: f.get(r.id)?.title ?? "",
		message: f.get(r.id)?.excerpt ?? "",
		linkUrl: r.link || null,
		deadline: r.deadline || null,
		hasDeadline: Boolean(r.deadline),
	}));
}

// compat: `trpc/router.ts` (not this job's file) still imports the old name
export const getActiveAnnouncement = listActiveAnnouncements;

export async function listOffices(db: DB) {
	const rows = await db
		.select()
		.from(offices)
		.where(eq(offices.tenantId, TENANT))
		.orderBy(asc(offices.sort));
	return attachMediaUrl(db, rows, "imageMediaId", "imageUrl");
}

export async function listPartners(db: DB) {
	const rows = await db
		.select()
		.from(partners)
		.where(eq(partners.tenantId, TENANT))
		.orderBy(asc(partners.sort));
	return attachMediaUrl(db, rows, "logoMediaId", "logoUrl");
}

/** Record one visit for today and return {today, month, total}. (Write-on-read counter.) */
export async function recordAndGetVisits(
	db: DB,
): Promise<{ today: number; month: number; total: number }> {
	const today = new Date().toISOString().slice(0, 10);
	await db
		.insert(visitorDaily)
		.values({ tenantId: TENANT, date: today, count: 1 })
		.onConflictDoUpdate({
			target: [visitorDaily.tenantId, visitorDaily.date],
			set: { count: sql`${visitorDaily.count} + 1` },
		});
	const rows = await db
		.select()
		.from(visitorDaily)
		.where(eq(visitorDaily.tenantId, TENANT));
	const month = today.slice(0, 7);
	return {
		today: rows.find((r) => r.date === today)?.count ?? 0,
		month: rows
			.filter((r) => r.date.startsWith(month))
			.reduce((s, r) => s + r.count, 0),
		total: rows.reduce((s, r) => s + r.count, 0),
	};
}
