import { z } from "zod";

// server only: it reads process.env and would leak credentials into the client bundle
const INSECURE_DEFAULT_SECRET = "dev-insecure-secret-change-me-please-32b";

const envSchema = z.object({
	// Local SQLite file used by Bun's built-in SQL engine.
	DATABASE_PATH: z.string().min(1).default("./cms.db"),

	// Managed libSQL (Turso, as KOOMPI Cloud provides). When set, it is used
	// instead of DATABASE_PATH. libsql://… or https://…, with its token.
	TURSO_DATABASE_URL: z.string().min(1).optional(),
	TURSO_AUTH_TOKEN: z.string().min(1).optional(),

	// Secret used to sign session JWTs. MUST be overridden in production and kept
	// constant across restarts — otherwise existing logins are invalidated.
	AUTH_SECRET: z.string().min(16).default(INSECURE_DEFAULT_SECRET),

	// caller-controlled header, honoured only when the operator names one; else the socket peer
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

	// unset in dev: submissions are stored and the mail is logged, not sent
	SMTP_HOST: z.string().optional(),
	SMTP_PORT: z.coerce.number().optional(),
	SMTP_USER: z.string().optional(),
	SMTP_PASS: z.string().optional(),
	MAIL_FROM: z.string().optional(),
	MAIL_TO: z.string().default(""),

	// all three required to take payments; SK/IV are base64 AES-256-CBC material from dash.baray.io
	BARAY_API_KEY: z.string().optional(),
	BARAY_SK: z.string().optional(),
	BARAY_IV: z.string().optional(),
	BARAY_API_URL: z.string().url().default("https://api.baray.io"),
	BARAY_PAY_URL: z.string().url().default("https://pay.baray.io"),
});

export const env = envSchema.parse(process.env);

// the default secret is in the source, so anyone could forge session tokens
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
