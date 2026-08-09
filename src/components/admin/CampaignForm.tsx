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
import { MediaPicker } from "./MediaPicker";
import { useDirtyGuard } from "./useDirty";

export type CampaignFormValue = {
	slug: string;
	status: "active" | "draft" | "ended";
	title: string;
	titleKm: string | null;
	blurb: string | null;
	blurbKm: string | null;
	currency: "USD" | "KHR";
	goalAmount: string | null;
	coverMediaId: number | null;
	presets: number[];
	allowCustom: boolean;
	impactTiers: { amount: number; label: string }[];
	showSupporters: boolean;
	featured: boolean;
	sort: number;
};

type Initial = {
	slug: string;
	status: string;
	title: string;
	titleKm: string | null;
	blurb: string | null;
	blurbKm: string | null;
	currency: string;
	goalAmount: number | string | null;
	coverMediaId: number | null;
	presets: number[];
	allowCustom: boolean;
	impactTiers: { amount: number; label: string }[];
	showSupporters: boolean;
	featured: boolean;
	sort: number;
} | null;

function Check({
	label,
	checked,
	onChange,
	hint,
}: {
	label: string;
	checked: boolean;
	onChange: (v: boolean) => void;
	hint?: string;
}) {
	return (
		<label className="flex items-start gap-2.5 cursor-pointer">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				className="mt-0.5 h-4 w-4 rounded border-border accent-[var(--accent)]"
			/>
			<span>
				<span className="text-sm font-medium text-foreground">{label}</span>
				{hint && (
					<span className="block text-xs text-muted-foreground">{hint}</span>
				)}
			</span>
		</label>
	);
}

export function CampaignForm({
	initial,
	onSubmit,
	saving,
	title,
}: {
	initial: Initial;
	onSubmit: (v: CampaignFormValue) => void;
	saving?: boolean;
	title: string;
}) {
	const [slug, setSlug] = useState(initial?.slug ?? "");
	const [status, setStatus] = useState<"active" | "draft" | "ended">(
		(initial?.status as any) ?? "active",
	);
	const [titleEn, setTitleEn] = useState(initial?.title ?? "");
	const [titleKm, setTitleKm] = useState(initial?.titleKm ?? "");
	const [blurb, setBlurb] = useState(initial?.blurb ?? "");
	const [blurbKm, setBlurbKm] = useState(initial?.blurbKm ?? "");
	const [currency, setCurrency] = useState<"USD" | "KHR">(
		(initial?.currency as any) ?? "USD",
	);
	const [goal, setGoal] = useState(
		initial?.goalAmount != null ? String(initial.goalAmount) : "",
	);
	const [coverMediaId, setCoverMediaId] = useState(
		initial?.coverMediaId != null ? String(initial.coverMediaId) : "",
	);
	const [presetsText, setPresetsText] = useState(
		(initial?.presets ?? []).join(", "),
	);
	const [allowCustom, setAllowCustom] = useState(initial?.allowCustom ?? true);
	const [tiers, setTiers] = useState<{ amount: string; label: string }[]>(
		(initial?.impactTiers ?? []).map((t) => ({
			amount: String(t.amount),
			label: t.label,
		})),
	);
	const [showSupporters, setShowSupporters] = useState(
		initial?.showSupporters ?? true,
	);
	const [featured, setFeatured] = useState(initial?.featured ?? false);

	const slugify = (s: string) =>
		s
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");

	function submit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit({
			slug: slug || slugify(titleEn),
			status,
			title: titleEn,
			titleKm: titleKm || null,
			blurb: blurb || null,
			blurbKm: blurbKm || null,
			currency,
			goalAmount: goal.trim() ? goal.trim() : null,
			coverMediaId: coverMediaId ? Number(coverMediaId) : null,
			presets: presetsText
				.split(",")
				.map((p) => Number(p.trim()))
				.filter((n) => Number.isFinite(n) && n > 0),
			allowCustom,
			impactTiers: tiers
				.map((t) => ({ amount: Number(t.amount), label: t.label.trim() }))
				.filter((t) => Number.isFinite(t.amount) && t.amount > 0 && t.label)
				.sort((a, b) => a.amount - b.amount),
			showSupporters,
			featured,
			sort: initial?.sort ?? 0,
		});
	}

	const dirty = useDirtyGuard(
		JSON.stringify({
			slug,
			status,
			titleEn,
			titleKm,
			blurb,
			blurbKm,
			currency,
			goal,
			coverMediaId,
			presetsText,
			allowCustom,
			tiers,
			showSupporters,
			featured,
		}),
	);

	return (
		<form onSubmit={submit}>
			<EditorHeader
				title={title}
				saving={saving}
				saveLabel="Save campaign"
				dirty={dirty}
			>
				<Link to="/admin/campaigns" className={cancelButtonClass}>
					Cancel
				</Link>
			</EditorHeader>
			<EditorGrid
				main={
					<div className="space-y-5">
						<FormSection
							title="Campaign"
							description="Title and description shown on the donate page (English + Khmer)."
						>
							<div className="space-y-4">
								<div className="grid sm:grid-cols-2 gap-4">
									<label className="block">
										<span className={fieldLabel}>Title (EN)</span>
										<input
											className={fieldInput}
											value={titleEn}
											onChange={(e) => setTitleEn(e.target.value)}
											placeholder="Where every child learns"
											required
										/>
									</label>
									<label className="block">
										<span className={fieldLabel}>Title (KM)</span>
										<input
											className={`${fieldInput} font-khmer`}
											value={titleKm}
											onChange={(e) => setTitleKm(e.target.value)}
										/>
									</label>
								</div>
								<div>
									<label className="block">
										<span className={fieldLabel}>Slug</span>
										<input
											className={`${fieldInput} font-mono`}
											value={slug}
											onChange={(e) => setSlug(slugify(e.target.value))}
											placeholder="every-child-learns"
										/>
									</label>
									<p className="mt-1 text-xs text-muted-foreground">
										URL: /donate/{slug || slugify(titleEn) || "…"}
									</p>
								</div>
								<div className="grid sm:grid-cols-2 gap-4">
									<label className="block">
										<span className={fieldLabel}>Blurb (EN)</span>
										<textarea
											className={fieldInput}
											rows={3}
											value={blurb}
											onChange={(e) => setBlurb(e.target.value)}
										/>
									</label>
									<label className="block">
										<span className={fieldLabel}>Blurb (KM)</span>
										<textarea
											className={`${fieldInput} font-khmer`}
											rows={3}
											value={blurbKm}
											onChange={(e) => setBlurbKm(e.target.value)}
										/>
									</label>
								</div>
							</div>
						</FormSection>

						<FormSection
							title="Amounts"
							description="Preset buttons and the impact each gift unlocks."
						>
							<div className="space-y-4">
								<div className="grid sm:grid-cols-2 gap-4">
									<label className="block">
										<span className={fieldLabel}>Currency</span>
										<select
											className={fieldInput}
											value={currency}
											onChange={(e) =>
												setCurrency(e.target.value as "USD" | "KHR")
											}
										>
											<option value="USD">USD ($)</option>
											<option value="KHR">KHR (៛)</option>
										</select>
									</label>
									<label className="block">
										<span className={fieldLabel}>Goal amount (optional)</span>
										<input
											className={fieldInput}
											type="number"
											value={goal}
											onChange={(e) => setGoal(e.target.value)}
											placeholder="50000"
										/>
									</label>
								</div>
								<label className="block">
									<span className={fieldLabel}>
										Preset amounts (comma-separated)
									</span>
									<input
										className={fieldInput}
										value={presetsText}
										onChange={(e) => setPresetsText(e.target.value)}
										placeholder="25, 50, 100, 250"
									/>
								</label>
								<fieldset>
									<legend className={fieldLabel}>Impact tiers</legend>
									<div className="space-y-2">
										{tiers.map((t, i) => (
											<div key={i} className="flex gap-2">
												<input
													className={`${fieldInput} w-28`}
													type="number"
													aria-label={`Tier ${i + 1} amount`}
													value={t.amount}
													placeholder="25"
													onChange={(e) =>
														setTiers((ts) =>
															ts.map((x, n) =>
																n === i ? { ...x, amount: e.target.value } : x,
															),
														)
													}
												/>
												<input
													className={fieldInput}
													aria-label={`Tier ${i + 1} label`}
													value={t.label}
													placeholder="Textbooks for a classroom"
													onChange={(e) =>
														setTiers((ts) =>
															ts.map((x, n) =>
																n === i ? { ...x, label: e.target.value } : x,
															),
														)
													}
												/>
												<button
													type="button"
													onClick={() =>
														setTiers((ts) => ts.filter((_, n) => n !== i))
													}
													className="rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-muted"
												>
													×
												</button>
											</div>
										))}
										<button
											type="button"
											onClick={() =>
												setTiers((ts) => [...ts, { amount: "", label: "" }])
											}
											className="text-sm font-semibold text-[var(--accent)] hover:underline"
										>
											+ Add tier
										</button>
									</div>
								</fieldset>
							</div>
						</FormSection>
					</div>
				}
				aside={
					<div className="space-y-5">
						<FormSection title="Status">
							<select
								className={fieldInput}
								value={status}
								onChange={(e) => setStatus(e.target.value as any)}
							>
								<option value="active">Active — accepting donations</option>
								<option value="draft">Draft — hidden</option>
								<option value="ended">Ended — visible, closed</option>
							</select>
						</FormSection>
						<FormSection
							title="Cover image"
							description="Hero image on the campaign page."
						>
							<MediaPicker
								mode="id"
								kind="image"
								accept="image/*"
								value={coverMediaId}
								onChange={setCoverMediaId}
								label="Choose cover"
							/>
						</FormSection>
						<FormSection title="Options">
							<div className="space-y-3">
								<Check
									label="Allow custom amount"
									checked={allowCustom}
									onChange={setAllowCustom}
									hint="Show an 'other amount' field."
								/>
								<Check
									label="Show supporters wall"
									checked={showSupporters}
									onChange={setShowSupporters}
									hint="Public list of recent donors + messages."
								/>
								<Check
									label="Featured"
									checked={featured}
									onChange={setFeatured}
									hint="Shown first on /donate. Only one campaign can be featured."
								/>
							</div>
						</FormSection>
					</div>
				}
			/>
		</form>
	);
}
