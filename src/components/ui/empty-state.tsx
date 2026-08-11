import type { ReactNode } from "react";

import { cn } from "#/lib/utils.ts";

/**
 * What a list says when it holds nothing. Two cases, because they need
 * different answers: nothing exists yet (offer the create action), or nothing
 * matches what was typed (offer to clear it).
 *
 * Moved here from `list-ui` so the ten lists are not the only surfaces that can
 * have one. `list-ui` re-exports it, so those ten did not notice.
 */
export function EmptyState({
	title,
	description,
	action,
	icon,
	className,
}: {
	title: string;
	description?: string;
	action?: ReactNode;
	/** A lucide icon. Decorative — the title is what says what is missing. */
	icon?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"rounded-xl border border-dashed border-admin-border bg-admin-panel px-6 py-12 text-center",
				className,
			)}
		>
			{icon && (
				<div
					aria-hidden="true"
					className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-admin-accent-soft text-admin-accent [&_svg]:size-6"
				>
					{icon}
				</div>
			)}
			<p className="text-base font-semibold text-admin-ink">{title}</p>
			{description && (
				<p className="mx-auto mt-2 max-w-md text-[13px] text-admin-ink-muted">
					{description}
				</p>
			)}
			{action && <div className="mt-6">{action}</div>}
		</div>
	);
}
