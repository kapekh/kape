import type * as React from "react";

import { cn } from "#/lib/utils.ts";
import { inputClass } from "./input.tsx";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(inputClass, "field-sizing-content min-h-20", className)}
			{...props}
		/>
	);
}

export { Textarea };
