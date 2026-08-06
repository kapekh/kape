import { z } from "zod";

/**
 * Server-only environment configuration.
 *
 * Import this from server modules only (db, storage, tRPC procedures).
 * Never import it into client/route components — it reads `process.env`
 * and would leak credentials into the browser bundle.
 */
const INSECURE_DEFAULT_SECRET = "dev-insecure-secret-change-me-please-32b";

const envSchema = z.object({
	// Local SQLite file used by Bun's built-in SQL engine.
	DATABASE_PATH: z.string().min(1).default("./cms.db"),

	// Secret used to sign session JWTs. MUST be overridden in production and kept
	// constant across restarts — otherwise existing logins are invalidated.
	AUTH_SECRET: z.string().min(16).default(INSECURE_DEFAULT_SECRET),

	// Name of the proxy header carrying the real client IP (e.g. "cf-connecting-ip"
	// or "x-forwarded-for"). Rate limiting keys on the client address, and any such
	// header is caller-controlled, so it is honoured ONLY when set here — meaning
	// the operator declares a proxy sits in front and the app is not reachable
	// directly. Unset (the default) uses the socket peer address and ignores all
	// proxy headers.
	TRUSTED_PROXY_HEADER: z
		.string()
		.trim()
		.toLowerCase()
		.min(1)
		.optional()
		.catch(undefined),

	// Cloudflare R2 (S3-compatible). Optional in dev; required to use storage.
	R2_ACCOUNT_ID: z.string().optional(),
	R2_ACCESS_KEY_ID: z.string().optional(),
	R2_SECRET_ACCESS_KEY: z.string().optional(),
	R2_BUCKET: z.string().optional(),
	// Public base URL for serving objects (custom domain or r2.dev), optional.
	R2_PUBLIC_URL: z.string().url().optional(),

	// SMTP (e.g. Gmail) for the contact form. Optional in dev — when unset,
	// submissions are stored and the email is logged instead of sent.
	SMTP_HOST: z.string().optional(),
	SMTP_PORT: z.coerce.number().optional(),
	SMTP_USER: z.string().optional(),
	SMTP_PASS: z.string().optional(),
	MAIL_FROM: z.string().optional(),
	MAIL_TO: z.string().default(""),

	// Baray payment gateway (https://baray.io) for donations. All three of
	// API_KEY/SK/IV are required to accept payments; when unset the donate flow
	// returns a clear "payments not configured" error and stores nothing.
	// SK (32-byte) and IV (16-byte) are Base64 and used for AES-256-CBC of the
	// request payload + webhook order id. Generate them in https://dash.baray.io.
	BARAY_API_KEY: z.string().optional(),
	BARAY_SK: z.string().optional(),
	BARAY_IV: z.string().optional(),
	BARAY_API_URL: z.string().url().default("https://api.baray.io"),
	BARAY_PAY_URL: z.string().url().default("https://pay.baray.io"),
});

export const env = envSchema.parse(process.env);

// The built-in default secret is publicly known (it's in the source), so anyone
// could forge session tokens. Refuse to boot with it in production; in dev just
// warn loudly. Set a fixed AUTH_SECRET in .env (see .env.example) to pin it.
if (env.AUTH_SECRET === INSECURE_DEFAULT_SECRET) {
	if (process.env.NODE_ENV === "production") {
		throw new Error(
			"[auth] AUTH_SECRET is not set. Refusing to start in production with the insecure " +
				"built-in default (session tokens would be forgeable). Set AUTH_SECRET in the " +
				"environment — generate one with: bun -e \"console.log(Array.from(crypto.getRandomValues(new Uint8Array(48))).map(b=>b.toString(16).padStart(2,'0')).join(''))\"",
		);
	}
	console.warn(
		"[auth] AUTH_SECRET is unset — using the insecure built-in default. " +
			"Set a fixed AUTH_SECRET in .env so logins persist securely across restarts.",
	);
}

export type Env = typeof env;
