import { TRPCError, initTRPC } from '@trpc/server'
import superjson from 'superjson'

import { SESSION_COOKIE, parseCookies, validateToken } from '#/server/auth'
import { db } from '#/server/db'
import { clearCache } from '#/server/render-cache'

/**
 * Per-request tRPC context. Exposes the database and the authenticated user
 * (resolved from the session cookie) to every procedure.
 */
export async function createTRPCContext(opts?: { req?: Request }) {
  const cookies = parseCookies(opts?.req?.headers.get('cookie') ?? null)
  const auth = await validateToken(db, cookies[SESSION_COOKIE])
  return { db, user: auth?.user ?? null, sessionId: auth?.sessionId ?? null }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
})

export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

/** Requires a logged-in user. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, user: ctx.user } })
})

/**
 * Requires the admin role. Any admin *mutation* busts the incremental-SSG render
 * cache afterwards, so edits surface on the public site immediately (reads re-warm
 * the cache lazily). Reads pass through untouched.
 */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next, type }) => {
  if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' })
  const result = await next()
  if (type === 'mutation') await clearCache(ctx.db).catch(() => {})
  return result
})

/** Requires staff-portal access (staff or admin). */
export const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'staff' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next()
})
