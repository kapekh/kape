# Right-sized images

## What is wrong

Every image on kapekh.org is served at the resolution it was uploaded at.
Measured on the live site: a news card renders 340px wide and ships the 4384px original; a gallery detail page transfers ~16.7MB.
The audience is phones on Cambodian mobile data, so this is the most expensive defect the audit found.

## True when done

A visitor on a phone downloads an image close to the size it is drawn at, and the original is still there for downloads and full-size viewing.
Nothing an editor does changes: they upload the same file the same way.

## Decisions

- Produce derivatives with `sharp` at upload, and backfill the 449 existing files with a script. Jev `strategy precompute_upload_plus_backfill p=0.92`.
- `webp` derivatives inside a `<picture>` with the original as the fallback source. Jev `format webp_with_original_fallback p=0.61`.
- `sharp` is a new dependency; Rithy approved it when he chose this job.

## Shape

- `src/server/images.ts` — one responsibility: given bytes, produce the derivative set. Pure enough to test without a server.
- `saveUpload` (`src/server/storage.ts`) keeps writing the original, and writes `<uuid>-<width>.webp` beside it.
- Derivative widths are a single exported list. A derivative is never larger than the source: an 800px upload produces no 1280px file.
- One component owns `<picture>`/`srcset`/`sizes`; call sites pass what they already pass. `loading="lazy"` stays as it is (AGENT.md: only a hero, the active slide and a single portrait are eager).
- `scripts/backfill-image-sizes.ts` — `--db <path>`, dry run by default, `--apply`, re-runnable, skips what exists, never touches an original.
- Non-images (PDF, video) are untouched.

## Risks

- Disk: derivatives land on the same volume as 573MB of uploads. The backfill prints the bytes it will add before writing.
- A corrupt or exotic source must fail loudly for that one file and leave the original serving.
- The render cache stores resolved payloads; if an image URL shape changes in a payload, `FORMAT` in `src/server/render-cache.ts` must be bumped in the same commit.

## Proving check

`bun run check`, plus: the derivative set for a wide source and for a source narrower than the smallest width; the backfill's second run adding nothing; and a rendering test that a `<picture>` offers webp and falls back to the original.
Measured before/after byte counts for one news listing and one gallery page, taken in the browser.
