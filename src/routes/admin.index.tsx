import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import {
	ArrowDown,
	ArrowUp,
	CheckCircle2,
	FileText,
	Image,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge, type BadgeTone } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { EmptyState } from "#/components/ui/empty-state";
import { PageHeader } from "#/components/ui/page-header";
import { Skeleton } from "#/components/ui/skeleton";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { enabledModules } from "#/lib/modules";
import type { SiteSettings } from "#/lib/site-identity";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

type Overview = Awaited<ReturnType<typeof trpcClient.admin.overview.query>>;
type Post = Awaited<
	ReturnType<typeof trpcClient.adminPosts.list.query>
>[number];

const TYPE_LABELS: Record<string, string> = {
	news: "News",
	story: "Impact story",
	job: "Job",
	video: "Video",
	person: "Person",
	publication: "Publication",
	document: "Document",
	event: "Event",
	internal_news: "Internal news",
	announcement: "Announcement",
	album: "Photo album",
};

const STATUS_TONE: Record<string, BadgeTone> = {
	published: "live",
	draft: "draft",
	archived: "neutral",
};

// rounded up to a number worth printing: 295 visits gets a 300 axis
function axisTop(peak: number) {
	if (peak <= 0) return 1;
	const p = 10 ** Math.floor(Math.log10(peak));
	return (
		[1, 2, 3, 4, 5, 6, 8, 10].map((m) => m * p).find((v) => v >= peak) ?? peak
	);
}

const shortDate = (iso: string) =>
	new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});

function Dashboard() {
	const [o, setO] = useState<Overview | null>(null);
	const [posts, setPosts] = useState<Post[] | null>(null);

	useEffect(() => {
		trpcClient.admin.overview
			.query()
			.then(setO)
			.catch(() => {});
		trpcClient.adminPosts.list
			.query()
			.then(setPosts)
			.catch(() => {});
	}, []);

	const drafts = posts?.filter((p) => p.status === "draft") ?? [];
	const published = posts?.filter((p) => p.status === "published").length ?? 0;
	const recent = (posts ?? []).slice(0, 6);
	const byType = Object.entries(
		(posts ?? []).reduce<Record<string, number>>((m, p) => {
			m[p.contentType] = (m[p.contentType] ?? 0) + 1;
			return m;
		}, {}),
	).sort((a, b) => b[1] - a[1]);

	// The record counters only make sense where the install keeps those records.
	const { settings } = useLoaderData({ from: "__root__" }) as {
		settings?: SiteSettings;
	};
	const mods = enabledModules(settings ?? {});
	const records = [
		mods.has("schools") ? `${o?.schools ?? 0} schools` : "",
		mods.has("partners") ? `${o?.partners ?? 0} partners` : "",
	].filter(Boolean);

	const series = o?.visitorSeries ?? [];
	const maxV = Math.max(1, ...series.map((d) => d.count));
	const delta = o ? o.visitsToday - o.visitsYesterday : 0;

	return (
		<div className="space-y-6">
			<PageHeader
				title="Overview"
				description="What's happening across the website."
				actions={
					<>
						<Button asChild>
							<Link to="/admin/posts/new">New post</Link>
						</Button>
						<Button variant="secondary" asChild>
							<Link to="/admin/pages/new">New page</Link>
						</Button>
					</>
				}
			/>

			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<Kpi label="Visitors today" value={o?.visitsToday}>
					<TrendNote delta={delta} />
				</Kpi>
				<Kpi label="Published content" value={published}>
					{drafts.length} in draft
				</Kpi>
				{mods.has("projects") ? (
					<Kpi label="Projects" value={o?.projects}>
						{records.length ? records.join(" · ") : `${o?.pages ?? 0} pages`}
					</Kpi>
				) : (
					<Kpi label="Media" value={o?.media}>
						{records.length ? records.join(" · ") : `${o?.pages ?? 0} pages`}
					</Kpi>
				)}
				<Kpi
					label="Form submissions"
					value={o ? o.submissions.contact : undefined}
				>
					{o?.submissions.newsletter ?? 0} subscribers
				</Kpi>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<div className="space-y-6 lg:col-span-2">
					<NeedsAttention drafts={drafts} posts={posts} o={o} />
					<Traffic series={series} maxV={maxV} total={o?.visitsTotal ?? 0} />
				</div>
				<ByType rows={byType} loading={posts === null} />
			</div>

			<Card padding="none">
				<div className="flex items-center justify-between gap-4 border-b border-admin-border px-4 py-4">
					<h2 className="text-base font-semibold text-admin-ink">
						Recent content
					</h2>
					<Link
						to="/admin/posts"
						className="rounded-lg text-[13px] font-medium text-admin-accent transition-colors duration-150 ease-out hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
					>
						All posts
					</Link>
				</div>
				{posts === null ? (
					<ul className="divide-y divide-admin-border">
						{["a", "b", "c", "d"].map((k) => (
							<li key={k} className="flex items-center gap-4 px-4 py-3">
								<div className="min-w-0 flex-1 space-y-2">
									<Skeleton className="h-4 w-64 max-w-full" />
									<Skeleton className="h-3 w-32" />
								</div>
								<Skeleton className="h-5 w-20 shrink-0" />
							</li>
						))}
						<li className="sr-only">Loading…</li>
					</ul>
				) : recent.length === 0 ? (
					<EmptyState
						className="border-0 bg-transparent"
						icon={<FileText />}
						title="No content yet"
						description="Posts, stories and announcements all live here once you write the first one."
						action={
							<Button asChild>
								<Link to="/admin/posts/new">Create the first post</Link>
							</Button>
						}
					/>
				) : (
					<ul className="divide-y divide-admin-border">
						{recent.map((p) => (
							<li key={p.id}>
								<Link
									to="/admin/posts/$id"
									params={{ id: String(p.id) }}
									className="flex items-center gap-4 px-4 py-3 transition-colors duration-150 ease-out hover:bg-admin-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-admin-focus/50"
								>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-sm font-medium text-admin-ink">
											{p.title}
										</span>
										<span className="text-[13px] text-admin-ink-muted">
											{TYPE_LABELS[p.contentType] ?? p.contentType}
											{p.publishedAt ? ` · ${p.publishedAt}` : ""}
										</span>
									</span>
									<Badge tone={STATUS_TONE[p.status] ?? "neutral"}>
										<span className="capitalize">{p.status}</span>
									</Badge>
								</Link>
							</li>
						))}
					</ul>
				)}
			</Card>
		</div>
	);
}

function NeedsAttention({
	drafts,
	posts,
	o,
}: {
	drafts: Post[];
	posts: Post[] | null;
	o: Overview | null;
}) {
	const noMedia = !!o && o.media === 0;
	const waiting = drafts.length > 0 || noMedia;
	const settled = posts !== null && !!o && !waiting;

	return (
		<Card
			padding="lg"
			tone={waiting ? "warning" : "neutral"}
			data-tour="dash-attention"
		>
			<h2 className="text-base font-semibold text-admin-ink">
				Needs attention
			</h2>
			{posts === null ? (
				<div className="mt-4 space-y-3">
					<Skeleton className="h-10 w-full" />
					<span className="sr-only">Loading…</span>
				</div>
			) : (
				<div className="mt-4 space-y-2">
					{drafts.length > 0 && (
						<>
							<Link
								to="/admin/posts"
								className="flex items-center justify-between gap-4 rounded-lg border border-admin-warning/40 bg-admin-panel px-4 py-3 text-sm text-admin-ink transition-colors duration-150 ease-out hover:border-admin-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
							>
								<span className="flex min-w-0 items-center gap-3">
									<FileText
										aria-hidden="true"
										className="size-4 shrink-0 text-admin-warning"
									/>
									Drafts awaiting review
								</span>
								<Badge tone="draft" dot={false}>
									{drafts.length}
								</Badge>
							</Link>
							<ul className="space-y-1">
								{drafts.slice(0, 4).map((d) => (
									<li key={d.id}>
										<Link
											to="/admin/posts/$id"
											params={{ id: String(d.id) }}
											className="flex items-center gap-3 rounded-lg px-4 py-2 text-[13px] text-admin-ink-muted transition-colors duration-150 ease-out hover:bg-admin-accent-soft hover:text-admin-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
										>
											<span className="truncate">{d.title}</span>
											<span className="ml-auto shrink-0 text-admin-ink-subtle">
												{TYPE_LABELS[d.contentType] ?? d.contentType}
											</span>
										</Link>
									</li>
								))}
							</ul>
						</>
					)}
					{noMedia && (
						<Link
							to="/admin/media"
							className="flex items-center justify-between gap-4 rounded-lg border border-admin-border bg-admin-panel px-4 py-3 text-sm text-admin-ink transition-colors duration-150 ease-out hover:border-admin-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
						>
							<span className="flex min-w-0 items-center gap-3">
								<Image
									aria-hidden="true"
									className="size-4 shrink-0 text-admin-ink-muted"
								/>
								No media uploaded
							</span>
							<span className="text-[13px] text-admin-ink-muted">Upload</span>
						</Link>
					)}
					{settled && (
						<p className="flex items-center gap-3 text-sm text-admin-ink-muted">
							<CheckCircle2
								aria-hidden="true"
								className="size-4 shrink-0 text-admin-live"
							/>
							All clear — nothing needs review.
						</p>
					)}
				</div>
			)}
		</Card>
	);
}

function Traffic({
	series,
	maxV,
	total,
}: {
	series: { date: string; count: number }[];
	maxV: number;
	total: number;
}) {
	const top = axisTop(maxV);
	const ticks = top % 2 === 0 ? [top, top / 2, 0] : [top, 0];

	return (
		<Card padding="lg" data-tour="dash-traffic">
			<figure className="m-0">
				<figcaption className="flex flex-wrap items-baseline justify-between gap-3">
					<h2 className="text-base font-semibold text-admin-ink">
						Website traffic
					</h2>
					<span className="text-[13px] text-admin-ink-muted">
						Last 14 days · {total.toLocaleString()} total · peak{" "}
						{maxV.toLocaleString()} a day
					</span>
				</figcaption>

				{series.length === 0 ? (
					<p className="mt-6 text-sm text-admin-ink-muted">No data yet.</p>
				) : (
					<>
						<div className="mt-6 flex gap-3">
							<div aria-hidden="true" className="relative h-36 w-10 shrink-0">
								{ticks.map((t) => (
									<span
										key={t}
										style={{ top: `${(1 - t / top) * 100}%` }}
										className="absolute right-0 -translate-y-1/2 text-[13px] tabular-nums text-admin-ink-subtle"
									>
										{t.toLocaleString()}
									</span>
								))}
							</div>
							<div className="relative min-w-0 flex-1">
								<div aria-hidden="true" className="absolute inset-0">
									{ticks.map((t) => (
										<div
											key={t}
											className="absolute inset-x-0 h-px bg-admin-border"
											style={{ top: `${(1 - t / top) * 100}%` }}
										/>
									))}
								</div>
								<div className="relative flex h-36 items-end gap-1">
									{series.map((d) => (
										<div
											key={d.date}
											className="group relative flex h-full flex-1 items-end justify-center"
										>
											<div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-admin-border bg-admin-panel-raised px-3 py-2 text-[13px] text-admin-ink shadow-[var(--shadow-soft)] group-hover:block">
												<span className="font-medium">
													{d.count.toLocaleString()} visit
													{d.count === 1 ? "" : "s"}
												</span>
												<span className="text-admin-ink-muted">
													{" "}
													· {shortDate(d.date)}
												</span>
											</div>
											<div
												className="w-full max-w-6 rounded-t-sm bg-admin-accent/70 transition-colors duration-150 ease-out group-hover:bg-admin-accent"
												style={{ height: `${(d.count / top) * 100}%` }}
											/>
										</div>
									))}
								</div>
								<div className="absolute inset-x-0 bottom-0 h-px bg-admin-border-strong" />
							</div>
						</div>
						<div
							aria-hidden="true"
							className="mt-2 flex justify-between pl-12 text-[13px] text-admin-ink-muted"
						>
							<span>{shortDate(series[0].date)}</span>
							<span>
								{shortDate(series[Math.floor(series.length / 2)].date)}
							</span>
							<span>Today</span>
						</div>
						<table className="sr-only">
							<caption>Visits per day, last 14 days</caption>
							<thead>
								<tr>
									<th>Date</th>
									<th>Visits</th>
								</tr>
							</thead>
							<tbody>
								{series.map((d) => (
									<tr key={d.date}>
										<td>{d.date}</td>
										<td>{d.count}</td>
									</tr>
								))}
							</tbody>
						</table>
					</>
				)}
			</figure>
		</Card>
	);
}

// one shared zero-based scale, and the scale is printed: a full bar means "the largest group"
function ByType({
	rows,
	loading,
}: {
	rows: [string, number][];
	loading: boolean;
}) {
	const top = rows[0]?.[1] ?? 1;
	const total = rows.reduce((s, [, n]) => s + n, 0);

	return (
		<Card padding="lg">
			<h2 className="text-base font-semibold text-admin-ink">
				Content by type
			</h2>
			{loading ? (
				<div className="mt-4 space-y-3">
					{["a", "b", "c", "d", "e"].map((k) => (
						<Skeleton key={k} className="h-4 w-full" />
					))}
					<span className="sr-only">Loading…</span>
				</div>
			) : rows.length === 0 ? (
				<p className="mt-4 text-[13px] text-admin-ink-muted">
					No posts yet, so there is nothing to count.
				</p>
			) : (
				<>
					<p className="mt-1 text-[13px] text-admin-ink-muted">
						{total} posts. A full bar is {top}, the largest group.
					</p>
					<ul className="mt-4 space-y-3">
						{rows.map(([type, n]) => (
							<li key={type} className="flex items-center gap-3 text-sm">
								<span className="w-28 shrink-0 truncate text-admin-ink">
									{TYPE_LABELS[type] ?? type}
								</span>
								<span
									aria-hidden="true"
									className="h-2 flex-1 overflow-hidden rounded-full bg-admin-neutral-soft"
								>
									<span
										data-count={n}
										className="block h-full rounded-full bg-admin-accent/70"
										style={{ width: `${(n / top) * 100}%` }}
									/>
								</span>
								<span className="w-8 shrink-0 text-right tabular-nums text-admin-ink-muted">
									{n}
								</span>
							</li>
						))}
					</ul>
				</>
			)}
		</Card>
	);
}

function Kpi({
	label,
	value,
	children,
}: {
	label: string;
	value?: number;
	children?: React.ReactNode;
}) {
	return (
		<Card padding="lg">
			<div className="text-[13px] text-admin-ink-muted">{label}</div>
			<div className="mt-2 text-3xl font-semibold leading-none text-admin-ink">
				{value === undefined ? "—" : value.toLocaleString()}
			</div>
			<div className="mt-3 text-[13px] text-admin-ink-muted">{children}</div>
		</Card>
	);
}

function TrendNote({ delta }: { delta: number }) {
	if (delta === 0) return <>Same as yesterday</>;
	const up = delta > 0;
	const Arrow = up ? ArrowUp : ArrowDown;
	return (
		<span
			className={`flex items-center gap-1 ${up ? "text-admin-live" : "text-admin-danger"}`}
		>
			<Arrow aria-hidden="true" className="size-4 shrink-0" />
			{Math.abs(delta).toLocaleString()} vs yesterday
		</span>
	);
}
