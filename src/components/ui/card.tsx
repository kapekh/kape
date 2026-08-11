import type * as React from "react";

import { cn } from "#/lib/utils.ts";

// tone is the status vocabulary the badges speak, so a card and its badge cannot disagree
export type CardTone =
	| "neutral"
	| "accent"
	| "live"
	| "draft"
	| "warning"
	| "danger";

const PADDING = {
	none: "",
	sm: "p-3",
	md: "p-4",
	lg: "p-6",
} as const;

const TONE: Record<CardTone, string> = {
	neutral: "border-admin-border bg-admin-panel",
	accent: "border-admin-accent/40 bg-admin-accent-soft",
	live: "border-admin-live/40 bg-admin-live-soft",
	draft: "border-admin-draft/40 bg-admin-draft-soft",
	warning: "border-admin-warning/40 bg-admin-warning-soft",
	danger: "border-admin-danger/40 bg-admin-danger-soft",
};

function Card({
	className,
	padding = "md",
	tone = "neutral",
	...props
}: React.ComponentProps<"div"> & {
	padding?: keyof typeof PADDING;
	tone?: CardTone;
}) {
	return (
		<div
			data-slot="card"
			data-tone={tone}
			className={cn(
				"rounded-xl border text-admin-ink",
				TONE[tone],
				PADDING[padding],
				className,
			)}
			{...props}
		/>
	);
}

export { Card };
