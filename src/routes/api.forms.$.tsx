import { createFileRoute } from '@tanstack/react-router'

import { db } from '#/server/db'
import { sendContactEmail } from '#/server/mail'
import { clientIp, rateLimit } from '#/server/ratelimit'
import { addSubscriber, createContactSubmission } from '#/server/repo/forms'

function ok(v: unknown) {
  return typeof v === 'string' && v.trim().length > 0
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const validEmail = (v: unknown) => typeof v === 'string' && EMAIL_RE.test(v.trim()) && v.length <= 254

async function handler({ request }: { request: Request }) {
  const action = new URL(request.url).pathname.replace(/^\/api\/forms\/?/, '')
  const body = (await request.json().catch(() => ({}))) as Record<string, string>

  // Honeypot: a hidden field real users never fill. Pretend success so bots
  // don't learn they were caught, but store nothing.
  if (ok(body.company)) return Response.json({ ok: true })

  // Abuse control: cap submissions per IP. 429 tells well-behaved clients to back off.
  const ip = clientIp(request)
  if (!rateLimit(`forms:${action}:${ip}`, 5, 60_000)) {
    return Response.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  if (action === 'contact') {
    if (!ok(body.name) || !validEmail(body.email) || !ok(body.message)) {
      return Response.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }
    await createContactSubmission(db, {
      name: body.name.slice(0, 200),
      email: body.email.trim(),
      phone: body.phone?.slice(0, 50),
      message: body.message.slice(0, 5000),
    })
    try {
      await sendContactEmail({ name: body.name, email: body.email, phone: body.phone, message: body.message })
    } catch (e) {
      console.error('[mail] send failed', e) // submission is still stored
    }
    return Response.json({ ok: true })
  }

  if (action === 'subscribe') {
    if (!validEmail(body.email)) return Response.json({ error: 'Valid email required' }, { status: 400 })
    await addSubscriber(db, body.email.trim())
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
