/** Shared building blocks so every admin create/edit form looks the same. */
import { useId } from "react";

import { Button, buttonVariants } from "#/components/ui/button.tsx";
import { Card } from "#/components/ui/card.tsx";
import { inputClass } from "#/components/ui/input.tsx";

/**
 * The three class strings 23 files spread onto their own elements. They are the
 * primitives' own strings rather than copies of them, so a hand-rolled
 * `<input>` and an `<Input>` cannot drift apart.
 */
export const fieldInput = inputClass;
export const fieldLabel =
	"block text-[13px] font-medium text-admin-ink mb-2";
export const cancelButtonClass = buttonVariants({
	variant: "secondary",
	size: "md",
});

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
		<Card
			padding="none"
			className="mx-auto mb-6 flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3"
		>
			<h1 className="text-xl font-semibold text-admin-ink">{title}</h1>
			<div className="flex items-center gap-2">
				{savedAt && (
					<span className="text-[13px] text-admin-live">Saved {savedAt}</span>
				)}
				{children}
				<Button
					type="submit"
					disabled={saving || dirty === false}
					// Disabled until the form is dirty is deliberate and was never
					// legible; a disabled primary that says nothing reads as broken.
					disabledReason={
						dirty === false && !saving ? "No changes to save." : undefined
					}
				>
					{saving ? "Saving…" : saveLabel}
				</Button>
			</div>
		</Card>
	);
}

/** Two-column editor body: main content + a sticky settings rail. Capped and
 *  centred so fields don't stretch absurdly wide and the rail never strands a
 *  lone card in a sea of open space on large screens. */
export function EditorGrid({
	main,
	aside,
}: {
	main: React.ReactNode;
	aside: React.ReactNode;
}) {
	return (
		<div className="mx-auto grid max-w-5xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
			<div className="min-w-0 space-y-6">{main}</div>
			{/* `top` MUST be ≤ the aside's resting offset, else sticky clamps the card
			    DOWN to `top` and opens a gap above it. `self-start` keeps it top-aligned. */}
			<aside className="space-y-6 self-start lg:sticky lg:top-6">{aside}</aside>
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
		<Card padding="none" className="overflow-hidden">
			<div className="border-b border-admin-border px-4 py-4">
				<h2 className="text-base font-semibold text-admin-ink">{title}</h2>
				{description && (
					<p className="mt-1 text-[13px] text-admin-ink-muted">{description}</p>
				)}
			</div>
			<div className="p-4">{children}</div>
		</Card>
	);
}

/** What `Field` hands its control so the label, hint and error actually bind. */
export type FieldControlProps = {
	id: string;
	required?: boolean;
	"aria-invalid"?: true;
	"aria-describedby"?: string;
};

/**
 * One labelled form field: the label, the required marker, an optional hint and
 * an optional error, with the id plumbing that ties them to the control.
 *
 * The control is a render prop rather than a fixed `<input>` because admin forms
 * use inputs, textareas, selects and the media picker in the same slot. Spread
 * what it gives you onto whatever you render:
 *
 *     <Field label="URL segment" required hint="Lowercase, no spaces." error={err}>
 *       {(p) => <input {...p} className={fieldInput} value={v} onChange={…} />}
 *     </Field>
 *
 * The marker is an `*` with a text alternative, not `*` alone: an asterisk is
 * punctuation to a screen reader, and `required` on the control is what a form
 * actually reads. Both are set, so it lands for sighted and non-sighted users.
 */
export function Field({
	label,
	required,
	hint,
	error,
	children,
}: {
	label: string;
	required?: boolean;
	hint?: string;
	error?: string | null;
	children: (props: FieldControlProps) => React.ReactNode;
}) {
	const base = useId();
	const id = `${base}-field`;
	const hintId = `${base}-hint`;
	const errorId = `${base}-error`;
	// error first: a screen reader reads the description in order, and the
	// problem matters more than the guidance that failed to prevent it
	const describedBy =
		[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
		undefined;

	return (
		<div>
			<label htmlFor={id} className={fieldLabel}>
				{label}
				{required && (
					<>
						<span aria-hidden="true" className="ml-0.5 text-admin-danger">
							*
						</span>
						<span className="sr-only"> (required)</span>
					</>
				)}
			</label>
			{children({
				id,
				required,
				"aria-invalid": error ? true : undefined,
				"aria-describedby": describedBy,
			})}
			{hint && (
				<p id={hintId} className="mt-2 text-[13px] text-admin-ink-muted">
					{hint}
				</p>
			)}
			{error && (
				<p
					id={errorId}
					className="mt-2 text-[13px] font-medium text-admin-danger"
				>
					{error}
				</p>
			)}
		</div>
	);
}
