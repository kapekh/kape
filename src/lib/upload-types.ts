/** Extensions `/api/media/upload` stores. SVG and HTML are out: both carry script from our own origin. */
export const ALLOWED_UPLOAD_EXT = [
	"png",
	"jpg",
	"jpeg",
	"webp",
	"gif",
	"avif",
	"pdf",
	"doc",
	"docx",
	"xls",
	"xlsx",
	"ppt",
	"pptx",
	"mp4",
	"webm",
] as const;

const IMAGE_EXT = ["png", "jpg", "jpeg", "webp", "gif", "avif"] as const;

/**
 * `accept` for an image field. Named extensions rather than `image/*`, so iOS
 * hands over a JPEG instead of the HEIC the server would reject.
 */
export const IMAGE_ACCEPT = IMAGE_EXT.map((e) => `.${e}`).join(",");
