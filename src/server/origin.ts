/**
 * Public site origin for absolute URLs in robots.txt / sitemap.xml / llms.txt.
 * Prefers VITE_SITE_URL when configured, else derives it from the request
 * (honouring reverse-proxy headers) so it's correct without any config.
 */
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
