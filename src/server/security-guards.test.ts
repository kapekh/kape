import { describe, expect, it } from "vitest";

import { ATTACHMENT_EXTS } from "#/lib/forms";

import {
	bytesMatchExtension,
	contentTypeForExtension,
	hasSignature,
	sniffType,
} from "./magic-bytes";
import {
	backoffDelayMs,
	countEvent,
	peekCount,
	rateLimit,
} from "./ratelimit-core";

const bytes = (...b: number[]) => new Uint8Array(b);
const withAscii = (prefix: number[], text: string) =>
	new Uint8Array([...prefix, ...[...text].map((c) => c.charCodeAt(0))]);

describe("rateLimit window arithmetic", () => {
	it("allows exactly `limit` calls then blocks within the window", () => {
		const key = `test:${crypto.randomUUID()}`;
		for (let i = 0; i < 5; i++) expect(rateLimit(key, 5, 60_000)).toBe(true);
		expect(rateLimit(key, 5, 60_000)).toBe(false);
		expect(rateLimit(key, 5, 60_000)).toBe(false);
	});

	it("keeps distinct keys in separate buckets", () => {
		const a = `a:${crypto.randomUUID()}`;
		const b = `b:${crypto.randomUUID()}`;
		expect(rateLimit(a, 1, 60_000)).toBe(true);
		expect(rateLimit(a, 1, 60_000)).toBe(false);
		// A second key (different email/IP) is unaffected: the office isn't locked
		// out because one account tripped the limit.
		expect(rateLimit(b, 1, 60_000)).toBe(true);
	});

	it("opens a fresh window once the old one has elapsed", () => {
		const key = `w:${crypto.randomUUID()}`;
		expect(rateLimit(key, 1, 1)).toBe(true);
		expect(rateLimit(key, 1, 1)).toBe(false);
		const until = Date.now() + 5;
		while (Date.now() <= until) {
			/* spin past the 1ms window */
		}
		expect(rateLimit(key, 1, 1)).toBe(true);
	});
});

describe("per-account backoff", () => {
	it("counts failures within a window and reports them without recording", () => {
		const key = `acct:${crypto.randomUUID()}`;
		expect(peekCount(key)).toBe(0);
		expect(countEvent(key, 60_000)).toBe(1);
		expect(countEvent(key, 60_000)).toBe(2);
		expect(peekCount(key)).toBe(2);
		expect(peekCount(key)).toBe(2);
	});

	it("stays silent until the threshold, then escalates and saturates", () => {
		expect(backoffDelayMs(0, 10, 2000)).toBe(0);
		expect(backoffDelayMs(10, 10, 2000)).toBe(0);
		expect(backoffDelayMs(11, 10, 2000)).toBe(100);
		expect(backoffDelayMs(12, 10, 2000)).toBe(200);
		expect(backoffDelayMs(13, 10, 2000)).toBe(400);
		expect(backoffDelayMs(99, 10, 2000)).toBe(2000);
	});

	it("never refuses, however many failures accumulate", () => {
		// may only ever delay: a refusal here lets a stranger lock a named admin out by failing logins in their name
		for (const n of [0, 5, 50, 5000]) {
			const delay = backoffDelayMs(n, 10, 2000);
			expect(typeof delay).toBe("number");
			expect(delay).toBeLessThanOrEqual(2000);
		}
	});
});

describe("magic-byte sniffing", () => {
	const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0);
	const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0);
	const GIF = withAscii([], "GIF89a\0\0");
	const WEBP = withAscii([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0], "WEBP");
	const PDF = withAscii([], "%PDF-1.7");
	const WEBM = bytes(0x1a, 0x45, 0xdf, 0xa3, 0, 0);
	const OLE = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
	const ZIP = bytes(0x50, 0x4b, 0x03, 0x04, 0, 0);
	const MP4 = withAscii([0, 0, 0, 0x18], "ftypisom");
	const AVIF = withAscii([0, 0, 0, 0x18], "ftypavif");
	const SHELL = withAscii([], "#!/bin/sh\necho pwned\n");

	it("identifies known signatures", () => {
		expect(sniffType(PNG)).toBe("png");
		expect(sniffType(JPEG)).toBe("jpeg");
		expect(sniffType(GIF)).toBe("gif");
		expect(sniffType(WEBP)).toBe("webp");
		expect(sniffType(PDF)).toBe("pdf");
		expect(sniffType(WEBM)).toBe("webm");
		expect(sniffType(OLE)).toBe("ole");
		expect(sniffType(ZIP)).toBe("zip");
		expect(sniffType(MP4)).toBe("mp4");
		expect(sniffType(AVIF)).toBe("avif");
		expect(sniffType(SHELL)).toBeNull();
	});

	it("accepts a real file under its true extension", () => {
		expect(bytesMatchExtension("png", PNG)).toBe(true);
		expect(bytesMatchExtension("jpg", JPEG)).toBe(true);
		expect(bytesMatchExtension("jpeg", JPEG)).toBe(true);
		expect(bytesMatchExtension("docx", ZIP)).toBe(true);
		expect(bytesMatchExtension("doc", OLE)).toBe(true);
		expect(bytesMatchExtension("mp4", MP4)).toBe(true);
		expect(bytesMatchExtension("avif", AVIF)).toBe(true);
	});

	it("rejects a shell script renamed with an allowed extension", () => {
		expect(bytesMatchExtension("png", SHELL)).toBe(false);
	});

	it("rejects a real image under the wrong extension", () => {
		expect(bytesMatchExtension("png", JPEG)).toBe(false);
		expect(bytesMatchExtension("mp4", PNG)).toBe(false);
	});

	it("rejects unknown extensions outright", () => {
		expect(bytesMatchExtension("sh", SHELL)).toBe(false);
		expect(bytesMatchExtension("exe", PNG)).toBe(false);
	});
});

describe("stored content type", () => {
	// R2 hands the stored type back on every GET, so anything the uploader
	// chose would be a stored-XSS vector on our own origin.
	const RENDERS_AS_PAGE = new Set([
		"text/html",
		"application/xhtml+xml",
		"image/svg+xml",
		"text/javascript",
		"application/javascript",
	]);
	it("never yields a type a browser renders as a page", () => {
		for (const ext of [...ATTACHMENT_EXTS, "mp4", "webm"]) {
			const type = contentTypeForExtension(ext).split(";")[0].trim();
			expect(RENDERS_AS_PAGE.has(type)).toBe(false);
		}
	});

	it("maps each allow-listed extension to its own type", () => {
		expect(contentTypeForExtension("PNG")).toBe("image/png");
		expect(contentTypeForExtension("jpg")).toBe("image/jpeg");
		expect(contentTypeForExtension("pdf")).toBe("application/pdf");
	});

	it("falls back to a non-rendering type for anything unmapped", () => {
		expect(contentTypeForExtension("bin")).toBe("application/octet-stream");
		expect(contentTypeForExtension("html")).toBe("application/octet-stream");
	});

	// txt and csv have no signature, so the form route has to skip the check
	// for them rather than reject every plain-text attachment.
	it("knows which extensions can be signature-checked", () => {
		expect(hasSignature("png")).toBe(true);
		expect(hasSignature("txt")).toBe(false);
		expect(hasSignature("csv")).toBe(false);
	});
});
