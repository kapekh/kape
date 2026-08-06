import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { COLLECTIONS } from "#/lib/collections";
import { DEFAULT_LANG } from "#/lib/i18n-config";
import { siteDescription, siteTitle } from "#/lib/site-identity";
import { db } from "#/server/db";
import { siteOrigin } from "#/server/origin";
import { listPosts } from "#/server/repo/content";
import { getSettings } from "#/server/repo/site";
import { pages } from "#/server/schema";

/**
 * /llms.txt — the llmstxt.org convention: a curated, plain-markdown map of the
 * site so LLMs can find the important content without crawling everything.
 * Blocked/internal content types are intentionally excluded.
 */
const BLOCKED = new Set(["internal_news", "document", "announcement", "event"]);

async function handler({ request }: { request: Request }) {
	const base = siteOrigin(request);
	const lang = DEFAULT_LANG;
	const u = (path: string) => `${base}/${lang}${path}`;
	const settings = await getSettings(db);
	const description = siteDescription(settings);

	const lines: string[] = [
		`# ${siteTitle(settings)}`,
		"",
		...(description
			? [
					`> ${description} This file helps language models find the key public content.`,
					"",
				]
			: []),
		"## Key pages",
		`- [Home](${u("")})`,
	];
	// A landing is an ordinary page: list the collections someone has authored one
	// for, not every prefix the code knows about.
	const authored = new Set(
		(
			await db
				.select({ slug: pages.slug })
				.from(pages)
				.where(eq(pages.status, "published"))
		).map((p) => p.slug),
	);
	for (const c of Object.values(COLLECTIONS)) {
		if (c.contentType && BLOCKED.has(c.contentType)) continue;
		if (!authored.has(c.prefix)) continue;
		lines.push(`- [${c.label}](${u(`/${c.prefix}`)})`);
	}

	// A few recent items so models have concrete entry points.
	for (const [ct, prefix, heading] of [
		["news", "news", "Latest news"],
		["story", "stories", "Impact stories"],
	] as const) {
		try {
			const items = await listPosts(db, ct, lang, 10);
			if (items.length) {
				lines.push("", `## ${heading}`);
				for (const it of items) {
					const desc =
						"excerpt" in it && it.excerpt
							? `: ${String(it.excerpt).replace(/\s+/g, " ").slice(0, 160)}`
							: "";
					lines.push(`- [${it.title}](${u(`/${prefix}/${it.slug}`)})${desc}`);
				}
			}
		} catch (e) {
			console.error(`[llms.txt] ${ct} query failed`, e);
		}
	}

	lines.push(
		"",
		"## Full index",
		`- [Sitemap](${base}/sitemap.xml): every public URL, in every language the site publishes`,
		"",
	);

	return new Response(lines.join("\n"), {
		headers: {
			"content-type": "text/plain; charset=utf-8",
			"cache-control": "public, max-age=3600",
		},
	});
}

export const Route = createFileRoute("/llms.txt")({
	server: {
		handlers: {
			GET: handler,
		},
	},
});
