// A donor who bookmarks or reloads the thank-you page must not be told a
// payment succeeded, so the loader only serves an order the gateway knows.
import { isRedirect } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { Route } from "./$lang.donate.success";

type Status = { status: string } | null;

function loadWith(order: string, row: Status) {
	const loader = Route.options.loader as (arg: {
		context: unknown;
		deps: { order: string };
		params: { lang: string };
	}) => Promise<{ status: string | null }>;
	return loader({
		context: {
			queryClient: {
				ensureQueryData: async (opts: { of: string }) =>
					opts.of === "i18n"
						? { strings: { "donate.success.metaTitle": "Thank you" } }
						: row,
			},
			trpc: {
				payments: { status: { queryOptions: () => ({ of: "payment" }) } },
				i18n: { bootstrap: { queryOptions: () => ({ of: "i18n" }) } },
			},
		},
		deps: { order },
		params: { lang: "en" },
	});
}

describe("the donation thank-you loader", () => {
	it("sends a bare visit back to the donate page", async () => {
		const err = await loadWith("", null).catch((e) => e);

		expect(isRedirect(err)).toBe(true);
		expect(err.options.href).toBe("/en/donate");
	});

	it("sends an order nobody placed back to the donate page", async () => {
		const err = await loadWith("made-up-order", null).catch((e) => e);

		expect(isRedirect(err)).toBe(true);
	});

	it("serves the page for a real order", async () => {
		expect(await loadWith("ord_1", { status: "paid" })).toEqual({
			status: "paid",
			metaTitle: "Thank you",
		});
	});
});
