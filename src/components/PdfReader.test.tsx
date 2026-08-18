// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { isPdfUrl, usePdfReader } from "./PdfReader";

// jsdom ships <dialog> as an empty class, so the modal methods are ours here
HTMLDialogElement.prototype.showModal = function showModal() {
	this.open = true;
};
HTMLDialogElement.prototype.close = function close() {
	this.open = false;
	this.dispatchEvent(new Event("close"));
};

function pointer(kind: "fine" | "coarse") {
	vi.stubGlobal(
		"matchMedia",
		vi.fn((q: string) => ({
			matches: q.includes("coarse") && kind === "coarse",
			media: q,
			addEventListener: () => {},
			removeEventListener: () => {},
		})),
	);
}

function Docs({ href, onDownload }: { href: string; onDownload?: () => void }) {
	const { openPdf, reader } = usePdfReader();
	return (
		<div>
			<a
				href={href}
				onClick={(e) =>
					openPdf(e, { url: href, title: "Annual Report", onDownload })
				}
			>
				Open
			</a>
			{reader}
		</div>
	);
}

describe("isPdfUrl", () => {
	it("accepts a .pdf path whatever follows it", () => {
		expect(isPdfUrl("/uploads/a.pdf")).toBe(true);
		expect(isPdfUrl("https://cdn.example/x.PDF?v=2")).toBe(true);
		expect(isPdfUrl("/uploads/a.pdf#page=3")).toBe(true);
	});

	it("rejects anything else", () => {
		expect(isPdfUrl("/uploads/a.docx")).toBe(false);
		expect(isPdfUrl("/pdf/report")).toBe(false);
		expect(isPdfUrl(null)).toBe(false);
		expect(isPdfUrl("")).toBe(false);
	});
});

describe("usePdfReader", () => {
	beforeEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("opens the PDF in a dialog instead of following the link", () => {
		pointer("fine");
		render(<Docs href="/uploads/report.pdf" />);

		const click = new MouseEvent("click", { bubbles: true, cancelable: true });
		fireEvent(screen.getByRole("link", { name: "Open" }), click);

		expect(click.defaultPrevented).toBe(true);
		expect(screen.getByTitle("Annual Report")).toHaveProperty(
			"data",
			expect.stringContaining("/uploads/report.pdf"),
		);
	});

	// a file that 404s used to leave the visitor watching an empty frame
	it("says so when the document cannot be loaded", () => {
		pointer("fine");
		render(<Docs href="/uploads/report.pdf" />);
		fireEvent.click(screen.getByRole("link", { name: "Open" }));

		fireEvent.error(screen.getByTitle("Annual Report"));

		expect(screen.queryByTitle("Annual Report")).toBeNull();
		expect(screen.getByText(/could not be loaded/i)).toBeTruthy();
	});

	it("offers the open document for offline, and counts that", () => {
		pointer("fine");
		const saved = vi.fn();
		render(<Docs href="/uploads/report.pdf" onDownload={saved} />);
		fireEvent.click(screen.getByRole("link", { name: "Open" }));

		const save = screen.getByRole("link", { name: "Download" });
		expect(save.getAttribute("href")).toBe("/uploads/report.pdf");
		expect(save.hasAttribute("download")).toBe(true);

		fireEvent.click(save);
		expect(saved).toHaveBeenCalledTimes(1);
	});

	// once focus is inside the plugin, Esc and Shift+Tab both stop working
	it("keeps the pdf plugin out of the tab order", () => {
		pointer("fine");
		render(<Docs href="/uploads/report.pdf" />);
		fireEvent.click(screen.getByRole("link", { name: "Open" }));

		expect(screen.getByTitle("Annual Report")).toHaveProperty("tabIndex", -1);
	});

	// the promise the coarse-pointer branch makes: mobile keeps the plain link
	it("leaves the link alone on a touch device", () => {
		pointer("coarse");
		render(<Docs href="/uploads/report.pdf" />);

		const click = new MouseEvent("click", { bubbles: true, cancelable: true });
		fireEvent(screen.getByRole("link", { name: "Open" }), click);

		expect(click.defaultPrevented).toBe(false);
		expect(screen.queryByTitle("Annual Report")).toBeNull();
	});

	it("leaves a non-PDF link alone", () => {
		pointer("fine");
		render(<Docs href="/uploads/notes.docx" />);

		const click = new MouseEvent("click", { bubbles: true, cancelable: true });
		fireEvent(screen.getByRole("link", { name: "Open" }), click);

		expect(click.defaultPrevented).toBe(false);
	});
});
