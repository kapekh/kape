import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "sqlite",
	schema: "./src/server/schema.ts",
	out: "./drizzle",
	dbCredentials: {
		// Must stay in step with the DATABASE_PATH default in src/env.ts. When the two
		// disagree, db:migrate, db:push and db:studio quietly operate on a different
		// file from the one the app runs on, and migrations land where nobody looks.
		url: process.env.DATABASE_PATH ?? "./cms.db",
	},
});
