import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm, toast } from "@/components/Dialogs";
import type { FormField } from "@/lib/forms";

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

	// `content` blocks are author text, not inputs — they have no submission column.
	const dataFields = fields.filter((f) => f.type !== "content");
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

	return (
		<div>
			<div className="mb-6">
				<Link
					to="/admin/forms"
					className="text-xs font-semibold text-muted-foreground hover:text-foreground"
				>
					← Forms
				</Link>
				<div className="mt-1 flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="font-display text-2xl font-semibold text-primary">
							{title} — responses
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							{rows.length} submission{rows.length === 1 ? "" : "s"}.
						</p>
					</div>
					<div className="flex gap-2">
						<Link
							to="/admin/forms/$id"
							params={{ id }}
							className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition"
						>
							Edit form
						</Link>
						<button
							type="button"
							onClick={exportCsv}
							disabled={rows.length === 0}
							className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
						>
							Export CSV
						</button>
					</div>
				</div>
			</div>

			<div className="overflow-x-auto rounded-xl border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-4 py-2.5 whitespace-nowrap">Date</th>
							{dataFields.map((f) => (
								<th key={f.key} className="px-2 py-2.5 whitespace-nowrap">
									{f.label}
								</th>
							))}
							<th className="px-3 py-2.5 text-right">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{loading ? (
							<tr>
								<td
									colSpan={dataFields.length + 2}
									className="px-4 py-6 text-muted-foreground"
								>
									Loading…
								</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td
									colSpan={dataFields.length + 2}
									className="px-4 py-6 text-muted-foreground"
								>
									No responses yet.
								</td>
							</tr>
						) : (
							rows.map((r) => {
								const data = (r.data ?? {}) as Record<string, string>;
								return (
									<tr key={r.id} className="hover:bg-muted/20 align-top">
										<td className="px-4 py-2.5 whitespace-nowrap text-foreground/70">
											{fmtDate(r.createdAt)}
										</td>
										{dataFields.map((f) => (
											<td
												key={f.key}
												className="px-2 py-2.5 text-foreground/90"
											>
												{f.type === "file" ? (
													data[f.key] ? (
														<a
															href={data[f.key]}
															target="_blank"
															rel="noopener noreferrer"
															className="inline-flex items-center gap-1 font-medium text-[var(--accent)] hover:underline"
														>
															↓ {data[`${f.key}__name`] || "Download"}
														</a>
													) : (
														<span className="text-muted-foreground">—</span>
													)
												) : f.type === "richtext" ? (
													data[f.key] ? (
														<div
															className="prose-body max-w-sm text-sm [&_p]:my-0.5"
															// biome-ignore lint/security/noDangerouslySetInnerHtml: public submission, rendered at write time by renderBasicRichText's restricted allow-list
															dangerouslySetInnerHTML={{ __html: data[f.key] }}
														/>
													) : (
														<span className="text-muted-foreground">—</span>
													)
												) : f.type === "email" && data[f.key] ? (
													<a
														href={`mailto:${data[f.key]}`}
														className="hover:text-[var(--accent)]"
													>
														{data[f.key]}
													</a>
												) : (
													data[f.key] || (
														<span className="text-muted-foreground">—</span>
													)
												)}
											</td>
										))}
										<td className="px-3 py-2.5 text-right">
											<ActionMenu
												items={[
													{
														label: "Delete response",
														danger: true,
														onClick: () => del(r.id),
													},
												]}
											/>
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
