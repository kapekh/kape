// a picsum photo read as an editorial choice and hotlinked a third-party host for every image
export const PLACEHOLDER_IMAGE = "/placeholder.svg";

/** True for a url that is only standing in for a real image. */
export const isPlaceholder = (url: string | null | undefined): boolean =>
	!url || url === PLACEHOLDER_IMAGE;

/**
 * A deleted or mistyped image leaves a broken element on a page a visitor is
 * reading. Swap in the standing-in image instead, once — the flag stops a
 * placeholder that is itself missing from looping.
 */
export function onImageError(
	e: React.SyntheticEvent<HTMLImageElement, Event>,
): void {
	const img = e.currentTarget;
	if (img.dataset.fallback === "on") return;
	img.dataset.fallback = "on";
	img.src = PLACEHOLDER_IMAGE;
}

/**
 * `onError` alone misses the common case: the image is server-rendered, the
 * browser gives up on it before React hydrates, and the event has already been
 * and gone. A ref runs after hydration and can still see the failure.
 */
export function imageFallbackRef(el: HTMLImageElement | null): void {
	if (!el || el.dataset.fallback === "on") return;
	if (el.complete && el.naturalWidth === 0) {
		el.dataset.fallback = "on";
		el.src = PLACEHOLDER_IMAGE;
	}
}
