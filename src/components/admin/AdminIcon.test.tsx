// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ADMIN_ICON_NAMES, AdminIcon } from "./AdminIcon";

afterEach(cleanup);

/** The names `src/routes/admin.tsx` asks this component for. */
const NAV_NAMES = [
	"dashboard",
	"modules",
	"posts",
	"pages",
	"projects",
	"nav",
	"hero",
	"stats",
	"announcements",
	"partners",
	"donors",
	"donations",
	"campaigns",
	"offices",
	"staff",
	"media",
	"languages",
	"settings",
	"tag",
	"news",
	"story",
	"video",
	"gallery",
	"team",
	"publication",
	"career",
	"event",
	"document",
	"footer",
	"message",
	"forms",
];

describe("AdminIcon on lucide", () => {
	it("still answers to all 31 names", () => {
		expect(ADMIN_ICON_NAMES.sort()).toEqual([...NAV_NAMES].sort());
	});

	it("draws something for every one of them", () => {
		for (const name of NAV_NAMES) {
			const { container } = render(
				<AdminIcon name={name} className="h-4 w-4" />,
			);
			const svg = container.querySelector("svg");
			expect(svg, name).not.toBeNull();
			expect(svg?.children.length, name).toBeGreaterThan(0);
			expect(svg?.getAttribute("aria-hidden"), name).toBe("true");
			cleanup();
		}
	});

	it("falls back rather than rendering a hole", () => {
		const { container } = render(<AdminIcon name="not-a-real-icon" />);
		expect(container.querySelector("svg")?.children.length).toBeGreaterThan(0);
	});

	it("passes its class through, because the nav sizes it", () => {
		const { container } = render(
			<AdminIcon name="pages" className="h-4 w-4" />,
		);
		expect(container.querySelector("svg")?.getAttribute("class")).toContain(
			"h-4 w-4",
		);
	});
});
