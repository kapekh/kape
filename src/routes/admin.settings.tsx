import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import {
	FormSection,
	fieldInput,
	fieldLabel,
} from "#/components/admin/form-ui";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/settings")({
	component: SettingsAdmin,
});

type Row = { key: string; value: string };
const ci =
	"w-full bg-transparent px-2 py-2 text-sm focus:outline-none focus:bg-[var(--accent)]/5 rounded";

function SettingsAdmin() {
	const [rows, setRows] = useState<Row[]>([]);
	const [loading, setLoading] = useState(true);
	const [add, setAdd] = useState({ key: "", value: "" });

	async function refresh() {
		const all = await trpcClient.adminSettings.list.query();
		setRows(
			all
				.map((r) => ({ key: r.key, value: r.value }))
				.sort((a, b) => a.key.localeCompare(b.key)),
		);
		setLoading(false);
	}
	useEffect(() => {
		refresh();
	}, []);

	async function save(key: string, value: string) {
		await trpcClient.adminSettings.set.mutate({ key, value });
	}
	async function create() {
		if (!add.key.trim()) return;
		await trpcClient.adminSettings.set.mutate({
			key: add.key.trim(),
			value: add.value,
		});
		setAdd({ key: "", value: "" });
		refresh();
	}
	async function del(key: string) {
		if (!(await confirm(`Delete setting "${key}"?`))) return;
		await trpcClient.adminSettings.delete.mutate({ key });
		setRows((rs) => rs.filter((r) => r.key !== key));
	}

	return (
		<div className="max-w-3xl space-y-5">
			<div>
				<h1 className="font-display text-2xl font-semibold text-primary">
					Site Settings
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Global values used by the header, footer and contact page.
				</p>
			</div>

			<FormSection
				title="Add setting"
				description="A key/value pair, e.g. contact_email → hello@example.org."
			>
				<div className="flex flex-wrap items-end gap-3">
					<div className="min-w-[180px]">
						<label className={fieldLabel}>Key</label>
						<input
							className={`${fieldInput} font-mono`}
							placeholder="contact_email"
							value={add.key}
							onChange={(e) => setAdd({ ...add, key: e.target.value })}
						/>
					</div>
					<div className="flex-1 min-w-[220px]">
						<label className={fieldLabel}>Value</label>
						<input
							className={fieldInput}
							placeholder="hello@example.org"
							value={add.value}
							onChange={(e) => setAdd({ ...add, value: e.target.value })}
							onKeyDown={(e) => e.key === "Enter" && create()}
						/>
					</div>
					<button
						type="button"
						onClick={create}
						className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 transition"
					>
						Add
					</button>
				</div>
			</FormSection>

			<div className="overflow-hidden rounded-xl border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-2 py-2.5 w-1/3">Key</th>
							<th className="px-2 py-2.5">Value</th>
							<th className="px-3 py-2.5 text-right">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{loading ? (
							<tr>
								<td colSpan={3} className="px-3 py-4 text-muted-foreground">
									Loading…
								</td>
							</tr>
						) : (
							rows.map((r, i) => (
								<tr key={r.key} className="hover:bg-muted/20">
									<td className="px-2 font-mono text-xs">{r.key}</td>
									<td>
										<input
											className={ci}
											value={r.value}
											onChange={(e) =>
												setRows((rs) =>
													rs.map((x, j) =>
														j === i ? { ...x, value: e.target.value } : x,
													),
												)
											}
										/>
									</td>
									<td className="px-3 py-2 text-right whitespace-nowrap">
										<button
											type="button"
											onClick={() => save(r.key, r.value)}
											className="text-xs rounded border border-border px-2.5 py-1 hover:bg-muted"
										>
											Save
										</button>
										<span className="ml-2 inline-flex align-middle">
											<ActionMenu
												items={[
													{
														label: "Delete",
														danger: true,
														onClick: () => del(r.key),
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
