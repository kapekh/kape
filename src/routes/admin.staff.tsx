import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { FormSection, fieldInput, fieldLabel } from "#/components/admin/form-ui";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/staff")({
	component: StaffAdmin,
});

type Row = Awaited<ReturnType<typeof trpcClient.adminStaff.list.query>>[number];
const empty = { staffNo: "", nameKm: "", nameEn: "", sex: "", phone: "", email: "", program: "" };
const ci = "w-full bg-transparent px-2 py-2 text-sm focus:outline-none focus:bg-[var(--accent)]/5 rounded";

function StaffAdmin() {
	const [rows, setRows] = useState<Row[]>([]);
	const [loading, setLoading] = useState(true);
	const [add, setAdd] = useState({ ...empty });

	async function refresh() {
		setRows(await trpcClient.adminStaff.list.query());
		setLoading(false);
	}
	useEffect(() => {
		refresh();
	}, []);

	function patch(id: number, field: keyof Row, value: string) {
		setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
	}
	async function save(r: Row) {
		await trpcClient.adminStaff.update.mutate({
			id: r.id, staffNo: r.staffNo ?? "", nameKm: r.nameKm ?? "", nameEn: r.nameEn ?? "",
			sex: r.sex ?? "", phone: r.phone ?? "", email: r.email ?? "", program: r.program ?? "", sort: r.sort,
		});
	}
	async function create() {
		if (!add.nameEn.trim() && !add.nameKm.trim()) return;
		await trpcClient.adminStaff.create.mutate({ ...add, sort: rows.length });
		setAdd({ ...empty });
		refresh();
	}
	async function del(id: number) {
		if (!window.confirm("Delete this staff record?")) return;
		await trpcClient.adminStaff.delete.mutate({ id });
		setRows((rs) => rs.filter((r) => r.id !== id));
	}

	return (
		<div className="space-y-5">
			<h1 className="font-display text-2xl font-semibold text-primary">Staff Directory</h1>

			<FormSection title="Add staff member" description="Used in the internal staff directory.">
				<div className="flex flex-wrap items-end gap-3">
					<div className="w-24">
						<label className={fieldLabel}>ID</label>
						<input className={fieldInput} placeholder="001" value={add.staffNo} onChange={(e) => setAdd({ ...add, staffNo: e.target.value })} />
					</div>
					<div className="min-w-[150px] flex-1">
						<label className={fieldLabel}>Name (KH)</label>
						<input className={`${fieldInput} font-khmer`} placeholder="ឈ្មោះ" value={add.nameKm} onChange={(e) => setAdd({ ...add, nameKm: e.target.value })} />
					</div>
					<div className="min-w-[150px] flex-1">
						<label className={fieldLabel}>Name (EN)</label>
						<input className={fieldInput} placeholder="Full name" value={add.nameEn} onChange={(e) => setAdd({ ...add, nameEn: e.target.value })} />
					</div>
					<div className="w-16">
						<label className={fieldLabel}>Sex</label>
						<input className={fieldInput} placeholder="M/F" value={add.sex} onChange={(e) => setAdd({ ...add, sex: e.target.value })} />
					</div>
					<div className="min-w-[120px]">
						<label className={fieldLabel}>Phone</label>
						<input className={fieldInput} value={add.phone} onChange={(e) => setAdd({ ...add, phone: e.target.value })} />
					</div>
					<div className="min-w-[170px] flex-1">
						<label className={fieldLabel}>Email</label>
						<input className={fieldInput} value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} />
					</div>
					<div className="min-w-[120px]">
						<label className={fieldLabel}>Program</label>
						<input className={fieldInput} value={add.program} onChange={(e) => setAdd({ ...add, program: e.target.value })} />
					</div>
					<button type="button" onClick={create} className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 transition">Add</button>
				</div>
			</FormSection>

			<div className="overflow-x-auto rounded-xl border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-2 py-2.5">ID</th>
							<th className="px-2 py-2.5">Name (KH)</th>
							<th className="px-2 py-2.5">Name (EN)</th>
							<th className="px-2 py-2.5">Sex</th>
							<th className="px-2 py-2.5">Phone</th>
							<th className="px-2 py-2.5">Email</th>
							<th className="px-2 py-2.5">Program</th>
							<th className="px-3 py-2.5 text-right">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{loading ? (
							<tr><td colSpan={8} className="px-3 py-4 text-muted-foreground">Loading…</td></tr>
						) : (
							rows.map((r) => (
								<tr key={r.id} className="hover:bg-muted/20">
									<td><input className={`${ci} w-20`} value={r.staffNo ?? ""} onChange={(e) => patch(r.id, "staffNo", e.target.value)} /></td>
									<td><input className={`${ci} font-khmer`} value={r.nameKm ?? ""} onChange={(e) => patch(r.id, "nameKm", e.target.value)} /></td>
									<td><input className={ci} value={r.nameEn ?? ""} onChange={(e) => patch(r.id, "nameEn", e.target.value)} /></td>
									<td><input className={`${ci} w-12`} value={r.sex ?? ""} onChange={(e) => patch(r.id, "sex", e.target.value)} /></td>
									<td><input className={ci} value={r.phone ?? ""} onChange={(e) => patch(r.id, "phone", e.target.value)} /></td>
									<td><input className={ci} value={r.email ?? ""} onChange={(e) => patch(r.id, "email", e.target.value)} /></td>
									<td><input className={ci} value={r.program ?? ""} onChange={(e) => patch(r.id, "program", e.target.value)} /></td>
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
