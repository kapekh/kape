import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { IMAGE_WIDTHS } from "#/lib/image-widths";
import { drawnSize, imageDerivatives } from "./images";

const NARROWEST = IMAGE_WIDTHS[0];

async function jpeg(width: number, height: number): Promise<Uint8Array> {
	const buf = await sharp({
		create: { width, height, channels: 3, background: "#336699" },
	})
		.jpeg()
		.toBuffer();
	return new Uint8Array(buf);
}

/** A landscape frame EXIF says to stand on its end, which is what a phone shoots. */
async function quarterTurned(
	width: number,
	height: number,
): Promise<Uint8Array> {
	const buf = await sharp({
		create: { width, height, channels: 3, background: "#336699" },
	})
		.withMetadata({ orientation: 6 })
		.jpeg()
		.toBuffer();
	return new Uint8Array(buf);
}

describe("imageDerivatives", () => {
	it("covers every width a wide source is wider than", async () => {
		const out = await imageDerivatives(await jpeg(4384, 2920));
		expect(out.map((d) => d.width)).toEqual([...IMAGE_WIDTHS]);
		for (const d of out) {
			const meta = await sharp(d.bytes).metadata();
			expect(meta.format).toBe("webp");
			expect(meta.width).toBe(d.width);
		}
	});

	it("stops at the source's own width rather than upscaling", async () => {
		const out = await imageDerivatives(await jpeg(700, 500));
		expect(out.map((d) => d.width)).toEqual([320, 640]);
	});

	it("produces no file at all for a source narrower than the narrowest width", async () => {
		expect(await imageDerivatives(await jpeg(NARROWEST - 1, 100))).toEqual([]);
	});

	it("produces no file for bytes that are not an image", async () => {
		expect(
			await imageDerivatives(new TextEncoder().encode("%PDF-1.4")),
		).toEqual([]);
	});

	it("reads the drawn size, not the stored one, for a quarter-turned photo", async () => {
		expect(await drawnSize(await quarterTurned(1000, 400))).toEqual({
			width: 400,
			height: 1000,
		});
	});

	it("names every file it writes by the width that file really is", async () => {
		for (const source of [
			await jpeg(4384, 2920),
			await quarterTurned(1000, 400),
		])
			for (const d of await imageDerivatives(source))
				expect((await sharp(d.bytes).metadata()).width).toBe(d.width);
	});
});
