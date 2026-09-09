import { and, desc, eq } from "drizzle-orm";

import type { DB } from "../db";
import { campaigns, donations } from "../schema";
import { defaultLangText } from "./i18n";

const TENANT = 1;

export type DonorVisibility = "anonymous" | "name" | "custom";

export type NewDonation = {
	campaignId?: number | null;
	orderId: string;
	amount: string;
	currency: string;
	donorName?: string | null;
	donorEmail?: string | null;
	message?: string | null;
	visibility?: DonorVisibility;
	displayName?: string | null;
};

/** Record a pending donation before the donor is sent to Baray. */
export async function createDonation(db: DB, v: NewDonation): Promise<void> {
	await db.insert(donations).values({
		tenantId: TENANT,
		campaignId: v.campaignId ?? null,
		orderId: v.orderId,
		amount: v.amount,
		currency: v.currency,
		status: "pending",
		donorName: v.donorName ?? null,
		donorEmail: v.donorEmail ?? null,
		message: v.message ?? null,
		visibility: v.visibility ?? "anonymous",
		displayName: v.displayName ?? null,
	});
}

/** Attach the Baray intent id once the gateway has accepted the intent. */
export async function setDonationIntent(
	db: DB,
	orderId: string,
	intentId: string,
): Promise<void> {
	await db
		.update(donations)
		.set({ intentId, updatedAt: new Date().toISOString() })
		.where(and(eq(donations.tenantId, TENANT), eq(donations.orderId, orderId)));
}

export async function getDonationByOrderId(db: DB, orderId: string) {
	const [row] = await db
		.select()
		.from(donations)
		.where(and(eq(donations.tenantId, TENANT), eq(donations.orderId, orderId)))
		.limit(1);
	return row ?? null;
}

// idempotent: a repeated webhook is a no-op once paid
export async function markDonationPaid(
	db: DB,
	orderId: string,
	bank: string,
): Promise<boolean> {
	const row = await getDonationByOrderId(db, orderId);
	if (!row) return false;
	if (row.status === "paid") return true;
	await db
		.update(donations)
		.set({
			status: "paid",
			bank,
			paidAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		})
		.where(eq(donations.id, row.id));
	return true;
}

/* ---- Admin ---- */

/** All donations, newest first, for the admin view (with campaign title). */
export async function adminListDonations(db: DB) {
	return db
		.select({
			id: donations.id,
			orderId: donations.orderId,
			amount: donations.amount,
			currency: donations.currency,
			status: donations.status,
			bank: donations.bank,
			donorName: donations.donorName,
			donorEmail: donations.donorEmail,
			message: donations.message,
			visibility: donations.visibility,
			displayName: donations.displayName,
			createdAt: donations.createdAt,
			campaignId: donations.campaignId,
			campaignTitle: defaultLangText("campaign", campaigns.id, "title"),
		})
		.from(donations)
		.leftJoin(campaigns, eq(donations.campaignId, campaigns.id))
		.where(eq(donations.tenantId, TENANT))
		.orderBy(desc(donations.createdAt));
}

/** Donations owned by one campaign, newest first. */
export async function adminListDonationsForCampaign(
	db: DB,
	campaignId: number,
) {
	return db
		.select({
			id: donations.id,
			orderId: donations.orderId,
			amount: donations.amount,
			currency: donations.currency,
			status: donations.status,
			bank: donations.bank,
			donorName: donations.donorName,
			donorEmail: donations.donorEmail,
			message: donations.message,
			visibility: donations.visibility,
			displayName: donations.displayName,
			createdAt: donations.createdAt,
			campaignId: donations.campaignId,
		})
		.from(donations)
		.where(
			and(eq(donations.tenantId, TENANT), eq(donations.campaignId, campaignId)),
		)
		.orderBy(desc(donations.createdAt));
}

/** Whether a campaign has any confirmed (paid) donations — blocks deletion. */
export async function campaignHasPaidDonations(
	db: DB,
	campaignId: number,
): Promise<boolean> {
	const [row] = await db
		.select({ id: donations.id })
		.from(donations)
		.where(
			and(
				eq(donations.tenantId, TENANT),
				eq(donations.campaignId, campaignId),
				eq(donations.status, "paid"),
			),
		)
		.limit(1);
	return !!row;
}

/** Manual reconciliation: mark a donation paid by id (e.g. a missed webhook). */
export async function adminMarkDonationPaid(db: DB, id: number): Promise<void> {
	await db
		.update(donations)
		.set({
			status: "paid",
			bank: "manual",
			paidAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		})
		.where(and(eq(donations.tenantId, TENANT), eq(donations.id, id)));
}
