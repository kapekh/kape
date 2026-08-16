import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Plus, SearchX } from "lucide-react";
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

export const Route = createFileRoute("/admin/offices/")({
	component: OfficesList,
});

type Row = Awaited<
	ReturnType<typeof trpcClient.adminOffices.list.query>
>[number];

function OfficesList() {
	const [provinces, setProvinces] = useState<Record<string, string>>({});
	const load = useCallback(async () => {
		const [o, prov] = await Promise.all([
			trpcClient.adminOffices.list.query(),
			trpcClient.terms.list.query({ taxonomy: "location" }),
		]);
		setProvinces(Object.fromEntries(prov.map((p) => [p.key, p.label])));
		return o;
	}, []);
	const { rows, setRows, state, error, reload } = useListQuery<Row>(load);
	const [q, setQ] = useState("");

	async function del(row: Row) {
		if (!(await confirm("Delete this office?"))) return;
		await removeWithRollback(
			rows,
			setRows,
			(r) => r.id === row.id,
			() => trpcClient.adminOffices.delete.mutate({ id: row.id }),
		);
	}

	const provinceLabel = (r: Row) =>
		r.province ? (provinces[r.province] ?? r.province) : "";
	const shown = rows.filter((r) =>
		matchesQuery(q, r.name, provinceLabel(r), r.phone),
	);

	const newOffice = (
		<Button asChild>
			<Link to="/admin/offices/new">
				<Plus aria-hidden="true" />
				New office
			</Link>
		</Button>
	);

	return (
		<div>
			<PageHeader
				title="Offices"
				description="The places the organisation works from. They appear on the contact page and the map."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Offices" }]}
				actions={newOffice}
				toolbar={
					state === "ready" && rows.length > 0 ? (
						<ListSearch
							value={q}
							onChange={setQ}
							label="Search offices"
							placeholder="Search by name, province or phone…"
							status={
								q
									? `${shown.length} of ${rows.length}`
									: `${rows.length} ${rows.length === 1 ? "office" : "offices"}`
							}
						/>
					) : undefined
				}
			/>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					icon={<MapPin />}
					title="No offices yet"
					description="Offices are the places the organisation works from. They appear on the contact page and the map."
					action={newOffice}
				/>
			) : shown.length === 0 ? (
				<EmptyState
					icon={<SearchX />}
					title="No offices match that search"
					description={`Nothing here contains “${q}”.`}
					action={
						<Button type="button" variant="secondary" onClick={() => setQ("")}>
							Clear search
						</Button>
					}
				/>
			) : (
				<TableScroll label="Offices">
					<Table>
						<THead>
							<TR>
								<TH width={72}>
									<span className="sr-only">Photo</span>
								</TH>
								<TH>Name</TH>
								<TH>Province</TH>
								<TH>Phone</TH>
								<TH width={100}>HQ</TH>
								<TH align="right" width={72}>
									Actions
								</TH>
							</TR>
						</THead>
						<TBody>
							{shown.map((r) => (
								<TR key={r.id} className="hover:bg-admin-accent-soft/50">
									<TD>
										<div className="h-10 w-14 overflow-hidden rounded-lg bg-admin-neutral-soft ring-1 ring-admin-border">
											{r.imageUrl ? (
												<img
													src={r.imageUrl}
													alt=""
													className="h-full w-full object-cover"
												/>
											) : null}
										</div>
									</TD>
									<TD label="Name">
										<Link
											to="/admin/offices/$id"
											params={{ id: String(r.id) }}
											className="tap-target block truncate font-medium text-admin-ink max-md:whitespace-normal transition-colors duration-150 ease-out hover:text-admin-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
										>
											{r.name}
										</Link>
									</TD>
									<TD label="Province" className="text-admin-ink-muted">
										{provinceLabel(r) || "—"}
									</TD>
									<TD label="Phone" className="text-admin-ink-muted">
										{r.phone || "—"}
									</TD>
									<TD label="HQ">
										{r.isHq ? (
											<Badge tone="accent" dot={false}>
												HQ
											</Badge>
										) : null}
									</TD>
									<TD align="right" className="max-md:justify-end">
										<ActionMenu
											label={`Actions for ${r.name}`}
											items={[
												{
													label: "Delete office",
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
