import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import type { CategoryFilter } from "#/lib/term-drift";

/**
 * Names each publication category a page filters by that no term carries: the
 * page can never fill and the upload form cannot offer the category, and
 * nothing else on either screen says so.
 */
export function PublicationCategoryDrift() {
	const [missing, setMissing] = useState<CategoryFilter[]>([]);

	useEffect(() => {
		let live = true;
		// an unreachable notice is not worth an error state on a screen that works,
		// but a silent one turns a broken check into a false all-clear
		trpcClient.adminTerms.publicationCategoryDrift
			.query()
			.then((rows) => {
				if (live) setMissing(rows);
			})
			.catch((cause: unknown) => {
				console.error(
					"[publication-categories] drift check failed, so no missing category can be reported:",
					cause,
				);
			});
		return () => {
			live = false;
		};
	}, []);

	if (missing.length === 0) return null;
	return (
		<output className="block space-y-1 rounded-xl border border-admin-warning/40 bg-admin-warning-soft px-4 py-3 text-[13px] text-admin-warning-ink">
			{missing.map((m) => (
				<p key={m.key}>
					The page {m.path} filters by{" "}
					<code className="font-mono">{m.key}</code>, which no category has.
					Publications cannot be filed into it.
				</p>
			))}
		</output>
	);
}
