import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

import { moduleForRouter, routerEnabled } from "#/lib/modules";
import { hasAdminArea, ROUTER_AREA } from "#/lib/permissions";
import { parseCookies, SESSION_COOKIE, validateToken } from "#/server/auth";
import { db } from "#/server/db";
import { clearCache } from "#/server/render-cache";
import { resolvePermissions } from "#/server/repo/roles";
import { getSettings } from "#/server/repo/site";
import { readableInputError } from "./errors";

export async function createTRPCContext(opts?: { req?: Request }) {
	const cookies = parseCookies(opts?.req?.headers.get("cookie") ?? null);
	const auth = await validateToken(db, cookies[SESSION_COOKIE]);
	const perms = auth?.user
		? await resolvePermissions(db, auth.user.role)
		: { permissions: [], isSuperAdmin: false };
	return {
		db,
		user: auth?.user ?? null,
		sessionId: auth?.sessionId ?? null,
		permissions: perms.permissions,
		isSuperAdmin: perms.isSuperAdmin,
	};
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
	transformer: superjson,
	// the default message is the issue list as JSON, which forms show verbatim
	errorFormatter({ shape, error }) {
		const message = readableInputError(error.cause);
		return message ? { ...shape, message } : shape;
	},
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

/** Requires a logged-in user. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
	return next({ ctx: { ...ctx, user: ctx.user } });
});

// any admin mutation busts the SSG render cache, so edits surface publicly at once
export const adminProcedure = protectedProcedure.use(
	async ({ ctx, next, type, path }) => {
		// `path` is "<routerKey>.<proc>".
		const routerKey = path.split(".")[0];
		// A domain module this install never turned on has no API at all, whatever
		// the caller's role. Only a router that belongs to one pays for the lookup.
		if (moduleForRouter(routerKey)) {
			if (!routerEnabled(await getSettings(ctx.db), routerKey))
				throw new TRPCError({ code: "FORBIDDEN" });
		}
		if (!ctx.isSuperAdmin) {
			// The router key maps to a permission area.
			// The dashboard overview is the shared landing — any admin user may read it.
			if (routerKey === "admin") {
				if (!hasAdminArea(ctx.permissions))
					throw new TRPCError({ code: "FORBIDDEN" });
			} else {
				const area = ROUTER_AREA[routerKey];
				// Unmapped admin routers default to deny for non-super users.
				if (!area || !ctx.permissions.includes(area)) {
					throw new TRPCError({ code: "FORBIDDEN" });
				}
			}
		}
		const result = await next();
		if (type === "mutation") await clearCache(ctx.db).catch(() => {});
		return result;
	},
);
