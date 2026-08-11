import { createFileRoute } from "@tanstack/react-router";

import {
	barayConfig,
	createPaymentIntent,
	decryptOrderId,
} from "#/server/baray";
import { db } from "#/server/db";
import { siteOrigin } from "#/server/origin";
import { clientIp, rateLimit } from "#/server/ratelimit";
import { getActiveCampaignBySlug } from "#/server/repo/campaigns";
import {
	createDonation,
	type DonorVisibility,
	markDonationPaid,
	setDonationIntent,
} from "#/server/repo/donations";

// Smallest accepted gift per currency (Baray: USD ≥ $0.03, KHR ≥ 100).
const MIN = { USD: 0.03, KHR: 100 } as const;

/** Format an amount the way Baray expects: 2dp for USD, whole riel for KHR. */
function formatAmount(value: number, currency: "USD" | "KHR"): string {
	return currency === "USD" ? value.toFixed(2) : String(Math.round(value));
}

/** Donor starts a payment → create a Baray intent, return the hosted-page URL. */
async function startDonation(request: Request): Promise<Response> {
	const cfg = barayConfig();
	if (!cfg) {
		return Response.json(
			{ error: "Donations are not configured yet. Please check back soon." },
			{ status: 503 },
		);
	}

	const ip = clientIp(request);
	if (!rateLimit(`pay:donate:${ip}`, 8, 60_000)) {
		return Response.json(
			{ error: "Too many attempts. Please try again shortly." },
			{ status: 429 },
		);
	}

	const body = (await request.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;

	// Every donation belongs to an active campaign; the campaign fixes the currency.
	const slug = typeof body.campaign === "string" ? body.campaign : "";
	const campaign = slug ? await getActiveCampaignBySlug(db, slug) : null;
	if (!campaign) {
		return Response.json(
			{ error: "This campaign is not accepting donations right now." },
			{ status: 404 },
		);
	}
	const currency = campaign.currency === "KHR" ? "KHR" : "USD";
	const value = Number(body.amount);
	if (!Number.isFinite(value) || value < MIN[currency]) {
		return Response.json(
			{
				error: `Minimum donation is ${currency === "USD" ? "$0.03" : "100 KHR"}.`,
			},
			{ status: 400 },
		);
	}

	const name =
		typeof body.name === "string" ? body.name.slice(0, 200).trim() : "";
	const email =
		typeof body.email === "string" ? body.email.slice(0, 254).trim() : "";
	const message =
		typeof body.message === "string" ? body.message.slice(0, 1000) : undefined;

	// How to credit the donor on the public supporters wall.
	const visibility: DonorVisibility =
		body.visibility === "name"
			? "name"
			: body.visibility === "custom"
				? "custom"
				: "anonymous";
	const customName =
		typeof body.displayName === "string"
			? body.displayName.slice(0, 80).trim()
			: "";
	const displayName =
		visibility === "name"
			? name || null
			: visibility === "custom"
				? customName || null
				: null;

	const orderId = `ORD-${crypto.randomUUID()}`;
	const amount = formatAmount(value, currency);

	await createDonation(db, {
		campaignId: campaign.id,
		orderId,
		amount,
		currency,
		donorName: name || undefined,
		donorEmail: email || undefined,
		message,
		visibility,
		displayName,
	});

	try {
		const { intentId, redirectUrl } = await createPaymentIntent(
			{
				amount,
				currency,
				orderId,
				successUrl: `${siteOrigin(request)}/donate/success?order=${encodeURIComponent(orderId)}`,
				tracking: { campaign: campaign.slug, donor: name, email },
			},
			cfg,
		);
		await setDonationIntent(db, orderId, intentId);
		return Response.json({ redirectUrl });
	} catch (e) {
		console.error("[baray] create intent failed", e);
		return Response.json(
			{ error: "Could not start the payment. Please try again." },
			{ status: 502 },
		);
	}
}

/** Baray webhook: confirms a completed payment. Body: { encrypted_order_id, bank }. */
async function handleWebhook(request: Request): Promise<Response> {
	const cfg = barayConfig();
	if (!cfg) return Response.json({ error: "not configured" }, { status: 503 });

	// baray sends no signature (see llm.txt); decrypting under the shared key is the only proof of origin, so throttle it as a decrypt oracle
	const ip = clientIp(request);
	if (!rateLimit(`pay:webhook:${ip}`, 120, 60_000)) {
		return Response.json({ error: "rate limited" }, { status: 429 });
	}

	const body = (await request.json().catch(() => ({}))) as {
		encrypted_order_id?: string;
		bank?: string;
	};
	if (!body.encrypted_order_id) {
		return Response.json(
			{ error: "missing encrypted_order_id" },
			{ status: 400 },
		);
	}

	let orderId: string;
	try {
		orderId = decryptOrderId(body.encrypted_order_id, cfg);
	} catch (e) {
		console.error("[baray] webhook decrypt failed", e);
		return Response.json({ error: "invalid payload" }, { status: 400 });
	}

	const bank = typeof body.bank === "string" ? body.bank : "unknown";
	const matched = await markDonationPaid(db, orderId, bank);
	if (!matched) {
		// Unknown order — acknowledge so Baray stops retrying, but flag it.
		console.warn("[baray] webhook for unknown order", orderId);
		return Response.json({ ok: true, matched: false });
	}
	return Response.json({ ok: true });
}

async function handler({ request }: { request: Request }): Promise<Response> {
	const action = new URL(request.url).pathname.replace(/^\/api\/pay\/?/, "");
	if (action === "donate") return startDonation(request);
	if (action === "webhook") return handleWebhook(request);
	return Response.json({ error: "Not found" }, { status: 404 });
}

export const Route = createFileRoute("/api/pay/$")({
	server: {
		handlers: {
			POST: handler,
		},
	},
});
