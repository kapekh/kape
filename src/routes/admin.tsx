import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AdminHeaderProvider } from "#/components/admin/AdminHeader";
import { AdminIcon } from "#/components/admin/AdminIcon";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin")({
	head: () => ({ meta: [{ title: "KAPE Admin" }] }),
	component: AdminLayout,
});

const NAV = [
	{
		group: "Content",
		items: [
			{ to: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
			{ to: "/admin/posts", label: "Posts", icon: "posts" },
			{ to: "/admin/pages", label: "Pages", icon: "pages" },
			{ to: "/admin/projects", label: "Projects", icon: "projects" },
			{ to: "/admin/nav", label: "Navigation", icon: "nav" },
		],
	},
	{
		group: "Organisation",
		items: [
			{ to: "/admin/schools", label: "Schools", icon: "offices" },
			{ to: "/admin/partners", label: "Partners", icon: "partners" },
			{ to: "/admin/donors", label: "Donors", icon: "donors" },
			{ to: "/admin/offices", label: "Offices", icon: "offices" },
			{ to: "/admin/staff", label: "Staff", icon: "staff" },
		],
	},
	{
		group: "System",
		items: [
			{ to: "/admin/media", label: "Media", icon: "media" },
			{ to: "/admin/languages", label: "Languages", icon: "languages" },
			{ to: "/admin/settings", label: "Settings", icon: "settings" },
		],
	},
	{
		group: "Reference lists",
		items: [
			{ to: "/admin/locations", label: "Locations", icon: "tag" },
			{ to: "/admin/publication-categories", label: "Publication categories", icon: "tag" },
			{ to: "/admin/doc-categories", label: "Document categories", icon: "tag" },
			{ to: "/admin/partner-categories", label: "Partner categories", icon: "tag" },
		],
	},
] as const;

/**
 * Admin layout + client-side auth guard. The admin is client-rendered: it calls
 * tRPC via the browser (cookies sent automatically), so no SSR-auth plumbing.
 */
function AdminLayout() {
	const navigate = useNavigate();
	const [ready, setReady] = useState(false);
	const [email, setEmail] = useState("");
	const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
	// Full-bleed "studio" chrome (no padding / max-width) for the page builder.
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const studio = /^\/admin\/pages\/(new|\d+)/.test(pathname);

	useEffect(() => {
		let alive = true;
		trpcClient.auth.me
			.query()
			.then((u) => {
				if (!alive) return;
				if (u && u.role === "admin") {
					setEmail(u.email);
					setReady(true);
				} else {
					navigate({ to: "/login" });
				}
			})
			.catch(() => navigate({ to: "/login" }));
		return () => {
			alive = false;
		};
	}, [navigate]);

	async function logout() {
		await fetch("/api/auth/logout", { method: "POST" });
		navigate({ to: "/login" });
	}

	if (!ready) {
		return (
			<div className="min-h-screen grid place-items-center bg-background text-muted-foreground">
				<div className="flex items-center gap-3 text-sm">
					<span className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
					Checking access…
				</div>
			</div>
		);
	}

	const link = "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground/70 transition-colors hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50";
	const linkActive = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent)]/10 shadow-[inset_3px_0_0_var(--accent)]";

	return (
		<div className="min-h-screen flex bg-card text-foreground">
			{/* Sidebar rail */}
			<aside className="w-64 shrink-0 sticky top-0 h-screen bg-card border-r border-border flex flex-col">
				<div className="flex items-center gap-2.5 px-5 h-16 border-b border-border shrink-0">
					<span className="h-9 w-9 rounded-xl bg-[var(--gold)] text-primary grid place-items-center font-display font-bold text-lg">K</span>
					<div className="leading-tight">
						<div className="font-display font-semibold text-primary">KAPE</div>
						<div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Admin</div>
					</div>
				</div>

				<nav className="thin-scroll flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-5">
					{NAV.map((section) => (
						<div key={section.group}>
							<div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">{section.group}</div>
							<div className="space-y-0.5">
								{section.items.map((it) => (
									<Link
										key={it.to}
										to={it.to}
										activeOptions={"exact" in it && it.exact ? { exact: true } : undefined}
										className={link}
										activeProps={{ className: linkActive }}
									>
										<AdminIcon name={it.icon} className="h-4 w-4 shrink-0 opacity-80" />
										<span className="truncate">{it.label}</span>
									</Link>
								))}
							</div>
						</div>
					))}
				</nav>
			</aside>

			{/* Content column */}
			<div className="flex-1 min-w-0 flex flex-col">
				<header className="sticky top-0 z-20 h-16 shrink-0 border-b border-border bg-card/85 backdrop-blur flex items-center justify-between gap-4 px-4 lg:px-5">
					<div ref={setHeaderSlot} className="flex min-w-0 flex-1 items-center gap-3" />
					<div className="flex items-center gap-4">
						<a href="/" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:text-[var(--accent)] transition-colors">View site ↗</a>
						<span className="h-5 w-px bg-border" />
						<div className="flex items-center gap-2.5">
							<span className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-semibold uppercase">{email.slice(0, 2)}</span>
							<div className="hidden sm:block leading-tight">
								<div className="text-xs font-medium text-foreground max-w-[180px] truncate">{email}</div>
								<div className="text-[10px] uppercase tracking-wide text-[var(--palm)]">Administrator</div>
							</div>
							<button type="button" onClick={logout} className="ml-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-muted hover:text-foreground transition-colors">Log out</button>
						</div>
					</div>
				</header>

				<AdminHeaderProvider slot={headerSlot}>
						{studio ? (
							<main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden xl:overflow-hidden">
								<Outlet />
							</main>
						) : (
							<main className="flex-1 p-4 lg:p-5 overflow-x-hidden">
								<div className="mx-auto max-w-[1600px]">
									<Outlet />
								</div>
							</main>
						)}
					</AdminHeaderProvider>
			</div>
		</div>
	);
}
