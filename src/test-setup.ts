import { afterEach } from "vitest";

// Without this a rendered tree stays mounted for the rest of the file and past
// the environment's teardown, where a pending timer reaches a window that is
// gone: 616 green tests, `window is not defined`, exit 1. Imported lazily so a
// node-environment test never pulls in react-dom.
afterEach(async () => {
	if (typeof document === "undefined") return;
	const { cleanup } = await import("@testing-library/react");
	cleanup();
});

// jsdom has none, and a section that counts up when it scrolls into view throws without one
if (typeof window !== "undefined" && !("IntersectionObserver" in window)) {
	globalThis.IntersectionObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
		takeRecords() {
			return [];
		}
	} as unknown as typeof IntersectionObserver;
}
