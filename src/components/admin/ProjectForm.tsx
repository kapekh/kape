import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { EditorGrid, EditorHeader, FormSection, cancelButtonClass, fieldInput, fieldLabel } from "./form-ui";
import type { LangOpt } from "./PostForm";
import { RichTextEditor } from "./RichTextEditor";

export type DonorOpt = { id: number; name: string };
export type ProjectStatus = "current" | "past";
export type ProjectFormValue = {
	code: string;
	slug: string;
	status: ProjectStatus;
	sort: number;
	translations: { lang: string; name: string; summary: string; body: string }[];
	donorIds: number[];
	locations: { schoolName: string; lat: string; lng: string }[];
};

type Initial = {
	code: string;
	slug: string;
	status: string;
	sort: number;
	translations: Record<string, Record<string, string>>;
	donorIds: number[];
	locations: { schoolName: string; lat: string; lng: string }[];
} | null;

export function ProjectForm({
	initial,
	languages,
	donors,
	onSubmit,
	saving,
	title,
	savedAt,
}: {
	initial: Initial;
	languages: LangOpt[];
	donors: DonorOpt[];
	onSubmit: (v: ProjectFormValue) => void;
	saving?: boolean;
	title: string;
	savedAt?: string | null;
}) {
	const [code, setCode] = useState(initial?.code ?? "");
	const [slug, setSlug] = useState(initial?.slug ?? "");
	const [status, setStatus] = useState<ProjectStatus>((initial?.status as ProjectStatus) ?? "current");
	const [donorIds, setDonorIds] = useState<number[]>(initial?.donorIds ?? []);
	const [locations, setLocations] = useState(initial?.locations ?? []);
	const [trans, setTrans] = useState<Record<string, { name: string; summary: string; body: string }>>(() => {
		const t: Record<string, { name: string; summary: string; body: string }> = {};
		for (const l of languages) {
			const e = initial?.translations[l.code] ?? {};
			t[l.code] = { name: e.name ?? "", summary: e.summary ?? "", body: e.body ?? "" };
		}
		return t;
	});

	function setField(lang: string, field: "name" | "summary" | "body", value: string) {
		setTrans((prev) => ({ ...prev, [lang]: { ...prev[lang], [field]: value } }));
	}
	function toggleDonor(id: number) {
		setDonorIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
	}
	function setLoc(i: number, field: "schoolName" | "lat" | "lng", value: string) {
		setLocations((ls) => ls.map((l, j) => (j === i ? { ...l, [field]: value } : l)));
	}
	function submit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit({
			code, slug, status, sort: initial?.sort ?? 0,
			translations: languages.map((l) => ({ lang: l.code, ...trans[l.code] })),
			donorIds,
			locations: locations.filter((l) => l.lat && l.lng),
		});
	}

	return (
		<form onSubmit={submit}>
			<EditorHeader title={title} saving={saving} savedAt={savedAt} saveLabel="Save project">
				<Link to="/admin/projects" className={cancelButtonClass}>Cancel</Link>
			</EditorHeader>
			<EditorGrid
				main={
					<>
						{languages.map((l) => (
							<FormSection key={l.code} title={`Content — ${l.name}`} description={`Project name and description in ${l.name} (${l.code}).`}>
								<div className="space-y-4">
									<div>
										<label className={fieldLabel}>Name</label>
										<input className={`${fieldInput} ${l.code === "km" ? "font-khmer" : ""}`} value={trans[l.code]?.name ?? ""} onChange={(e) => setField(l.code, "name", e.target.value)} />
									</div>
									<div>
										<label className={fieldLabel}>Summary</label>
										<textarea className={`${fieldInput} ${l.code === "km" ? "font-khmer" : ""}`} rows={2} value={trans[l.code]?.summary ?? ""} onChange={(e) => setField(l.code, "summary", e.target.value)} />
									</div>
									<div>
										<label className={fieldLabel}>Body</label>
										<RichTextEditor value={trans[l.code]?.body ?? ""} onChange={(v) => setField(l.code, "body", v)} />
									</div>
								</div>
							</FormSection>
						))}

						<FormSection title="Map locations" description="Sites shown for this project on the About-page map.">
							<div className="space-y-2">
								{locations.map((l, i) => (
									<div key={i} className="flex flex-wrap gap-2 items-center">
										<input className={`${fieldInput} max-w-[260px]`} placeholder="School / site name" value={l.schoolName} onChange={(e) => setLoc(i, "schoolName", e.target.value)} />
										<input className={`${fieldInput} max-w-[110px]`} placeholder="Lat" value={l.lat} onChange={(e) => setLoc(i, "lat", e.target.value)} />
										<input className={`${fieldInput} max-w-[110px]`} placeholder="Lng" value={l.lng} onChange={(e) => setLoc(i, "lng", e.target.value)} />
										<button type="button" onClick={() => setLocations((ls) => ls.filter((_, j) => j !== i))} className="text-xs text-destructive hover:underline">Remove</button>
									</div>
								))}
								<button type="button" onClick={() => setLocations((ls) => [...ls, { schoolName: "", lat: "", lng: "" }])} className="text-xs rounded border border-border px-3 py-1 hover:bg-muted">+ Add location</button>
							</div>
						</FormSection>
					</>
				}
				aside={
					<>
						<FormSection title="Project details" description="Code, slug and lifecycle.">
							<div className="space-y-4">
								<div>
									<label className={fieldLabel}>Code</label>
									<input className={fieldInput} value={code} onChange={(e) => setCode(e.target.value)} placeholder="NGS" required />
								</div>
								<div>
									<label className={fieldLabel}>Slug</label>
									<input className={fieldInput} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ngs" required />
								</div>
								<div>
									<label className={fieldLabel}>Status</label>
									<select className={fieldInput} value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
										<option value="current">Current</option>
										<option value="past">Past</option>
									</select>
								</div>
							</div>
						</FormSection>

						<FormSection title="Donors" description="Funders backing this project.">
							<div className="space-y-2.5">
								{donors.length === 0 ? (
									<span className="text-sm text-muted-foreground">No donors yet — add some under Admin → Donors.</span>
								) : (
									donors.map((d) => (
										<label key={d.id} className="flex items-center gap-2 text-sm">
											<input type="checkbox" checked={donorIds.includes(d.id)} onChange={() => toggleDonor(d.id)} /> {d.name}
										</label>
									))
								)}
							</div>
						</FormSection>
					</>
				}
			/>
		</form>
	);
}
