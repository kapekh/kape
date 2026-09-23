// writer (server/images.ts) and reader (components/Picture.tsx) name the same
// files from here, or a card offers a url nothing ever wrote

/** The widths an upload is re-encoded at, narrowest first. */
export const IMAGE_WIDTHS = [320, 640, 960, 1280, 1920] as const;

// gif would lose its animation to a still webp; svg has no pixels to save
const DERIVABLE_EXT = new Set(["png", "jpg", "jpeg", "webp", "avif"]);

/** True when `<name>-<width>.webp` files belong beside this path or key. */
export function isDerivable(path: string): boolean {
	const dot = path.lastIndexOf(".");
	if (dot <= 0 || dot < path.lastIndexOf("/")) return false;
	return DERIVABLE_EXT.has(path.slice(dot + 1).toLowerCase());
}

/** `/uploads/a.jpg` at 640 → `/uploads/a-640.webp`. */
export function derivativePath(path: string, width: number): string {
	return `${path.slice(0, path.lastIndexOf("."))}-${width}.webp`;
}

/** The widths a source of this size has files for; never wider than the source. */
export function derivativeWidths(
	sourceWidth: number | null | undefined,
): number[] {
	if (!sourceWidth || sourceWidth <= 0) return [];
	return IMAGE_WIDTHS.filter((w) => w <= sourceWidth);
}
