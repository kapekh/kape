import type * as React from "react";

import { cn } from "#/lib/utils.ts";

/**
 * A loading state is the shape of the thing being loaded, not the word
 * "Loading…" where a whole table used to be. Six routes replaced the page with
 * a bare paragraph, so the header vanished and came back.
 *
 * `aria-hidden` because the shapes say nothing: whoever renders these owns the
 * announcement, which in `ListStatus` is an `sr-only` "Loading…".
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="skeleton"
			aria-hidden="true"
			className={cn(
				"rounded-lg bg-admin-border/70 motion-safe:animate-pulse",
				className,
			)}
			{...props}
		/>
	);
}

/** Rows in the shape of a table, for a list that has not answered yet. */
function SkeletonRows({
	rows = 5,
	className,
	...props
}: React.ComponentProps<"div"> & { rows?: number }) {
	return (
		<div
			data-slot="skeleton-rows"
			className={cn("divide-y divide-admin-border", className)}
			{...props}
		>
			{Array.from({ length: rows }, (_, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows have no identity beyond their position
					key={i}
					className="flex h-14 items-center gap-4 px-4"
				>
					<Skeleton className="h-3 w-1/3" />
					<Skeleton className="h-3 w-1/5" />
					<Skeleton className="ml-auto h-3 w-16" />
				</div>
			))}
		</div>
	);
}

export { Skeleton, SkeletonRows };
