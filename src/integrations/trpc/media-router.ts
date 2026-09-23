import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	adminListMedia,
	adminListMediaPage,
	adminMediaById,
	adminMediaByIds,
	adminMediaByUrl,
	adminMediaStats,
	deleteMedia,
} from "#/server/repo/admin";
import { adminMediaUsage, MediaInUseError } from "#/server/repo/media-usage";
import { adminProcedure } from "./init";

export const adminMediaRouter = {
	list: adminProcedure.query(({ ctx }) => adminListMedia(ctx.db)),
	page: adminProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(30),
				offset: z.number().min(0).default(0),
				query: z.string().optional(),
				type: z.enum(["all", "image", "video", "file"]).default("all"),
			}),
		)
		.query(({ ctx, input }) => adminListMediaPage(ctx.db, input)),
	stats: adminProcedure.query(({ ctx }) => adminMediaStats(ctx.db)),
	byId: adminProcedure
		.input(z.object({ id: z.number() }))
		.query(({ ctx, input }) => adminMediaById(ctx.db, input.id)),
	byIds: adminProcedure
		.input(z.object({ ids: z.array(z.number()) }))
		.query(({ ctx, input }) => adminMediaByIds(ctx.db, input.ids)),
	byUrl: adminProcedure
		.input(z.object({ url: z.string() }))
		.query(({ ctx, input }) => adminMediaByUrl(ctx.db, input.url)),
	usage: adminProcedure
		.input(z.object({ id: z.number() }))
		.query(({ ctx, input }) => adminMediaUsage(ctx.db, input.id)),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			try {
				await deleteMedia(ctx.db, input.id);
			} catch (e) {
				// BAD_REQUEST so the repo's message reaches the operator, not a generic failure
				if (e instanceof MediaInUseError)
					throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
				throw e;
			}
		}),
} satisfies TRPCRouterRecord;
