import { describe, expect, it } from "vitest";

import {
	dbTime,
	type PathFacts,
	staleReason,
} from "../../scripts/prerender-static";

const RENDERED = Date.parse("2026-08-13T02:00:00.000Z");

const facts = (over: Partial<PathFacts> = {}): PathFacts => ({
	renderedAt: RENDERED,
	contentAt: Date.parse("2026-08-12T09:00:00.000Z"),
	builtAt: Date.parse("2026-08-12T09:30:00.000Z"),
	marks: { chrome: "aaaa" },
	recorded: { chrome: "aaaa" },
	hasRow: true,
	...over,
});

describe("dbTime", () => {
	it("reads both stamps the column holds", () => {
		expect(dbTime("2026-08-12 16:58:14")).toBe(
			Date.parse("2026-08-12T16:58:14Z"),
		);
		expect(dbTime("2026-08-13T02:35:50.903Z")).toBe(
			Date.parse("2026-08-13T02:35:50.903Z"),
		);
	});

	it("orders a sqlite stamp against an app stamp", () => {
		const seeded = dbTime("2026-08-04 04:43:13") as number;
		const saved = dbTime("2026-08-13T02:35:50.903Z") as number;
		expect(saved).toBeGreaterThan(seeded);
	});

	it("is null for nothing and for junk", () => {
		expect(dbTime(null)).toBeNull();
		expect(dbTime("")).toBeNull();
		expect(dbTime("last tuesday")).toBeNull();
	});
});

describe("staleReason", () => {
	it("skips a file newer than everything it renders", () => {
		expect(staleReason(facts())).toBeNull();
	});

	it("regenerates a path with no file", () => {
		expect(staleReason(facts({ renderedAt: null }))).toBe("no file");
	});

	it("regenerates a save that landed after the render", () => {
		const reason = staleReason(
			facts({ contentAt: Date.parse("2026-08-13T02:35:50.903Z") }),
		);
		expect(reason).toContain("2026-08-13T02:35:50.903Z");
		expect(reason).toContain("2026-08-13T02:00:00.000Z");
	});

	it("regenerates on a ui-string write, which has no timestamp to compare", () => {
		expect(staleReason(facts({ marks: { chrome: "bbbb" } }))).toBe(
			"chrome changed",
		);
	});

	it("regenerates a project, whose row has no version column either", () => {
		expect(
			staleReason(
				facts({
					contentAt: null,
					marks: { chrome: "aaaa", entity: "2222" },
					recorded: { chrome: "aaaa", entity: "1111" },
				}),
			),
		).toBe("entity changed");
		expect(
			staleReason(
				facts({
					contentAt: null,
					marks: { chrome: "aaaa", entity: "1111" },
					recorded: { chrome: "aaaa", entity: "1111" },
				}),
			),
		).toBeNull();
	});

	it("regenerates html left behind by an older build", () => {
		const reason = staleReason(
			facts({ builtAt: Date.parse("2026-08-13T02:30:00.000Z") }),
		);
		expect(reason).toContain("build 2026-08-13T02:30:00.000Z");
	});

	it("regenerates a file this script has never accounted for", () => {
		expect(staleReason(facts({ recorded: null }))).toBe(
			"not in the prerender state file",
		);
	});

	it("does not fire twice: a rerender clears every reason", () => {
		const stale = facts({
			renderedAt: null,
			contentAt: Date.parse("2026-08-13T02:35:50.903Z"),
			marks: { chrome: "bbbb" },
			recorded: { chrome: "aaaa" },
		});
		expect(staleReason(stale)).not.toBeNull();
		const rerendered: PathFacts = {
			...stale,
			renderedAt: Date.now(),
			recorded: stale.marks,
		};
		expect(staleReason(rerendered)).toBeNull();
	});
});
