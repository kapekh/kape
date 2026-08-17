export type Sized = { width?: number | null; height?: number | null };

/**
 * Below this on the long edge an image is upscaled in every cover, hero and
 * banner slot the site has, which is what "the photo lost resolution" is.
 */
export const MIN_FULL_WIDTH = 1200;

export function isLowResolution(m: Sized): boolean {
	if (!m.width || !m.height) return false;
	return Math.max(m.width, m.height) < MIN_FULL_WIDTH;
}

/** "1920 × 1440", or null when the size was never recorded. */
export function formatSize(m: Sized): string | null {
	if (!m.width || !m.height) return null;
	return `${m.width} × ${m.height}`;
}
