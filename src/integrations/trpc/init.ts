import { TRPCError, initTRPC } from '@trpc/server'
import superjson from 'superjson'

import { ROUTER_AREA } from '#/lib/permissions'
import { SESSION_COOKIE, parseCookies, validateToken } from '#/server/auth'
import { db } from '#/server/db'
import { clearCache } from '#/server/render-cache'
import { resolvePermissions } from '#/server/repo/roles'

/**
 * Per-request tRPC context. Exposes the database, the authenticated user
 * (resolved from the session cookie), and the user's effective permission areas
 * (resolved from their role; `admin` is the super-role with everything).
 */
export async function createTRPCContext(opts?: { req?: Request }) {
  const cookies = parseCookies(opts?.req?.headers.get('cookie') ?? null)
  const auth = await validateToken(db, cookies[SESSION_COOKIE])
  const perms = auth?.user ? await resolvePermissions(db, auth.user.role) : { permissions: [], isSuperAdmin: false }
  return {
    db,
    user: auth?.user ?? null,
    sessionId: auth?.sessionId ?? null,
    permissions: perms.permissions,
    isSuperAdmin: perms.isSuperAdmin,
  }
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
export const adminProcedure = protectedProcedure.use(async ({ ctx, next, type, path }) => {
  if (!ctx.isSuperAdmin) {
    // `path` is "<routerKey>.<proc>"; the router key maps to a permission area.
    const routerKey = path.split('.')[0]
    // The dashboard overview is the shared landing — any admin user may read it.
    if (routerKey === 'admin') {
      if (ctx.permissions.length === 0) throw new TRPCError({ code: 'FORBIDDEN' })
    } else {
      const area = ROUTER_AREA[routerKey]
      // Unmapped admin routers default to deny for non-super users.
      if (!area || !ctx.permissions.includes(area)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
    }
  }
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
