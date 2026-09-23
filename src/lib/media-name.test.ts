import { describe, expect, it } from "vitest";

import {
	MEDIA_NAME_MAX,
	mediaDisplayName,
	mediaStorageName,
	sanitizeUploadName,
} from "./media-name";

describe("sanitizeUploadName", () => {
	it("keeps a name a person would recognise", () => {
		expect(sanitizeUploadName("Annual Report 2024.pdf")).toBe(
			"Annual Report 2024.pdf",
		);
	});

	it("keeps Khmer, which half the library is named in", () => {
		expect(sanitizeUploadName("របាយការណ៍ប្រចាំឆ្នាំ.pdf")).toBe(
			"របាយការណ៍ប្រចាំឆ្នាំ.pdf",
		);
	});

	it("drops every directory a path separator carries", () => {
		expect(sanitizeUploadName("../../etc/passwd")).toBe("passwd");
		expect(sanitizeUploadName("C:\\Users\\sok\\report.pdf")).toBe("report.pdf");
		expect(sanitizeUploadName("/var/www/uploads/logo.png")).toBe("logo.png");
	});

	it("leaves nothing a path could be rebuilt from", () => {
		for (const raw of ["../../etc/passwd", "a/b\\c.png", "..\\..\\x"]) {
			const name = sanitizeUploadName(raw) ?? "";
			expect(name).not.toMatch(/[/\\]/);
			expect(name.startsWith(".")).toBe(false);
		}
	});

	it("truncates a very long name and keeps its extension", () => {
		const name = sanitizeUploadName(`${"a".repeat(500)}.pdf`);
		expect(name).not.toBeNull();
		expect(name?.length).toBe(MEDIA_NAME_MAX);
		expect(name?.endsWith(".pdf")).toBe(true);
	});

	it("truncates a very long name that has no extension", () => {
		expect(sanitizeUploadName("b".repeat(500))).toBe(
			"b".repeat(MEDIA_NAME_MAX),
		);
	});

	it("defuses markup rather than storing a tag", () => {
		const name = sanitizeUploadName('<img src=x onerror="alert(1)">.png');
		expect(name).not.toBeNull();
		expect(name).not.toMatch(/[<>"]/);
	});

	it("takes a name with no extension as it is", () => {
		expect(sanitizeUploadName("scan from the printer")).toBe(
			"scan from the printer",
		);
	});

	it("keeps a quote out of a download header", () => {
		expect(sanitizeUploadName('a"; filename="evil.sh')).toBe(
			"a ; filename= evil.sh",
		);
	});

	it("strips the control characters that would split a header line", () => {
		expect(sanitizeUploadName("report\r\nX-Evil: 1.pdf")).toBe(
			"report X-Evil 1.pdf",
		);
	});

	it("gives back no name when nothing recognisable survives", () => {
		expect(sanitizeUploadName("...")).toBeNull();
		expect(sanitizeUploadName("   ")).toBeNull();
		expect(sanitizeUploadName("")).toBeNull();
		expect(sanitizeUploadName("<>")).toBeNull();
	});

	it("refuses a name that is only punctuation", () => {
		expect(sanitizeUploadName("---")).toBeNull();
		expect(sanitizeUploadName("!!! ???")).toBeNull();
		expect(sanitizeUploadName("_-_")).toBeNull();
	});

	it("truncates without cutting a character in half", () => {
		const emoji = sanitizeUploadName(`${"🌏".repeat(300)}.png`) ?? "";
		// a high surrogate with no low after it, or a low with no high before it
		expect(emoji).not.toMatch(
			/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/,
		);
		expect(emoji.endsWith(".png")).toBe(true);
		expect([...new Intl.Segmenter().segment(emoji)]).toHaveLength(
			MEDIA_NAME_MAX,
		);
	});

	it("truncates Khmer without detaching a vowel from its consonant", () => {
		const khmer = sanitizeUploadName(`${"ប្រចាំ".repeat(80)}.pdf`) ?? "";
		expect(khmer.endsWith(".pdf")).toBe(true);
		// a dangling combining mark would open the name with one
		expect(khmer).not.toMatch(/^[឴-៓]/);
	});

	it("does not leave a file hidden by a leading dot", () => {
		expect(sanitizeUploadName(".htaccess")).toBe("htaccess");
	});
});

describe("mediaDisplayName", () => {
	it("prefers the name the operator uploaded", () => {
		expect(
			mediaDisplayName({ id: 7, originalName: "Report.pdf", usedBy: "Home" }),
		).toBe("Report.pdf");
	});

	it("falls back to where an unnamed file is used", () => {
		expect(
			mediaDisplayName({ id: 7, originalName: null, usedBy: "Home" }),
		).toBe("Home");
	});

	it("names a file with neither, instead of showing a broken blank", () => {
		expect(mediaDisplayName({ id: 7, originalName: null, usedBy: null })).toBe(
			"Untitled #7",
		);
		expect(mediaDisplayName({ id: 7, originalName: "  ", usedBy: "" })).toBe(
			"Untitled #7",
		);
	});
});

describe("mediaStorageName", () => {
	it("is the stored object, not the display name", () => {
		expect(mediaStorageName({ r2Key: "media/4cc45291.jpg" })).toBe(
			"4cc45291.jpg",
		);
		expect(mediaStorageName({ url: "https://cdn.example/x/y.pdf?v=2" })).toBe(
			"y.pdf",
		);
		expect(mediaStorageName({ r2Key: null, url: null })).toBeNull();
	});
});
