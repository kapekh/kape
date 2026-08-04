import { createFileRoute } from "@tanstack/react-router";

import { siteOrigin } from "#/server/origin";

/**
 * Dynamic robots.txt. Emits an ABSOLUTE Sitemap URL (a relative one is invalid
 * per the protocol and ignored by crawlers). All bots — including AI crawlers
 * (GPTBot, ClaudeBot, PerplexityBot, CCBot, Google-Extended, …) — are allowed
 * the public site via `User-agent: *`; only private/app areas are disallowed.
 */
function handler({ request }: { request: Request }) {
	const origin = siteOrigin(request);
	const body = [
		"# AI and search crawlers are welcome to index the public site.",
		"User-agent: *",
		"Allow: /",
		"Disallow: /admin",
		"Disallow: /internalsources",
		"Disallow: /login",
		"Disallow: /api/",
		"",
		`Sitemap: ${origin}/sitemap.xml`,
		"",
	].join("\n");
	return new Response(body, {
		headers: {
			"content-type": "text/plain; charset=utf-8",
			"cache-control": "public, max-age=3600",
		},
	});
}

export const Route = createFileRoute("/robots.txt")({
	server: {
		handlers: {
			GET: handler,
		},
	},
});
