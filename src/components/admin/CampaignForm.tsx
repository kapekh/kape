import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { MIN_FULL_WIDTH } from "#/lib/media-size";
import {
	cancelButtonClass,
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
import { MediaPicker } from "./MediaPicker";
import { useDirtyGuard } from "./useDirty";
import { useFieldErrors } from "./useFieldErrors";

const CAMPAIGN_FIELDS = ["title", "blurb"] as const;
type CampaignText = Record<(typeof CAMPAIGN_FIELDS)[number], string>;

export type { LangOpt } from "./LangTabs";

export type CampaignFormValue = {
	slug: string;
	status: "active" | "draft" | "ended";
	currency: "USD" | "KHR";
	goalAmount: string | null;
	coverMediaId: number | null;
	presets: number[];
	allowCustom: boolean;
	impactTiers: { amount: number; label: string }[];
	showSupporters: boolean;
	featured: boolean;
	sort: number;
	translations: ({ lang: string } & CampaignText)[];
};

type Initial = {
	slug: string;
	status: string;
	currency: string;
	goalAmount: number | string | null;
	coverMediaId: number | null;
	presets: number[];
	allowCustom: boolean;
	impactTiers: { amount: number; label: string }[];
	showSupporters: boolean;
	featured: boolean;
	sort: number;
	translations?: Record<string, Partial<CampaignText>>;
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
		<label className="flex cursor-pointer items-start gap-2.5">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				className="mt-0.5 size-4 rounded border-admin-border accent-[var(--admin-accent)]"
			/>
			<span>
				<span className="text-sm font-medium text-admin-ink">{label}</span>
				{hint && (
					<span className="block text-[13px] text-admin-ink-muted">{hint}</span>
				)}
			</span>
		</label>
	);
}

export function CampaignForm({
	initial,
	languages,
	onSubmit,
	saving,
	title,
}: {
	initial: Initial;
	languages: LangOpt[];
	onSubmit: (v: CampaignFormValue) => void;
	saving?: boolean;
	title: string;
}) {
	const [slug, setSlug] = useState(initial?.slug ?? "");
	const [status, setStatus] = useState<CampaignFormValue["status"]>(
		(initial?.status as CampaignFormValue["status"]) ?? "active",
	);
	const {
		text: trans,
		setText,
		toTranslations,
	} = useLangText(languages, CAMPAIGN_FIELDS, initial?.translations);
	const [currency, setCurrency] = useState<CampaignFormValue["currency"]>(
		(initial?.currency as CampaignFormValue["currency"]) ?? "USD",
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
	// a row's identity is its own, not its index: removing the first tier must not
	// hand its React state to the second
	const [tiers, setTiers] = useState<
		{ amount: string; label: string; key: string }[]
	>(
		(initial?.impactTiers ?? []).map((t, i) => ({
			amount: String(t.amount),
			label: t.label,
			key: `t${i}`,
		})),
	);
	const [showSupporters, setShowSupporters] = useState(
		initial?.showSupporters ?? true,
	);
	const [featured, setFeatured] = useState(initial?.featured ?? false);

	const defaultLang = defaultLanguage(languages)?.code;
	const defaultTitle = defaultLang ? (trans[defaultLang]?.title ?? "") : "";

	const slugify = (s: string) =>
		s
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");

	function submit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit({
			slug: slug || slugify(defaultTitle),
			status,
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
			translations: toTranslations(),
		});
	}

	const { errors, invalid } = useFieldErrors();

	const dirty = useDirtyGuard(
		JSON.stringify({
			slug,
			status,
			trans,
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
							description="Title and description shown on the donate page, each in its own language. Switch languages with the tabs — your text is kept as you switch."
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
														placeholder="Where every child learns"
													/>
												)}
											</Field>
											<Field label="Blurb">
												{(p) => (
													<Textarea
														{...p}
														rows={3}
														className={
															l.code === "km" ? "font-khmer" : undefined
														}
														value={trans[l.code]?.blurb ?? ""}
														onChange={(e) =>
															setText(l.code, "blurb", e.target.value)
														}
													/>
												)}
											</Field>
										</div>
									)}
								</LangTabs>
								<Field
									label="Slug"
									hint={`URL: /donate/${slug || slugify(defaultTitle) || "…"}`}
								>
									{(p) => (
										<Input
											{...p}
											className="font-mono"
											value={slug}
											onChange={(e) => setSlug(slugify(e.target.value))}
											placeholder="every-child-learns"
										/>
									)}
								</Field>
							</div>
						</FormSection>

						<FormSection
							split
							title="Amounts"
							description="Preset buttons and the impact each gift unlocks."
						>
							<div className="space-y-6">
								<div className="grid gap-4 sm:grid-cols-2">
									<Field label="Currency">
										{(p) => (
											<Select
												value={currency}
												onValueChange={(v) => setCurrency(v as "USD" | "KHR")}
											>
												<SelectTrigger
													id={p.id}
													aria-label="Currency"
													className="w-full"
												>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="USD">USD ($)</SelectItem>
													<SelectItem value="KHR">KHR (៛)</SelectItem>
												</SelectContent>
											</Select>
										)}
									</Field>
									<Field label="Goal amount (optional)">
										{(p) => (
											<Input
												{...p}
												type="number"
												value={goal}
												onChange={(e) => setGoal(e.target.value)}
												placeholder="50000"
											/>
										)}
									</Field>
								</div>
								<Field label="Preset amounts (comma-separated)">
									{(p) => (
										<Input
											{...p}
											value={presetsText}
											onChange={(e) => setPresetsText(e.target.value)}
											placeholder="25, 50, 100, 250"
										/>
									)}
								</Field>
								<fieldset>
									<legend className="mb-2 block text-[13px] font-medium text-admin-ink">
										Impact tiers
									</legend>
									<div className="space-y-2">
										{tiers.map((t, i) => (
											<div key={t.key} className="flex gap-2">
												<Input
													className="w-28"
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
												<Input
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
												<Button
													type="button"
													variant="secondary"
													size="icon"
													aria-label={`Remove tier ${i + 1}`}
													onClick={() =>
														setTiers((ts) => ts.filter((_, n) => n !== i))
													}
												>
													<X className="size-4" aria-hidden="true" />
												</Button>
											</div>
										))}
										<Button
											type="button"
											variant="secondary"
											size="sm"
											onClick={() =>
												setTiers((ts) => [
													...ts,
													{ amount: "", label: "", key: crypto.randomUUID() },
												])
											}
										>
											+ Add tier
										</Button>
									</div>
								</fieldset>
							</div>
						</FormSection>
					</div>
				}
				aside={
					<div className="space-y-5">
						<FormSection title="Status">
							<Select
								value={status}
								onValueChange={(v) =>
									setStatus(v as CampaignFormValue["status"])
								}
							>
								<SelectTrigger aria-label="Campaign status" className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="active">
										Active — accepting donations
									</SelectItem>
									<SelectItem value="draft">Draft — hidden</SelectItem>
									<SelectItem value="ended">Ended — visible, closed</SelectItem>
								</SelectContent>
							</Select>
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
								minWidth={MIN_FULL_WIDTH}
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
