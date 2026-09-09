import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
import {
	DragHandle,
	SortableStatus,
	useSortableArray,
} from "#/components/ui/sortable.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import {
	cancelButtonClass,
	dragGrip,
	dragItem,
	EditorGrid,
	EditorHeader,
	Field,
	FormSection,
	fieldLabel,
} from "./form-ui";
import { LangTabs, useLangText } from "./LangTabs";
import { MapField } from "./MapField";
import { MediaPicker } from "./MediaPicker";
import type { LangOpt } from "./PostForm";
import { RichTextEditor } from "./RichTextEditor";
import { useDirtyGuard } from "./useDirty";
import { useFieldErrors } from "./useFieldErrors";
import { useModules } from "./useModules";

const PROJECT_FIELDS = ["name", "summary", "body"] as const;

export type DonorOpt = { id: number; name: string };
export type ParentOpt = { id: number; name: string };

/** URLs nest one level, so only a top-level project can be a parent. */
export function parentOptions(
	rows: { id: number; parentId: number | null; name: string }[],
	selfId: number | null,
): ParentOpt[] {
	return rows
		.filter((r) => r.parentId == null && r.id !== selfId)
		.map((r) => ({ id: r.id, name: r.name }));
}
export type ProjectStatus = "current" | "past";

// radix rejects "" as an item value
const NO_PARENT = "none";
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
	parentId: number | null;
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
	parentId: number | null;
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
	parents,
	onSubmit,
	saving,
	title,
	savedAt,
}: {
	initial: Initial;
	languages: LangOpt[];
	donors: DonorOpt[];
	parents: ParentOpt[];
	onSubmit: (v: ProjectFormValue) => void;
	saving?: boolean;
	title: string;
	savedAt?: string | null;
}) {
	const modules = useModules();
	const uid = useId();
	const [code, setCode] = useState(initial?.code ?? "");
	const [slug, setSlug] = useState(initial?.slug ?? "");
	const [status, setStatus] = useState<ProjectStatus>(
		(initial?.status as ProjectStatus) ?? "current",
	);
	const [parentId, setParentId] = useState<number | null>(
		initial?.parentId ?? null,
	);
	const [donorIds, setDonorIds] = useState<number[]>(initial?.donorIds ?? []);
	// a row's identity is its own, not its index: removing the first one must not
	// hand its React state to the second
	const [locations, setLocations] = useState<
		(ProjectLocation & { key: string })[]
	>(() => (initial?.locations ?? []).map((l, i) => ({ ...l, key: `l${i}` })));
	const [startDate, setStartDate] = useState(initial?.startDate ?? "");
	const [endDate, setEndDate] = useState(initial?.endDate ?? "");
	const [targetAreas, setTargetAreas] = useState(
		(initial?.targetAreas ?? []).join("\n"),
	);
	const [snapshots, setSnapshots] = useState<(Snapshot & { key: string })[]>(
		() => (initial?.snapshots ?? []).map((s, i) => ({ ...s, key: `s${i}` })),
	);
	const {
		text: trans,
		setText: setField,
		toTranslations,
	} = useLangText(languages, PROJECT_FIELDS, initial?.translations);
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
	const sortableLocations = useSortableArray({
		items: locations,
		id: (l) => l.key,
		describe: (l) => l.schoolName.trim() || "unnamed site",
		onReorder: setLocations,
	});
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
			parentId,
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
			translations: toTranslations(),
			donorIds,
			locations: locations
				.filter((l) => l.lat && l.lng)
				.map(({ key: _key, ...l }) => l),
		});
	}

	const { errors, invalid } = useFieldErrors();

	const dirty = useDirtyGuard(
		JSON.stringify({
			code,
			slug,
			parentId,
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
									<div className="space-y-6">
										<Field label="Name">
											{(p) => (
												<Input
													{...p}
													className={l.code === "km" ? "font-khmer" : undefined}
													value={trans[l.code]?.name ?? ""}
													onChange={(e) =>
														setField(l.code, "name", e.target.value)
													}
												/>
											)}
										</Field>
										<Field
											label="Summary"
											hint="One or two sentences, shown on the projects list."
										>
											{(p) => (
												<Textarea
													{...p}
													className={l.code === "km" ? "font-khmer" : undefined}
													rows={2}
													value={trans[l.code]?.summary ?? ""}
													onChange={(e) =>
														setField(l.code, "summary", e.target.value)
													}
												/>
											)}
										</Field>
										<div>
											<span
												id={`${uid}-body-${l.code}-label`}
												className={fieldLabel}
											>
												Body
											</span>
											<RichTextEditor
												ariaLabelledBy={`${uid}-body-${l.code}-label`}
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
							<div className="space-y-3">
								<SortableStatus status={sortableLocations.status} />
								{sortableLocations.items.map((l, i) => {
									const grip = sortableLocations.grip(l);
									return (
										<div
											key={l.key}
											{...sortableLocations.itemProps(l)}
											className={`flex flex-wrap items-center gap-2 rounded-lg ${dragItem}`}
										>
											{grip ? (
												<DragHandle {...grip} className={dragGrip} />
											) : null}
											<Input
												className="max-w-[260px]"
												aria-label={`Site ${i + 1} name`}
												placeholder="School / site name"
												value={l.schoolName}
												onChange={(e) =>
													setLoc(i, "schoolName", e.target.value)
												}
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
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="text-admin-danger-ink"
												onClick={() =>
													setLocations((ls) => ls.filter((_, j) => j !== i))
												}
											>
												Remove
											</Button>
										</div>
									);
								})}
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={() =>
										setLocations((ls) => [
											...ls,
											{
												schoolName: "",
												lat: "",
												lng: "",
												photoMediaId: null,
												key: crypto.randomUUID(),
											},
										])
									}
								>
									+ Add location
								</Button>
							</div>
						</FormSection>

						<FormSection
							split
							title="Target areas"
							description="Provinces or districts this project works in. One per line."
						>
							<Textarea
								aria-label="Target areas, one per line"
								rows={4}
								value={targetAreas}
								onChange={(e) => setTargetAreas(e.target.value)}
								placeholder={"Kampong Cham\nTboung Khmum"}
							/>
						</FormSection>

						<FormSection
							split
							title="Snapshot figures"
							description="Headline numbers shown as tiles on the project page."
						>
							<div className="space-y-3">
								{snapshots.map((s, i) => (
									<div
										key={s.key}
										className="flex flex-wrap items-center gap-2"
									>
										<Input
											className="max-w-[140px]"
											aria-label={`Figure ${i + 1} value`}
											placeholder="385+"
											value={s.value}
											onChange={(e) => setSnapshot(i, "value", e.target.value)}
										/>
										<Input
											className="max-w-[260px]"
											aria-label={`Figure ${i + 1} label`}
											placeholder="schools reached"
											value={s.label}
											onChange={(e) => setSnapshot(i, "label", e.target.value)}
										/>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="text-admin-danger-ink"
											onClick={() =>
												setSnapshots((ss) => ss.filter((_, j) => j !== i))
											}
										>
											Remove
										</Button>
									</div>
								))}
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={() =>
										setSnapshots((ss) => [
											...ss,
											{ value: "", label: "", key: crypto.randomUUID() },
										])
									}
								>
									+ Add figure
								</Button>
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
							<div className="space-y-6">
								<Field
									label="Code"
									required
									hint="Short identifier, used in reports."
									error={errors.code}
								>
									{(p) => (
										<Input
											{...p}
											{...invalid("code")}
											value={code}
											onChange={(e) => setCode(e.target.value)}
											placeholder="NGS"
										/>
									)}
								</Field>
								<Field
									label="Slug"
									required
									hint="The last part of the project's web address."
									error={errors.slug}
								>
									{(p) => (
										<Input
											{...p}
											{...invalid("slug")}
											value={slug}
											onChange={(e) => setSlug(e.target.value)}
											placeholder="ngs"
										/>
									)}
								</Field>
								<Field
									label="Parent project"
									hint="Makes this a sub-project, served at /projects/<parent>/<slug>."
								>
									{(p) => (
										<Select
											value={parentId == null ? NO_PARENT : String(parentId)}
											onValueChange={(v) =>
												setParentId(v === NO_PARENT ? null : Number(v))
											}
										>
											<SelectTrigger
												id={p.id}
												aria-label="Parent project"
												className="w-full"
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={NO_PARENT}>
													None — a top-level project
												</SelectItem>
												{parents.map((o) => (
													<SelectItem key={o.id} value={String(o.id)}>
														{o.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								</Field>
								<Field label="Status">
									{(p) => (
										<Select
											value={status}
											onValueChange={(v) => setStatus(v as ProjectStatus)}
										>
											<SelectTrigger
												id={p.id}
												aria-label="Status"
												className="w-full"
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="current">Current</SelectItem>
												<SelectItem value="past">Past</SelectItem>
											</SelectContent>
										</Select>
									)}
								</Field>
								<div>
									<label className={fieldLabel} htmlFor="project-start-date">
										Start date
									</label>
									<Input
										id="project-start-date"
										type="date"
										value={startDate}
										onChange={(e) => setStartDate(e.target.value)}
									/>
								</div>
								<div>
									<label className={fieldLabel} htmlFor="project-end-date">
										End date
									</label>
									<Input
										id="project-end-date"
										type="date"
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
							{/* own scrollport: a long register left its last donors below a pinned rail */}
							<div className="max-h-80 space-y-3 overflow-y-auto overscroll-contain">
								{donors.length === 0 ? (
									<span className="text-[13px] text-admin-ink-muted">
										{modules.has("fundraising")
											? "No donors yet — add some under Admin → Donors."
											: "This site does not keep a donor register. Turn on Campaigns, donations and donors under Admin → Modules to credit funders here."}
									</span>
								) : (
									donors.map((d) => (
										<label
											key={d.id}
											className="flex min-h-6 cursor-pointer items-center gap-2.5 text-sm text-admin-ink"
										>
											<input
												type="checkbox"
												className="size-4 rounded border-admin-border accent-[var(--admin-accent)]"
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
