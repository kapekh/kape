import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, SearchX, ShieldCheck } from "lucide-react";
import { useCallback, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import {
	EmptyState,
	ListSearch,
	ListStatus,
	matchesQuery,
	TableScroll,
	useListQuery,
} from "#/components/admin/list-ui";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { PageHeader } from "#/components/ui/page-header.tsx";
import { Table, TBody, TD, TH, THead, TR } from "#/components/ui/table.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm, toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/roles/")({ component: RolesList });

type Row = Awaited<ReturnType<typeof trpcClient.adminRoles.list.query>>[number];

function RolesList() {
	const load = useCallback(() => trpcClient.adminRoles.list.query(), []);
	const { rows, setRows, state, error, reload } = useListQuery<Row>(load);
	const [q, setQ] = useState("");

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

	const access = (r: Row) =>
		r.key === "admin"
			? "Full access"
			: `${r.permissions.length} area${r.permissions.length === 1 ? "" : "s"}`;
	const shown = rows.filter((r) => matchesQuery(q, r.name, r.key, access(r)));

	const newRole = (
		<Button asChild>
			<Link to="/admin/roles/new">
				<Plus aria-hidden="true" />
				New role
			</Link>
		</Button>
	);

	return (
		<div>
			<PageHeader
				title="Roles"
				description="What each role can manage. A user gets their areas from the role they hold, and anyone with Users & roles can hand out only the areas they hold themselves; administrators are touched by administrators alone."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Roles" }]}
				actions={newRole}
				toolbar={
					state === "ready" && rows.length > 0 ? (
						<ListSearch
							value={q}
							onChange={setQ}
							label="Search roles"
							placeholder="Search by name or access…"
							status={
								q
									? `${shown.length} of ${rows.length}`
									: `${rows.length} ${rows.length === 1 ? "role" : "roles"}`
							}
						/>
					) : undefined
				}
			/>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					icon={<ShieldCheck />}
					title="No roles yet"
					description="A role is a named set of admin areas. Create one, then assign it to a user."
					action={newRole}
				/>
			) : shown.length === 0 ? (
				<EmptyState
					icon={<SearchX />}
					title="No roles match that search"
					description={`Nothing here contains “${q}”.`}
					action={
						<Button type="button" variant="secondary" onClick={() => setQ("")}>
							Clear search
						</Button>
					}
				/>
			) : (
				<TableScroll label="Roles">
					<Table>
						<THead>
							<TR>
								<TH>Role</TH>
								<TH>Access</TH>
								<TH width={100}>Users</TH>
								<TH align="right" width={72}>
									Actions
								</TH>
							</TR>
						</THead>
						<TBody>
							{shown.map((r) => (
								<TR key={r.id} className="hover:bg-admin-accent-soft/50">
									<TD label="Role">
										<span className="flex flex-wrap items-center gap-2">
											<Link
												to="/admin/roles/$id"
												params={{ id: String(r.id) }}
												className="tap-target truncate font-medium text-admin-ink transition-colors duration-150 ease-out hover:text-admin-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50 max-md:whitespace-normal"
											>
												{r.name}
											</Link>
											{r.isSystem && <Badge dot={false}>Built-in</Badge>}
										</span>
									</TD>
									<TD label="Access" className="text-admin-ink-muted">
										{access(r)}
									</TD>
									<TD label="Users" className="text-admin-ink-muted">
										{r.userCount}
									</TD>
									<TD align="right" className="max-md:justify-end">
										{/* a built-in role cannot be deleted, so it has no menu */}
										{r.isSystem ? null : (
											<ActionMenu
												label={`Actions for ${r.name}`}
												items={[
													{
														label: "Delete role",
														danger: true,
														onClick: () => del(r),
													},
												]}
											/>
										)}
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
