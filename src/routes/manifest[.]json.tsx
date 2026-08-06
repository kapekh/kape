import { createFileRoute } from "@tanstack/react-router";

import { DEFAULT_LANG } from "#/lib/i18n-config";
import { siteDescription, siteShortName, siteTitle } from "#/lib/site-identity";
import { db } from "#/server/db";
import { getSettings } from "#/server/repo/site";

/**
 * The PWA manifest, built from `site_settings` so an install that renames itself
 * renames its home-screen icon too. Served here rather than shipped in public/
 * for that reason.
 */
async function handler() {
	const settings = await getSettings(db);
	const description = siteDescription(settings);
	const manifest = {
		short_name: siteShortName(settings),
		name: siteTitle(settings),
		...(description ? { description } : {}),
		icons: [
			{
				src: "favicon.ico",
				sizes: "64x64 32x32 24x24 16x16",
				type: "image/x-icon",
			},
			{
				src: "logo.png",
				type: "image/png",
				sizes: "any",
				purpose: "any maskable",
			},
		],
		start_url: `/${DEFAULT_LANG}/`,
		scope: "/",
		display: "standalone",
		theme_color: "#1f4e79",
		background_color: "#ffffff",
	};
	return new Response(JSON.stringify(manifest, null, 2), {
		headers: {
			"content-type": "application/manifest+json; charset=utf-8",
			"cache-control": "public, max-age=3600",
		},
	});
}

export const Route = createFileRoute("/manifest.json")({
	server: {
		handlers: {
			GET: handler,
		},
	},
});
