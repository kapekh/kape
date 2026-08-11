// a picsum photo read as an editorial choice and hotlinked a third-party host for every image
export const PLACEHOLDER_IMAGE = "/placeholder.svg";

/** True for a url that is only standing in for a real image. */
export const isPlaceholder = (url: string | null | undefined): boolean =>
	!url || url === PLACEHOLDER_IMAGE;
