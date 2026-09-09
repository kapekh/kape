import { Link } from "@tanstack/react-router";
import { ChevronRight, Plus, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
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
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { toast } from "@/components/Dialogs";
import {
	FIELD_TYPES,
	type FormField,
	type FormFieldType,
	isFormClosed,
} from "@/lib/forms";
import {
	cancelButtonClass,
	dragGrip,
	dragItem,
	EditorGrid,
	EditorHeader,
	Field,
	FormSection,
} from "./form-ui";
import {
	defaultLanguage,
	type LangOpt,
	LangTabs,
	useLangText,
} from "./LangTabs";
import { RichTextEditor } from "./RichTextEditor";
import { useDirtyGuard } from "./useDirty";
import { useFieldErrors } from "./useFieldErrors";

type SlugStatus = "idle" | "checking" | "available" | "taken";
type FormStatus = "active" | "draft";

const FORM_FIELDS = [
	"title",
	"intro",
	"submitLabel",
	"successMessage",
] as const;
type FormText = Record<(typeof FORM_FIELDS)[number], string>;

export type { LangOpt } from "./LangTabs";

export type FormBuilderValue = {
	slug: string;
	status: FormStatus;
	fields: FormField[];
	deadline: string | null;
	notifyEmail: string | null;
	translations: ({ lang: string } & FormText)[];
};

type Initial =
	| (Omit<FormBuilderValue, "status" | "translations"> & {
			status: string;
			id?: number;
			translations?: Record<string, Partial<FormText>>;
	  })
	| null;

type EditorField = FormField & { rid: string };

const slugify = (s: string) =>
	s
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");

/** Keystroke-safe: keeps the separator you just typed, so a slug can be typed out. */
const slugAsTyped = (s: string) => s.toLowerCase().replace(/[^a-z0-9_]+/g, "_");

const ROW_BUTTON =
	"grid size-9 shrink-0 place-items-center rounded-lg text-admin-ink-muted transition-colors duration-150 ease-out hover:bg-admin-accent-soft hover:text-admin-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50 disabled:cursor-not-allowed disabled:opacity-40";

export function FormBuilder({
	initial,
	languages,
	onSubmit,
	saving,
	title,
}: {
	initial: Initial;
	languages: LangOpt[];
	onSubmit: (v: FormBuilderValue) => void;
	saving?: boolean;
	title: string;
}) {
	const [slug, setSlug] = useState(initial?.slug ?? "");
	const [status, setStatus] = useState<FormStatus>(
		initial?.status === "draft" ? "draft" : "active",
	);
	const {
		text: trans,
		setText,
		toTranslations,
	} = useLangText(languages, FORM_FIELDS, initial?.translations);
	const [notifyEmail, setNotifyEmail] = useState(initial?.notifyEmail ?? "");
	const [deadline, setDeadline] = useState(initial?.deadline ?? "");
	// `rid` is the row's identity while it is edited: a field's own key is empty
	// until it is named, and the list reorders. Stripped before the form is saved.
	const [fields, setFields] = useState<EditorField[]>(() =>
		(initial?.fields ?? []).map((f) => ({ ...f, rid: crypto.randomUUID() })),
	);
	// which field's settings are open; a builder that shows every field's settings
	// at once is a wall, and only one field is ever being edited
	const [openField, setOpenField] = useState<string | null>(null);
	const { errors, invalid } = useFieldErrors();
	const uid = useId();

	const defaultLang = defaultLanguage(languages)?.code;
	const defaultTitle = defaultLang ? (trans[defaultLang]?.title ?? "") : "";

	// Live slug-availability check (the effective slug is what will be saved).
	const effectiveSlug = slugify(slug) || slugify(defaultTitle);
	const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
	useEffect(() => {
		if (!effectiveSlug) {
			setSlugStatus("idle");
			return;
		}
		setSlugStatus("checking");
		let alive = true;
		const t = setTimeout(() => {
			trpcClient.adminForms.slugAvailable
				.query({ slug: effectiveSlug, excludeId: initial?.id })
				.then((ok) => alive && setSlugStatus(ok ? "available" : "taken"))
				.catch(() => alive && setSlugStatus("idle"));
		}, 350);
		return () => {
			alive = false;
			clearTimeout(t);
		};
	}, [effectiveSlug, initial?.id]);

	const setField = (i: number, patch: Partial<FormField>) =>
		setFields((fs) => fs.map((f, n) => (n === i ? { ...f, ...patch } : f)));
	const removeField = (rid: string) => {
		setFields((fs) => fs.filter((f) => f.rid !== rid));
		setOpenField((cur) => (cur === rid ? null : cur));
	};
	const addField = () => {
		const rid = crypto.randomUUID();
		setFields((fs) => [...fs, { rid, key: "", label: "", type: "text" }]);
		setOpenField(rid);
	};
	const sortable = useSortableArray({
		items: fields,
		id: (f) => f.rid,
		describe: (f) => f.label.trim() || "untitled field",
		onReorder: setFields,
	});

	function submit(e: React.FormEvent) {
		e.preventDefault();
		if (slugStatus === "taken") {
			toast("That form name is already taken. Pick a different one.", "error");
			return;
		}
		const cleaned = fields
			.map(({ rid: _rid, ...f }, idx) => {
				const options = f.options
					?.map((o) => o.trim())
					.filter(Boolean)
					.filter((o, n, all) => all.indexOf(o) === n);
				return f.type === "content"
					? {
							...f,
							key: f.key?.trim() || `content_${idx}`,
							label: f.label?.trim() || "Content block",
						}
					: {
							...f,
							...(options ? { options } : {}),
							key: f.key.trim() || slugify(f.label) || `${f.type}_${idx}`,
							label: f.label.trim(),
						};
			})
			// Content blocks survive on their content; everything else needs a label
			// (sections carry no key of their own use, but stay keyed for React).
			.filter((f) =>
				f.type === "content" ? !!f.content?.trim() : f.key && f.label,
			);

		// Field keys are submission columns — they MUST be unique, or two fields
		// collide (overwriting each other's answers + duplicate React keys).
		const seen = new Set<string>();
		for (const f of cleaned) {
			let k = f.key;
			let n = 2;
			while (seen.has(k)) k = `${f.key}_${n++}`;
			seen.add(k);
			f.key = k;
		}
		onSubmit({
			slug: effectiveSlug,
			status,
			fields: cleaned,
			deadline: deadline || null,
			notifyEmail: notifyEmail || null,
			translations: toTranslations(),
		});
	}

	const dirty = useDirtyGuard(
		JSON.stringify({
			slug,
			status,
			trans,
			notifyEmail,
			deadline,
			fields,
		}),
	);

	return (
		<form onSubmit={submit}>
			<EditorHeader
				title={title}
				saving={saving}
				saveLabel="Save form"
				dirty={dirty}
			>
				<Link to="/admin/forms" className={cancelButtonClass}>
					Cancel
				</Link>
			</EditorHeader>
			<EditorGrid
				main={
					<div className="space-y-5">
						<FormSection
							title="Form"
							description="Shown to visitors above the fields, each in its own language. Switch languages with the tabs — your text is kept as you switch."
						>
							<div className="space-y-6">
								<LangTabs languages={languages}>
									{(l) => (
										<div className="space-y-6">
											<Field
												label="Title"
												required={l.code === defaultLang}
												error={errors.title}
											>
												{(p) => (
													<Input
														{...p}
														{...invalid("title")}
														className={
															l.code === "km" ? "font-khmer" : undefined
														}
														value={trans[l.code]?.title ?? ""}
														onChange={(e) =>
															setText(l.code, "title", e.target.value)
														}
														placeholder="Alumni registration"
													/>
												)}
											</Field>
											<Field label="Intro">
												{(p) => (
													<Textarea
														{...p}
														rows={2}
														className={
															l.code === "km" ? "font-khmer" : undefined
														}
														value={trans[l.code]?.intro ?? ""}
														onChange={(e) =>
															setText(l.code, "intro", e.target.value)
														}
													/>
												)}
											</Field>
										</div>
									)}
								</LangTabs>
								<Field
									label="Form name"
									error={
										slugStatus === "taken"
											? `“${effectiveSlug}” is already taken. Choose another.`
											: null
									}
									hint={
										slugStatus === "checking"
											? "Checking availability…"
											: slugStatus === "available"
												? `“${effectiveSlug}” is available`
												: "A unique name for this form, filled in from the title if you leave it blank."
									}
								>
									{(p) => (
										<Input
											{...p}
											className="font-mono"
											value={slug}
											onChange={(e) => setSlug(slugAsTyped(e.target.value))}
											placeholder="alumni"
										/>
									)}
								</Field>
							</div>
						</FormSection>

						<FormSection
							title="Fields"
							description="The questions visitors answer. Open one to change it, drag a grip to reorder."
						>
							<div className="space-y-2">
								<SortableStatus status={sortable.status} />
								{fields.length === 0 && (
									<p className="text-[13px] text-admin-ink-muted">
										No fields yet. Add the first one below.
									</p>
								)}
								{sortable.items.map((f, i) => {
									const open = openField === f.rid;
									const panelId = `${uid}-field-${f.rid}`;
									const grip = sortable.grip(f);
									const typeLabel =
										FIELD_TYPES.find((t) => t.value === f.type)?.label ??
										f.type;
									const named =
										f.label.trim() ||
										(f.type === "content" ? "Content block" : "Untitled field");
									return (
										<div
											key={f.rid}
											{...sortable.itemProps(f)}
											className={`overflow-hidden rounded-lg border ${dragItem} ${f.type === "section" ? "border-admin-accent/40 bg-admin-accent-soft" : "border-admin-border bg-admin-panel"}`}
										>
											<div className="flex items-center gap-1 pr-2">
												<button
													type="button"
													onClick={() => setOpenField(open ? null : f.rid)}
													aria-expanded={open}
													aria-controls={panelId}
													className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 ease-out hover:bg-admin-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
												>
													<ChevronRight
														aria-hidden="true"
														className={`size-4 shrink-0 text-admin-ink-subtle transition-transform duration-200 ${open ? "rotate-90" : ""}`}
													/>
													<span className="min-w-0 flex-1 truncate text-sm text-admin-ink">
														{named}
														{f.required && (
															<span
																aria-hidden="true"
																className="ml-0.5 text-admin-danger-ink"
															>
																*
															</span>
														)}
													</span>
													<span className="shrink-0 text-[13px] text-admin-ink-muted">
														{typeLabel}
													</span>
												</button>
												{grip ? (
													<DragHandle {...grip} className={dragGrip} />
												) : null}
												<button
													type="button"
													aria-label={`Remove ${named}`}
													className={`${ROW_BUTTON} hover:text-admin-danger-ink`}
													onClick={() => removeField(f.rid)}
												>
													<X aria-hidden="true" className="size-4" />
												</button>
											</div>
											{open && (
												<div
													id={panelId}
													className="space-y-4 border-t border-admin-border p-3"
												>
													<div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)]">
														<Field
															label={
																f.type === "content"
																	? "Block name (internal)"
																	: f.type === "section"
																		? "Section title"
																		: "Field label"
															}
														>
															{(p) => (
																<Input
																	{...p}
																	value={f.label}
																	placeholder={
																		f.type === "content"
																			? "Optional"
																			: f.type === "section"
																				? "e.g. Personal information"
																				: "e.g. Full name"
																	}
																	// the key derives at save, not per keystroke, so submissions survive a reworded label
																	onChange={(e) =>
																		setField(i, { label: e.target.value })
																	}
																/>
															)}
														</Field>
														<Field label="Type">
															{(p) => (
																<Select
																	value={f.type}
																	onValueChange={(v) =>
																		setField(i, { type: v as FormFieldType })
																	}
																>
																	<SelectTrigger
																		id={p.id}
																		aria-label={`Type of ${named}`}
																		className="w-full"
																	>
																		<SelectValue />
																	</SelectTrigger>
																	<SelectContent>
																		{FIELD_TYPES.map((t) => (
																			<SelectItem key={t.value} value={t.value}>
																				{t.label}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															)}
														</Field>
													</div>
													{f.type === "content" ? (
														<div>
															<p className="mb-1.5 text-[13px] text-admin-ink-muted">
																Formatted text shown to visitors between
																questions: instructions, a section intro. Not an
																input.
															</p>
															<RichTextEditor
																value={f.content ?? ""}
																onChange={(json) =>
																	setField(i, { content: json })
																}
															/>
														</div>
													) : f.type === "section" ? (
														<>
															<p className="text-[13px] text-admin-ink-muted">
																A numbered heading. Fields below it, up to the
																next section, are grouped under it.
															</p>
															<Field label="Section title (Khmer)">
																{(p) => (
																	<Input
																		{...p}
																		className="font-khmer"
																		value={f.labelKm ?? ""}
																		onChange={(e) =>
																			setField(i, { labelKm: e.target.value })
																		}
																	/>
																)}
															</Field>
														</>
													) : (
														<>
															<label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-admin-border p-3 transition-colors duration-150 ease-out hover:bg-admin-panel-raised">
																<input
																	type="checkbox"
																	checked={!!f.required}
																	onChange={(e) =>
																		setField(i, { required: e.target.checked })
																	}
																	className="mt-0.5 h-4 w-4 rounded border-admin-border accent-[var(--admin-accent)]"
																/>
																<span className="text-sm text-admin-ink">
																	Required. A visitor cannot submit without it
																</span>
															</label>
															{f.type !== "richtext" &&
																f.type !== "checkboxes" && (
																	<Field label="Placeholder (optional)">
																		{(p) => (
																			<Input
																				{...p}
																				value={f.placeholder ?? ""}
																				onChange={(e) =>
																					setField(i, {
																						placeholder: e.target.value,
																					})
																				}
																			/>
																		)}
																	</Field>
																)}
															<Field label="Label (Khmer)">
																{(p) => (
																	<Input
																		{...p}
																		className="font-khmer"
																		value={f.labelKm ?? ""}
																		onChange={(e) =>
																			setField(i, { labelKm: e.target.value })
																		}
																	/>
																)}
															</Field>
															{(f.type === "select" ||
																f.type === "checkboxes") && (
																<Field
																	label="Options"
																	hint="One line's worth, separated by commas."
																>
																	{(p) => (
																		<Input
																			{...p}
																			// no trim here: it ate the comma you just typed; options are cleaned at save
																			value={(f.options ?? []).join(",")}
																			placeholder="Yes,No,Maybe"
																			onChange={(e) =>
																				setField(i, {
																					options: e.target.value.split(","),
																				})
																			}
																		/>
																	)}
																</Field>
															)}
														</>
													)}
												</div>
											)}
										</div>
									);
								})}
								<button
									type="button"
									onClick={addField}
									className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-admin-accent-ink transition-colors duration-150 ease-out hover:bg-admin-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
								>
									<Plus aria-hidden="true" className="size-4" />
									Add field
								</button>
							</div>
						</FormSection>
					</div>
				}
				aside={
					<div className="space-y-5">
						<FormSection title="Availability">
							<div className="space-y-6">
								<Field label="Status">
									{(p) => (
										<Select
											value={status}
											onValueChange={(v) => setStatus(v as FormStatus)}
										>
											<SelectTrigger
												id={p.id}
												aria-label="Status"
												className="w-full"
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="active">
													Active, accepting responses
												</SelectItem>
												<SelectItem value="draft">Draft, hidden</SelectItem>
											</SelectContent>
										</Select>
									)}
								</Field>
								<Field
									label="Deadline (optional)"
									hint={
										deadline
											? isFormClosed(deadline)
												? "This date has passed, so the form is closed to new responses."
												: "Closes at the end of this day. After that it stops accepting responses."
											: "Leave empty to stay open indefinitely."
									}
								>
									{(p) => (
										<Input
											{...p}
											type="date"
											value={deadline}
											onChange={(e) => setDeadline(e.target.value)}
										/>
									)}
								</Field>
							</div>
						</FormSection>
						<FormSection
							title="After submit"
							description="The button and the thank-you, each in its own language."
						>
							<div className="space-y-6">
								<LangTabs languages={languages}>
									{(l) => (
										<div className="space-y-6">
											<Field label="Submit button label">
												{(p) => (
													<Input
														{...p}
														className={
															l.code === "km" ? "font-khmer" : undefined
														}
														value={trans[l.code]?.submitLabel ?? ""}
														onChange={(e) =>
															setText(l.code, "submitLabel", e.target.value)
														}
														placeholder="Submit"
													/>
												)}
											</Field>
											<Field label="Success message">
												{(p) => (
													<Textarea
														{...p}
														rows={3}
														className={
															l.code === "km" ? "font-khmer" : undefined
														}
														value={trans[l.code]?.successMessage ?? ""}
														onChange={(e) =>
															setText(l.code, "successMessage", e.target.value)
														}
														placeholder="Thank you, your response has been recorded."
													/>
												)}
											</Field>
										</div>
									)}
								</LangTabs>
								<Field label="Notify email (optional)">
									{(p) => (
										<Input
											{...p}
											value={notifyEmail}
											onChange={(e) => setNotifyEmail(e.target.value)}
											placeholder="team@example.org"
										/>
									)}
								</Field>
							</div>
						</FormSection>
					</div>
				}
			/>
		</form>
	);
}
