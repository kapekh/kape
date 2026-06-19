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
	DATABASE_PATH: z.string().min(1).default("./kape.db"),

	// Secret used to sign session JWTs. MUST be overridden in production and kept
	// constant across restarts — otherwise existing logins are invalidated.
	AUTH_SECRET: z.string().min(16).default(INSECURE_DEFAULT_SECRET),

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
	MAIL_TO: z.string().default("kape@kapekh.org"),
});

export const env = envSchema.parse(process.env);

// Loud warning: the built-in default secret means logins only survive restarts
// by luck. Set AUTH_SECRET in .env (see .env.example) to pin it.
if (env.AUTH_SECRET === INSECURE_DEFAULT_SECRET) {
	console.warn(
		"[auth] AUTH_SECRET is unset — using the insecure built-in default. " +
			"Set a fixed AUTH_SECRET in .env so logins persist securely across restarts.",
	);
}

export type Env = typeof env;
