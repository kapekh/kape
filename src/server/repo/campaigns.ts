import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";

import type { DB } from "../db";
import { campaigns, donations } from "../schema";
import { attachMediaUrl } from "./media-util";

const TENANT = 1;

export type CampaignInput = {
	slug: string;
	status: "active" | "draft" | "ended";
	title: string;
	titleKm: string | null;
	blurb: string | null;
	blurbKm: string | null;
	currency: "USD" | "KHR";
	goalAmount: string | null;
	coverMediaId: number | null;
	presets: number[];
	allowCustom: boolean;
	impactTiers: { amount: number; label: string }[];
	showSupporters: boolean;
	featured: boolean;
	sort: number;
};

export type CampaignProgress = { raised: number; supporters: number };

const localize = <
	T extends {
		title: string;
		titleKm: string | null;
		blurb: string | null;
		blurbKm: string | null;
	},
>(
	c: T,
	lang: string,
) => ({
	title: lang === "km" ? c.titleKm || c.title : c.title,
	blurb: lang === "km" ? c.blurbKm || c.blurb : c.blurb,
});

/** Raised total + supporter count from *paid* donations, per campaign id. */
async function progressByCampaign(
	db: DB,
	ids: number[],
): Promise<Map<number, CampaignProgress>> {
	const map = new Map<number, CampaignProgress>();
	if (!ids.length) return map;
	const rows = await db
		.select({
			campaignId: donations.campaignId,
			raised: sql<number>`coalesce(sum(cast(${donations.amount} as real)), 0)`,
			supporters: sql<number>`count(*)`,
		})
		.from(donations)
		.where(
			and(
				eq(donations.tenantId, TENANT),
				eq(donations.status, "paid"),
				inArray(donations.campaignId, ids),
			),
		)
		.groupBy(donations.campaignId);
	for (const r of rows)
		if (r.campaignId != null)
			map.set(r.campaignId, {
				raised: Number(r.raised) || 0,
				supporters: Number(r.supporters) || 0,
			});
	return map;
}

function publicShape(
	row: typeof campaigns.$inferSelect & { coverUrl: string | null },
	lang: string,
	prog: CampaignProgress | undefined,
) {
	return {
		id: row.id,
		slug: row.slug,
		status: row.status,
		...localize(row, lang),
		currency: row.currency,
		goalAmount: row.goalAmount != null ? Number(row.goalAmount) : null,
		coverUrl: row.coverUrl,
		presets: row.presets ?? [],
		allowCustom: row.allowCustom,
		impactTiers: row.impactTiers ?? [],
		showSupporters: row.showSupporters,
		featured: row.featured,
		raised: prog?.raised ?? 0,
		supporters: prog?.supporters ?? 0,
	};
}

export type CampaignPublic = ReturnType<typeof publicShape>;

/** Active campaigns for the public donate hub — featured first, then sort. */
export async function listActiveCampaigns(
	db: DB,
	lang: string,
): Promise<CampaignPublic[]> {
	const rows = await db
		.select()
		.from(campaigns)
		.where(and(eq(campaigns.tenantId, TENANT), eq(campaigns.status, "active")))
		.orderBy(desc(campaigns.featured), asc(campaigns.sort), asc(campaigns.id));
	const withUrl = await attachMediaUrl(db, rows, "coverMediaId", "coverUrl");
	const prog = await progressByCampaign(
		db,
		rows.map((r) => r.id),
	);
	return withUrl.map((r) => publicShape(r, lang, prog.get(r.id)));
}

/** A single campaign (active or ended) plus its recent public supporters. */
export async function getCampaignBySlug(db: DB, slug: string, lang: string) {
	const [row] = await db
		.select()
		.from(campaigns)
		.where(
			and(
				eq(campaigns.tenantId, TENANT),
				eq(campaigns.slug, slug),
				ne(campaigns.status, "draft"),
			),
		)
		.limit(1);
	if (!row) return null;
	const [withUrl] = await attachMediaUrl(db, [row], "coverMediaId", "coverUrl");
	const prog = (await progressByCampaign(db, [row.id])).get(row.id);
	const recentSupporters = row.showSupporters
		? await listSupporters(db, row.id, 12)
		: [];
	return { ...publicShape(withUrl, lang, prog), recentSupporters };
}

/** Recent paid, non-anonymous donors for the supporters wall. */
export async function listSupporters(db: DB, campaignId: number, limit = 12) {
	const rows = await db
		.select({
			displayName: donations.displayName,
			amount: donations.amount,
			currency: donations.currency,
			message: donations.message,
			paidAt: donations.paidAt,
		})
		.from(donations)
		.where(
			and(
				eq(donations.tenantId, TENANT),
				eq(donations.campaignId, campaignId),
				eq(donations.status, "paid"),
				ne(donations.visibility, "anonymous"),
			),
		)
		.orderBy(desc(donations.paidAt))
		.limit(limit);
	return rows
		.filter((r) => r.displayName)
		.map((r) => ({
			name: r.displayName as string,
			amount: Number(r.amount) || 0,
			currency: r.currency,
			message: r.message,
			paidAt: r.paidAt,
		}));
}

/** Resolve an active campaign for a donation (payment route). Null if missing/closed. */
export async function getActiveCampaignBySlug(db: DB, slug: string) {
	const [row] = await db
		.select()
		.from(campaigns)
		.where(
			and(
				eq(campaigns.tenantId, TENANT),
				eq(campaigns.slug, slug),
				eq(campaigns.status, "active"),
			),
		)
		.limit(1);
	return row ?? null;
}

/* ---- Admin ---- */

export async function adminListCampaigns(db: DB) {
	const rows = await db
		.select()
		.from(campaigns)
		.where(eq(campaigns.tenantId, TENANT))
		.orderBy(desc(campaigns.featured), asc(campaigns.sort), asc(campaigns.id));
	const withUrl = await attachMediaUrl(db, rows, "coverMediaId", "coverUrl");
	const prog = await progressByCampaign(
		db,
		rows.map((r) => r.id),
	);
	return withUrl.map((r) => ({
		...r,
		goalAmount: r.goalAmount != null ? Number(r.goalAmount) : null,
		raised: prog.get(r.id)?.raised ?? 0,
		supporters: prog.get(r.id)?.supporters ?? 0,
	}));
}

export async function getCampaignForEdit(db: DB, id: number) {
	const [row] = await db
		.select()
		.from(campaigns)
		.where(and(eq(campaigns.tenantId, TENANT), eq(campaigns.id, id)))
		.limit(1);
	if (!row) return null;
	const [withUrl] = await attachMediaUrl(db, [row], "coverMediaId", "coverUrl");
	return withUrl;
}

/** Keep at most one featured campaign — clear others when this one is featured. */
async function clearOtherFeatured(db: DB, keepId: number | null) {
	const cond =
		keepId == null
			? and(eq(campaigns.tenantId, TENANT), eq(campaigns.featured, true))
			: and(
					eq(campaigns.tenantId, TENANT),
					eq(campaigns.featured, true),
					ne(campaigns.id, keepId),
				);
	await db.update(campaigns).set({ featured: false }).where(cond);
}

export async function createCampaign(
	db: DB,
	input: CampaignInput,
): Promise<number> {
	const [r] = await db
		.insert(campaigns)
		.values({ tenantId: TENANT, ...input })
		.returning({ id: campaigns.id });
	if (input.featured) await clearOtherFeatured(db, r.id);
	return r.id;
}

export async function updateCampaign(
	db: DB,
	id: number,
	input: CampaignInput,
): Promise<void> {
	await db
		.update(campaigns)
		.set({ ...input, updatedAt: new Date().toISOString() })
		.where(and(eq(campaigns.tenantId, TENANT), eq(campaigns.id, id)));
	if (input.featured) await clearOtherFeatured(db, id);
}

export async function deleteCampaign(db: DB, id: number): Promise<void> {
	// Donations are OWNED by their campaign. A campaign with confirmed (paid)
	// gifts can't be deleted — that would lose financial records; end it instead.
	const [paid] = await db
		.select({ id: donations.id })
		.from(donations)
		.where(
			and(
				eq(donations.tenantId, TENANT),
				eq(donations.campaignId, id),
				eq(donations.status, "paid"),
			),
		)
		.limit(1);
	if (paid) {
		throw new Error(
			"This campaign has confirmed donations and can't be deleted. Set its status to “Ended” instead to preserve the records.",
		);
	}
	// No paid gifts: remove the campaign and its pending/failed attempts together
	// (no orphaned donations left behind).
	await db
		.delete(donations)
		.where(and(eq(donations.tenantId, TENANT), eq(donations.campaignId, id)));
	await db
		.delete(campaigns)
		.where(and(eq(campaigns.tenantId, TENANT), eq(campaigns.id, id)));
}
