import { createFileRoute } from '@tanstack/react-router'

import { SESSION_COOKIE, parseCookies, validateToken } from '#/server/auth'
import { db } from '#/server/db'
import { createMediaRecord } from '#/server/repo/admin'
import { saveUpload } from '#/server/storage'

async function handler({ request }: { request: Request }) {
  const url = new URL(request.url)
  const action = url.pathname.replace(/^\/api\/media\/?/, '')

  // Admin only.
  const cookies = parseCookies(request.headers.get('cookie'))
  const auth = await validateToken(db, cookies[SESSION_COOKIE])
  if (!auth || auth.user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (request.method === 'POST' && action === 'upload') {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return Response.json({ error: 'No file' }, { status: 400 })
    const bytes = new Uint8Array(await file.arrayBuffer())
    const ext = file.name.split('.').pop() || file.type.split('/').pop() || 'bin'
    const stored = await saveUpload(bytes, file.type || 'application/octet-stream', ext)
    const id = await createMediaRecord(db, {
      r2Key: stored.key,
      url: stored.url,
      contentType: file.type,
      size: file.size,
    })
    return Response.json({ id, url: stored.url })
  }

  return Response.json({ error: 'Not found' }, { status: 404 })
}

export const Route = createFileRoute('/api/media/$')({
  server: {
    handlers: {
      POST: handler,
    },
  },
})
