import { createFileRoute } from "@tanstack/react-router";
import { Mail, SearchX } from "lucide-react";
import { useCallback, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import {
	EmptyState,
	ListSearch,
	ListStatus,
	matchesQuery,
	removeWithRollback,
	useListQuery,
} from "#/components/admin/list-ui";
import { Button } from "#/components/ui/button.tsx";
import { PageHeader } from "#/components/ui/page-header.tsx";
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
	const load = useCallback(() => trpcClient.adminMessages.contact.query(), []);
	const { rows, setRows, state, error, reload } = useListQuery<Row>(load);
	const [q, setQ] = useState("");

	async function del(row: Row) {
		if (!(await confirm("Delete this message?"))) return;
		await removeWithRollback(
			rows,
			setRows,
			(r) => r.id === row.id,
			() => trpcClient.adminMessages.deleteContact.mutate({ id: row.id }),
		);
	}

	const shown = rows.filter((r) =>
		matchesQuery(q, r.name, r.email, r.phone, r.message),
	);

	return (
		<div>
			<PageHeader
				title="Messages"
				description="What visitors sent through the contact form on the public site."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Messages" }]}
				toolbar={
					state === "ready" && rows.length > 0 ? (
						<ListSearch
							value={q}
							onChange={setQ}
							label="Search messages"
							placeholder="Search by name, email or words…"
							status={
								q
									? `${shown.length} of ${rows.length}`
									: `${rows.length} ${rows.length === 1 ? "message" : "messages"}`
							}
						/>
					) : undefined
				}
			/>

			{state !== "ready" ? (
				<ListStatus state={state} error={error} onRetry={reload} />
			) : rows.length === 0 ? (
				<EmptyState
					icon={<Mail />}
					title="No messages yet"
					description="When someone writes in through the contact form, their message lands here."
				/>
			) : shown.length === 0 ? (
				<EmptyState
					icon={<SearchX />}
					title="No messages match that search"
					description={`Nothing here contains “${q}”.`}
					action={
						<Button type="button" variant="secondary" onClick={() => setQ("")}>
							Clear search
						</Button>
					}
				/>
			) : (
				// A message has a body to read, so this stays a list of cards rather
				// than becoming a table. Scanning who wrote is not the job here.
				<div className="space-y-3">
					{shown.map((r) => (
						<article
							key={r.id}
							className="rounded-xl border border-admin-border bg-admin-panel p-6"
						>
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div className="min-w-0">
									<h2 className="font-medium text-admin-ink">{r.name}</h2>
									<div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-admin-ink-muted">
										<a
											href={`mailto:${r.email}`}
											className="rounded transition-colors duration-150 ease-out hover:text-admin-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
										>
											{r.email}
										</a>
										{r.phone && (
											<a
												href={`tel:${r.phone}`}
												className="rounded transition-colors duration-150 ease-out hover:text-admin-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
											>
												{r.phone}
											</a>
										)}
										<time className="text-admin-ink-subtle">
											{fmtDate(r.createdAt)}
										</time>
									</div>
								</div>
								<div className="flex shrink-0 items-center gap-2">
									<Button asChild variant="secondary" size="sm">
										<a href={`mailto:${r.email}?subject=Re:%20Your%20message`}>
											Reply
										</a>
									</Button>
									<ActionMenu
										label={`Actions for the message from ${r.name}`}
										items={[
											{
												label: "Delete message",
												danger: true,
												onClick: () => del(r),
											},
										]}
									/>
								</div>
							</div>
							<p className="mt-4 whitespace-pre-wrap border-t border-admin-border pt-4 text-sm text-admin-ink">
								{r.message}
							</p>
						</article>
					))}
				</div>
			)}
		</div>
	);
}
