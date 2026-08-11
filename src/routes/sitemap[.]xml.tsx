import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { COLLECTIONS, NON_PUBLIC_CONTENT_TYPES } from "#/lib/collections";
import { LANGS, reportUnroutable } from "#/lib/i18n-config";
import { db } from "#/server/db";
import { siteOrigin } from "#/server/origin";
import { languages, pages, posts } from "#/server/schema";

// Internal-only content types are excluded (shared with the route resolver + section queries).
const BLOCKED = NON_PUBLIC_CONTENT_TYPES;

// content_type -> URL prefix (e.g. "news" -> "news", "story" -> "stories").
const PREFIX_BY_TYPE: Record<string, string> = {};
for (const c of Object.values(COLLECTIONS))
	if (c.contentType) PREFIX_BY_TYPE[c.contentType] = c.prefix;

const xmlEscape = (s: string) =>
	s.replace(/[&<>'"]/g, (c) => `&#${c.charCodeAt(0)};`);

async function handler({ request }: { request: Request }) {
	// collection landings are ordinary pages; listing every prefix advertised a landing nobody had authored
	const paths = new Set<string>(["/"]);

	// The router's prefix list is the fallback, not the source: a site that has
	// only English should not advertise a /km/ URL for every page it owns.
	let langs = LANGS;
	try {
		const enabled = await db
			.select({ code: languages.code })
			.from(languages)
			.where(eq(languages.enabled, true))
			.orderBy(languages.sort);
		if (enabled.length) langs = enabled.map((l) => l.code);
		reportUnroutable(langs, "sitemap");
	} catch (e) {
		console.error("[sitemap] languages query failed", e);
	}

	try {
		const pubPages = await db
			.select({ slug: pages.slug })
			.from(pages)
			.where(eq(pages.status, "published"));
		// "home" is already listed as "/", and both URLs serve the same page.
		for (const p of pubPages)
			if (p.slug && p.slug !== "home") paths.add(`/${p.slug}`);
	} catch (e) {
		console.error("[sitemap] pages query failed", e);
	}

	try {
		const pubPosts = await db
			.select({ slug: posts.slug, contentType: posts.contentType })
			.from(posts)
			.where(eq(posts.status, "published"));
		for (const p of pubPosts) {
			if (BLOCKED.has(p.contentType)) continue;
			const prefix = PREFIX_BY_TYPE[p.contentType];
			if (prefix && p.slug) paths.add(`/${prefix}/${p.slug}`);
		}
	} catch (e) {
		console.error("[sitemap] posts query failed", e);
	}

	const base = siteOrigin(request);
	const urls: string[] = [];
	for (const p of paths) {
		for (const lang of langs) {
			const loc = `${base}/${lang}${p === "/" ? "" : p}`;
			urls.push(`  <url><loc>${xmlEscape(loc)}</loc></url>`);
		}
	}

	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
	return new Response(body, {
		headers: {
			"content-type": "application/xml; charset=utf-8",
			"cache-control": "public, max-age=3600",
		},
	});
}

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: handler,
		},
	},
});
