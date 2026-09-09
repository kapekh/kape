import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type * as React from "react";

import { cn } from "#/lib/utils.ts";

type Crumb = { label: string; to?: LinkProps["to"] };

function PageHeader({
	title,
	description,
	breadcrumb,
	actions,
	toolbar,
	className,
	...props
}: Omit<React.ComponentProps<"header">, "title"> & {
	title: React.ReactNode;
	description?: React.ReactNode;
	breadcrumb?: Crumb[];
	/** The one primary action, and whatever secondary ones earn their place. */
	actions?: React.ReactNode;
	/** Search, filters, tabs — the row that belongs to the list below. */
	toolbar?: React.ReactNode;
}) {
	return (
		<header
			data-slot="page-header"
			className={cn("mb-6 flex flex-col gap-4", className)}
			{...props}
		>
			{breadcrumb && breadcrumb.length > 0 && (
				<nav aria-label="Breadcrumb">
					<ol className="flex flex-wrap items-center gap-2 text-[13px] text-admin-ink-muted">
						{breadcrumb.map((crumb, i) => {
							const last = i === breadcrumb.length - 1;
							return (
								<li key={crumb.label} className="flex items-center gap-2">
									{i > 0 && (
										<ChevronRight
											aria-hidden="true"
											className="size-3 shrink-0 text-admin-ink-subtle"
										/>
									)}
									{crumb.to && !last ? (
										<Link
											to={crumb.to}
											className="tap-target rounded-lg transition-colors duration-150 ease-out hover:text-admin-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
										>
											{crumb.label}
										</Link>
									) : (
										<span aria-current={last ? "page" : undefined}>
											{crumb.label}
										</span>
									)}
								</li>
							);
						})}
					</ol>
				</nav>
			)}
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="min-w-0">
					<h1 className="text-xl font-semibold text-admin-ink">{title}</h1>
					{description && (
						<p className="mt-1 max-w-2xl text-[13px] text-admin-ink-muted">
							{description}
						</p>
					)}
				</div>
				{actions && (
					<div
						data-slot="page-actions"
						className="flex shrink-0 flex-wrap items-center gap-2"
					>
						{actions}
					</div>
				)}
			</div>
			{toolbar && (
				<div
					data-slot="page-toolbar"
					className="flex flex-wrap items-center gap-3"
				>
					{toolbar}
				</div>
			)}
		</header>
	);
}

export { PageHeader };
