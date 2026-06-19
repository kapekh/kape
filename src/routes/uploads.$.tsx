import { createFileRoute } from '@tanstack/react-router'

/**
 * Serves locally-stored uploads (the dev fallback when R2 isn't configured).
 * In production with R2, media URLs point at R2/its public domain and never
 * hit this route. More specific than the catch-all `/$` page route, so it wins.
 */
async function handler({ request }: { request: Request }) {
  const name = new URL(request.url).pathname
    .replace(/^\/uploads\//, '')
    .replace(/\.\.+/g, '') // no path traversal
  const file = Bun.file(`public/uploads/${name}`)
  if (!(await file.exists())) return new Response('Not found', { status: 404 })
  return new Response(file)
}

export const Route = createFileRoute('/uploads/$')({
  server: {
    handlers: {
      GET: handler,
    },
  },
})
