import { useRouter } from "@tanstack/react-router";
import { Check, Palette } from "lucide-react";
import { useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { rememberVersion, useInlineEdit, versionFor } from "#/lib/inline-edit";
import { saveErrorMessage } from "#/lib/save-error";
import { choiceField, SECTION_TONES } from "#/lib/sections";

import type { EditIdentity } from "./SectionRenderer";

const SWATCH: Record<string, string> = {
	"": "bg-background",
	card: "bg-card",
	muted: "bg-muted",
	primary: "bg-[var(--band-primary)]",
	accent: "bg-[var(--band-accent)]",
	dark: "bg-[var(--band-dark)]",
};

const HEX = /^#[0-9a-f]{6}$/i;

export function SectionBackground({
	identity,
	sectionId,
	type,
	tone,
	toneColor,
}: {
	identity: EditIdentity;
	sectionId: string;
	type: string;
	tone?: string;
	toneColor?: string;
}) {
	const { setStatus, bumpRevision } = useInlineEdit();
	const router = useRouter({ warn: false });
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const field = choiceField(type, "tone");
	// hero, stats and cta paint their own background and offer no tone
	if (!field || identity.entity !== "page") return null;
	const current = tone ?? "";
	const custom = toneColor ?? "";
	const label = (value: string) =>
		SECTION_TONES.find((t) => t.value === value)?.label ?? value;

	const write = async (prop: string, value: string, said: string) => {
		setBusy(true);
		setStatus({ kind: "saving", label: "Background" });
		try {
			const result = await trpcClient.adminPages.updateField.mutate({
				entity: "page",
				entityId: identity.entityId,
				lang: identity.lang,
				target: `section:${sectionId}:props.${prop}`,
				value,
				expectedUpdatedAt: versionFor(identity.entity, identity.entityId),
			});
			rememberVersion(identity.entity, identity.entityId, result.updatedAt);
			// re-running the loader repaints the band without losing the scroll
			router?.options.context.queryClient.removeQueries();
			await router?.invalidate();
			bumpRevision();
			setStatus({ kind: "saved", label: said });
		} catch (err) {
			setStatus({
				kind: "error",
				label: "Background",
				message: saveErrorMessage(err),
			});
		} finally {
			setBusy(false);
		}
	};

	// a preset and a colour are two props, and the colour wins, so picking one clears the other
	const pickPreset = async (value: string) => {
		if (value === current && !custom) return;
		if (custom) await write("toneColor", "", `${label(value)} background`);
		await write("tone", value, `${label(value)} background`);
		setOpen(false);
	};

	const pickColour = async (value: string) => {
		if (!HEX.test(value) || value.toLowerCase() === custom.toLowerCase())
			return;
		await write("toneColor", value, "Custom background");
	};

	// anchored left: opening the swatches grows into the page, not off the viewport
	return (
		<div className="absolute left-4 top-4 z-40 print:hidden">
			<div className="flex items-center gap-1 rounded-full border border-border bg-background/95 p-1 shadow-lg backdrop-blur">
				<button
					type="button"
					onClick={() => setOpen((v) => !v)}
					aria-expanded={open}
					className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
				>
					<Palette className="size-3.5 text-muted-foreground" aria-hidden />
					{open ? "Background" : custom ? "Custom" : label(current)}
				</button>
				{open && (
					<>
						{SECTION_TONES.map((t) => (
							<button
								key={t.value || "default"}
								type="button"
								disabled={busy}
								onClick={() => void pickPreset(t.value)}
								title={t.label}
								aria-label={`${t.label} background`}
								aria-pressed={!custom && t.value === current}
								className={`grid size-6 place-items-center rounded-full border ${SWATCH[t.value] ?? "bg-background"} ${!custom && t.value === current ? "border-foreground" : "border-border"} disabled:opacity-50`}
							>
								{!custom && t.value === current && (
									<Check
										className="size-3.5 text-white mix-blend-difference"
										aria-hidden
									/>
								)}
							</button>
						))}
						<span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
						{/* the browser's own colour wheel; change fires when it closes, not per drag */}
						<label
							title="Mix your own"
							className={`grid size-6 cursor-pointer place-items-center overflow-hidden rounded-full border ${custom ? "border-foreground" : "border-border"}`}
							style={custom ? { background: custom } : undefined}
						>
							<span className="sr-only">Custom background colour</span>
							<input
								type="color"
								disabled={busy}
								value={HEX.test(custom) ? custom : "#1f4e79"}
								onChange={(e) => void pickColour(e.target.value)}
								className="size-8 cursor-pointer opacity-0"
							/>
						</label>
						{custom && (
							<button
								type="button"
								disabled={busy}
								onClick={() =>
									void write("toneColor", "", `${label(current)} background`)
								}
								className="rounded-full px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
							>
								Clear
							</button>
						)}
					</>
				)}
			</div>
		</div>
	);
}
