import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// against a real installed database: what makes a gift possible is a campaign row,
// the module setting and the payment credentials, so only the real ones prove it
const dir = mkdtempSync(join(tmpdir(), "donate-open-"));
const dbPath = join(dir, "donate.db");
const root = process.cwd();

afterAll(() => rmSync(dir, { recursive: true, force: true }));

execFileSync("bun", ["src/server/install.ts"], {
	env: {
		...process.env,
		DATABASE_PATH: dbPath,
		SITE_NAME: "Test Org",
		ADMIN_EMAIL: "owner@test.example",
		ADMIN_PASSWORD: "test-install-password",
		SSG_CACHE: "off",
	},
	encoding: "utf8",
});

const PAID_UP = {
	BARAY_API_KEY: "test-key",
	BARAY_SK: "dGVzdC1zZWNyZXQ=",
	BARAY_IV: "dGVzdC1pdg==",
};

/** Set the database up with `sql`, then run `answer` against it and read the JSON back. */
function run<T>(sql: string, answer: string, env: Record<string, string>): T {
	const out = execFileSync(
		"bun",
		[
			"-e",
			`import { db } from "${root}/src/server/db.ts";
			 import { donationsOpen } from "${root}/src/server/donate-open.ts";
			 import { getSettings } from "${root}/src/server/repo/site.ts";
			 import { createTRPCContext } from "${root}/src/integrations/trpc/init.ts";
			 import { trpcRouter } from "${root}/src/integrations/trpc/router.ts";
			 const exec = (s) => db.$client.query(s).run();

			 exec("delete from campaigns");
			 exec("delete from site_settings where key = 'enabled_modules'");
			 ${sql}

			 console.log(JSON.stringify(${answer}));`,
		],
		{
			env: {
				...process.env,
				BARAY_API_KEY: "",
				BARAY_SK: "",
				BARAY_IV: "",
				...env,
				DATABASE_PATH: dbPath,
				SSG_CACHE: "off",
			},
			encoding: "utf8",
		},
	);
	return JSON.parse(out.trim().split("\n").at(-1) as string) as T;
}

/** The definition itself. */
const isOpen = (sql: string, env: Record<string, string> = PAID_UP): boolean =>
	run<boolean>(sql, "await donationsOpen(db, await getSettings(db))", env);

/** What `site.settings` actually puts on the wire, which is what the header reads. */
const flagsOnTheWire = (
	sql: string,
	env: Record<string, string> = PAID_UP,
): Record<string, string | undefined> =>
	run<Record<string, string | undefined>>(
		sql,
		`await (async () => {
			 const caller = trpcRouter.createCaller(await createTRPCContext());
			 const s = await caller.site.settings();
			 return { donate_open: s.donate_open, donate_payments: s.donate_payments };
		 })()`,
		env,
	);

const campaign = (slug: string, status: string) =>
	`exec("insert into campaigns (tenant_id, slug, status, currency) values (1, '${slug}', '${status}', 'USD')");`;

const modules = (ids: string) =>
	`exec("insert into site_settings (tenant_id, key, value) values (1, 'enabled_modules', '${ids}')");`;

describe("can a visitor give anything right now", () => {
	it("yes, once a campaign is published", () => {
		expect(isOpen(campaign("classrooms", "active"))).toBe(true);
	});

	it("no, with no campaign at all", () => {
		expect(isOpen("")).toBe(false);
	});

	it("no, while every campaign is still a draft or already ended", () => {
		expect(
			isOpen(campaign("draft-one", "draft") + campaign("old-one", "ended")),
		).toBe(false);
	});

	it("no, when the fundraising module is off", () => {
		expect(
			isOpen(campaign("classrooms", "active") + modules("projects,partners")),
		).toBe(false);
	});

	it("yes again when fundraising is among the modules that are on", () => {
		expect(
			isOpen(
				campaign("classrooms", "active") + modules("projects,fundraising"),
			),
		).toBe(true);
	});

	it("no, when payments are not configured — the gift would 503 at the gateway", () => {
		expect(isOpen(campaign("classrooms", "active"), {})).toBe(false);
	});
});

// the header reads the flag off site.settings, so the wiring is the behaviour
describe("what site.settings puts on the wire", () => {
	it("says the site is open once a campaign is published", () => {
		expect(flagsOnTheWire(campaign("classrooms", "active"))).toEqual({
			donate_open: "1",
			donate_payments: "1",
		});
	});

	it("says it is closed with nothing to give to", () => {
		expect(flagsOnTheWire("")).toEqual({
			donate_open: "",
			donate_payments: "1",
		});
	});

	it("separates the credential leg from the rest", () => {
		expect(flagsOnTheWire(campaign("classrooms", "active"), {})).toEqual({
			donate_open: "",
			donate_payments: "",
		});
	});
});
