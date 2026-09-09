import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";

import type { DB } from "../db";
import { campaigns, donations } from "../schema";
import {
	deleteEntityText,
	type EntityText,
	readEntityText,
	requireDefaultText,
	resolveTranslations,
	writeEntityText,
} from "./i18n";
import { attachMediaUrl } from "./media-util";

const TENANT = 1;

/** Campaign text that lives in `translations`, not in a column of `campaigns`. */
export const CAMPAIGN_TEXT_FIELDS = ["title", "blurb"] as const;
export type CampaignText = EntityText<(typeof CAMPAIGN_TEXT_FIELDS)[number]>;

export type CampaignInput = {
	slug: string;
	status: "active" | "draft" | "ended";
	currency: "USD" | "KHR";
	goalAmount: string | null;
	coverMediaId: number | null;
	presets: number[];
	allowCustom: boolean;
	impactTiers: { amount: number; label: string }[];
	showSupporters: boolean;
	featured: boolean;
	sort: number;
	translations: CampaignText[];
};

export type CampaignProgress = { raised: number; supporters: number };

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
	text: Record<string, string> | undefined,
	prog: CampaignProgress | undefined,
) {
	return {
		id: row.id,
		slug: row.slug,
		status: row.status,
		title: text?.title ?? "",
		blurb: text?.blurb ?? null,
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
	const ids = rows.map((r) => r.id);
	const prog = await progressByCampaign(db, ids);
	const text = await resolveTranslations(db, "campaign", ids, lang);
	return withUrl.map((r) => publicShape(r, text.get(r.id), prog.get(r.id)));
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
	const text = await resolveTranslations(db, "campaign", [row.id], lang);
	const recentSupporters = row.showSupporters
		? await listSupporters(db, row.id, 12)
		: [];
	return { ...publicShape(withUrl, text.get(row.id), prog), recentSupporters };
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
	const ids = rows.map((r) => r.id);
	const prog = await progressByCampaign(db, ids);
	const { textOf } = await readEntityText(db, "campaign", ids);
	return withUrl.map((r) => {
		const { text } = textOf(r.id);
		return {
			...r,
			title: text.title ?? "",
			blurb: text.blurb ?? "",
			goalAmount: r.goalAmount != null ? Number(r.goalAmount) : null,
			raised: prog.get(r.id)?.raised ?? 0,
			supporters: prog.get(r.id)?.supporters ?? 0,
		};
	});
}

export async function getCampaignForEdit(db: DB, id: number) {
	const [row] = await db
		.select()
		.from(campaigns)
		.where(and(eq(campaigns.tenantId, TENANT), eq(campaigns.id, id)))
		.limit(1);
	if (!row) return null;
	const [withUrl] = await attachMediaUrl(db, [row], "coverMediaId", "coverUrl");
	const { text, byLang } = (await readEntityText(db, "campaign", [id])).textOf(
		id,
	);
	return { ...withUrl, title: text.title ?? "", translations: byLang };
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
	const { translations: text, ...cols } = input;
	await requireDefaultText(db, text, "campaign", "title");
	const [r] = await db
		.insert(campaigns)
		.values({ tenantId: TENANT, ...cols })
		.returning({ id: campaigns.id });
	await writeEntityText(db, "campaign", r.id, CAMPAIGN_TEXT_FIELDS, text);
	if (input.featured) await clearOtherFeatured(db, r.id);
	return r.id;
}

export async function updateCampaign(
	db: DB,
	id: number,
	input: CampaignInput,
): Promise<void> {
	const { translations: text, ...cols } = input;
	await requireDefaultText(db, text, "campaign", "title");
	await db
		.update(campaigns)
		.set({ ...cols, updatedAt: new Date().toISOString() })
		.where(and(eq(campaigns.tenantId, TENANT), eq(campaigns.id, id)));
	await writeEntityText(db, "campaign", id, CAMPAIGN_TEXT_FIELDS, text);
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
	await deleteEntityText(db, "campaign", id);
	await db
		.delete(campaigns)
		.where(and(eq(campaigns.tenantId, TENANT), eq(campaigns.id, id)));
}
