import type * as React from "react";

import { cn } from "#/lib/utils.ts";

/**
 * One table. Nine `<th>` strings and twenty-seven `<td>` strings described the
 * same list before this, at two different row heights.
 *
 * Below `md` the whole thing turns into a stacked card list rather than a
 * horizontal scroll: a 6-column table on a 390px phone is 70px of content and
 * a scrollbar nobody finds. The header row goes `sr-only` and each cell prints
 * its own column name from `label`.
 *
 * `display: block` is what stacks it, and it takes the implicit table roles
 * with it — a stacked table reads to a screen reader as a pile of anonymous
 * text. So the roles are written out. They are redundant at desktop and load
 * bearing at 390px.
 */
type Align = "left" | "center" | "right";

const ALIGN: Record<Align, string> = {
	left: "text-left",
	center: "text-center",
	right: "text-right",
};

function Table({ className, ...props }: React.ComponentProps<"table">) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: the semantic element is what is being used; the role is only there because display:block takes the implicit one away
		<table
			data-slot="table"
			// biome-ignore lint/a11y/noRedundantRoles: the roles are implied only while these are laid out as a table; below md they are display:block and the browser drops every one of them
			role="table"
			className={cn(
				"w-full border-collapse text-sm text-admin-ink max-md:block",
				className,
			)}
			{...props}
		/>
	);
}

function THead({ className, ...props }: React.ComponentProps<"thead">) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: the semantic element is what is being used; the role is only there because display:block takes the implicit one away
		<thead
			data-slot="table-head"
			// biome-ignore lint/a11y/noRedundantRoles: the roles are implied only while these are laid out as a table; below md they are display:block and the browser drops every one of them
			role="rowgroup"
			className={cn("max-md:sr-only", className)}
			{...props}
		/>
	);
}

function TBody({ className, ...props }: React.ComponentProps<"tbody">) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: the semantic element is what is being used; the role is only there because display:block takes the implicit one away
		<tbody
			data-slot="table-body"
			// biome-ignore lint/a11y/noRedundantRoles: the roles are implied only while these are laid out as a table; below md they are display:block and the browser drops every one of them
			role="rowgroup"
			className={cn("max-md:block max-md:space-y-3", className)}
			{...props}
		/>
	);
}

function TR({ className, ...props }: React.ComponentProps<"tr">) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: the semantic element is what is being used; the role is only there because display:block takes the implicit one away
		<tr
			data-slot="table-row"
			// biome-ignore lint/a11y/noRedundantRoles: the roles are implied only while these are laid out as a table; below md they are display:block and the browser drops every one of them
			role="row"
			className={cn(
				"h-14 border-b border-admin-border transition-colors duration-150 ease-out last:border-b-0",
				"max-md:block max-md:h-auto max-md:rounded-xl max-md:border max-md:bg-admin-panel max-md:p-4",
				className,
			)}
			{...props}
		/>
	);
}

function TH({
	className,
	align = "left",
	width,
	style,
	...props
}: Omit<React.ComponentProps<"th">, "align" | "width"> & {
	align?: Align;
	width?: string | number;
}) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: the semantic element is what is being used; the role is only there because display:block takes the implicit one away
		<th
			data-slot="table-header-cell"
			// biome-ignore lint/a11y/noRedundantRoles: the roles are implied only while these are laid out as a table; below md they are display:block and the browser drops every one of them
			role="columnheader"
			scope="col"
			style={width === undefined ? style : { width, ...style }}
			className={cn(
				"h-10 border-b border-admin-border-strong px-4 align-middle text-xs font-medium tracking-wide text-admin-ink-muted uppercase",
				ALIGN[align],
				className,
			)}
			{...props}
		/>
	);
}

function TD({
	className,
	align = "left",
	width,
	style,
	label,
	...props
}: Omit<React.ComponentProps<"td">, "align" | "width"> & {
	align?: Align;
	width?: string | number;
	/** The column name, printed beside the value once the table is stacked. */
	label?: string;
}) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: the semantic element is what is being used; the role is only there because display:block takes the implicit one away
		<td
			data-slot="table-cell"
			// biome-ignore lint/a11y/noRedundantRoles: the roles are implied only while these are laid out as a table; below md they are display:block and the browser drops every one of them
			role="cell"
			data-label={label}
			style={width === undefined ? style : { width, ...style }}
			className={cn(
				// py-2 not py-3: the row is 56px from `h-14`, and a cell holding a
				// 36px icon button has to fit inside that rather than push past it
				"px-4 py-2 align-middle text-admin-ink",
				ALIGN[align],
				"max-md:flex max-md:items-center max-md:justify-between max-md:gap-4 max-md:px-0 max-md:py-1 max-md:text-right",
				label &&
					"max-md:before:shrink-0 max-md:before:text-left max-md:before:text-[13px] max-md:before:font-medium max-md:before:text-admin-ink-muted max-md:before:content-[attr(data-label)]",
				className,
			)}
			{...props}
		/>
	);
}

export { Table, TBody, TD, TH, THead, TR };
