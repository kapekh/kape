import type * as React from "react";

import { cn } from "#/lib/utils.ts";

// dot plus label, not a filled pill: the state is not carried by colour alone
export type BadgeTone =
	| "live"
	| "draft"
	| "warning"
	| "danger"
	| "neutral"
	| "accent";

const TONE: Record<BadgeTone, { shell: string; dot: string }> = {
	live: { shell: "bg-admin-live-soft text-admin-live", dot: "bg-admin-live" },
	draft: {
		shell: "bg-admin-draft-soft text-admin-draft",
		dot: "bg-admin-draft",
	},
	warning: {
		shell: "bg-admin-warning-soft text-admin-warning",
		dot: "bg-admin-warning",
	},
	danger: {
		shell: "bg-admin-danger-soft text-admin-danger",
		dot: "bg-admin-danger",
	},
	neutral: {
		shell: "bg-admin-neutral-soft text-admin-ink-muted",
		dot: "bg-admin-ink-muted",
	},
	accent: {
		shell: "bg-admin-accent-soft text-admin-accent",
		dot: "bg-admin-accent",
	},
};

function Badge({
	className,
	tone = "neutral",
	dot = true,
	children,
	...props
}: React.ComponentProps<"span"> & {
	tone?: BadgeTone;
	/** Off for a count or a plain tag, where there is no state to signal. */
	dot?: boolean;
}) {
	const t = TONE[tone];
	return (
		<span
			data-slot="badge"
			data-tone={tone}
			className={cn(
				"inline-flex items-center gap-2 rounded-full px-2 py-1 text-[13px] leading-none font-medium",
				t.shell,
				className,
			)}
			{...props}
		>
			{dot && (
				<span
					aria-hidden="true"
					className={cn("size-1.5 shrink-0 rounded-full", t.dot)}
				/>
			)}
			{children}
		</span>
	);
}

export { Badge };
