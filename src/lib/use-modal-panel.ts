import { useEffect, useRef } from "react";

const FOCUSABLE =
	'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Focus behaviour for a modal panel: focus moves in on open, Tab stays inside,
 * Esc closes, and the trigger gets focus back on close. Put the returned ref on
 * the panel, which needs role="dialog" aria-modal="true" tabIndex={-1} and a name.
 */
export function useModalPanel(onClose?: () => void, active = true) {
	const ref = useRef<HTMLDivElement>(null);
	const close = useRef(onClose);
	useEffect(() => {
		close.current = onClose;
	});

	useEffect(() => {
		const panel = ref.current;
		if (!panel || !active) return;
		const restore = document.activeElement as HTMLElement | null;
		panel.focus();

		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				close.current?.();
				return;
			}
			if (e.key !== "Tab") return;
			const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
				(el) => el.offsetParent !== null,
			);
			// an empty panel keeps the focus itself rather than handing it to the page
			if (!items.length) {
				e.preventDefault();
				panel.focus();
				return;
			}
			const active = document.activeElement;
			const first = items[0];
			const last = items[items.length - 1];
			if (!panel.contains(active)) {
				e.preventDefault();
				(e.shiftKey ? last : first).focus();
			} else if (e.shiftKey && (active === first || active === panel)) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && active === last) {
				e.preventDefault();
				first.focus();
			}
		};

		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("keydown", onKey);
			restore?.focus?.();
		};
	}, [active]);

	return ref;
}
