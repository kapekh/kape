export const ADMIN_HINT_COOKIE = "cms_admin";

// the session cookie is HttpOnly, so without this the browser cannot ask "might I be signed in"
// without a request on every public page load
export function hasAdminHint(): boolean {
	if (typeof document === "undefined") return false;
	return document.cookie
		.split(";")
		.some((c) => c.trim() === `${ADMIN_HINT_COOKIE}=1`);
}
