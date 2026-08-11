import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { DEFAULT_LANG, LANGS } from "@/lib/i18n-config";

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
