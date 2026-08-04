import { and, asc, desc, eq } from "drizzle-orm";

import type { DB } from "../db";
import { renderBody } from "../richtext";
import { posts, staff } from "../schema";
import { resolveTranslations } from "./i18n";
import { attachMediaUrl } from "./media-util";

const TENANT = 1;

/** Internal news feed (type=internal_news), newest first. */
export async function staffNews(db: DB, lang: string) {
	const rows = await db
		.select()
		.from(posts)
		.where(
			and(
				eq(posts.tenantId, TENANT),
				eq(posts.contentType, "internal_news"),
				eq(posts.status, "published"),
			),
		)
		.orderBy(desc(posts.publishedAt));
	const f = await resolveTranslations(
		db,
		"post",
		rows.map((r) => r.id),
		lang,
	);
	return rows.map((r) => ({
		id: r.id,
		slug: r.slug,
		publishedAt: r.publishedAt,
		title: f.get(r.id)?.title ?? "",
		excerpt: f.get(r.id)?.excerpt ?? "",
		bodyHtml: renderBody(f.get(r.id)?.body ?? null),
	}));
}

/** Calendar events (type=event). Program/start/end live in `meta`. */
export async function staffEvents(db: DB, lang: string) {
	const rows = await db
		.select()
		.from(posts)
		.where(and(eq(posts.tenantId, TENANT), eq(posts.contentType, "event")))
		.orderBy(asc(posts.publishedAt));
	const f = await resolveTranslations(
		db,
		"post",
		rows.map((r) => r.id),
		lang,
	);
	return rows.map((r) => {
		const meta = (r.meta ?? {}) as Record<string, unknown>;
		return {
			id: r.id,
			title: f.get(r.id)?.title ?? "",
			program: String(meta.program ?? ""),
			start: String(meta.start ?? ""),
			end: String(meta.end ?? ""),
		};
	});
}

/** Internal documents (type=document). Category + file URL live in `meta`. */
export async function staffDocuments(db: DB, lang: string) {
	const rows = await db
		.select()
		.from(posts)
		.where(and(eq(posts.tenantId, TENANT), eq(posts.contentType, "document")))
		.orderBy(desc(posts.id));
	const f = await resolveTranslations(
		db,
		"post",
		rows.map((r) => r.id),
		lang,
	);
	return rows.map((r) => {
		const meta = (r.meta ?? {}) as Record<string, unknown>;
		return {
			id: r.id,
			title: f.get(r.id)?.title ?? "",
			category: String(meta.category ?? "Other"),
			fileUrl: meta.fileUrl ? String(meta.fileUrl) : null,
		};
	});
}

/** Staff directory rows (with resolved photo URLs). */
export async function staffDirectory(db: DB) {
	const rows = await db
		.select()
		.from(staff)
		.where(eq(staff.tenantId, TENANT))
		.orderBy(asc(staff.sort));
	return attachMediaUrl(db, rows, "photoMediaId", "photoUrl");
}
