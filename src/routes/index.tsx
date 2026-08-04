import { createFileRoute, redirect } from "@tanstack/react-router";

import { DEFAULT_LANG } from "@/lib/i18n-config";

/** Root `/` has no language → redirect to the default-language home (/en). */
export const Route = createFileRoute("/")({
	beforeLoad: () => {
		throw redirect({
			to: "/$",
			params: { _splat: DEFAULT_LANG },
			statusCode: 301,
		});
	},
});
