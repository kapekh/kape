import { Switch as SwitchPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "#/lib/utils.ts";

function Switch({
	className,
	size = "default",
	...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
	size?: "sm" | "default";
}) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			data-size={size}
			className={cn(
				"tap-target peer group/switch inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50 disabled:cursor-not-allowed disabled:opacity-60 data-[size=default]:h-5 data-[size=default]:w-9 data-[size=sm]:h-4 data-[size=sm]:w-7 data-[state=checked]:bg-admin-accent data-[state=unchecked]:bg-admin-border-strong",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(
					"pointer-events-none block rounded-full bg-admin-panel shadow-sm ring-0 transition-transform duration-200 ease-out group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0",
				)}
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
