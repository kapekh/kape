import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, SearchX, Users } from "lucide-react";
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
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { PageHeader } from "#/components/ui/page-header.tsx";
import { Table, TBody, TD, TH, THead, TR } from "#/components/ui/table.tsx";
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
	const [role, setRole] = useState("");

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

	const roles = [...new Set(rows.map((r) => r.role))].sort();
	const ofRole = role ? rows.filter((r) => r.role === role) : rows;
	const shown = ofRole.filter((r) => matchesQuery(q, r.email, r.name, r.role));
	const filtered = q !== "" || role !== "";

	const newUser = (
		<Button asChild>
			<Link to="/admin/users/new">
				<Plus aria-hidden="true" />
				New user
			</Link>
		</Button>
	);

	const clearFilters = (
		<Button
			type="button"
			variant="secondary"
			onClick={() => {
				setQ("");
				setRole("");
			}}
		>
			{role ? "Clear filters" : "Clear search"}
		</Button>
	);

	return (
		<div>
			<PageHeader
				title="Users"
				description="People who can sign in. Their role decides what they can reach."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Users" }]}
				actions={newUser}
				toolbar={
					state === "ready" && rows.length > 0 ? (
						<>
							<ListSearch
								value={q}
								onChange={setQ}
								label="Search users"
								placeholder="Search by email, name or role…"
								status={
									filtered
										? `${shown.length} of ${rows.length}`
										: `${rows.length} ${rows.length === 1 ? "user" : "users"}`
								}
							/>
							<fieldset className="flex flex-wrap items-center gap-2">
								<legend className="sr-only">Filter by role</legend>
								<Button
									type="button"
									size="sm"
									variant={role === "" ? "primary" : "secondary"}
									aria-pressed={role === ""}
									onClick={() => setRole("")}
								>
									All
								</Button>
								{roles.map((r) => (
									<Button
										key={r}
										type="button"
										size="sm"
										variant={role === r ? "primary" : "secondary"}
										aria-pressed={role === r}
										onClick={() => setRole(r)}
										className="capitalize"
									>
										{r}
									</Button>
								))}
							</fieldset>
						</>
					) : undefined
				}
			/>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					icon={<Users />}
					title="No users yet"
					description="Users are the accounts that can sign in to this admin. Their role decides what they can reach."
					action={newUser}
				/>
			) : shown.length === 0 ? (
				<EmptyState
					icon={<SearchX />}
					title="No users match your filters"
					description={
						q
							? `Nothing here contains “${q}”.`
							: "Nobody carries that role yet."
					}
					action={clearFilters}
				/>
			) : (
				<TableScroll label="Users">
					<Table>
						<THead>
							<TR>
								<TH>Email</TH>
								<TH>Name</TH>
								<TH width={140}>Role</TH>
								<TH width={140}>Added</TH>
								<TH align="right" width={72}>
									Actions
								</TH>
							</TR>
						</THead>
						<TBody>
							{shown.map((r) => (
								<TR key={r.id} className="hover:bg-admin-accent-soft/50">
									<TD label="Email">
										<Link
											to="/admin/users/$id"
											params={{ id: String(r.id) }}
											className="block truncate font-medium text-admin-ink max-md:whitespace-normal transition-colors duration-150 ease-out hover:text-admin-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
										>
											{r.email}
										</Link>
									</TD>
									<TD label="Name" className="text-admin-ink-muted">
										{r.name || "—"}
									</TD>
									<TD label="Role">
										<Badge tone={r.role === "admin" ? "accent" : "neutral"}>
											<span className="capitalize">{r.role}</span>
										</Badge>
									</TD>
									<TD label="Added" className="text-admin-ink-muted">
										{fmtDate(r.createdAt, lang)}
									</TD>
									<TD align="right" className="max-md:justify-end">
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
									</TD>
								</TR>
							))}
						</TBody>
					</Table>
				</TableScroll>
			)}
		</div>
	);
}
