import { createFileRoute } from "@tanstack/react-router";

import { DEFAULT_LANG } from "#/lib/i18n-config";
import {
	siteDescription,
	siteFavicon,
	siteLogo,
	siteShortName,
	siteTitle,
} from "#/lib/site-identity";
import { themeColor } from "#/lib/site-theme";
import { db } from "#/server/db";
import { getSettings } from "#/server/repo/site";

// built from site_settings, so an install that renames itself renames its home-screen icon
async function handler() {
	const settings = await getSettings(db);
	const description = siteDescription(settings);
	const manifest = {
		short_name: siteShortName(settings),
		name: siteTitle(settings),
		...(description ? { description } : {}),
		icons: [
			{ src: siteFavicon(settings), sizes: "48x48 32x32 16x16" },
			{
				src: siteLogo(settings),
				type: "image/png",
				sizes: "any",
				purpose: "any maskable",
			},
		],
		start_url: `/${DEFAULT_LANG}/`,
		scope: "/",
		display: "standalone",
		theme_color: themeColor(settings),
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
