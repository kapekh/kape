import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/internalsources")({
	head: () => ({ meta: [{ title: "KAPE Staff Portal" }] }),
	component: Portal,
});

function Portal() {
	const navigate = useNavigate();
	const [ready, setReady] = useState(false);
	const [name, setName] = useState("");

	useEffect(() => {
		let alive = true;
		trpcClient.auth.me
			.query()
			.then((u) => {
				if (!alive) return;
				if (u && (u.role === "staff" || u.role === "admin")) {
					setName(u.name || u.email);
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

	if (!ready) return <div className="min-h-screen grid place-items-center text-muted-foreground">Checking access…</div>;

	const tab = "py-2 border-b-2 border-transparent hover:border-[var(--secondary)] transition";
	const tabActive = "py-2 border-b-2 border-[var(--secondary)] font-semibold";
	return (
		<div className="min-h-screen bg-muted/30">
			<header className="bg-primary text-primary-foreground">
				<div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
					<div className="font-display font-semibold">KAPE Staff Portal</div>
					<div className="flex items-center gap-4 text-sm">
						<span className="opacity-80">{name}</span>
						<button type="button" onClick={logout} className="hover:underline">Log out</button>
					</div>
				</div>
				<nav className="mx-auto max-w-5xl px-6 flex gap-6 text-sm">
					<Link to="/internalsources" activeOptions={{ exact: true }} className={tab} activeProps={{ className: tabActive }}>News Feed</Link>
					<Link to="/internalsources/calendar" className={tab} activeProps={{ className: tabActive }}>Calendar</Link>
					<Link to="/internalsources/documents" className={tab} activeProps={{ className: tabActive }}>Documents</Link>
					<Link to="/internalsources/directory" className={tab} activeProps={{ className: tabActive }}>Directory</Link>
				</nav>
			</header>
			<main className="mx-auto max-w-5xl px-6 py-8">
				<Outlet />
			</main>
		</div>
	);
}
