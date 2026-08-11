"use client";

import { Label as LabelPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "#/lib/utils.ts";

/** 13px/500, sentence case. Shared with `fieldLabel` in form-ui. */
export const labelClass =
	"flex items-center gap-2 text-[13px] leading-none font-medium text-admin-ink select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:text-admin-ink-subtle peer-disabled:cursor-not-allowed peer-disabled:text-admin-ink-subtle";

function Label({
	className,
	...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
	return (
		<LabelPrimitive.Root
			data-slot="label"
			className={cn(labelClass, className)}
			{...props}
		/>
	);
}

export { Label };
