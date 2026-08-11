import { useLoaderData } from "@tanstack/react-router";
import { useMemo } from "react";

import { enabledModules, MODULES_SETTING, type ModuleId } from "#/lib/modules";
import type { SiteSettings } from "#/lib/site-identity";

// a disabled module's router answers FORBIDDEN, which rejects the whole Promise.all and hangs the screen
export function useModules() {
	const { settings } = useLoaderData({ from: "__root__" }) as {
		settings?: SiteSettings;
	};
	// Keyed on the setting itself so the returned helpers are stable across
	// renders and safe to name in an effect's dependencies.
	const raw = settings?.[MODULES_SETTING];
	return useMemo(() => {
		const on = enabledModules(
			raw === undefined ? {} : { [MODULES_SETTING]: raw },
		);
		return {
			has: (id: ModuleId) => on.has(id),
			/** The module's rows, or none where this install does not have it. */
			list: <T>(id: ModuleId, query: () => Promise<T[]>): Promise<T[]> =>
				on.has(id) ? query() : Promise.resolve([]),
		};
	}, [raw]);
}
