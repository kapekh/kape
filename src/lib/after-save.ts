import { useRouter } from "@tanstack/react-router";

import { useInlineEdit } from "./inline-edit";

const NOT_REPAINTED = "Reload the page to see it here.";

/**
 * Repaint the page from what was just written. Only for after the write resolved:
 * a loader that rejects here has undone nothing, so this says saved either way
 * and never throws. False when the page is still showing the old copy.
 */
export function useRefreshAfterSave(): (label: string) => Promise<boolean> {
	const { setStatus } = useInlineEdit();
	const router = useRouter({ warn: false });
	return async (label) => {
		try {
			// dropped, not invalidated: the loaders read through ensureQueryData, which
			// hands back whatever is cached however stale
			router?.options.context.queryClient.removeQueries();
			await router?.invalidate();
			setStatus({ kind: "saved", label });
			return true;
		} catch {
			setStatus({ kind: "saved", label, note: NOT_REPAINTED });
			return false;
		}
	};
}
