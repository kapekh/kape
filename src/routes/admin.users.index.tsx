import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm, prompt, toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/users/")({ component: UsersList });

type Row = Awaited<ReturnType<typeof trpcClient.adminUsers.list.query>>[number];

function fmtDate(s: string) {
	const d = new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`);
	return Number.isNaN(d.getTime())
		? s
		: d.toLocaleDateString(undefined, {
				day: "numeric",
				month: "short",
				year: "numeric",
			});
}

function UsersList() {
	const [rows, setRows] = useState<Row[]>([]);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		setRows(await trpcClient.adminUsers.list.query());
		setLoading(false);
	}, []);
	useEffect(() => {
		refresh();
	}, [refresh]);

	async function resetPw(id: number, email: string) {
		const pw = await prompt({
			title: "Reset password",
			message: `Set a new password for ${email}. It signs them out of all sessions.`,
			placeholder: "At least 8 characters",
			confirmLabel: "Reset password",
		});
		if (pw === null) return; // cancelled
		if (pw.trim().length < 8) {
			toast("Password must be at least 8 characters.", "error");
			return;
		}
		try {
			await trpcClient.adminUsers.resetPassword.mutate({
				id,
				password: pw.trim(),
			});
			toast(`Password reset for ${email}.`, "success");
		} catch (e) {
			toast(
				e instanceof Error ? e.message : "Could not reset the password.",
				"error",
			);
		}
	}

	async function del(id: number) {
		if (
			!(await confirm({
				message:
					"Delete this user? They'll be signed out and lose access immediately.",
				danger: true,
				confirmLabel: "Delete",
			}))
		)
			return;
		try {
			await trpcClient.adminUsers.delete.mutate({ id });
			setRows((rs) => rs.filter((r) => r.id !== id));
		} catch (e) {
			toast(
				e instanceof Error ? e.message : "Could not delete this user.",
				"error",
			);
		}
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">
						Users
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						People who can sign in — {rows.length} total.
					</p>
				</div>
				<Link
					to="/admin/users/new"
					className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
				>
					+ New user
				</Link>
			</div>

			<div className="overflow-hidden rounded-xl border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-4 py-2.5">Email</th>
							<th className="px-2 py-2.5">Name</th>
							<th className="px-2 py-2.5">Role</th>
							<th className="px-2 py-2.5">Added</th>
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
									No users yet.
								</td>
							</tr>
						) : (
							rows.map((r) => (
								<tr key={r.id} className="hover:bg-muted/20">
									<td className="px-4 py-2.5">
										<Link
											to="/admin/users/$id"
											params={{ id: String(r.id) }}
											className="font-medium text-foreground hover:text-[var(--accent)]"
										>
											{r.email}
										</Link>
									</td>
									<td className="px-2 py-2.5 text-foreground/80">
										{r.name || <span className="text-muted-foreground">—</span>}
									</td>
									<td className="px-2 py-2.5">
										<span
											className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${r.role === "admin" ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "bg-muted text-muted-foreground"}`}
										>
											{r.role}
										</span>
									</td>
									<td className="px-2 py-2.5 text-foreground/70">
										{fmtDate(r.createdAt)}
									</td>
									<td className="px-3 py-2.5 text-right whitespace-nowrap">
										<Link
											to="/admin/users/$id"
											params={{ id: String(r.id) }}
											className="text-xs font-semibold text-[var(--accent)] hover:underline"
										>
											Edit
										</Link>
										<span className="ml-2 inline-flex align-middle">
											<ActionMenu
												items={[
													{
														label: "Reset password",
														onClick: () => resetPw(r.id, r.email),
													},
													{
														label: "Delete user",
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
