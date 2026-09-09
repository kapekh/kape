import { useEffect, useRef, useState } from "react";

import { useT } from "@/lib/i18n";

export type LightboxPhoto = { id: number; url: string; caption?: string };

// stays mounted while closed: unmounting skips the native focus restore
function Lightbox({
	photos,
	index,
	onIndex,
	onClose,
}: {
	photos: LightboxPhoto[];
	index: number | null;
	onIndex: (i: number) => void;
	onClose: () => void;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	const t = useT();

	useEffect(() => {
		const d = ref.current;
		if (!d) return;
		if (index === null) {
			if (d.open) d.close();
		} else if (!d.open) {
			d.showModal();
		}
	}, [index]);

	function step(delta: number) {
		if (index === null) return;
		onIndex((index + delta + photos.length) % photos.length);
	}

	const photo = index === null ? null : photos[index];
	const many = photos.length > 1;

	return (
		<dialog
			ref={ref}
			aria-label={t("lightbox.title", "Photo viewer")}
			onClose={onClose}
			onClick={(e) => {
				if (e.target === ref.current) onClose();
			}}
			onKeyDown={(e) => {
				if (!many) return;
				if (e.key === "ArrowLeft") {
					e.preventDefault();
					step(-1);
				} else if (e.key === "ArrowRight") {
					e.preventDefault();
					step(1);
				}
			}}
			className="m-0 h-full max-h-none w-full max-w-none bg-black/90 p-4 text-white backdrop-blur-sm open:flex open:items-center open:justify-center"
		>
			<button
				type="button"
				onClick={onClose}
				aria-label={t("lightbox.close", "Close")}
				className="absolute top-4 right-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-2xl transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
			>
				×
			</button>
			{many && (
				<>
					<button
						type="button"
						onClick={() => step(-1)}
						aria-label={t("lightbox.prev", "Previous photo")}
						className="absolute top-1/2 left-4 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-3xl transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
					>
						‹
					</button>
					<button
						type="button"
						onClick={() => step(1)}
						aria-label={t("lightbox.next", "Next photo")}
						className="absolute top-1/2 right-4 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-3xl transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
					>
						›
					</button>
				</>
			)}
			{photo && (
				<figure className="flex w-full max-w-6xl flex-col items-center">
					<img
						src={photo.url}
						alt={photo.caption || ""}
						className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
					/>
					<figcaption className="mt-4 max-w-3xl text-center text-sm text-white/90 md:text-base">
						{photo.caption}
						<span
							aria-live="polite"
							className="mt-1 block text-xs text-white/60"
						>
							{t("lightbox.position", "{n} of {total}", {
								n: (index ?? 0) + 1,
								total: photos.length,
							})}
						</span>
					</figcaption>
				</figure>
			)}
		</dialog>
	);
}

/** Thumbnail grid whose tiles open the shared lightbox. */
export function PhotoGrid({
	photos,
	className = "grid-cols-2 md:grid-cols-3",
}: {
	photos: LightboxPhoto[];
	className?: string;
}) {
	const [index, setIndex] = useState<number | null>(null);
	const t = useT();
	if (photos.length === 0) return null;
	return (
		<>
			<div className={`grid gap-3 ${className}`}>
				{photos.map((p, i) => (
					<button
						key={p.id}
						type="button"
						onClick={() => setIndex(i)}
						aria-label={
							p.caption ||
							t("lightbox.viewNth", "View photo {n} of {total}", {
								n: i + 1,
								total: photos.length,
							})
						}
						className="group relative block overflow-hidden rounded-2xl border border-border focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
					>
						<img
							src={p.url}
							alt=""
							className="aspect-square w-full object-cover transition duration-700 group-hover:scale-105"
						/>
						{p.caption && (
							<span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left text-xs text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
								{p.caption}
							</span>
						)}
					</button>
				))}
			</div>
			<Lightbox
				photos={photos}
				index={index}
				onIndex={setIndex}
				onClose={() => setIndex(null)}
			/>
		</>
	);
}
