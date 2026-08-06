/**
 * Stand-in for a slot with no image yet.
 *
 * It used to be a picsum photograph seeded on the record's slug, so every
 * image-less record showed a real, unrelated photograph — an aurora over a
 * library handover in Kang Meas, a US flag over rural digital literacy. That
 * reads as an editorial choice rather than a gap, and it makes production
 * hotlink a third-party host for every image. A placeholder has to look like
 * one.
 */
export const PLACEHOLDER_IMAGE = "/placeholder.svg";

/** True for a url that is only standing in for a real image. */
export const isPlaceholder = (url: string | null | undefined): boolean =>
	!url || url === PLACEHOLDER_IMAGE;
