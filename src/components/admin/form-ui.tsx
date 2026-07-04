/** Shared building blocks so every admin create/edit form looks the same. */

export const fieldInput =
	"w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25 transition";
export const fieldLabel = "block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5";
export const cancelButtonClass = "rounded-full border border-border px-5 py-1.5 text-sm font-semibold text-foreground/70 hover:bg-muted transition";

/**
 * Sticky editor header: page title on the left, actions on the right (pass the
 * Cancel link as children; the primary Save submit button is rendered here).
 * Sits just below the admin top bar.
 */
export function EditorHeader({
	title,
	saving,
	savedAt,
	saveLabel = "Save",
	dirty,
	children,
}: {
	title: string;
	saving?: boolean;
	savedAt?: string | null;
	saveLabel?: string;
	/** When explicitly `false`, Save is disabled (no unsaved changes). */
	dirty?: boolean;
	children?: React.ReactNode;
}) {
	return (
		<div className="mx-auto mb-4 flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2">
			<h1 className="font-display text-base font-semibold text-primary">{title}</h1>
			<div className="flex items-center gap-2">
				{savedAt && <span className="text-xs text-[var(--palm)]">Saved {savedAt}</span>}
				{children}
				<button type="submit" disabled={saving || dirty === false} className="rounded-full bg-primary text-primary-foreground px-5 py-1.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
					{saving ? "Saving…" : saveLabel}
				</button>
			</div>
		</div>
	);
}

/** Two-column editor body: main content + a sticky settings rail. Capped and
 *  centred so fields don't stretch absurdly wide and the rail never strands a
 *  lone card in a sea of open space on large screens. */
export function EditorGrid({ main, aside }: { main: React.ReactNode; aside: React.ReactNode }) {
	return (
		<div className="mx-auto grid max-w-5xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
			<div className="min-w-0 space-y-5">{main}</div>
			{/* `top` MUST be ≤ the aside's resting offset, else sticky clamps the card
			    DOWN to `top` and opens a gap above it. `self-start` keeps it top-aligned. */}
			<aside className="space-y-5 self-start lg:sticky lg:top-6">{aside}</aside>
		</div>
	);
}

/** A titled card that groups related fields. */
export function FormSection({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-2xl border border-border bg-card overflow-hidden">
			<div className="border-b border-border px-5 py-4">
				<h2 className="font-display text-base font-semibold text-primary">{title}</h2>
				{description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
			</div>
			<div className="p-5">{children}</div>
		</section>
	);
}

/** Right-aligned footer action bar. Pass a Cancel link as `children`. */
export function FormActions({
	saving,
	label,
	savedAt,
	dirty,
	children,
}: {
	saving?: boolean;
	label: string;
	savedAt?: string | null;
	/** When explicitly `false`, Save is disabled (no unsaved changes). */
	dirty?: boolean;
	children?: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-end gap-3 pt-1">
			{savedAt && <span className="mr-auto text-xs text-[var(--palm)]">Saved {savedAt}</span>}
			{children}
			<button type="submit" disabled={saving || dirty === false} className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
				{saving ? "Saving…" : label}
			</button>
		</div>
	);
}
