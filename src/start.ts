import { createMiddleware, createStart } from '@tanstack/react-start'

/**
 * Global request middleware: attach security headers to every response.
 *
 * The Content-Security-Policy is only applied in production — in dev it would
 * block Vite's HMR (inline eval + websockets). The allow-list reflects what the
 * app actually loads: same-origin assets, inline theme/hydration scripts and
 * Tailwind styles, Google Fonts, and remote images (picsum / R2 / data URIs).
 */
const securityHeaders = createMiddleware({ type: 'request' }).server(async ({ next }) => {
  const result = await next()
  const h = result.response.headers
  h.set('X-Content-Type-Options', 'nosniff')
  h.set('X-Frame-Options', 'SAMEORIGIN')
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (process.env.NODE_ENV === 'production' && !h.has('content-security-policy')) {
    h.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'self'",
        "img-src 'self' data: https:",
        "media-src 'self' https:",
        "font-src 'self' https://fonts.gstatic.com data:",
        // unpkg serves the Leaflet stylesheet used by the project-location map.
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
        "script-src 'self' 'unsafe-inline'",
        "connect-src 'self'",
      ].join('; '),
    )
  }
  return result
})

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders],
}))
