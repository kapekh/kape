import { type PublicRecord, publicPathOf } from "#/lib/public-path";

import type { ActionItem } from "./ActionMenu";

/** Row action that opens the record on the public site. Empty when nothing serves it. */
export function viewOnSite(record: PublicRecord): ActionItem[] {
	const path = publicPathOf(record);
	if (!path) return [];
	return [
		{
			label: "View on site",
			onClick: () => window.open(path, "_blank", "noopener,noreferrer"),
		},
	];
}
