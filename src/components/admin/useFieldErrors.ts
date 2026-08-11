import { useCallback, useRef, useState } from "react";

type Guarded = Required<
	Pick<React.ComponentProps<"input">, "onInvalid" | "onInput">
>;

/**
 * Renders the browser's own constraint message under its field instead of in a
 * bubble. The refusal is still the browser's: nothing here decides what is valid.
 */
export function useFieldErrors() {
	const [errors, setErrors] = useState<Record<string, string>>({});
	const took = useRef(false);

	const invalid = useCallback((key: string): Guarded => {
		return {
			// cancels the bubble only; the UA still blocks the submit
			onInvalid: (e) => {
				e.preventDefault();
				// read now: React nulls currentTarget before the updater runs
				const el = e.currentTarget;
				const message = el.validationMessage;
				// preventDefault took the UA's focus with the bubble; one pass fires
				// every invalid field, so only the first keeps it
				if (!took.current) {
					took.current = true;
					el.focus();
					queueMicrotask(() => {
						took.current = false;
					});
				}
				setErrors((p) => ({ ...p, [key]: message }));
			},
			onInput: (e) => {
				if (!e.currentTarget.validity.valid) return;
				setErrors((p) => {
					if (!(key in p)) return p;
					const { [key]: _gone, ...rest } = p;
					return rest;
				});
			},
		};
	}, []);

	return { errors, invalid };
}
