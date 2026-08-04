import crypto from "node:crypto";

import { env } from "#/env";

/**
 * Baray payment gateway client (https://baray.io).
 *
 * Server-only. Baray is a redirect + webhook gateway: we POST an AES-256-CBC
 * encrypted payload to create a payment "intent", redirect the donor to the
 * hosted pay page, and later receive a webhook with the encrypted order id to
 * confirm the payment. No card data ever touches this app.
 *
 * Docs: https://baray.io/llm.txt
 */

export type BarayConfig = { apiKey: string; sk: string; iv: string };

/** Returns the configured credentials, or null when payments aren't set up. */
export function barayConfig(): BarayConfig | null {
	const { BARAY_API_KEY: apiKey, BARAY_SK: sk, BARAY_IV: iv } = env;
	if (!apiKey || !sk || !iv) return null;
	return { apiKey, sk, iv };
}

export const isBarayConfigured = () => barayConfig() !== null;

function encryptPayload(payload: unknown, sk: string, iv: string): string {
	const key = Buffer.from(sk, "base64");
	const ivBuffer = Buffer.from(iv, "base64");
	const cipher = crypto.createCipheriv("aes-256-cbc", key, ivBuffer);
	const encrypted = Buffer.concat([
		cipher.update(JSON.stringify(payload), "utf8"),
		cipher.final(),
	]);
	return encrypted.toString("base64");
}

/** Decrypt the `encrypted_order_id` sent on the Baray webhook. */
export function decryptOrderId(
	encryptedOrderId: string,
	cfg: BarayConfig,
): string {
	const key = Buffer.from(cfg.sk, "base64");
	const ivBuffer = Buffer.from(cfg.iv, "base64");
	const decipher = crypto.createDecipheriv("aes-256-cbc", key, ivBuffer);
	const decrypted = Buffer.concat([
		decipher.update(Buffer.from(encryptedOrderId, "base64")),
		decipher.final(),
	]);
	return decrypted.toString("utf8");
}

export type IntentInput = {
	amount: string;
	currency: "USD" | "KHR";
	orderId: string;
	successUrl: string;
	tracking?: Record<string, unknown>;
};

export type IntentResult = { intentId: string; redirectUrl: string };

/**
 * Create a payment intent and return the hosted pay-page URL to redirect to.
 * Throws on any non-2xx response or misconfiguration.
 */
export async function createPaymentIntent(
	input: IntentInput,
	cfg: BarayConfig,
): Promise<IntentResult> {
	const payload = {
		amount: input.amount,
		currency: input.currency,
		order_id: input.orderId,
		tracking: input.tracking ?? {},
		custom_success_url: input.successUrl,
	};

	const res = await fetch(`${env.BARAY_API_URL}/pay`, {
		method: "POST",
		headers: { "Content-Type": "application/json", "x-api-key": cfg.apiKey },
		body: JSON.stringify({ data: encryptPayload(payload, cfg.sk, cfg.iv) }),
	});

	if (!res.ok) {
		const detail = await res.text().catch(() => "");
		throw new Error(
			`Baray /pay failed (${res.status}): ${detail.slice(0, 300)}`,
		);
	}

	const intent = (await res.json()) as { _id?: string };
	if (!intent._id) throw new Error("Baray /pay returned no intent id");
	return {
		intentId: intent._id,
		redirectUrl: `${env.BARAY_PAY_URL}/${intent._id}`,
	};
}
