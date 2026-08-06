import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/messages")({
	component: Messages,
});

type Row = Awaited<
	ReturnType<typeof trpcClient.adminMessages.contact.query>
>[number];

function fmtDate(s: string) {
	const d = new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`);
	return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
}

function Messages() {
	const [rows, setRows] = useState<Row[]>([]);
	const [loading, setLoading] = useState(true);

	async function refresh() {
		setRows(await trpcClient.adminMessages.contact.query());
		setLoading(false);
	}
	useEffect(() => {
		refresh();
	}, []);

	async function del(id: number) {
		if (!(await confirm("Delete this message?"))) return;
		await trpcClient.adminMessages.deleteContact.mutate({ id });
		setRows((rs) => rs.filter((r) => r.id !== id));
	}

	return (
		<div>
			<div className="mb-6">
				<h1 className="font-display text-2xl font-semibold text-primary">
					Messages
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Contact-form submissions from the public site — {rows.length} total.
				</p>
			</div>

			{loading ? (
				<div className="rounded-xl border border-border bg-card p-6 text-muted-foreground">
					Loading…
				</div>
			) : rows.length === 0 ? (
				<div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
					No messages yet.
				</div>
			) : (
				<div className="space-y-3">
					{rows.map((r) => (
						<article
							key={r.id}
							className="rounded-2xl border border-border bg-card p-5"
						>
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="font-semibold text-foreground">{r.name}</div>
									<div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
										<a
											href={`mailto:${r.email}`}
											className="hover:text-[var(--accent)]"
										>
											{r.email}
										</a>
										{r.phone && (
											<a
												href={`tel:${r.phone}`}
												className="hover:text-[var(--accent)]"
											>
												{r.phone}
											</a>
										)}
									</div>
								</div>
								<div className="flex items-center gap-3 whitespace-nowrap">
									<span className="text-xs text-muted-foreground">
										{fmtDate(r.createdAt)}
									</span>
									<a
										href={`mailto:${r.email}?subject=Re:%20Your%20message`}
										className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
									>
										Reply
									</a>
									<ActionMenu
										items={[
											{
												label: "Delete message",
												danger: true,
												onClick: () => del(r.id),
											},
										]}
									/>
								</div>
							</div>
							<p className="mt-3 whitespace-pre-wrap border-t border-border pt-3 text-sm text-foreground/90">
								{r.message}
							</p>
						</article>
					))}
				</div>
			)}
		</div>
	);
}
