import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ClipboardList, Plus, SearchX } from "lucide-react";
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
import { confirm } from "@/components/Dialogs";
import { isFormClosed } from "@/lib/forms";

export const Route = createFileRoute("/admin/forms/")({ component: FormsList });

type Row = Awaited<ReturnType<typeof trpcClient.adminForms.list.query>>[number];

/** Closed is a live form past its deadline, which `status` alone cannot say. */
const formState = (r: Row) =>
	r.status === "active" && isFormClosed(r.deadline) ? "closed" : r.status;

function FormsList() {
	const navigate = useNavigate();
	const load = useCallback(() => trpcClient.adminForms.list.query(), []);
	const { rows, setRows, state, error, reload } = useListQuery<Row>(load);
	const [q, setQ] = useState("");

	async function del(row: Row) {
		if (
			!(await confirm({
				message:
					"Delete this form and all its submissions? This can't be undone.",
				danger: true,
				confirmLabel: "Delete",
			}))
		)
			return;
		await removeWithRollback(
			rows,
			setRows,
			(r) => r.id === row.id,
			() => trpcClient.adminForms.delete.mutate({ id: row.id }),
		);
	}

	const shown = rows.filter((r) =>
		matchesQuery(q, r.title, r.slug, formState(r)),
	);

	const newForm = (
		<Button asChild>
			<Link to="/admin/forms/new">
				<Plus aria-hidden="true" />
				New form
			</Link>
		</Button>
	);

	return (
		<div>
			<PageHeader
				title="Forms"
				description="Forms the public site can show, and what visitors have sent back."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Forms" }]}
				actions={newForm}
				toolbar={
					state === "ready" && rows.length > 0 ? (
						<ListSearch
							value={q}
							onChange={setQ}
							label="Search forms"
							placeholder="Search by title or URL…"
							status={
								q
									? `${shown.length} of ${rows.length}`
									: `${rows.length} ${rows.length === 1 ? "form" : "forms"}`
							}
						/>
					) : undefined
				}
			/>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					icon={<ClipboardList />}
					title="No forms yet"
					description="Build a form here, then embed it on any page. What visitors send lands under Responses."
					action={newForm}
				/>
			) : shown.length === 0 ? (
				<EmptyState
					icon={<SearchX />}
					title="No forms match that search"
					description={`Nothing here contains “${q}”.`}
					action={
						<Button type="button" variant="secondary" onClick={() => setQ("")}>
							Clear search
						</Button>
					}
				/>
			) : (
				<TableScroll label="Forms">
					<Table>
						<THead>
							<TR>
								<TH>Title</TH>
								<TH width={120}>Status</TH>
								<TH align="right" width={100}>
									Fields
								</TH>
								<TH align="right" width={140}>
									Responses
								</TH>
								<TH align="right" width={72}>
									Actions
								</TH>
							</TR>
						</THead>
						<TBody>
							{shown.map((r) => {
								const st = formState(r);
								return (
									<TR key={r.id} className="hover:bg-admin-accent-soft/50">
										<TD label="Title">
											<Link
												to="/admin/forms/$id"
												params={{ id: String(r.id) }}
												className="block truncate font-medium text-admin-ink transition-colors duration-150 ease-out hover:text-admin-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50 max-md:whitespace-normal"
											>
												{r.title}
											</Link>
											<span className="font-mono text-[13px] text-admin-ink-subtle">
												/{r.slug}
											</span>
										</TD>
										<TD label="Status">
											<Badge
												tone={
													st === "active"
														? "live"
														: st === "closed"
															? "warning"
															: "neutral"
												}
											>
												<span className="capitalize">{st}</span>
											</Badge>
										</TD>
										<TD
											label="Fields"
											align="right"
											className="tabular-nums text-admin-ink-muted"
										>
											{r.fields.length}
										</TD>
										<TD label="Responses" align="right">
											<Link
												to="/admin/forms/$id/submissions"
												params={{ id: String(r.id) }}
												className="rounded font-medium tabular-nums text-admin-accent transition-colors duration-150 ease-out hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
											>
												{r.submissionCount}
											</Link>
										</TD>
										<TD align="right" className="max-md:justify-end">
											<ActionMenu
												label={`Actions for ${r.title}`}
												items={[
													{
														label: "View responses",
														onClick: () =>
															navigate({
																to: "/admin/forms/$id/submissions",
																params: { id: String(r.id) },
															}),
													},
													{
														label: "Delete form",
														danger: true,
														onClick: () => del(r),
													},
												]}
											/>
										</TD>
									</TR>
								);
							})}
						</TBody>
					</Table>
				</TableScroll>
			)}
		</div>
	);
}
