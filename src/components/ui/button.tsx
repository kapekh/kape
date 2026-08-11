import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "#/lib/utils.ts";

// not-disabled: on hover, or a disabled button stops answering the pointer and its title tooltip never opens
const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50 disabled:cursor-not-allowed disabled:opacity-80 disabled:saturate-[0.35] aria-disabled:cursor-not-allowed aria-disabled:opacity-80 aria-disabled:saturate-[0.35] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				primary:
					"bg-admin-accent text-accent-foreground not-disabled:hover:bg-admin-accent/90",
				secondary:
					"border border-admin-border bg-admin-panel text-admin-ink not-disabled:hover:border-admin-border-strong not-disabled:hover:bg-admin-accent-soft",
				ghost:
					"text-admin-ink-muted not-disabled:hover:bg-admin-accent-soft not-disabled:hover:text-admin-ink",
				danger:
					"bg-admin-danger text-destructive-foreground not-disabled:hover:bg-admin-danger/90",
			},
			size: {
				sm: "h-8 px-3",
				md: "h-10 px-4",
				icon: "size-9",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "md",
		},
	},
);

function Button({
	className,
	variant = "primary",
	size = "md",
	asChild = false,
	disabledReason,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
		// a disabled primary that says nothing reads as a failed render
		disabledReason?: string;
	}) {
	const Comp = asChild ? Slot.Root : "button";
	const hintId = React.useId();
	// asChild hands its props to someone else's element, and a sibling would be
	// a second child Slot cannot take
	const reason = !asChild && props.disabled ? disabledReason : undefined;

	const button = (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			{...props}
			title={reason ?? props.title}
			aria-describedby={
				reason
					? [props["aria-describedby"], hintId].filter(Boolean).join(" ")
					: props["aria-describedby"]
			}
			className={cn(buttonVariants({ variant, size, className }))}
		/>
	);

	if (!reason) return button;
	return (
		<>
			{button}
			<span id={hintId} className="sr-only">
				{reason}
			</span>
		</>
	);
}

export { Button, buttonVariants };
