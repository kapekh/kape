import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { DEFAULT_LANG, LANGS } from "@/lib/i18n-config";

/**
 * Layout route for the /:lang/donate branch. The hub lives in
 * $lang.donate.index.tsx, the scoped campaign page in $lang.donate.$campaign.tsx,
 * and the receipt in $lang.donate.success.tsx — they render here through the
 * Outlet. Its loader guards the whole branch against a non-language prefix.
 */
export const Route = createFileRoute("/$lang/donate")({
	loader: ({ params, location }) => {
		if (!LANGS.includes(params.lang))
			throw redirect({
				href: `/${DEFAULT_LANG}${location.pathname}${location.searchStr}`,
				statusCode: 301,
			});
	},
	component: () => <Outlet />,
});
