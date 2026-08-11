import type * as React from "react";

import { cn } from "#/lib/utils.ts";

/**
 * The one field surface, shared with `fieldInput` in form-ui so a hand-rolled
 * `<input>`, `<select>` or `<textarea>` in an admin form is the same object as
 * an `<Input>`.
 *
 * No explicit height: `py-2` and 14px text land on the 40px the density scale
 * asks for, while a `<textarea>` keeps growing and the compact rows in
 * FormBuilder can still append `h-8` and be obeyed.
 *
 * `text-base md:text-sm` and not `text-sm` alone: iOS zooms the page in on a
 * focused field below 16px and never zooms back out.
 */
export const inputClass =
	"w-full min-w-0 rounded-lg border border-admin-border bg-admin-panel px-3 py-2 text-base text-admin-ink transition-colors duration-150 ease-out outline-none selection:bg-admin-accent selection:text-accent-foreground file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-admin-ink placeholder:text-admin-ink-subtle focus-visible:border-admin-accent focus-visible:ring-2 focus-visible:ring-admin-focus/40 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-admin-danger aria-invalid:ring-2 aria-invalid:ring-admin-danger/25 md:text-sm";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			// the 40px the density scale asks for. It cannot live in `inputClass`,
			// which is also spread onto textareas and onto compact rows that append
			// their own `h-8` — a height there would override both.
			className={cn(inputClass, "h-10", className)}
			{...props}
		/>
	);
}

export { Input };
