import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { FormSection, fieldInput, fieldLabel } from "#/components/admin/form-ui";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/stats")({ component: StatsAdmin });

type Row = Awaited<ReturnType<typeof trpcClient.adminStats.list.query>>[number];
const ci = "w-full bg-transparent px-2 py-2 text-sm focus:outline-none focus:bg-[var(--accent)]/5 rounded";

function StatsAdmin() {
	const [rows, setRows] = useState<Row[]>([]);
	const [loading, setLoading] = useState(true);
	const [add, setAdd] = useState({ value: "", en: "", km: "" });

	async function refresh() {
		setRows(await trpcClient.adminStats.list.query());
		setLoading(false);
	}
	useEffect(() => {
		refresh();
	}, []);

	function patch(id: number, field: "value" | "en" | "km", value: string) {
		setRows((rs) =>
			rs.map((r) => {
				if (r.id !== id) return r;
				if (field === "value") return { ...r, value: Number(value) || 0 };
				return { ...r, labels: { ...r.labels, [field]: value } };
			}),
		);
	}
	async function save(r: Row) {
		await trpcClient.adminStats.update.mutate({ id: r.id, value: r.value, sort: r.sort, labels: { en: r.labels.en ?? "", km: r.labels.km ?? "" } });
	}
	async function create() {
		if (!add.en.trim()) return;
		await trpcClient.adminStats.create.mutate({ value: Number(add.value) || 0, sort: rows.length, labels: { en: add.en, km: add.km } });
		setAdd({ value: "", en: "", km: "" });
		refresh();
	}
	async function del(id: number) {
		if (!window.confirm("Delete stat?")) return;
		await trpcClient.adminStats.delete.mutate({ id });
		setRows((rs) => rs.filter((r) => r.id !== id));
	}

	return (
		<div className="space-y-5">
			<h1 className="font-display text-2xl font-semibold text-primary">Impact Stats</h1>

			<FormSection title="Add stat" description="The counters shown in the homepage 'Our reach' band.">
				<div className="flex flex-wrap items-end gap-3">
					<div className="w-28">
						<label className={fieldLabel}>Number</label>
						<input className={fieldInput} type="number" placeholder="0" value={add.value} onChange={(e) => setAdd({ ...add, value: e.target.value })} />
					</div>
					<div className="flex-1 min-w-[160px]">
						<label className={fieldLabel}>Label (EN)</label>
						<input className={fieldInput} placeholder="Students" value={add.en} onChange={(e) => setAdd({ ...add, en: e.target.value })} />
					</div>
					<div className="flex-1 min-w-[160px]">
						<label className={fieldLabel}>Label (KH)</label>
						<input className={`${fieldInput} font-khmer`} placeholder="សិស្ស" value={add.km} onChange={(e) => setAdd({ ...add, km: e.target.value })} />
					</div>
					<button type="button" onClick={create} className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 transition">Add</button>
				</div>
			</FormSection>

			<div className="overflow-hidden rounded-xl border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
						<tr><th className="px-2 py-2.5 w-28">Number</th><th className="px-2 py-2.5">Label (EN)</th><th className="px-2 py-2.5">Label (KH)</th><th className="px-3 py-2.5 text-right">Actions</th></tr>
					</thead>
					<tbody className="divide-y divide-border">
						{loading ? (
							<tr><td colSpan={4} className="px-3 py-4 text-muted-foreground">Loading…</td></tr>
						) : (
							rows.map((r) => (
								<tr key={r.id} className="hover:bg-muted/20">
									<td><input className={ci} type="number" value={r.value} onChange={(e) => patch(r.id, "value", e.target.value)} /></td>
									<td><input className={ci} value={r.labels.en ?? ""} onChange={(e) => patch(r.id, "en", e.target.value)} /></td>
									<td><input className={`${ci} font-khmer`} value={r.labels.km ?? ""} onChange={(e) => patch(r.id, "km", e.target.value)} /></td>
									<td className="px-3 py-2 text-right whitespace-nowrap">
										<button type="button" onClick={() => save(r)} className="text-xs rounded border border-border px-2.5 py-1 hover:bg-muted">Save</button>
										<span className="ml-2 inline-flex align-middle"><ActionMenu items={[{ label: "Delete", danger: true, onClick: () => del(r.id) }]} /></span>
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
