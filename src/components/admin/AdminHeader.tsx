import { createContext, type ReactNode, useContext } from "react";
import { createPortal } from "react-dom";

/** The DOM node in the admin topbar that pages render their titlebar content into. */
const HeaderSlotContext = createContext<HTMLElement | null>(null);

export function AdminHeaderProvider({
	slot,
	children,
}: {
	slot: HTMLElement | null;
	children: ReactNode;
}) {
	return (
		<HeaderSlotContext.Provider value={slot}>
			{children}
		</HeaderSlotContext.Provider>
	);
}

export function AdminHeader({ children }: { children: ReactNode }) {
	const slot = useContext(HeaderSlotContext);
	if (!slot) return null;
	return createPortal(children, slot);
}
