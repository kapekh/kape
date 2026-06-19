import { createFileRoute } from '@tanstack/react-router'

import {
  SESSION_COOKIE,
  authenticate,
  clearSessionCookie,
  createSession,
  parseCookies,
  revokeSession,
  sessionCookie,
  validateToken,
} from '#/server/auth'
import { db } from '#/server/db'

async function handler({ request }: { request: Request }) {
  const url = new URL(request.url)
  const action = url.pathname.replace(/^\/api\/auth\/?/, '')
  const cookies = parseCookies(request.headers.get('cookie'))

  // POST /api/auth/login  { email, password } -> set session cookie
  if (request.method === 'POST' && action === 'login') {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string
      password?: string
    }
    const user = await authenticate(db, String(body.email ?? ''), String(body.password ?? ''))
    if (!user) return Response.json({ error: 'Invalid credentials' }, { status: 401 })
    const { token } = await createSession(db, user.id, request.headers.get('user-agent') ?? undefined)
    return Response.json({ user }, { headers: { 'set-cookie': sessionCookie(token) } })
  }

  // POST /api/auth/logout -> revoke session + clear cookie
  if (request.method === 'POST' && action === 'logout') {
    const auth = await validateToken(db, cookies[SESSION_COOKIE])
    if (auth) await revokeSession(db, auth.sessionId)
    return Response.json({ ok: true }, { headers: { 'set-cookie': clearSessionCookie() } })
  }

  // GET /api/auth/me -> current user or null
  if (action === 'me') {
    const auth = await validateToken(db, cookies[SESSION_COOKIE])
    return Response.json({ user: auth?.user ?? null })
  }

  return Response.json({ error: 'Not found' }, { status: 404 })
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
})
