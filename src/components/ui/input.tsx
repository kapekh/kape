import type * as React from "react";

import { cn } from "#/lib/utils.ts";

// no explicit height: py-2 lands on 40px and a textarea can still grow; text-base below md, or iOS zooms in on focus and never back out
export const inputClass =
	"w-full min-w-0 rounded-lg border border-admin-border bg-admin-panel px-3 py-2 text-base text-admin-ink transition-colors duration-150 ease-out outline-none selection:bg-admin-accent selection:text-accent-foreground file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-admin-ink placeholder:text-admin-ink-subtle focus-visible:border-admin-accent focus-visible:ring-2 focus-visible:ring-admin-focus/40 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-admin-danger aria-invalid:ring-2 aria-invalid:ring-admin-danger/25 md:text-sm";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			// h-10 here, not inputClass: that is shared with textareas and with rows that append h-8
			className={cn(inputClass, "h-10", className)}
			{...props}
		/>
	);
}

export { Input };
