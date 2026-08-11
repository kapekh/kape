// prefers VITE_SITE_URL, else derives it from the request so it is correct without config
export function siteOrigin(request: Request): string {
	const configured = process.env.VITE_SITE_URL;
	if (configured) return configured.replace(/\/$/, "");
	const u = new URL(request.url);
	const proto =
		request.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
	const host =
		request.headers.get("x-forwarded-host") ??
		request.headers.get("host") ??
		u.host;
	return `${proto}://${host}`;
}
