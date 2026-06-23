import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { FormSection, fieldInput, fieldLabel } from "#/components/admin/form-ui";
import { MediaThumb } from "#/components/admin/MediaThumb";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/partners")({ component: PartnersAdmin });

type Row = Awaited<ReturnType<typeof trpcClient.adminPartners.list.query>>[number];
type Cat = { key: string; label: string };
const ci = "w-full bg-transparent px-2 py-2 text-sm focus:outline-none focus:bg-[var(--accent)]/5 rounded";

function PartnersAdmin() {
	const [rows, setRows] = useState<Row[]>([]);
	const [cats, setCats] = useState<Cat[]>([]);
	const [loading, setLoading] = useState(true);
	const [add, setAdd] = useState<{ name: string; category: string; url: string; logoMediaId: number | null; logoUrl: string | null }>({ name: "", category: "government", url: "", logoMediaId: null, logoUrl: null });

	async function refresh() {
		const [p, c] = await Promise.all([trpcClient.adminPartners.list.query(), trpcClient.terms.list.query({ taxonomy: "partner_category" })]);
		setRows(p);
		setCats(c);
		setLoading(false);
	}
	useEffect(() => {
		refresh();
	}, []);

	function patch(id: number, field: "name" | "category" | "url", value: string) {
		setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
	}
	function setLogo(id: number, mediaId: number | null, url: string | null) {
		setRows((rs) => rs.map((r) => (r.id === id ? { ...r, logoMediaId: mediaId, logoUrl: url } : r)));
	}
	async function save(r: Row) {
		await trpcClient.adminPartners.update.mutate({ id: r.id, name: r.name, category: r.category, url: r.url ?? "", sort: r.sort, logoMediaId: r.logoMediaId ?? null });
	}
	async function create() {
		if (!add.name.trim()) return;
		await trpcClient.adminPartners.create.mutate({ name: add.name, category: add.category, url: add.url, logoMediaId: add.logoMediaId, sort: rows.length });
		setAdd({ name: "", category: add.category, url: "", logoMediaId: null, logoUrl: null });
		refresh();
	}
	async function del(id: number) {
		if (!window.confirm("Delete partner?")) return;
		await trpcClient.adminPartners.delete.mutate({ id });
		setRows((rs) => rs.filter((r) => r.id !== id));
	}

	return (
		<div className="space-y-5">
			<h1 className="font-display text-2xl font-semibold text-primary">Partners</h1>

			<FormSection title="Add partner" description="Organisations KAPE collaborates with, shown on the Partners page.">
				<div className="flex flex-wrap items-end gap-3">
					<div className="flex-1 min-w-[180px]">
						<label className={fieldLabel}>Name</label>
						<input className={fieldInput} placeholder="e.g. UNICEF" value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} />
					</div>
					<div className="min-w-[180px]">
						<label className={fieldLabel}>Category</label>
						<select className={fieldInput} value={add.category} onChange={(e) => setAdd({ ...add, category: e.target.value })}>{cats.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
					</div>
					<div className="flex-1 min-w-[180px]">
						<label className={fieldLabel}>Website (optional)</label>
						<input className={fieldInput} placeholder="https://…" value={add.url} onChange={(e) => setAdd({ ...add, url: e.target.value })} />
					</div>
					<div>
						<label className={fieldLabel}>Logo</label>
						<MediaThumb value={add.logoMediaId} url={add.logoUrl} onChange={(id, url) => setAdd({ ...add, logoMediaId: id, logoUrl: url })} />
					</div>
					<button type="button" onClick={create} className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 transition">Add</button>
				</div>
			</FormSection>

			<div className="overflow-hidden rounded-xl border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
						<tr><th className="px-2 py-2.5">Logo</th><th className="px-2 py-2.5">Name</th><th className="px-2 py-2.5">Category</th><th className="px-2 py-2.5">URL</th><th className="px-3 py-2.5 text-right">Actions</th></tr>
					</thead>
					<tbody className="divide-y divide-border">
						{loading ? (
							<tr><td colSpan={5} className="px-3 py-4 text-muted-foreground">Loading…</td></tr>
						) : (
							rows.map((r) => (
								<tr key={r.id} className="hover:bg-muted/20">
									<td className="px-2"><MediaThumb value={r.logoMediaId} url={r.logoUrl} onChange={(id, url) => setLogo(r.id, id, url)} /></td>
									<td><input className={ci} value={r.name} onChange={(e) => patch(r.id, "name", e.target.value)} /></td>
									<td><select className={ci} value={r.category} onChange={(e) => patch(r.id, "category", e.target.value)}>{cats.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></td>
									<td><input className={ci} value={r.url ?? ""} onChange={(e) => patch(r.id, "url", e.target.value)} /></td>
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
