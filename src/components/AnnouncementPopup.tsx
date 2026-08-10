import { useEffect, useRef, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { useLang } from "@/lib/i18n";
import { localizedHref } from "@/lib/i18n-config";

type Announcement = Awaited<
	ReturnType<typeof trpcClient.site.announcement.query>
>[number];

const DISMISSED_KEY = "announcements-dismissed";

function readDismissed(): number[] {
	try {
		const raw = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
		return Array.isArray(raw) ? raw.filter((n) => typeof n === "number") : [];
	} catch {
		return [];
	}
}

/**
 * Announcement modal. Several deadlines can run at once, so
 * every open notice is reachable here, not just the soonest. Client-only
 * (fetched on mount) so prerendered/cached static HTML never freezes a
 * deadline-driven notice. Built on the native `<dialog>` so the focus trap,
 * Esc-to-close and focus restore are the browser's, not ours — the element
 * stays mounted once opened because unmounting skips the native focus restore.
 */
export function AnnouncementPopup() {
	const { lang, t } = useLang();
	const ref = useRef<HTMLDialogElement>(null);
	const [items, setItems] = useState<Announcement[]>([]);
	const [index, setIndex] = useState(0);
	const [open, setOpen] = useState(false);
	const seen = useRef(new Set<number>());

	useEffect(() => {
		trpcClient.site.announcement
			.query({ lang: lang || "" })
			.then((rows) => {
				const dismissed = readDismissed();
				const fresh = rows.filter((r) => !dismissed.includes(r.id));
				setItems(fresh);
				setIndex(0);
				setOpen(fresh.length > 0);
			})
			.catch(() => {});
	}, [lang]);

	useEffect(() => {
		const d = ref.current;
		if (!d) return;
		if (open && !d.open) d.showModal();
		else if (!open && d.open) d.close();
	}, [open]);

	useEffect(() => {
		const current = items[index];
		if (current) seen.current.add(current.id);
	}, [items, index]);

	function dismiss() {
		// only what was actually displayed: closing notice 1 of 2 must not bury
		// notice 2, which the visitor never saw
		const ids = new Set([...readDismissed(), ...seen.current]);
		localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
		setOpen(false);
	}

	function step(delta: number) {
		setIndex((i) => (i + delta + items.length) % items.length);
	}

	const a = items[index];
	if (!a) return null;
	const many = items.length > 1;

	return (
		<dialog
			ref={ref}
			aria-labelledby="announcement-title"
			onClose={dismiss}
			onClick={(e) => {
				if (e.target === ref.current) dismiss();
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
			className="m-auto w-[min(92vw,42rem)] max-w-none overflow-hidden rounded-3xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
		>
			<button
				type="button"
				onClick={dismiss}
				aria-label={t("announcement.close", "Close announcement")}
				className="absolute top-4 right-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-border bg-background/90 text-2xl leading-none transition hover:bg-background focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
			>
				×
			</button>
			<div className="h-2 w-full bg-gradient-to-r from-[var(--accent)] via-[var(--gold)] to-[var(--secondary)]" />
			<div className="p-8 md:p-10">
				<div className="flex items-center justify-between gap-4">
					<div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
						{t("announcement.label", "Announcement")}
					</div>
					{many && (
						<div
							aria-live="polite"
							className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground"
						>
							{t("announcement.position", "{n} of {total}", {
								n: index + 1,
								total: items.length,
							})}
						</div>
					)}
				</div>
				<h2
					id="announcement-title"
					className="mt-3 font-display text-2xl font-semibold leading-tight text-primary md:text-3xl"
				>
					{a.title}
				</h2>
				{a.message && (
					<p className="mt-4 text-base leading-relaxed text-foreground/80">
						{a.message}
					</p>
				)}
				{a.deadline && (
					<div className="mt-6 inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-1.5 text-sm font-semibold text-[var(--accent)]">
						⏳{" "}
						{t("announcement.deadlineOn", "Deadline {date}", {
							date: a.deadline,
						})}
					</div>
				)}
				<div className="mt-8 flex flex-wrap gap-3">
					{a.linkUrl && (
						<a
							href={localizedHref(a.linkUrl, lang)}
							onClick={dismiss}
							className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow transition hover:-translate-y-0.5"
						>
							{t("announcement.more", "Read more")} →
						</a>
					)}
					<button
						type="button"
						onClick={dismiss}
						className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold transition hover:bg-muted"
					>
						{t("announcement.close.label", "Close")}
					</button>
				</div>
				{many && (
					<div className="mt-8 flex items-center justify-between border-t border-border pt-4">
						<button
							type="button"
							onClick={() => step(-1)}
							className="text-sm font-semibold text-primary transition hover:text-[var(--accent)]"
						>
							← {t("announcement.prev", "Previous")}
						</button>
						<div className="flex gap-1.5">
							{items.map((it, i) => (
								<button
									key={it.id}
									type="button"
									onClick={() => setIndex(i)}
									aria-label={t("announcement.goto", "Announcement {n}", {
										n: i + 1,
									})}
									className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-[var(--accent)]" : "w-2 bg-border hover:bg-muted-foreground/40"}`}
								/>
							))}
						</div>
						<button
							type="button"
							onClick={() => step(1)}
							className="text-sm font-semibold text-primary transition hover:text-[var(--accent)]"
						>
							{t("announcement.next", "Next")} →
						</button>
					</div>
				)}
			</div>
		</dialog>
	);
}
