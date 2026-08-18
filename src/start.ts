import { createMiddleware, createStart } from "@tanstack/react-start";

export const contentSecurityPolicy = [
	"default-src 'self'",
	"base-uri 'self'",
	// pdf reader embeds uploads with <object>
	"object-src 'self'",
	"frame-ancestors 'self'",
	"img-src 'self' data: https:",
	"media-src 'self' https:",
	"font-src 'self' https://fonts.gstatic.com data:",
	// unpkg serves the Leaflet stylesheet used by the project-location map.
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
	"script-src 'self' 'unsafe-inline'",
	"connect-src 'self'",
].join("; ");

// CSP is production-only: in dev it blocks Vite's HMR
const securityHeaders = createMiddleware({ type: "request" }).server(
	async ({ next }) => {
		const result = await next();
		const h = result.response.headers;
		h.set("X-Content-Type-Options", "nosniff");
		h.set("X-Frame-Options", "SAMEORIGIN");
		h.set("Referrer-Policy", "strict-origin-when-cross-origin");
		h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

		if (
			process.env.NODE_ENV === "production" &&
			!h.has("content-security-policy")
		) {
			h.set("Content-Security-Policy", contentSecurityPolicy);
		}
		return result;
	},
);

export const startInstance = createStart(() => ({
	requestMiddleware: [securityHeaders],
}));
