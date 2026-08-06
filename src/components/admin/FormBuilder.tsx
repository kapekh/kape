import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
	EditorGrid,
	EditorHeader,
	FormSection,
	fieldInput,
	fieldLabel,
} from "./form-ui";
import { RichTextEditor } from "./RichTextEditor";
import { useDirtyGuard } from "./useDirty";

type SlugStatus = "idle" | "checking" | "available" | "taken";

export type FormBuilderValue = {
	slug: string;
	status: "active" | "draft";
	title: string;
	titleKm: string | null;
	intro: string | null;
	introKm: string | null;
	fields: FormField[];
	deadline: string | null;
	submitLabel: string | null;
	successMessage: string | null;
	notifyEmail: string | null;
};

type Initial =
	| (Omit<FormBuilderValue, "status"> & { status: string; id?: number })
	| null;

const slugify = (s: string) =>
	s
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");

export function FormBuilder({
	initial,
	onSubmit,
	saving,
	title,
}: {
	initial: Initial;
	onSubmit: (v: FormBuilderValue) => void;
	saving?: boolean;
	title: string;
}) {
	const [slug, setSlug] = useState(initial?.slug ?? "");
	const [status, setStatus] = useState<"active" | "draft">(
		(initial?.status as any) ?? "active",
	);
	const [formTitle, setFormTitle] = useState(initial?.title ?? "");
	const [titleKm, setTitleKm] = useState(initial?.titleKm ?? "");
	const [intro, setIntro] = useState(initial?.intro ?? "");
	const [submitLabel, setSubmitLabel] = useState(initial?.submitLabel ?? "");
	const [successMessage, setSuccessMessage] = useState(
		initial?.successMessage ?? "",
	);
	const [notifyEmail, setNotifyEmail] = useState(initial?.notifyEmail ?? "");
	const [deadline, setDeadline] = useState(initial?.deadline ?? "");
	const [fields, setFields] = useState<FormField[]>(initial?.fields ?? []);

	// Live slug-availability check (the effective slug is what will be saved).
	const effectiveSlug = slug || slugify(formTitle);
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
	const move = (i: number, dir: -1 | 1) =>
		setFields((fs) => {
			const j = i + dir;
			if (j < 0 || j >= fs.length) return fs;
			const a = [...fs];
			[a[i], a[j]] = [a[j], a[i]];
			return a;
		});
	const addField = () =>
		setFields((fs) => [...fs, { key: "", label: "", type: "text" }]);

	function submit(e: React.FormEvent) {
		e.preventDefault();
		if (slugStatus === "taken") {
			toast("That form name is already taken — pick a different one.", "error");
			return;
		}
		const cleaned = fields
			.map((f, idx) =>
				f.type === "content"
					? {
							...f,
							key: f.key?.trim() || `content_${idx}`,
							label: f.label?.trim() || "Content block",
						}
					: {
							...f,
							key: f.key.trim() || slugify(f.label),
							label: f.label.trim(),
						},
			)
			// Content blocks survive on their content; input fields need a key + label.
			.filter((f) =>
				f.type === "content"
					? !!(f.content && f.content.trim())
					: f.key && f.label,
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
			slug: slug || slugify(formTitle),
			status,
			title: formTitle,
			titleKm: titleKm || null,
			intro: intro || null,
			introKm: null,
			fields: cleaned,
			deadline: deadline || null,
			submitLabel: submitLabel || null,
			successMessage: successMessage || null,
			notifyEmail: notifyEmail || null,
		});
	}

	const dirty = useDirtyGuard(
		JSON.stringify({
			slug,
			status,
			formTitle,
			titleKm,
			intro,
			submitLabel,
			successMessage,
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
							description="Shown to visitors above the fields."
						>
							<div className="space-y-4">
								<div className="grid sm:grid-cols-2 gap-4">
									<div>
										<label className={fieldLabel}>Title (EN)</label>
										<input
											className={fieldInput}
											value={formTitle}
											onChange={(e) => setFormTitle(e.target.value)}
											placeholder="Alumni registration"
											required
										/>
									</div>
									<div>
										<label className={fieldLabel}>Title (KM)</label>
										<input
											className={`${fieldInput} font-khmer`}
											value={titleKm}
											onChange={(e) => setTitleKm(e.target.value)}
										/>
									</div>
								</div>
								<div>
									<label className={fieldLabel}>Form name (unique)</label>
									<input
										className={`${fieldInput} font-mono ${slugStatus === "taken" ? "border-destructive focus:border-destructive" : ""}`}
										value={slug}
										onChange={(e) => setSlug(slugify(e.target.value))}
										placeholder="alumni"
									/>
									<p className="mt-1 text-xs">
										{slugStatus === "checking" ? (
											<span className="text-muted-foreground">
												Checking availability…
											</span>
										) : slugStatus === "available" ? (
											<span className="text-[var(--palm)]">
												✓ “{effectiveSlug}” is available
											</span>
										) : slugStatus === "taken" ? (
											<span className="text-destructive">
												✕ “{effectiveSlug}” is already taken — choose another
											</span>
										) : (
											<span className="text-muted-foreground">
												A unique name for this form (auto-filled from the
												title).
											</span>
										)}
									</p>
								</div>
								<div>
									<label className={fieldLabel}>Intro</label>
									<textarea
										className={fieldInput}
										rows={2}
										value={intro}
										onChange={(e) => setIntro(e.target.value)}
									/>
								</div>
							</div>
						</FormSection>

						<FormSection
							title="Fields"
							description="The questions visitors answer. Drag order with the arrows."
						>
							<div className="space-y-3">
								{fields.length === 0 && (
									<p className="text-sm text-muted-foreground">
										No fields yet — add the first one below.
									</p>
								)}
								{fields.map((f, i) => (
									<div
										key={i}
										className="rounded-xl border border-border bg-background/40 p-3"
									>
										<div className="flex items-center gap-2">
											<input
												className={`${fieldInput} flex-1 min-w-0`}
												value={f.label}
												placeholder={
													f.type === "content"
														? "Block name (internal, optional)"
														: "Field label (e.g. Full name)"
												}
												onChange={(e) =>
													setField(i, {
														label: e.target.value,
														key: f.key || slugify(e.target.value),
													})
												}
											/>
											<select
												className={`${fieldInput} basis-36 shrink-0`}
												value={f.type}
												onChange={(e) =>
													setField(i, { type: e.target.value as FormFieldType })
												}
											>
												{FIELD_TYPES.map((t) => (
													<option key={t.value} value={t.value}>
														{t.label}
													</option>
												))}
											</select>
											<button
												type="button"
												className="rounded-lg border border-border px-2 py-2 text-xs hover:bg-muted"
												disabled={i === 0}
												onClick={() => move(i, -1)}
											>
												↑
											</button>
											<button
												type="button"
												className="rounded-lg border border-border px-2 py-2 text-xs hover:bg-muted"
												disabled={i === fields.length - 1}
												onClick={() => move(i, 1)}
											>
												↓
											</button>
											<button
												type="button"
												className="rounded-lg border border-border px-2 py-2 text-xs text-destructive hover:bg-destructive/10"
												onClick={() =>
													setFields((fs) => fs.filter((_, n) => n !== i))
												}
											>
												✕
											</button>
										</div>
										{f.type === "content" ? (
											<div className="mt-2">
												<p className="mb-1.5 text-xs text-muted-foreground">
													Formatted text shown to visitors between questions
													(instructions, a section intro…). Not an input.
												</p>
												<RichTextEditor
													value={f.content ?? ""}
													onChange={(json) => setField(i, { content: json })}
												/>
											</div>
										) : (
											<>
												<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
													<label className="flex items-center gap-1.5 text-xs">
														<input
															type="checkbox"
															checked={!!f.required}
															onChange={(e) =>
																setField(i, { required: e.target.checked })
															}
															className="h-3.5 w-3.5 accent-[var(--accent)]"
														/>{" "}
														Required
													</label>
													{f.type !== "richtext" && (
														<input
															className={`${fieldInput} h-8 flex-1 min-w-[140px] text-xs`}
															value={f.placeholder ?? ""}
															placeholder="Placeholder (optional)"
															onChange={(e) =>
																setField(i, { placeholder: e.target.value })
															}
														/>
													)}
													<input
														className={`${fieldInput} h-8 basis-40 shrink-0 font-khmer text-xs`}
														value={f.labelKm ?? ""}
														placeholder="Label (KM)"
														onChange={(e) =>
															setField(i, { labelKm: e.target.value })
														}
													/>
												</div>
												{f.type === "select" && (
													<input
														className={`${fieldInput} mt-2 text-xs`}
														value={(f.options ?? []).join(", ")}
														placeholder="Options, comma-separated"
														onChange={(e) =>
															setField(i, {
																options: e.target.value
																	.split(",")
																	.map((o) => o.trim())
																	.filter(Boolean),
															})
														}
													/>
												)}
											</>
										)}
									</div>
								))}
								<button
									type="button"
									onClick={addField}
									className="text-sm font-semibold text-[var(--accent)] hover:underline"
								>
									+ Add field
								</button>
							</div>
						</FormSection>
					</div>
				}
				aside={
					<div className="space-y-5">
						<FormSection title="Availability">
							<div className="space-y-4">
								<div>
									<label className={fieldLabel}>Status</label>
									<select
										className={fieldInput}
										value={status}
										onChange={(e) => setStatus(e.target.value as any)}
									>
										<option value="active">Active — accepting responses</option>
										<option value="draft">Draft — hidden</option>
									</select>
								</div>
								<div>
									<label className={fieldLabel}>Deadline (optional)</label>
									<input
										type="date"
										className={fieldInput}
										value={deadline}
										onChange={(e) => setDeadline(e.target.value)}
									/>
									<p className="mt-1 text-xs text-muted-foreground">
										{deadline
											? isFormClosed(deadline)
												? "⚠ This date has passed — the form is closed to new responses."
												: "Closes at end of this day; after that it stops accepting responses."
											: "Leave empty to stay open indefinitely."}
									</p>
								</div>
							</div>
						</FormSection>
						<FormSection title="After submit">
							<div className="space-y-4">
								<div>
									<label className={fieldLabel}>Submit button label</label>
									<input
										className={fieldInput}
										value={submitLabel}
										onChange={(e) => setSubmitLabel(e.target.value)}
										placeholder="Submit"
									/>
								</div>
								<div>
									<label className={fieldLabel}>Success message</label>
									<textarea
										className={fieldInput}
										rows={3}
										value={successMessage}
										onChange={(e) => setSuccessMessage(e.target.value)}
										placeholder="Thank you — your response has been recorded."
									/>
								</div>
								<div>
									<label className={fieldLabel}>Notify email (optional)</label>
									<input
										className={fieldInput}
										value={notifyEmail}
										onChange={(e) => setNotifyEmail(e.target.value)}
										placeholder="team@kapekh.org"
									/>
								</div>
							</div>
						</FormSection>
					</div>
				}
			/>
		</form>
	);
}
