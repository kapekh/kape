// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

import { drawnSize, imageDerivatives } from "#/server/images";
import { PLACEHOLDER_IMAGE } from "@/lib/placeholder";
import { Picture } from "./Picture";

afterEach(cleanup);

const SRC = "/uploads/11111111-2222-4333-8444-555555555555.jpg";
const NEXT = "/uploads/99999999-8888-4777-8666-555555555555.jpg";

const sourceOf = (): HTMLSourceElement | null =>
	document.querySelector("picture source");

const offeredWidths = (): number[] =>
	(sourceOf()?.srcset ?? "")
		.split(", ")
		.filter(Boolean)
		.map((c) => Number(c.split(" ")[1].replace("w", "")));

const imgSrc = () => document.querySelector("img")?.getAttribute("src");
const fail = () =>
	fireEvent.error(document.querySelector("img") as HTMLImageElement);

describe("Picture", () => {
	it("offers webp derivatives and keeps the original as the fallback", () => {
		render(<Picture src={SRC} width={4384} alt="A school opening" />);
		const source = sourceOf();
		expect(source?.type).toBe("image/webp");
		expect(source?.srcset).toBe(
			[320, 640, 960, 1280, 1920]
				.map((w) => `${SRC.replace(".jpg", `-${w}.webp`)} ${w}w`)
				.join(", "),
		);
		expect(screen.getByAltText("A school opening")).toHaveProperty(
			"src",
			expect.stringContaining(SRC) as unknown as string,
		);
	});

	it("offers no derivative wider than the source", () => {
		render(<Picture src={SRC} width={700} alt="" />);
		expect(sourceOf()?.srcset).toBe(
			`${SRC.replace(".jpg", "-320.webp")} 320w, ${SRC.replace(".jpg", "-640.webp")} 640w`,
		);
	});

	it("ships the original alone when nothing says how wide the source is", () => {
		render(<Picture src={SRC} alt="" />);
		expect(sourceOf()).toBeNull();
		expect(document.querySelector("img")?.getAttribute("src")).toBe(SRC);
	});

	it("drops to the original when a derivative fails to load", () => {
		render(<Picture src={SRC} width={4384} alt="" />);
		fail();
		expect(sourceOf()).toBeNull();
		expect(imgSrc()).toBe(SRC);
	});

	it("stands in for an original that is gone too", () => {
		render(<Picture src={SRC} width={4384} alt="" />);
		fail();
		fail();
		expect(imgSrc()).toBe(PLACEHOLDER_IMAGE);
	});

	// the lightbox swaps src on one mounted element: photo 4 failing must not
	// make photos 5 onwards render the placeholder
	it("starts the next photo clean, since it is not the one that failed", () => {
		const { rerender } = render(<Picture src={SRC} width={4384} alt="" />);
		fail();
		fail();
		expect(imgSrc()).toBe(PLACEHOLDER_IMAGE);
		rerender(<Picture src={NEXT} width={4384} alt="" />);
		expect(offeredWidths()).toEqual([320, 640, 960, 1280, 1920]);
		expect(imgSrc()).toBe(NEXT);
	});

	// one measure of "how wide is it", or a quarter-turned phone photo offers
	// candidates nothing wrote and every card falls back to the full original
	it("offers exactly the files a quarter-turned photo is stored with", async () => {
		const buf = await sharp({
			create: { width: 1000, height: 400, channels: 3, background: "#336699" },
		})
			.withMetadata({ orientation: 6 })
			.jpeg()
			.toBuffer();
		const bytes = new Uint8Array(buf);
		const written = await imageDerivatives(bytes);
		// what an upload records in media.width, which is what a call site passes
		const recorded = await drawnSize(bytes);
		render(<Picture src={SRC} width={recorded?.width} alt="" />);
		expect(offeredWidths()).toEqual(written.map((d) => d.width));
	});

	it("leaves a gif alone, which has no webp beside it", () => {
		render(<Picture src="/uploads/a.gif" width={4384} alt="" />);
		expect(sourceOf()).toBeNull();
	});

	it("loads lazily, since nothing it draws is a hero or the active slide", () => {
		render(<Picture src={SRC} width={4384} alt="below the fold" />);
		expect(screen.getByAltText("below the fold").getAttribute("loading")).toBe(
			"lazy",
		);
	});

	// React preloads every eager <img> in the SSR shell, so this has to be asked for
	it("loads eagerly only where a call site asks", () => {
		render(<Picture eager src={SRC} width={4384} alt="the hero" />);
		expect(screen.getByAltText("the hero").getAttribute("loading")).toBe(
			"eager",
		);
	});

	it("leaves a second picture lazy while one is eager", () => {
		render(
			<>
				<Picture eager src={SRC} width={4384} alt="the hero" />
				<Picture src={NEXT} width={4384} alt="a card" />
			</>,
		);
		expect(screen.getByAltText("the hero").getAttribute("loading")).toBe(
			"eager",
		);
		expect(screen.getByAltText("a card").getAttribute("loading")).toBe("lazy");
	});

	it("stays eager through the fallback to the original", () => {
		render(<Picture eager src={SRC} width={4384} alt="the hero" />);
		fail();
		expect(sourceOf()).toBeNull();
		expect(screen.getByAltText("the hero").getAttribute("loading")).toBe(
			"eager",
		);
	});
});
