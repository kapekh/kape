import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

type Overview = Awaited<ReturnType<typeof trpcClient.admin.overview.query>>;
type Post = Awaited<ReturnType<typeof trpcClient.adminPosts.list.query>>[number];

const TYPE_LABELS: Record<string, string> = {
	news: "News", story: "Impact story", job: "Job", video: "Video", person: "Person",
	publication: "Publication", document: "Document", event: "Event", internal_news: "Internal news", announcement: "Announcement", album: "Photo album",
};
const card = "rounded-2xl border border-border bg-card";

function Dashboard() {
	const [o, setO] = useState<Overview | null>(null);
	const [posts, setPosts] = useState<Post[] | null>(null);

	useEffect(() => {
		trpcClient.admin.overview.query().then(setO).catch(() => {});
		trpcClient.adminPosts.list.query().then(setPosts).catch(() => {});
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

	const series = o?.visitorSeries ?? [];
	const maxV = Math.max(1, ...series.map((d) => d.count));
	const delta = o ? o.visitsToday - o.visitsYesterday : 0;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-display text-3xl font-semibold text-primary">Overview</h1>
					<p className="mt-1 text-sm text-muted-foreground">What's happening across the KAPE website.</p>
				</div>
				<div className="flex gap-2">
					<Link to="/admin/posts/new" className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition">New post</Link>
					<Link to="/admin/pages/new" className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground/80 hover:bg-muted transition">New page</Link>
				</div>
			</div>

			{/* KPI row */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<Kpi label="Visitors today" value={o?.visitsToday} accent>
					<TrendNote delta={delta} />
				</Kpi>
				<Kpi label="Published content" value={published}>
					<span className="text-muted-foreground">{drafts.length} in draft</span>
				</Kpi>
				<Kpi label="Projects" value={o?.projects}>
					<span className="text-muted-foreground">{o?.schools ?? 0} schools · {o?.partners ?? 0} partners</span>
				</Kpi>
				<Kpi label="Form submissions" value={o ? o.submissions.contact : undefined}>
					<span className="text-muted-foreground">{o?.submissions.newsletter ?? 0} subscribers</span>
				</Kpi>
			</div>

			{/* Main grid */}
			<div className="grid lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					{/* Traffic */}
					<section className={`${card} p-5`}>
						<div className="flex items-baseline justify-between">
							<h2 className="font-display text-lg font-semibold text-primary">Website traffic</h2>
							<span className="text-xs text-muted-foreground">Last 14 days · {(o?.visitsTotal ?? 0).toLocaleString()} total</span>
						</div>
						<div className="mt-5 flex items-end gap-1.5 h-36">
							{series.length === 0 ? (
								<div className="text-sm text-muted-foreground self-center">No data yet.</div>
							) : (
								series.map((d) => (
									<div
										key={d.date}
										title={`${d.date}: ${d.count} visit${d.count === 1 ? "" : "s"}`}
										className="flex-1 rounded-t bg-[var(--accent)]/75 hover:bg-[var(--accent)] transition-colors"
										style={{ height: `${Math.max(2, (d.count / maxV) * 100)}%` }}
									/>
								))
							)}
						</div>
						{series.length > 0 && (
							<div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
								<span>{series[0]?.date.slice(5)}</span>
								<span>{series[Math.floor(series.length / 2)]?.date.slice(5)}</span>
								<span>Today</span>
							</div>
						)}
					</section>

					{/* Recently updated */}
					<section className={card}>
						<div className="flex items-center justify-between px-5 py-4 border-b border-border">
							<h2 className="font-display text-lg font-semibold text-primary">Recent content</h2>
							<Link to="/admin/posts" className="text-sm font-medium text-[var(--accent)] hover:underline">All posts →</Link>
						</div>
						{posts === null ? (
							<p className="px-5 py-6 text-sm text-muted-foreground">Loading…</p>
						) : recent.length === 0 ? (
							<p className="px-5 py-6 text-sm text-muted-foreground">No content yet. <Link to="/admin/posts/new" className="text-[var(--accent)] hover:underline">Create the first post →</Link></p>
						) : (
							<ul className="divide-y divide-border">
								{recent.map((p) => (
									<li key={p.id}>
										<Link to="/admin/posts/$id" params={{ id: String(p.id) }} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition">
											<span className="min-w-0 flex-1">
												<span className="block truncate font-medium text-foreground">{p.title}</span>
												<span className="text-xs text-muted-foreground">{TYPE_LABELS[p.contentType] ?? p.contentType}{p.publishedAt ? ` · ${p.publishedAt}` : ""}</span>
											</span>
											<StatusChip status={p.status} />
										</Link>
									</li>
								))}
							</ul>
						)}
					</section>
				</div>

				{/* Side column */}
				<div className="space-y-6">
					{/* Needs attention */}
					<section className={`${card} p-5`}>
						<h2 className="font-display text-lg font-semibold text-primary">Needs attention</h2>
						<div className="mt-3 space-y-2">
							{drafts.length > 0 ? (
								<Link to="/admin/posts" className="flex items-center justify-between rounded-lg border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-3 py-2 text-sm hover:bg-[var(--gold)]/15 transition">
									<span>Drafts awaiting review</span>
									<span className="font-semibold text-primary">{drafts.length}</span>
								</Link>
							) : null}
							{o && o.media === 0 ? (
								<Link to="/admin/media" className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted transition">
									<span>No media uploaded</span><span>→</span>
								</Link>
							) : null}
							{posts !== null && drafts.length === 0 && o && o.media > 0 ? (
								<p className="text-sm text-[var(--palm)]">All clear — nothing needs review.</p>
							) : null}
							{posts === null && <p className="text-sm text-muted-foreground">Loading…</p>}
						</div>
					</section>

					{/* Content by type */}
					<section className={`${card} p-5`}>
						<h2 className="font-display text-lg font-semibold text-primary">Content by type</h2>
						<div className="mt-3 space-y-2.5">
							{byType.length === 0 ? (
								<p className="text-sm text-muted-foreground">No posts yet.</p>
							) : (
								byType.map(([type, n]) => {
									const max = byType[0][1];
									return (
										<div key={type} className="flex items-center gap-3 text-sm">
											<span className="w-28 shrink-0 truncate text-foreground/80">{TYPE_LABELS[type] ?? type}</span>
											<span className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
												<span className="block h-full rounded-full bg-primary/70" style={{ width: `${(n / max) * 100}%` }} />
											</span>
											<span className="w-8 text-right tabular-nums text-muted-foreground">{n}</span>
										</div>
									);
								})
							)}
						</div>
					</section>

					{/* Manage */}
					<section className={`${card} p-5`}>
						<h2 className="font-display text-lg font-semibold text-primary">Manage</h2>
						<div className="mt-3 grid grid-cols-2 gap-2 text-sm">
							{[
								{ to: "/admin/schools", label: "Schools" },
								{ to: "/admin/nav", label: "Navigation" },
								{ to: "/admin/media", label: "Media" },
								{ to: "/admin/pages", label: "Pages" },
								{ to: "/admin/languages", label: "Languages" },
								{ to: "/admin/settings", label: "Settings" },
								{ to: "/admin/projects", label: "Projects" },
							].map((l) => (
								<Link key={l.to} to={l.to} className="rounded-lg border border-border px-3 py-2 text-foreground/75 hover:border-[var(--accent)] hover:text-[var(--accent)] transition">{l.label}</Link>
							))}
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}

function Kpi({ label, value, accent, children }: { label: string; value?: number; accent?: boolean; children?: React.ReactNode }) {
	return (
		<div className={`rounded-2xl border bg-card p-5 ${accent ? "border-[var(--accent)]/30" : "border-border"}`}>
			<div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
			<div className="mt-2 font-display text-4xl font-semibold text-primary tabular-nums leading-none">
				{value === undefined ? "—" : value.toLocaleString()}
			</div>
			<div className="mt-2 text-xs">{children}</div>
		</div>
	);
}

function TrendNote({ delta }: { delta: number }) {
	if (delta === 0) return <span className="text-muted-foreground">Same as yesterday</span>;
	const up = delta > 0;
	return (
		<span className={up ? "text-[var(--palm)]" : "text-destructive"}>
			{up ? "▲" : "▼"} {Math.abs(delta).toLocaleString()} vs yesterday
		</span>
	);
}

function StatusChip({ status }: { status: string }) {
	const map: Record<string, string> = {
		published: "bg-[var(--palm)]/15 text-[var(--palm)]",
		draft: "bg-[var(--gold)]/20 text-[oklch(0.5_0.12_80)]",
		archived: "bg-muted text-muted-foreground",
	};
	return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${map[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}
