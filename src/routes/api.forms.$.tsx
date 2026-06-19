import { createFileRoute } from '@tanstack/react-router'

import { db } from '#/server/db'
import { sendContactEmail } from '#/server/mail'
import { addSubscriber, createContactSubmission } from '#/server/repo/forms'

function ok(v: unknown) {
  return typeof v === 'string' && v.trim().length > 0
}

async function handler({ request }: { request: Request }) {
  const action = new URL(request.url).pathname.replace(/^\/api\/forms\/?/, '')
  const body = (await request.json().catch(() => ({}))) as Record<string, string>

  if (action === 'contact') {
    if (!ok(body.name) || !ok(body.email) || !ok(body.message)) {
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    }
    await createContactSubmission(db, {
      name: body.name,
      email: body.email,
      phone: body.phone,
      message: body.message,
    })
    try {
      await sendContactEmail({ name: body.name, email: body.email, phone: body.phone, message: body.message })
    } catch (e) {
      console.error('[mail] send failed', e) // submission is still stored
    }
    return Response.json({ ok: true })
  }

  if (action === 'subscribe') {
    if (!ok(body.email)) return Response.json({ error: 'Email required' }, { status: 400 })
    await addSubscriber(db, body.email)
    return Response.json({ ok: true })
  }

  return Response.json({ error: 'Not found' }, { status: 404 })
}

export const Route = createFileRoute('/api/forms/$')({
  server: {
    handlers: {
      POST: handler,
    },
  },
})
