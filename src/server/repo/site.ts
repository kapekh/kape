import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
	COLLECTIONS,
	collectionHref,
	NOTICE_CONTENT_TYPES,
	noticeDeadline,
	openNotices,
} from "#/lib/collections";

import type { DB } from "../db";
import {
	heroSlides,
	media,
	offices,
	pageViews,
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
	// This map is dehydrated into every page's HTML; the installer's own bookkeeping
	// is not site identity and has no business travelling to the browser.
	for (const r of rows)
		if (r.key !== "install_completed_at") o[r.key] = r.value;
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

/** What the home page pops up: published jobs and announcements, none past their deadline. */
export async function listActiveAnnouncements(db: DB, lang: string) {
	const rows = await db
		.select({
			id: posts.id,
			slug: posts.slug,
			meta: posts.meta,
			publishedAt: posts.publishedAt,
		})
		.from(posts)
		.where(
			and(
				eq(posts.tenantId, TENANT),
				inArray(posts.contentType, NOTICE_CONTENT_TYPES),
				eq(posts.status, "published"),
			),
		);
	const active = openNotices(
		rows.map((r) => ({
			id: r.id,
			slug: r.slug,
			deadline: noticeDeadline(r.meta),
			publishedAt: r.publishedAt ?? "",
		})),
	);
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
		// no body, nothing to read — a read-more onto a bare headline is worse
		// than no read-more at all
		linkUrl: f.get(r.id)?.body
			? collectionHref(COLLECTIONS.careers.prefix, r.slug)
			: null,
		deadline: r.deadline || null,
		hasDeadline: Boolean(r.deadline),
	}));
}

export async function listOffices(db: DB, lang: string) {
	const rows = await db
		.select()
		.from(offices)
		.where(eq(offices.tenantId, TENANT))
		.orderBy(asc(offices.sort));
	const withUrl = await attachMediaUrl(db, rows, "imageMediaId", "imageUrl");
	const text = await resolveTranslations(
		db,
		"office",
		rows.map((r) => r.id),
		lang,
	);
	return withUrl.map((r) => ({
		...r,
		name: text.get(r.id)?.name ?? "",
		address: text.get(r.id)?.address ?? "",
	}));
}

export async function listPartners(db: DB) {
	const rows = await db
		.select()
		.from(partners)
		.where(eq(partners.tenantId, TENANT))
		.orderBy(asc(partners.sort));
	return attachMediaUrl(db, rows, "logoMediaId", "logoUrl");
}

/**
 * The page a view is filed under. The language prefix goes, so a page reads as
 * one page however many languages it is published in, and a query string with
 * it: `?page=2` is the same article list.
 */
export function viewPath(raw: string): string | null {
	const path = String(raw || "").split(/[?#]/)[0];
	if (!path.startsWith("/")) return null;
	const stripped = path.replace(/^\/[a-z]{2}(?=\/|$)/i, "") || "/";
	// an admin screen is not readership, and neither is a file
	if (/^\/(admin|internalsources|api|uploads|login)(\/|$)/.test(stripped))
		return null;
	return stripped.length > 512 ? null : stripped;
}

/** Record one view of one page. Unknown or non-public paths are not counted. */
export async function recordPageView(db: DB, raw: string): Promise<void> {
	const path = viewPath(raw);
	if (!path) return;
	await db
		.insert(pageViews)
		.values({
			tenantId: TENANT,
			path,
			count: 1,
			lastViewedAt: new Date().toISOString(),
		})
		.onConflictDoUpdate({
			target: [pageViews.tenantId, pageViews.path],
			set: {
				count: sql`${pageViews.count} + 1`,
				lastViewedAt: new Date().toISOString(),
			},
		});
}

/** Record one visit for today and return {today, month, total}. (Write-on-read counter.) */
export async function recordAndGetVisits(
	db: DB,
	path?: string,
): Promise<{ today: number; month: number; total: number }> {
	if (path) await recordPageView(db, path);
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
