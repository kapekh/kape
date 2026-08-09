import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm } from "@/components/Dialogs";
import { isFormClosed } from "@/lib/forms";

export const Route = createFileRoute("/admin/forms/")({ component: FormsList });

type Row = Awaited<ReturnType<typeof trpcClient.adminForms.list.query>>[number];

function FormsList() {
	const [rows, setRows] = useState<Row[]>([]);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		setRows(await trpcClient.adminForms.list.query());
		setLoading(false);
	}, []);
	useEffect(() => {
		refresh();
	}, [refresh]);

	async function del(id: number) {
		if (
			!(await confirm({
				message:
					"Delete this form and all its submissions? This can't be undone.",
				danger: true,
				confirmLabel: "Delete",
			}))
		)
			return;
		await trpcClient.adminForms.delete.mutate({ id });
		setRows((rs) => rs.filter((r) => r.id !== id));
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">
						Forms
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Data-collection forms for the public site — {rows.length} total.
					</p>
				</div>
				<Link
					to="/admin/forms/new"
					className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
				>
					+ New form
				</Link>
			</div>

			<div className="overflow-hidden rounded-xl border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-4 py-2.5">Title</th>
							<th className="px-2 py-2.5">Status</th>
							<th className="px-2 py-2.5 text-right">Fields</th>
							<th className="px-2 py-2.5 text-right">Submissions</th>
							<th className="px-3 py-2.5 text-right">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{loading ? (
							<tr>
								<td colSpan={5} className="px-4 py-6 text-muted-foreground">
									Loading…
								</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td colSpan={5} className="px-4 py-6 text-muted-foreground">
									No forms yet.{" "}
									<Link
										to="/admin/forms/new"
										className="text-[var(--accent)] hover:underline"
									>
										Create the first one →
									</Link>
								</td>
							</tr>
						) : (
							rows.map((r) => (
								<tr key={r.id} className="hover:bg-muted/20">
									<td className="px-4 py-2.5">
										<Link
											to="/admin/forms/$id"
											params={{ id: String(r.id) }}
											className="font-medium text-foreground hover:text-[var(--accent)]"
										>
											{r.title}
										</Link>
										<span className="ml-2 font-mono text-xs text-muted-foreground">
											/{r.slug}
										</span>
									</td>
									<td className="px-2 py-2.5">
										{r.status === "active" && isFormClosed(r.deadline) ? (
											<span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
												Closed
											</span>
										) : (
											<span
												className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${r.status === "active" ? "bg-[var(--palm)]/15 text-[var(--palm)]" : "bg-muted text-muted-foreground"}`}
											>
												{r.status}
											</span>
										)}
									</td>
									<td className="px-2 py-2.5 text-right tabular-nums text-foreground/80">
										{r.fields.length}
									</td>
									<td className="px-2 py-2.5 text-right tabular-nums">
										<Link
											to="/admin/forms/$id/submissions"
											params={{ id: String(r.id) }}
											className="font-semibold text-[var(--accent)] hover:underline"
										>
											{r.submissionCount}
										</Link>
									</td>
									<td className="px-3 py-2.5 text-right whitespace-nowrap">
										<Link
											to="/admin/forms/$id/submissions"
											params={{ id: String(r.id) }}
											className="text-xs font-semibold text-[var(--accent)] hover:underline"
										>
											Responses
										</Link>
										<Link
											to="/admin/forms/$id"
											params={{ id: String(r.id) }}
											className="ml-3 text-xs font-semibold text-[var(--accent)] hover:underline"
										>
											Edit
										</Link>
										<span className="ml-2 inline-flex align-middle">
											<ActionMenu
												items={[
													{
														label: "Delete form",
														danger: true,
														onClick: () => del(r.id),
													},
												]}
											/>
										</span>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
