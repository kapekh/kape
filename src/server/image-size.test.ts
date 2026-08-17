import { describe, expect, it } from "vitest";

import { imageSize } from "./image-size";

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
const be32 = (n: number) => [
	n >>> 24,
	(n >>> 16) & 255,
	(n >>> 8) & 255,
	n & 255,
];
const be16 = (n: number) => [(n >>> 8) & 255, n & 255];
const le16 = (n: number) => [n & 255, (n >>> 8) & 255];

function png(w: number, h: number) {
	return new Uint8Array([
		0x89,
		0x50,
		0x4e,
		0x47,
		0x0d,
		0x0a,
		0x1a,
		0x0a,
		...be32(13),
		...ascii("IHDR"),
		...be32(w),
		...be32(h),
	]);
}

function jpeg(w: number, h: number, opts: { app0?: boolean } = {}) {
	const app0 = opts.app0
		? [0xff, 0xe0, ...be16(16), ...ascii("JFIF\0"), ...new Array(9).fill(0)]
		: [];
	return new Uint8Array([
		0xff,
		0xd8,
		...app0,
		0xff,
		0xc0,
		...be16(11),
		8,
		...be16(h),
		...be16(w),
		3,
	]);
}

function gif(w: number, h: number) {
	return new Uint8Array([...ascii("GIF89a"), ...le16(w), ...le16(h)]);
}

function riff(chunk: string, payload: number[]) {
	return new Uint8Array([
		...ascii("RIFF"),
		0,
		0,
		0,
		0,
		...ascii("WEBP"),
		...ascii(chunk),
		0,
		0,
		0,
		0,
		...payload,
	]);
}

describe("imageSize", () => {
	it("reads a PNG IHDR", () => {
		expect(imageSize(png(1920, 1440))).toEqual({ width: 1920, height: 1440 });
	});

	it("reads a JPEG SOF0 that follows other segments", () => {
		expect(imageSize(jpeg(265, 149, { app0: true }))).toEqual({
			width: 265,
			height: 149,
		});
	});

	it("reads a JPEG whose SOF is the first segment", () => {
		expect(imageSize(jpeg(4032, 3024))).toEqual({ width: 4032, height: 3024 });
	});

	it("reads a GIF screen descriptor", () => {
		expect(imageSize(gif(800, 600))).toEqual({ width: 800, height: 600 });
	});

	it("reads a lossy WebP frame header", () => {
		// VP8 bitstream: 3 tag bytes, 3 sync bytes, then 14-bit width and height.
		const payload = [0, 0, 0, 0x9d, 0x01, 0x2a, ...le16(1280), ...le16(720)];
		expect(imageSize(riff("VP8 ", payload))).toEqual({
			width: 1280,
			height: 720,
		});
	});

	it("reads a lossless WebP header", () => {
		// signature byte, then 14 bits of width-1 and 14 bits of height-1.
		const bits = (100 - 1) | ((50 - 1) << 14);
		const payload = [
			0x2f,
			bits & 255,
			(bits >>> 8) & 255,
			(bits >>> 16) & 255,
			(bits >>> 24) & 255,
		];
		expect(imageSize(riff("VP8L", payload))).toEqual({
			width: 100,
			height: 50,
		});
	});

	it("reads an extended WebP canvas", () => {
		const w = 2000 - 1;
		const h = 1000 - 1;
		const payload = [
			0,
			0,
			0,
			0,
			w & 255,
			(w >>> 8) & 255,
			(w >>> 16) & 255,
			h & 255,
			(h >>> 8) & 255,
			(h >>> 16) & 255,
			0,
			0,
			0,
			0,
		];
		expect(imageSize(riff("VP8X", payload))).toEqual({
			width: 2000,
			height: 1000,
		});
	});

	it("reads an AVIF ispe property", () => {
		const bytes = new Uint8Array([
			0,
			0,
			0,
			0x20,
			...ascii("ftyp"),
			...ascii("avif"),
			...new Array(24).fill(0),
			...ascii("ispe"),
			0,
			0,
			0,
			0,
			...be32(1600),
			...be32(900),
			...new Array(8).fill(0),
		]);
		expect(imageSize(bytes)).toEqual({ width: 1600, height: 900 });
	});

	it("returns null for a non-image and for truncated bytes", () => {
		expect(imageSize(new Uint8Array(ascii("%PDF-1.7")))).toBeNull();
		expect(imageSize(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
		expect(imageSize(new Uint8Array())).toBeNull();
	});

	it("gives up on a JPEG that reaches scan data without a frame header", () => {
		const bytes = new Uint8Array([
			0xff,
			0xd8,
			0xff,
			0xda,
			...new Array(20).fill(0),
		]);
		expect(imageSize(bytes)).toBeNull();
	});
});
