import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import {
	EmptyState,
	ListSearch,
	ListStatus,
	matchesQuery,
	removeWithRollback,
	TableScroll,
	useListQuery,
} from "#/components/admin/list-ui";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { fmtDate } from "#/lib/format";
import { useLang } from "#/lib/i18n";
import { confirm, prompt, toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/users/")({ component: UsersList });

type Row = Awaited<ReturnType<typeof trpcClient.adminUsers.list.query>>[number];

function UsersList() {
	const { lang } = useLang();
	const load = useCallback(() => trpcClient.adminUsers.list.query(), []);
	const { rows, setRows, state, error, reload } = useListQuery<Row>(load);
	const [q, setQ] = useState("");

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

	async function del(row: Row) {
		if (
			!(await confirm({
				message:
					"Delete this user? They'll be signed out and lose access immediately.",
				danger: true,
				confirmLabel: "Delete",
			}))
		)
			return;
		await removeWithRollback(
			rows,
			setRows,
			(r) => r.id === row.id,
			() => trpcClient.adminUsers.delete.mutate({ id: row.id }),
		);
	}

	const shown = rows.filter((r) => matchesQuery(q, r.email, r.name, r.role));

	const newUser = (
		<Link
			to="/admin/users/new"
			className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
		>
			+ New user
		</Link>
	);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">
						Users
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						People who can sign in
						{state === "ready" ? ` — ${rows.length} total.` : "."}
					</p>
				</div>
				{newUser}
			</div>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					title="No users yet"
					description="Users are the accounts that can sign in to this admin. Their role decides what they can reach."
					action={newUser}
				/>
			) : (
				<>
					<ListSearch
						value={q}
						onChange={setQ}
						label="Search users"
						placeholder="Search by email, name or role…"
						status={q ? `${shown.length} of ${rows.length}` : undefined}
					/>
					{shown.length === 0 ? (
						<EmptyState
							title="No users match that search"
							description={`Nothing here contains “${q}”.`}
							action={
								<button
									type="button"
									onClick={() => setQ("")}
									className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
								>
									Clear search
								</button>
							}
						/>
					) : (
						<TableScroll label="Users">
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
									{shown.map((r) => (
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
												{r.name || (
													<span className="text-muted-foreground">—</span>
												)}
											</td>
											<td className="px-2 py-2.5">
												<span
													className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${r.role === "admin" ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "bg-muted text-muted-foreground"}`}
												>
													{r.role}
												</span>
											</td>
											<td className="px-2 py-2.5 text-foreground/70">
												{fmtDate(r.createdAt, lang)}
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
														label={`Actions for ${r.email}`}
														items={[
															{
																label: "Reset password",
																onClick: () => resetPw(r.id, r.email),
															},
															{
																label: "Delete user",
																danger: true,
																onClick: () => del(r),
															},
														]}
													/>
												</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</TableScroll>
					)}
				</>
			)}
		</div>
	);
}
