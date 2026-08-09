import { Link } from "@tanstack/react-router";
import { useState } from "react";

import {
	cancelButtonClass,
	EditorGrid,
	EditorHeader,
	FormSection,
	fieldInput,
	fieldLabel,
} from "./form-ui";
import { LangTabs } from "./LangTabs";
import { MapField } from "./MapField";
import { MediaPicker } from "./MediaPicker";
import type { LangOpt } from "./PostForm";
import { RichTextEditor } from "./RichTextEditor";
import { useDirtyGuard } from "./useDirty";
import { useModules } from "./useModules";

export type DonorOpt = { id: number; name: string };
export type ProjectStatus = "current" | "past";
export type Snapshot = { value: string; label: string };
export type ProjectLocation = {
	schoolName: string;
	lat: string;
	lng: string;
	photoMediaId: number | null;
};
export type ProjectFormValue = {
	code: string;
	slug: string;
	status: ProjectStatus;
	sort: number;
	startDate: string;
	endDate: string;
	targetAreas: string[];
	snapshots: Snapshot[];
	translations: { lang: string; name: string; summary: string; body: string }[];
	donorIds: number[];
	locations: ProjectLocation[];
};

type Initial = {
	code: string;
	slug: string;
	status: string;
	sort: number;
	startDate: string;
	endDate: string;
	targetAreas: string[];
	snapshots: Snapshot[];
	translations: Record<string, Record<string, string>>;
	donorIds: number[];
	locations: ProjectLocation[];
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
	const modules = useModules();
	const [code, setCode] = useState(initial?.code ?? "");
	const [slug, setSlug] = useState(initial?.slug ?? "");
	const [status, setStatus] = useState<ProjectStatus>(
		(initial?.status as ProjectStatus) ?? "current",
	);
	const [donorIds, setDonorIds] = useState<number[]>(initial?.donorIds ?? []);
	const [locations, setLocations] = useState(initial?.locations ?? []);
	const [startDate, setStartDate] = useState(initial?.startDate ?? "");
	const [endDate, setEndDate] = useState(initial?.endDate ?? "");
	const [targetAreas, setTargetAreas] = useState(
		(initial?.targetAreas ?? []).join("\n"),
	);
	const [snapshots, setSnapshots] = useState<(Snapshot & { key: string })[]>(
		() => (initial?.snapshots ?? []).map((s, i) => ({ ...s, key: `s${i}` })),
	);
	const [trans, setTrans] = useState<
		Record<string, { name: string; summary: string; body: string }>
	>(() => {
		const t: Record<string, { name: string; summary: string; body: string }> =
			{};
		for (const l of languages) {
			const e = initial?.translations[l.code] ?? {};
			t[l.code] = {
				name: e.name ?? "",
				summary: e.summary ?? "",
				body: e.body ?? "",
			};
		}
		return t;
	});

	function setField(
		lang: string,
		field: "name" | "summary" | "body",
		value: string,
	) {
		setTrans((prev) => ({
			...prev,
			[lang]: { ...prev[lang], [field]: value },
		}));
	}
	function toggleDonor(id: number) {
		setDonorIds((ids) =>
			ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
		);
	}
	function setLoc<K extends keyof ProjectLocation>(
		i: number,
		field: K,
		value: ProjectLocation[K],
	) {
		setLocations((ls) =>
			ls.map((l, j) => (j === i ? { ...l, [field]: value } : l)),
		);
	}
	function setSnapshot(i: number, field: keyof Snapshot, value: string) {
		setSnapshots((ss) =>
			ss.map((s, j) => (j === i ? { ...s, [field]: value } : s)),
		);
	}
	function submit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit({
			code,
			slug,
			status,
			sort: initial?.sort ?? 0,
			startDate,
			endDate,
			targetAreas: targetAreas
				.split("\n")
				.map((a) => a.trim())
				.filter(Boolean),
			snapshots: snapshots
				.filter((s) => s.value.trim() && s.label.trim())
				.map((s) => ({ value: s.value, label: s.label })),
			translations: languages.map((l) => ({ lang: l.code, ...trans[l.code] })),
			donorIds,
			locations: locations.filter((l) => l.lat && l.lng),
		});
	}

	const dirty = useDirtyGuard(
		JSON.stringify({
			code,
			slug,
			status,
			donorIds,
			locations,
			trans,
			startDate,
			endDate,
			targetAreas,
			snapshots,
		}),
		savedAt,
	);

	return (
		<form onSubmit={submit}>
			<EditorHeader
				title={title}
				saving={saving}
				savedAt={savedAt}
				saveLabel="Save project"
				dirty={dirty}
			>
				<Link to="/admin/projects" className={cancelButtonClass}>
					Cancel
				</Link>
			</EditorHeader>
			<EditorGrid
				main={
					<>
						<FormSection
							title="Content"
							description="Project name and description. Switch languages with the tabs — your text is kept as you switch."
						>
							<LangTabs languages={languages}>
								{(l) => (
									<div className="space-y-4">
										<label className="block">
											<span className={fieldLabel}>Name</span>
											<input
												className={`${fieldInput} ${l.code === "km" ? "font-khmer" : ""}`}
												value={trans[l.code]?.name ?? ""}
												onChange={(e) =>
													setField(l.code, "name", e.target.value)
												}
											/>
										</label>
										<label className="block">
											<span className={fieldLabel}>Summary</span>
											<textarea
												className={`${fieldInput} ${l.code === "km" ? "font-khmer" : ""}`}
												rows={2}
												value={trans[l.code]?.summary ?? ""}
												onChange={(e) =>
													setField(l.code, "summary", e.target.value)
												}
											/>
										</label>
										<div>
											<label className={fieldLabel}>Body</label>
											<RichTextEditor
												value={trans[l.code]?.body ?? ""}
												onChange={(v) => setField(l.code, "body", v)}
											/>
										</div>
									</div>
								)}
							</LangTabs>
						</FormSection>

						<FormSection
							title="Map locations"
							description="Sites shown for this project on the About-page map."
						>
							<div className="space-y-2">
								{locations.map((l, i) => (
									<div key={i} className="flex flex-wrap gap-2 items-center">
										<input
											className={`${fieldInput} max-w-[260px]`}
											placeholder="School / site name"
											value={l.schoolName}
											onChange={(e) => setLoc(i, "schoolName", e.target.value)}
										/>
										<MapField
											lat={l.lat}
											lng={l.lng}
											label={l.schoolName || "site location"}
											onChange={(la, ln) => {
												setLoc(i, "lat", la);
												setLoc(i, "lng", ln);
											}}
										/>
										<div className="w-24">
											<MediaPicker
												mode="id"
												kind="image"
												aspect="square"
												label="Photo"
												value={
													l.photoMediaId != null ? String(l.photoMediaId) : ""
												}
												onChange={(v) =>
													setLoc(i, "photoMediaId", v ? Number(v) : null)
												}
											/>
										</div>
										<button
											type="button"
											onClick={() =>
												setLocations((ls) => ls.filter((_, j) => j !== i))
											}
											className="text-xs text-destructive hover:underline"
										>
											Remove
										</button>
									</div>
								))}
								<button
									type="button"
									onClick={() =>
										setLocations((ls) => [
											...ls,
											{ schoolName: "", lat: "", lng: "", photoMediaId: null },
										])
									}
									className="text-xs rounded border border-border px-3 py-1 hover:bg-muted"
								>
									+ Add location
								</button>
							</div>
						</FormSection>

						<FormSection
							title="Target areas"
							description="Provinces or districts this project works in. One per line."
						>
							<textarea
								className={fieldInput}
								rows={4}
								value={targetAreas}
								onChange={(e) => setTargetAreas(e.target.value)}
								placeholder={"Kampong Cham\nTboung Khmum"}
							/>
						</FormSection>

						<FormSection
							title="Snapshot figures"
							description="Headline numbers shown as tiles on the project page."
						>
							<div className="space-y-2">
								{snapshots.map((s, i) => (
									<div
										key={s.key}
										className="flex flex-wrap gap-2 items-center"
									>
										<input
											className={`${fieldInput} max-w-[140px]`}
											placeholder="385+"
											value={s.value}
											onChange={(e) => setSnapshot(i, "value", e.target.value)}
										/>
										<input
											className={`${fieldInput} max-w-[260px]`}
											placeholder="schools reached"
											value={s.label}
											onChange={(e) => setSnapshot(i, "label", e.target.value)}
										/>
										<button
											type="button"
											onClick={() =>
												setSnapshots((ss) => ss.filter((_, j) => j !== i))
											}
											className="text-xs text-destructive hover:underline"
										>
											Remove
										</button>
									</div>
								))}
								<button
									type="button"
									onClick={() =>
										setSnapshots((ss) => [
											...ss,
											{ value: "", label: "", key: crypto.randomUUID() },
										])
									}
									className="text-xs rounded border border-border px-3 py-1 hover:bg-muted"
								>
									+ Add figure
								</button>
							</div>
						</FormSection>
					</>
				}
				aside={
					<>
						<FormSection
							title="Project details"
							description="Code, slug and lifecycle."
						>
							<div className="space-y-4">
								<label className="block">
									<span className={fieldLabel}>Code</span>
									<input
										className={fieldInput}
										value={code}
										onChange={(e) => setCode(e.target.value)}
										placeholder="NGS"
										required
									/>
								</label>
								<label className="block">
									<span className={fieldLabel}>Slug</span>
									<input
										className={fieldInput}
										value={slug}
										onChange={(e) => setSlug(e.target.value)}
										placeholder="ngs"
										required
									/>
								</label>
								<label className="block">
									<span className={fieldLabel}>Status</span>
									<select
										className={fieldInput}
										value={status}
										onChange={(e) => setStatus(e.target.value as ProjectStatus)}
									>
										<option value="current">Current</option>
										<option value="past">Past</option>
									</select>
								</label>
								<div>
									<label className={fieldLabel} htmlFor="project-start-date">
										Start date
									</label>
									<input
										id="project-start-date"
										type="date"
										className={fieldInput}
										value={startDate}
										onChange={(e) => setStartDate(e.target.value)}
									/>
								</div>
								<div>
									<label className={fieldLabel} htmlFor="project-end-date">
										End date
									</label>
									<input
										id="project-end-date"
										type="date"
										className={fieldInput}
										value={endDate}
										onChange={(e) => setEndDate(e.target.value)}
									/>
								</div>
							</div>
						</FormSection>

						<FormSection
							title="Donors"
							description="Funders backing this project."
						>
							<div className="space-y-2.5">
								{donors.length === 0 ? (
									<span className="text-sm text-muted-foreground">
										{modules.has("fundraising")
											? "No donors yet — add some under Admin → Donors."
											: "This site does not keep a donor register. Turn on Campaigns, donations and donors under Admin → Modules to credit funders here."}
									</span>
								) : (
									donors.map((d) => (
										<label
											key={d.id}
											className="flex items-center gap-2 text-sm"
										>
											<input
												type="checkbox"
												checked={donorIds.includes(d.id)}
												onChange={() => toggleDonor(d.id)}
											/>{" "}
											{d.name}
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
