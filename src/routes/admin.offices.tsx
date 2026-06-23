import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { FormSection, fieldInput, fieldLabel } from "#/components/admin/form-ui";
import { MediaThumb } from "#/components/admin/MediaThumb";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/offices")({ component: OfficesAdmin });

type Row = Awaited<ReturnType<typeof trpcClient.adminOffices.list.query>>[number];
const empty: { name: string; province: string; address: string; phone: string; email: string; lat: string; lng: string; isHq: boolean; imageMediaId: number | null; imageUrl: string | null } = { name: "", province: "", address: "", phone: "", email: "", lat: "", lng: "", isHq: false, imageMediaId: null, imageUrl: null };
const ci = "w-full bg-transparent px-2 py-2 text-sm focus:outline-none focus:bg-[var(--accent)]/5 rounded";

function OfficesAdmin() {
	const [rows, setRows] = useState<Row[]>([]);
	const [loading, setLoading] = useState(true);
	const [add, setAdd] = useState({ ...empty });

	async function refresh() {
		setRows(await trpcClient.adminOffices.list.query());
		setLoading(false);
	}
	useEffect(() => {
		refresh();
	}, []);

	function patch(id: number, field: keyof Row, value: string | boolean) {
		setRows((rs) => rs.map((r) => (r.id === id ? ({ ...r, [field]: value } as unknown as Row) : r)));
	}
	function setImage(id: number, mediaId: number | null, url: string | null) {
		setRows((rs) => rs.map((r) => (r.id === id ? { ...r, imageMediaId: mediaId, imageUrl: url } : r)));
	}
	async function save(r: Row) {
		await trpcClient.adminOffices.update.mutate({
			id: r.id, name: r.name, province: r.province ?? "", address: r.address ?? "", phone: r.phone ?? "",
			email: r.email ?? "", lat: r.lat ?? "", lng: r.lng ?? "", isHq: r.isHq, sort: r.sort, imageMediaId: r.imageMediaId ?? null,
		});
	}
	async function create() {
		if (!add.name.trim()) return;
		await trpcClient.adminOffices.create.mutate({ ...add, sort: rows.length });
		setAdd({ ...empty });
		refresh();
	}
	async function del(id: number) {
		if (!window.confirm("Delete office?")) return;
		await trpcClient.adminOffices.delete.mutate({ id });
		setRows((rs) => rs.filter((r) => r.id !== id));
	}

	return (
		<div className="space-y-5">
			<h1 className="font-display text-2xl font-semibold text-primary">Offices</h1>

			<FormSection title="Add office" description="KAPE office locations shown on the Contact page and map.">
				<div className="flex flex-wrap items-end gap-3">
					<div className="flex-1 min-w-[160px]">
						<label className={fieldLabel}>Name</label>
						<input className={fieldInput} placeholder="e.g. Head Office (PTTC)" value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} />
					</div>
					<div className="min-w-[140px]">
						<label className={fieldLabel}>Province</label>
						<input className={fieldInput} placeholder="Kampong Cham" value={add.province} onChange={(e) => setAdd({ ...add, province: e.target.value })} />
					</div>
					<div className="min-w-[130px]">
						<label className={fieldLabel}>Phone</label>
						<input className={fieldInput} value={add.phone} onChange={(e) => setAdd({ ...add, phone: e.target.value })} />
					</div>
					<div className="min-w-[180px]">
						<label className={fieldLabel}>Email</label>
						<input className={fieldInput} value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} />
					</div>
					<div className="w-24">
						<label className={fieldLabel}>Lat</label>
						<input className={fieldInput} value={add.lat} onChange={(e) => setAdd({ ...add, lat: e.target.value })} />
					</div>
					<div className="w-24">
						<label className={fieldLabel}>Lng</label>
						<input className={fieldInput} value={add.lng} onChange={(e) => setAdd({ ...add, lng: e.target.value })} />
					</div>
					<label className="flex items-center gap-1.5 text-sm pb-2"><input type="checkbox" checked={add.isHq} onChange={(e) => setAdd({ ...add, isHq: e.target.checked })} /> HQ</label>
					<div>
						<label className={fieldLabel}>Image</label>
						<MediaThumb value={add.imageMediaId} url={add.imageUrl} onChange={(id, url) => setAdd({ ...add, imageMediaId: id, imageUrl: url })} />
					</div>
					<button type="button" onClick={create} className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 transition">Add</button>
				</div>
			</FormSection>

			<div className="overflow-x-auto rounded-xl border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-2 py-2.5">Image</th>
							<th className="px-2 py-2.5">Name</th><th className="px-2 py-2.5">Province</th><th className="px-2 py-2.5">Phone</th>
							<th className="px-2 py-2.5">Email</th><th className="px-2 py-2.5">Lat</th><th className="px-2 py-2.5">Lng</th>
							<th className="px-2 py-2.5">HQ</th><th className="px-3 py-2.5 text-right">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{loading ? (
							<tr><td colSpan={9} className="px-3 py-4 text-muted-foreground">Loading…</td></tr>
						) : (
							rows.map((r) => (
								<tr key={r.id} className="hover:bg-muted/20">
									<td className="px-2"><MediaThumb value={r.imageMediaId} url={r.imageUrl} onChange={(id, url) => setImage(r.id, id, url)} /></td>
									<td><input className={ci} value={r.name} onChange={(e) => patch(r.id, "name", e.target.value)} /></td>
									<td><input className={ci} value={r.province ?? ""} onChange={(e) => patch(r.id, "province", e.target.value)} /></td>
									<td><input className={ci} value={r.phone ?? ""} onChange={(e) => patch(r.id, "phone", e.target.value)} /></td>
									<td><input className={ci} value={r.email ?? ""} onChange={(e) => patch(r.id, "email", e.target.value)} /></td>
									<td><input className={`${ci} w-20`} value={r.lat ?? ""} onChange={(e) => patch(r.id, "lat", e.target.value)} /></td>
									<td><input className={`${ci} w-20`} value={r.lng ?? ""} onChange={(e) => patch(r.id, "lng", e.target.value)} /></td>
									<td className="text-center"><input type="checkbox" checked={r.isHq} onChange={(e) => patch(r.id, "isHq", e.target.checked)} /></td>
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
