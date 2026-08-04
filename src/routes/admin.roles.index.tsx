import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm, toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/roles/")({ component: RolesList });

type Row = Awaited<ReturnType<typeof trpcClient.adminRoles.list.query>>[number];

function RolesList() {
	const [rows, setRows] = useState<Row[]>([]);
	const [loading, setLoading] = useState(true);

	async function refresh() {
		setRows(await trpcClient.adminRoles.list.query());
		setLoading(false);
	}
	useEffect(() => {
		refresh();
	}, []);

	async function del(r: Row) {
		if (
			!(await confirm({
				message: `Delete the “${r.name}” role?`,
				danger: true,
				confirmLabel: "Delete",
			}))
		)
			return;
		try {
			await trpcClient.adminRoles.delete.mutate({ id: r.id });
			setRows((rs) => rs.filter((x) => x.id !== r.id));
		} catch (e) {
			toast(
				e instanceof Error ? e.message : "Could not delete this role.",
				"error",
			);
		}
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">
						Roles
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Define what each role can manage — {rows.length} total.
					</p>
				</div>
				<Link
					to="/admin/roles/new"
					className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
				>
					+ New role
				</Link>
			</div>

			<div className="overflow-hidden rounded-xl border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-4 py-2.5">Role</th>
							<th className="px-2 py-2.5">Access</th>
							<th className="px-2 py-2.5">Users</th>
							<th className="px-3 py-2.5 text-right">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{loading ? (
							<tr>
								<td colSpan={4} className="px-4 py-6 text-muted-foreground">
									Loading…
								</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td colSpan={4} className="px-4 py-6 text-muted-foreground">
									No roles yet.
								</td>
							</tr>
						) : (
							rows.map((r) => {
								const isSuper = r.key === "admin";
								return (
									<tr key={r.id} className="hover:bg-muted/20">
										<td className="px-4 py-2.5">
											<Link
												to="/admin/roles/$id"
												params={{ id: String(r.id) }}
												className="font-medium text-foreground hover:text-[var(--accent)]"
											>
												{r.name}
											</Link>
											{r.isSystem && (
												<span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
													Built-in
												</span>
											)}
										</td>
										<td className="px-2 py-2.5 text-foreground/70">
											{isSuper
												? "Full access"
												: `${r.permissions.length} area${r.permissions.length === 1 ? "" : "s"}`}
										</td>
										<td className="px-2 py-2.5 text-foreground/70">
											{r.userCount}
										</td>
										<td className="px-3 py-2.5 text-right whitespace-nowrap">
											<Link
												to="/admin/roles/$id"
												params={{ id: String(r.id) }}
												className="text-xs font-semibold text-[var(--accent)] hover:underline"
											>
												Edit
											</Link>
											{!r.isSystem && (
												<span className="ml-2 inline-flex align-middle">
													<ActionMenu
														items={[
															{
																label: "Delete role",
																danger: true,
																onClick: () => del(r),
															},
														]}
													/>
												</span>
											)}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
