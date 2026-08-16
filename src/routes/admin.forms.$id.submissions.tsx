import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Inbox, SearchX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import {
	EmptyState,
	ListSearch,
	matchesQuery,
	TableScroll,
} from "#/components/admin/list-ui";
import { Button } from "#/components/ui/button.tsx";
import { PageHeader } from "#/components/ui/page-header.tsx";
import { Table, TBody, TD, TH, THead, TR } from "#/components/ui/table.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm, toast } from "@/components/Dialogs";
import { type FormField, isContentField } from "@/lib/forms";

export const Route = createFileRoute("/admin/forms/$id/submissions")({
	component: Submissions,
});

type Sub = Awaited<
	ReturnType<typeof trpcClient.adminForms.submissions.query>
>[number];

function fmtDate(s: string) {
	const d = new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`);
	return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
}

function Submissions() {
	const { id } = Route.useParams();
	const fid = Number(id);
	const [title, setTitle] = useState("");
	const [fields, setFields] = useState<FormField[]>([]);
	const [rows, setRows] = useState<Sub[]>([]);
	const [loading, setLoading] = useState(true);
	const [q, setQ] = useState("");

	// `content` blocks and `section` headings are author text, not inputs — they
	// have no submission column.
	const dataFields = fields.filter((f) => !isContentField(f));
	const stripHtml = (s: string) =>
		s
			.replace(/<[^>]*>/g, " ")
			.replace(/\s+/g, " ")
			.trim();

	const refresh = useCallback(async () => {
		const [form, subs] = await Promise.all([
			trpcClient.adminForms.get.query({ id: fid }),
			trpcClient.adminForms.submissions.query({ formId: fid }),
		]);
		setTitle(form?.title ?? "Form");
		setFields(form?.fields ?? []);
		setRows(subs);
		setLoading(false);
	}, [fid]);
	useEffect(() => {
		refresh();
	}, [refresh]);

	async function del(sid: number) {
		if (
			!(await confirm({
				message: "Delete this response?",
				danger: true,
				confirmLabel: "Delete",
			}))
		)
			return;
		await trpcClient.adminForms.deleteSubmission.mutate({ id: sid });
		setRows((rs) => rs.filter((r) => r.id !== sid));
	}

	function exportCsv() {
		const cols = ["Date", ...dataFields.map((f) => f.label)];
		const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
		const lines = [cols.map(esc).join(",")];
		for (const r of rows) {
			const data = (r.data ?? {}) as Record<string, string>;
			lines.push(
				[
					fmtDate(r.createdAt),
					...dataFields.map((f) =>
						f.type === "richtext"
							? stripHtml(data[f.key] ?? "")
							: (data[f.key] ?? ""),
					),
				]
					.map(esc)
					.join(","),
			);
		}
		const blob = new Blob([lines.join("\n")], { type: "text/csv" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-responses.csv`;
		a.click();
		URL.revokeObjectURL(a.href);
		toast("CSV exported.", "success");
	}

	const searchable = (r: Sub) => {
		const data = (r.data ?? {}) as Record<string, string>;
		return dataFields.map((f) =>
			f.type === "richtext"
				? stripHtml(data[f.key] ?? "")
				: (data[f.key] ?? ""),
		);
	};
	const shown = rows.filter((r) =>
		matchesQuery(q, fmtDate(r.createdAt), ...searchable(r)),
	);

	return (
		<div>
			<PageHeader
				title={`${title || "Form"} — responses`}
				description="What visitors sent through this form."
				breadcrumb={[
					{ label: "Admin", to: "/admin" },
					{ label: "Forms", to: "/admin/forms" },
					{ label: "Responses" },
				]}
				actions={
					<>
						<Button asChild variant="secondary">
							<Link to="/admin/forms/$id" params={{ id }}>
								Edit form
							</Link>
						</Button>
						<Button
							type="button"
							onClick={exportCsv}
							disabled={rows.length === 0}
						>
							<Download aria-hidden="true" />
							Export CSV
						</Button>
					</>
				}
				toolbar={
					!loading && rows.length > 0 ? (
						<ListSearch
							value={q}
							onChange={setQ}
							label="Search responses"
							placeholder="Search what people wrote…"
							status={
								q
									? `${shown.length} of ${rows.length}`
									: `${rows.length} response${rows.length === 1 ? "" : "s"}`
							}
						/>
					) : undefined
				}
			/>

			{loading ? (
				<EmptyState title="Loading responses…" />
			) : rows.length === 0 ? (
				<EmptyState
					icon={<Inbox />}
					title="No responses yet"
					description="When someone fills this form in on the public site, their answers land here."
				/>
			) : shown.length === 0 ? (
				<EmptyState
					icon={<SearchX />}
					title="No responses match that search"
					description={`Nothing here contains “${q}”.`}
					action={
						<Button type="button" variant="secondary" onClick={() => setQ("")}>
							Clear search
						</Button>
					}
				/>
			) : (
				<TableScroll label={`${title} responses`}>
					<Table>
						<THead>
							<TR>
								<TH>Date</TH>
								{dataFields.map((f) => (
									<TH key={f.key}>{f.label}</TH>
								))}
								<TH align="right" width={72}>
									Actions
								</TH>
							</TR>
						</THead>
						<TBody>
							{shown.map((r) => {
								const data = (r.data ?? {}) as Record<string, string>;
								return (
									<TR key={r.id} className="hover:bg-admin-accent-soft/50">
										<TD
											label="Date"
											className="whitespace-nowrap text-admin-ink-muted"
										>
											{fmtDate(r.createdAt)}
										</TD>
										{dataFields.map((f) => (
											<TD key={f.key} label={f.label}>
												{f.type === "file" ? (
													data[f.key] ? (
														<a
															href={data[f.key]}
															target="_blank"
															rel="noopener noreferrer"
															className="inline-flex items-center gap-1.5 rounded font-medium text-admin-accent-ink transition-colors duration-150 ease-out hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
														>
															<Download
																aria-hidden="true"
																className="size-4 shrink-0"
															/>
															{data[`${f.key}__name`] || "Download"}
														</a>
													) : (
														<span className="text-admin-ink-subtle">—</span>
													)
												) : f.type === "richtext" ? (
													data[f.key] ? (
														<div
															className="prose-body max-w-sm text-sm [&_p]:my-0.5"
															// biome-ignore lint/security/noDangerouslySetInnerHtml: public submission, rendered at write time by renderBasicRichText's restricted allow-list
															dangerouslySetInnerHTML={{ __html: data[f.key] }}
														/>
													) : (
														<span className="text-admin-ink-subtle">—</span>
													)
												) : f.type === "email" && data[f.key] ? (
													<a
														href={`mailto:${data[f.key]}`}
														className="rounded transition-colors duration-150 ease-out hover:text-admin-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
													>
														{data[f.key]}
													</a>
												) : (
													data[f.key] || (
														<span className="text-admin-ink-subtle">—</span>
													)
												)}
											</TD>
										))}
										<TD align="right" className="max-md:justify-end">
											<ActionMenu
												label={`Actions for the response of ${fmtDate(r.createdAt)}`}
												items={[
													{
														label: "Delete response",
														danger: true,
														onClick: () => del(r.id),
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
