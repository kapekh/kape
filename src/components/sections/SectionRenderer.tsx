import { useEffect, useRef, useState } from "react";

import type { SectionNode } from "#/lib/sections";
import { useLang } from "@/lib/i18n";
import { localizedHref } from "@/lib/i18n-config";

import { ContactForm } from "../ContactForm";
import { FormRenderer } from "../FormRenderer";
import { type MapMarker, MapView } from "../MapView";
import { NavLink } from "../NavLink";
import { PublicOrgChart } from "../PublicOrgChart";
import { RichBody } from "../RichBody";

/* eslint-disable @typescript-eslint/no-explicit-any */
type P = Record<string, any> & { layout?: string };

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */

const Container = ({
	className = "",
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) => <div className={`mx-auto max-w-7xl px-6 ${className}`}>{children}</div>;

const PAD = "py-20 md:py-24";
const toneBg = (t?: string) =>
	t === "card"
		? "bg-card border-y border-border"
		: t === "muted"
			? "bg-muted/40 border-y border-border"
			: "";
const card =
	"rounded-3xl border border-border bg-card shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]";

/** Render a title string with *asterisk-wrapped* segments as italic accent text. */
function renderTitle(title: string, accent = "text-[var(--secondary)]") {
	return String(title)
		.split(/(\*[^*]+\*|\n)/g)
		.map((seg, i) => {
			if (seg === "\n") return <br key={i} />;
			if (seg.startsWith("*") && seg.endsWith("*"))
				return (
					<span key={i} className={`italic ${accent}`}>
						{seg.slice(1, -1)}
					</span>
				);
			return <span key={i}>{seg}</span>;
		});
}

function Heading({
	eyebrow,
	title,
	center = false,
	light = false,
}: {
	eyebrow?: string;
	title?: string;
	center?: boolean;
	light?: boolean;
}) {
	if (!title && !eyebrow) return null;
	return (
		<div
			className={`${center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"} mb-12`}
		>
			{eyebrow && (
				<div
					className={`t-eyebrow ${light ? "text-[var(--gold)]" : "text-[var(--accent)]"}`}
				>
					{eyebrow}
				</div>
			)}
			{title && (
				<h2 className={`mt-3 t-section ${light ? "" : "text-primary"}`}>
					{renderTitle(title)}
				</h2>
			)}
		</div>
	);
}

const Empty = ({ children }: { children: React.ReactNode }) => (
	<p className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
		{children}
	</p>
);

const Blob = ({ className }: { className: string }) => (
	<div
		className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
		aria-hidden
	/>
);

const imgFor = (p: any) =>
	p.image ||
	p.cover ||
	`https://picsum.photos/seed/kape-${encodeURIComponent(String(p.slug || p.id || "x"))}/900/650`;

/** Returns a language-prefixing localizer for internal hrefs (path-based i18n). */
function useL() {
	const { lang } = useLang();
	return (href?: string | null) => localizedHref(href, lang);
}

const Icon = {
	play: (c = "") => (
		<svg className={c} viewBox="0 0 24 24" fill="currentColor">
			<path d="M8 5v14l11-7z" />
		</svg>
	),
	doc: (c = "") => (
		<svg
			className={c}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M14 3v5h5" />
			<path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
		</svg>
	),
	download: (c = "") => (
		<svg
			className={c}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M12 3v12m0 0 4-4m-4 4-4-4" />
			<path d="M5 21h14" />
		</svg>
	),
};

function useCount(target: number, run: boolean, duration = 1800) {
	// Start AT the target so the server-rendered / no-JS / pre-scroll DOM shows the
	// real number (crawlers and prerendered static pages otherwise captured "0").
	// The from-0 count-up plays once the band scrolls into view.
	const [n, setN] = useState(target);
	const played = useRef(false);
	useEffect(() => {
		if (!run || played.current) return;
		played.current = true;
		let raf = 0;
		const start = performance.now();
		setN(0);
		const tick = (now: number) => {
			const p = Math.min(1, (now - start) / duration);
			setN(Math.floor(target * (1 - Math.pow(1 - p, 3))));
			if (p < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [target, run, duration]);
	return n;
}

/** Fires once when the element first scrolls into view — gates on-scroll animations
 * (e.g. the stats count-up) so they play when the user reaches them, not on page load. */
function useInView<T extends HTMLElement>() {
	const ref = useRef<T | null>(null);
	const [inView, setInView] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (!el || inView) return;
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) setInView(true);
			},
			{ rootMargin: "0px 0px -15% 0px" },
		);
		io.observe(el);
		return () => io.disconnect();
	}, [inView]);
	return [ref, inView] as const;
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Slideshow({ slides }: { slides: any[] }) {
	const [i, setI] = useState(0);
	const [paused, setPaused] = useState(false);
	useEffect(() => {
		if (paused || slides.length < 2) return;
		const t = setInterval(() => setI((p) => (p + 1) % slides.length), 4500);
		return () => clearInterval(t);
	}, [paused, slides.length]);
	if (!slides.length) return null;
	return (
		<div
			className="relative h-[440px] md:h-[560px]"
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
		>
			<div className="group absolute inset-0 overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)] ring-1 ring-border">
				{slides.map((s, idx) => (
					<div
						key={idx}
						className={`absolute inset-0 transition-all duration-[1400ms] ease-out ${idx === i ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
						aria-hidden={idx !== i}
					>
						{s.image && (
							<img
								src={s.image}
								alt={s.caption || ""}
								className="h-full w-full object-cover"
							/>
						)}
						<div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/20 to-transparent" />
						<div className="absolute inset-x-0 bottom-0 p-7 md:p-9 text-primary-foreground">
							{s.kicker && (
								<div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--gold)]">
									{s.kicker}
								</div>
							)}
							{s.title && (
								<h3 className="mt-2 max-w-md font-display text-2xl md:text-3xl font-semibold leading-tight">
									{s.title}
								</h3>
							)}
							{s.caption && (
								<p className="mt-2 text-sm opacity-90">{s.caption}</p>
							)}
						</div>
					</div>
				))}
				<div className="absolute inset-x-5 top-5 z-10 flex gap-1.5">
					{slides.map((_, idx) => (
						<button
							key={idx}
							type="button"
							onClick={() => setI(idx)}
							aria-label={`Slide ${idx + 1}`}
							className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/30"
						>
							<span
								className={`absolute inset-y-0 left-0 bg-white ${idx === i ? "w-full transition-[width] duration-[4500ms] ease-linear" : "w-0"}`}
							/>
						</button>
					))}
				</div>
			</div>
			<Blob className="-left-6 -top-6 -z-10 h-32 w-32 bg-[var(--gold)]/40" />
			<Blob className="-bottom-6 -right-6 -z-10 h-40 w-40 bg-[var(--accent)]/30" />
		</div>
	);
}

function Hero(p: P) {
	const L = useL();
	const layout = p.layout ?? "banner";
	const slides: any[] = Array.isArray(p.slides) ? p.slides : [];
	const stats: any[] = Array.isArray(p.stats) ? p.stats : [];

	const ctas = (center?: boolean) => (
		<div
			className={`mt-8 flex flex-wrap gap-3 ${center ? "justify-center" : ""}`}
		>
			{p.ctaHref && (
				<NavLink
					href={L(p.ctaHref)}
					className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition"
				>
					{p.ctaLabel || "Learn more"}
				</NavLink>
			)}
			{p.cta2Href && (
				<NavLink
					href={L(p.cta2Href)}
					className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition"
				>
					{p.cta2Label || "Learn more"}
				</NavLink>
			)}
		</div>
	);

	// Showcase: split text + slideshow (the homepage hero).
	if ((layout === "carousel" || layout === "showcase") && slides.length) {
		return (
			<section className="relative overflow-hidden">
				<Container className="grid items-center gap-12 py-16 lg:grid-cols-12 lg:py-24">
					<div className="relative z-10 lg:col-span-6">
						{p.eyebrow && (
							<div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/5 px-4 py-1.5 text-xs font-medium text-[var(--accent)]">
								<span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
								{p.eyebrow}
							</div>
						)}
						<h1 className="mt-6 t-display text-primary">
							{renderTitle(p.title || "", "text-[var(--accent)]")}
						</h1>
						{p.lead && (
							<p className="mt-6 max-w-xl t-lead text-muted-foreground">
								{p.lead}
							</p>
						)}
						{ctas()}
						{stats.length > 0 && (
							<div className="mt-12 flex items-center gap-6 text-xs text-muted-foreground">
								{stats.map((s, n) => (
									<div key={n} className="flex items-center gap-6">
										{n > 0 && <span className="h-10 w-px bg-border" />}
										<div>
											<div className="font-display text-2xl font-semibold text-primary">
												{s.value}
											</div>
											{s.label}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
					<div className="lg:col-span-6">
						<Slideshow slides={slides} />
					</div>
				</Container>
			</section>
		);
	}

	if (layout === "split") {
		return (
			<section className="py-16 md:py-24">
				<Container className="grid items-center gap-12 lg:grid-cols-2">
					<div>
						{p.eyebrow && (
							<div className="t-eyebrow text-[var(--accent)]">{p.eyebrow}</div>
						)}
						<h1 className="mt-3 t-page-title text-primary">
							{renderTitle(p.title || "")}
						</h1>
						{p.lead && (
							<p className="mt-5 t-lead text-foreground/75">{p.lead}</p>
						)}
						{ctas()}
					</div>
					{p.image && (
						<img
							src={p.image}
							alt={p.title || ""}
							className="rounded-3xl object-cover w-full aspect-[4/3] shadow-[var(--shadow-soft)]"
						/>
					)}
				</Container>
			</section>
		);
	}

	// Banner (full-bleed) — used by sub-pages / simple heroes.
	const bg = p.image;
	return (
		<section className="relative flex min-h-[60vh] items-center overflow-hidden bg-primary">
			<div className="absolute inset-0">
				{bg && <img src={bg} alt="" className="h-full w-full object-cover" />}
				<div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/45" />
			</div>
			<Container className="relative py-24 text-center text-primary-foreground">
				{p.eyebrow && (
					<div className="t-eyebrow text-[var(--gold)] [text-shadow:0_1px_10px_rgba(0,0,0,0.7)]">
						{p.eyebrow}
					</div>
				)}
				<h1 className="mx-auto mt-4 max-w-4xl t-page-title [text-shadow:0_2px_24px_rgba(0,0,0,0.45)]">
					{renderTitle(p.title || "", "text-[var(--gold)]")}
				</h1>
				{p.lead && (
					<p className="mx-auto mt-6 max-w-2xl t-lead text-white/90 [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">
						{p.lead}
					</p>
				)}
				{ctas(true)}
			</Container>
		</section>
	);
}

/* ------------------------------------------------------------------ */
/* Static templates                                                    */
/* ------------------------------------------------------------------ */

function RichText(p: P) {
	return (
		<section className={`${PAD} ${toneBg(p.tone)}`}>
			<Container className={p.layout === "narrow" ? "max-w-3xl" : "max-w-4xl"}>
				<RichBody className="prose-kape" html={p.bodyHtml ?? ""} />
			</Container>
		</section>
	);
}

function Cards(p: P) {
	const L = useL();
	const cols =
		p.layout === "cols-2"
			? "md:grid-cols-2"
			: p.layout === "cols-4"
				? "sm:grid-cols-2 lg:grid-cols-4"
				: "sm:grid-cols-2 lg:grid-cols-3";
	const items: any[] = Array.isArray(p.items) ? p.items : [];

	const footer = (it: any, light = false) => {
		// Buttons: explicit list, or a legacy single `href` folded into one button.
		const btns: any[] = Array.isArray(it.buttons)
			? it.buttons
			: it.href
				? [{ label: "Learn more", href: it.href }]
				: [];
		const valid = btns.filter((b) => b && b.href);
		if (!valid.length) return null;
		return (
			<div className="mt-5 flex flex-wrap gap-2">
				{valid.map((b, i) => (
					<NavLink
						key={i}
						href={L(b.href)}
						className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${light ? "bg-white/15 text-white hover:bg-white/25" : "bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"}`}
					>
						{b.label || "Learn more"}
					</NavLink>
				))}
			</div>
		);
	};

	return (
		<section className={`${PAD} ${toneBg(p.tone)}`}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} center={p.center} />
				<div className={`grid grid-cols-1 ${cols} gap-5`}>
					{items.map((it, n) => {
						// Background-image card: image fills the card, text overlaid in white.
						if (it.image && it.imageAsBg) {
							return (
								<div
									key={n}
									className="relative flex min-h-[260px] flex-col justify-end overflow-hidden rounded-3xl border border-border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
								>
									<img
										src={it.image}
										alt={it.title || ""}
										className="absolute inset-0 h-full w-full object-cover"
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
									<div className="relative text-white">
										{it.title && (
											<h3 className="t-card-title [text-shadow:0_1px_10px_rgba(0,0,0,0.5)]">
												{it.title}
											</h3>
										)}
										{it.body && (
											<p className="mt-2 t-body text-white/85">{it.body}</p>
										)}
										{footer(it, true)}
									</div>
								</div>
							);
						}
						// Standard card: optional image on top, then title/body/buttons.
						return (
							<div
								key={n}
								className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[var(--shadow-soft)]"
							>
								{it.image ? (
									<img
										src={it.image}
										alt={it.title || ""}
										className="aspect-video w-full object-cover"
									/>
								) : null}
								<div className="flex flex-1 flex-col p-6">
									{!it.image && (
										<div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] font-display text-lg font-bold">
											{n + 1}
										</div>
									)}
									{it.title && (
										<h3 className="t-card-title text-primary">{it.title}</h3>
									)}
									{it.body && (
										<p className="mt-2 t-body text-foreground/75">{it.body}</p>
									)}
									{footer(it)}
								</div>
							</div>
						);
					})}
				</div>
			</Container>
		</section>
	);
}

function StatItem({
	value,
	label,
	run,
	valueClass = "text-5xl md:text-6xl",
	labelClass = "text-xs",
}: {
	value: string;
	label: string;
	run: boolean;
	valueClass?: string;
	labelClass?: string;
}) {
	const digits = String(value).replace(/[^0-9]/g, "");
	const target = digits ? Number(digits) : 0;
	const n = useCount(target, run);
	// Replace the whole numeric run (incl. thousands separators) so values >= 1000 also
	// animate — matching on the bare digit string fails against a comma-formatted value.
	const display = digits
		? String(value).replace(/[\d,]+/, n.toLocaleString())
		: value;
	return (
		<div className="group">
			<div
				aria-hidden="true"
				className={`font-display ${valueClass} font-semibold tabular-nums tracking-tight text-[var(--secondary)] whitespace-nowrap`}
			>
				{display}
			</div>
			<span className="sr-only">
				{value} {label}
			</span>
			<div
				aria-hidden="true"
				className={`mt-2 ${labelClass} uppercase tracking-[0.18em] text-primary-foreground/70`}
			>
				{label}
			</div>
			<div
				aria-hidden="true"
				className="mt-4 h-px w-12 bg-[var(--secondary)]/60 transition-all duration-500 group-hover:w-24"
			/>
		</div>
	);
}

const STAT_VALUE_SIZE: Record<string, string> = {
	sm: "text-3xl md:text-4xl",
	md: "text-4xl md:text-5xl",
	lg: "text-5xl md:text-6xl",
	xl: "text-6xl md:text-7xl",
};
const STAT_LABEL_SIZE: Record<string, string> = {
	xs: "text-xs",
	sm: "text-sm",
	md: "text-base",
};

function Stats(p: P) {
	const items: any[] = Array.isArray(p.items) ? p.items : [];
	const [bandRef, inView] = useInView<HTMLElement>();
	const band = p.layout !== "plain";
	// Default the number to large on the band / medium on the plain layout; label defaults small.
	const valueClass =
		STAT_VALUE_SIZE[p.valueSize as string] ??
		(band ? STAT_VALUE_SIZE.lg : STAT_VALUE_SIZE.md);
	const labelClass =
		STAT_LABEL_SIZE[p.labelSize as string] ?? STAT_LABEL_SIZE.xs;
	if (!band) {
		return (
			<section className={PAD}>
				<Container>
					<Heading eyebrow={p.eyebrow} title={p.title} />
					<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-8 gap-y-10">
						{items.map((it, n) => (
							<div key={n}>
								<div
									className={`font-display ${valueClass} font-semibold tabular-nums tracking-tight text-primary whitespace-nowrap`}
								>
									{it.value}
								</div>
								<div className={`mt-2 ${labelClass} text-muted-foreground`}>
									{it.label}
								</div>
							</div>
						))}
					</div>
				</Container>
			</section>
		);
	}
	return (
		<section
			ref={bandRef}
			className="relative overflow-hidden py-24 text-primary-foreground"
			style={{ background: "var(--gradient-hero)" }}
		>
			{p.image && (
				<div
					className="absolute inset-0 opacity-30 mix-blend-overlay"
					style={{
						backgroundImage: `url(${p.image})`,
						backgroundSize: "cover",
						backgroundPosition: "center",
					}}
				/>
			)}
			<div className="absolute inset-0 bg-primary/70" />
			<Container className="relative">
				<div className="mb-16 max-w-3xl">
					{p.eyebrow && (
						<div className="t-eyebrow text-[var(--gold)]">{p.eyebrow}</div>
					)}
					{p.title && <h2 className="mt-3 t-band">{renderTitle(p.title)}</h2>}
				</div>
				<div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-10 gap-y-12">
					{items.map((it, n) => (
						<StatItem
							key={n}
							value={String(it.value)}
							label={it.label}
							run={inView}
							valueClass={valueClass}
							labelClass={labelClass}
						/>
					))}
				</div>
			</Container>
		</section>
	);
}

function Cta(p: P) {
	const L = useL();
	return (
		<section
			className="relative overflow-hidden py-24"
			style={{ background: "var(--gradient-warm)" }}
		>
			<Blob className="-left-20 -top-20 h-80 w-80 bg-[var(--gold)]/40" />
			<Blob className="-bottom-20 -right-20 h-80 w-80 bg-primary/30" />
			<div className="relative mx-auto max-w-4xl px-6 text-center">
				{p.eyebrow && (
					<div className="t-eyebrow text-[oklch(0.3_0.07_255)]/80">
						{p.eyebrow}
					</div>
				)}
				<h2 className="mt-4 t-band text-[oklch(0.24_0.09_255)]">
					{renderTitle(p.title || "", "italic")}
				</h2>
				{p.body && (
					<p className="mx-auto mt-6 max-w-2xl t-lead text-[oklch(0.3_0.07_255)]/90">
						{p.body}
					</p>
				)}
				<div className="mt-10 flex flex-wrap justify-center gap-4">
					{p.ctaHref && (
						<NavLink
							href={L(p.ctaHref)}
							className="inline-flex items-center gap-2 rounded-full bg-[oklch(0.24_0.09_255)] text-white px-8 py-4 text-base font-semibold shadow-[var(--shadow-lift)] hover:-translate-y-1 transition"
						>
							{p.ctaLabel || "Donate now"}
						</NavLink>
					)}
					{p.cta2Href && (
						<NavLink
							href={L(p.cta2Href)}
							className="inline-flex items-center gap-2 rounded-full border-2 border-[oklch(0.24_0.09_255)]/40 text-[oklch(0.24_0.09_255)] px-8 py-4 text-base font-semibold hover:bg-[oklch(0.24_0.09_255)] hover:text-white transition"
						>
							{p.cta2Label || "Learn more"}
						</NavLink>
					)}
				</div>
			</div>
		</section>
	);
}

function Resources(p: P) {
	const items: any[] = Array.isArray(p.items) ? p.items : [];
	const cols = p.layout === "cols-2" ? "md:grid-cols-2" : "";
	return (
		<section className={`${PAD} ${toneBg(p.tone)}`}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} />
				{items.length === 0 ? (
					<Empty>No resources published yet.</Empty>
				) : (
					<div className={`grid grid-cols-1 ${cols} gap-4`}>
						{items.map((it, n) => (
							<NavLink
								key={n}
								href={it.href || "#"}
								className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[var(--shadow-soft)]"
							>
								<div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
									{Icon.doc("h-6 w-6")}
								</div>
								<div className="min-w-0 flex-1">
									<div className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] font-semibold">
										{it.kind || "file"}
									</div>
									<div className="mt-0.5 font-medium text-foreground group-hover:text-[var(--accent)] transition">
										{it.title}
									</div>
									{it.meta && (
										<div className="text-xs text-muted-foreground mt-0.5">
											{it.meta}
										</div>
									)}
								</div>
								<span className="shrink-0 text-muted-foreground/50 group-hover:text-[var(--accent)] transition">
									{Icon.download("h-5 w-5")}
								</span>
							</NavLink>
						))}
					</div>
				)}
			</Container>
		</section>
	);
}

function Split(p: P) {
	const mediaLeft = p.layout === "media-left";
	const media = p.image ? (
		<div className="relative">
			<div className="overflow-hidden rounded-3xl ring-1 ring-border shadow-[var(--shadow-soft)]">
				<img
					src={p.image}
					alt={p.title || ""}
					className="h-[420px] w-full object-cover md:h-[480px]"
				/>
			</div>
			{p.statValue && (
				<div className="absolute -bottom-8 -right-6 max-w-[220px] rounded-2xl bg-card p-6 shadow-[var(--shadow-lift)] ring-1 ring-border">
					<div className="font-display text-4xl font-semibold text-[var(--accent)]">
						{p.statValue}
					</div>
					<div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
						{p.statLabel}
					</div>
				</div>
			)}
		</div>
	) : null;
	const text = (
		<div>
			{p.eyebrow && (
				<div className="t-eyebrow text-[var(--accent)]">{p.eyebrow}</div>
			)}
			{p.title && (
				<h2 className="mt-3 t-section text-primary">
					{renderTitle(p.title, "italic text-primary")}
				</h2>
			)}
			<RichBody className="prose-kape mt-6" html={p.bodyHtml ?? ""} />
		</div>
	);
	return (
		<section className={`${PAD} ${toneBg(p.tone)}`}>
			<Container className="grid items-center gap-16 lg:grid-cols-2">
				{mediaLeft ? (
					<>
						{media}
						{text}
					</>
				) : (
					<>
						{text}
						{media}
					</>
				)}
			</Container>
		</section>
	);
}

function Pills(p: P) {
	const groups: any[] = Array.isArray(p.groups) ? p.groups : [];
	const parse = (s: string) =>
		String(s || "")
			.split(",")
			.map((x) => x.trim())
			.filter(Boolean)
			.map((pair) => {
				const [label, href] = pair.split("|").map((y) => y.trim());
				return { label, href: href || "#" };
			});
	return (
		<section className={`${PAD} ${toneBg(p.tone)}`}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} />
				<div className="space-y-7">
					{groups.map((g, n) => (
						<div key={n}>
							{g.heading && (
								<h3 className="mb-3 font-display text-lg font-semibold text-primary">
									{g.heading}
								</h3>
							)}
							<div className="flex flex-wrap gap-2.5">
								{parse(g.links).map((l, m) => (
									<NavLink
										key={m}
										href={l.href}
										className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/80 shadow-sm hover:border-[var(--accent)] hover:text-[var(--accent)] hover:-translate-y-0.5 transition"
									>
										{l.label}
									</NavLink>
								))}
							</div>
						</div>
					))}
				</div>
			</Container>
		</section>
	);
}

function FormSection(p: P) {
	// A built form carries its own title/intro/submit, so the section's heading
	// and intro are only used for the quick (contact/subscribe/signup) layouts.
	const builtForm = !!p.formSlug;
	return (
		<section className={`${PAD} ${toneBg(p.tone)}`}>
			<Container className="max-w-2xl">
				{!builtForm && <Heading eyebrow={p.eyebrow} title={p.title} center />}
				{!builtForm && p.body && (
					<p className="-mt-6 mb-8 text-center text-foreground/75 leading-relaxed">
						{p.body}
					</p>
				)}
				<div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
					{p.formSlug ? (
						<FormRenderer slug={p.formSlug} />
					) : p.layout === "contact" ? (
						<ContactForm />
					) : (
						<form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
							{p.layout === "signup" && (
								<input
									className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
									placeholder="Your name"
								/>
							)}
							<input
								type="email"
								className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
								placeholder="you@email.org"
								required
							/>
							{p.layout === "signup" && (
								<textarea
									className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
									rows={4}
									placeholder="Message"
								/>
							)}
							<button
								type="submit"
								className="w-full rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 transition"
							>
								{p.submitLabel || "Submit"}
							</button>
						</form>
					)}
				</div>
			</Container>
		</section>
	);
}

/* ------------------------------------------------------------------ */
/* Dynamic templates                                                   */
/* ------------------------------------------------------------------ */

function PostCard({ post, base }: { post: any; base: string }) {
	const L = useL();
	const href = base ? L(`${base}/${post.slug}`) : undefined;
	const body = (
		<>
			<div className="relative h-56 overflow-hidden">
				<img
					src={imgFor(post)}
					alt={post.title || ""}
					className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent to-transparent" />
				{post.publishedAt && (
					<span className="absolute left-4 top-4 rounded-full bg-[var(--accent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
						{post.publishedAt}
					</span>
				)}
			</div>
			<div className="p-6">
				<h3 className="t-card-title text-primary group-hover:text-[var(--accent)] transition">
					{post.title}
				</h3>
				{post.excerpt && (
					<p className="mt-2 t-meta text-foreground/70 line-clamp-3">
						{post.excerpt}
					</p>
				)}
				{href && (
					<span className="mt-4 inline-block text-sm font-semibold text-[var(--accent)]">
						Read more →
					</span>
				)}
			</div>
		</>
	);
	return href ? (
		<NavLink href={href} className={`${card} group block overflow-hidden`}>
			{body}
		</NavLink>
	) : (
		<div className="group overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
			{body}
		</div>
	);
}

function PostList(p: P) {
	const L = useL();
	const posts: any[] = Array.isArray(p.data) ? p.data : [];
	const base = p.linkBase ?? "";
	const link = (slug: string) => (base ? L(`${base}/${slug}`) : "#");
	const layout = p.layout ?? "grid-3";
	return (
		<section className={`${PAD} ${toneBg(p.tone)}`}>
			<Container>
				<div className="mb-12 flex items-end justify-between gap-4 flex-wrap">
					<Heading eyebrow={p.eyebrow} title={p.title} />
					{p.moreHref && (
						<NavLink
							href={L(p.moreHref) ?? "#"}
							className="text-sm font-semibold text-primary underline underline-offset-8 hover:text-[var(--accent)]"
						>
							See all →
						</NavLink>
					)}
				</div>
				{posts.length === 0 ? (
					<Empty>Nothing published here yet.</Empty>
				) : layout === "list" ? (
					<ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
						{posts.map((post) => (
							<li key={post.id}>
								<NavLink
									href={link(post.slug)}
									className="group flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--accent)]/5 transition"
								>
									<span className="font-medium text-foreground/85 group-hover:text-[var(--accent)] transition">
										{post.title}
									</span>
									<span className="shrink-0 text-xs text-muted-foreground">
										{post.publishedAt}
									</span>
								</NavLink>
							</li>
						))}
					</ul>
				) : layout === "featured" && posts.length > 1 ? (
					<div className="grid gap-8 lg:grid-cols-12">
						<article className="group lg:col-span-7">
							<NavLink
								href={link(posts[0].slug)}
								className="relative block h-[420px] overflow-hidden rounded-3xl ring-1 ring-border"
							>
								<img
									src={imgFor(posts[0])}
									alt={posts[0].title || ""}
									className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
								/>
								<div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/30 to-transparent" />
								<div className="absolute bottom-0 p-8 text-primary-foreground">
									{posts[0].publishedAt && (
										<span className="rounded-full bg-[var(--accent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
											{posts[0].publishedAt}
										</span>
									)}
									<h3 className="mt-4 max-w-xl t-section">{posts[0].title}</h3>
									{posts[0].excerpt && (
										<p className="mt-3 max-w-lg t-meta opacity-90 line-clamp-2">
											{posts[0].excerpt}
										</p>
									)}
									<span className="mt-5 inline-block text-sm font-semibold text-[var(--gold)]">
										Read more →
									</span>
								</div>
							</NavLink>
						</article>
						<div className="space-y-6 lg:col-span-5">
							{posts.slice(1, 4).map((post) => (
								<NavLink
									key={post.id}
									href={link(post.slug)}
									className="group flex gap-5"
								>
									<div className="relative h-32 w-40 shrink-0 overflow-hidden rounded-2xl ring-1 ring-border">
										<img
											src={imgFor(post)}
											alt={post.title || ""}
											className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
										/>
									</div>
									<div className="flex-1">
										{post.publishedAt && (
											<div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
												{post.publishedAt}
											</div>
										)}
										<h4 className="mt-1.5 t-card-title text-primary group-hover:text-[var(--accent)] transition line-clamp-3">
											{post.title}
										</h4>
									</div>
								</NavLink>
							))}
						</div>
					</div>
				) : (
					<div
						className={`grid gap-8 ${layout === "grid-2" || posts.length < 3 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}
					>
						{posts.map((post) => (
							<PostCard key={post.id} post={post} base={base} />
						))}
					</div>
				)}
			</Container>
		</section>
	);
}

function youtubeId(url: string): string | null {
	const m = String(url || "").match(
		/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{6,})/,
	);
	return m ? m[1] : null;
}

function VideoGrid(p: P) {
	const L = useL();
	const videos: any[] = Array.isArray(p.data) ? p.data : [];
	return (
		<section className={`${PAD} ${toneBg(p.tone)}`}>
			<Container>
				<div className="mb-12 flex items-end justify-between gap-4 flex-wrap">
					<Heading eyebrow={p.eyebrow} title={p.title} />
					{p.moreHref && (
						<NavLink
							href={L(p.moreHref) ?? "#"}
							className="text-sm font-semibold text-primary underline underline-offset-8 hover:text-[var(--accent)]"
						>
							All videos →
						</NavLink>
					)}
				</div>
				{videos.length === 0 ? (
					<Empty>No videos yet.</Empty>
				) : (
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{videos.map((v) => {
							const id = youtubeId(v.youtubeUrl);
							const thumb = id
								? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
								: imgFor(v);
							return (
								<NavLink
									key={v.id}
									href={v.youtubeUrl || "#"}
									target="_blank"
									rel="noreferrer"
									className="group cursor-pointer"
								>
									<div className="relative aspect-video overflow-hidden rounded-2xl ring-1 ring-border">
										<img
											src={thumb}
											alt={v.title || ""}
											className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
										/>
										<div className="absolute inset-0 bg-primary/20 transition group-hover:bg-primary/10" />
										<div className="absolute inset-0 grid place-items-center">
											<span className="grid h-16 w-16 place-items-center rounded-full bg-background/95 text-[var(--accent)] shadow-[var(--shadow-lift)] transition group-hover:scale-110">
												{Icon.play("h-6 w-6 translate-x-0.5")}
											</span>
										</div>
									</div>
									<h3 className="mt-4 t-card-title text-primary group-hover:text-[var(--accent)] transition">
										{v.title}
									</h3>
								</NavLink>
							);
						})}
					</div>
				)}
			</Container>
		</section>
	);
}

function AlbumGrid(p: P) {
	const L = useL();
	const albums: any[] = Array.isArray(p.data) ? p.data : [];
	return (
		<section className={`${PAD} ${toneBg(p.tone)}`}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} />
				{albums.length === 0 ? (
					<Empty>No photo albums yet.</Empty>
				) : (
					<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{albums.map((a) => (
							<NavLink
								key={a.id}
								href={L(`/galleries/${a.slug}`)}
								className="group relative block overflow-hidden rounded-3xl ring-1 ring-border shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
							>
								<div className="aspect-[4/3] bg-muted">
									<img
										src={imgFor(a)}
										alt={a.title || ""}
										className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
									/>
								</div>
								<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent p-5 text-primary-foreground">
									<div className="t-card-title">{a.title}</div>
									<div className="mt-0.5 t-meta opacity-85">
										{a.count} photos
									</div>
								</div>
							</NavLink>
						))}
					</div>
				)}
			</Container>
		</section>
	);
}

function PublicationList(p: P) {
	const items: any[] = Array.isArray(p.data) ? p.data : [];
	return (
		<section className={`${PAD} ${toneBg(p.tone)}`}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} />
				{items.length === 0 ? (
					<Empty>No publications in this category yet.</Empty>
				) : (
					<div
						className={`grid gap-4 ${p.layout === "list" ? "" : "md:grid-cols-2"}`}
					>
						{items.map((it) => (
							<NavLink
								key={it.id}
								href={it.fileUrl || "#"}
								className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[var(--shadow-soft)]"
							>
								<div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
									{Icon.doc("h-6 w-6")}
								</div>
								<div className="min-w-0 flex-1">
									<div className="font-medium text-foreground group-hover:text-[var(--accent)] transition">
										{it.title}
									</div>
									{it.year && (
										<div className="text-xs text-muted-foreground">
											{it.year}
										</div>
									)}
								</div>
								<span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--accent)]">
									{Icon.download("h-4 w-4")} PDF
								</span>
							</NavLink>
						))}
					</div>
				)}
			</Container>
		</section>
	);
}

function People(p: P) {
	const L = useL();
	const people: any[] = Array.isArray(p.data) ? p.data : [];
	const initials = (name: string) =>
		String(name || "")
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0])
			.join("");
	return (
		<section className={`${PAD} ${toneBg(p.tone)}`}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} />
				{people.length === 0 ? (
					<Empty>No team members listed yet.</Empty>
				) : (
					<div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
						{people.map((person) => (
							<NavLink
								key={person.id}
								href={L(`/team/${person.slug}`)}
								className="group text-center"
							>
								<div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-primary-foreground font-display text-2xl font-bold shadow-md ring-4 ring-card transition group-hover:scale-105">
									{initials(person.name)}
								</div>
								<div className="mt-3 text-sm font-semibold text-primary group-hover:text-[var(--accent)] transition">
									{person.name}
								</div>
								{person.position && (
									<div className="text-xs text-muted-foreground">
										{person.position}
									</div>
								)}
							</NavLink>
						))}
					</div>
				)}
			</Container>
		</section>
	);
}

function MapSection(p: P) {
	const rows: any[] = Array.isArray(p.data) ? p.data : [];
	const markers: MapMarker[] = rows
		.map((r) => ({
			lat: Number(r.lat),
			lng: Number(r.lng),
			label: r.label || r.name || r.schoolName || "",
		}))
		.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
	const center: [number, number] = markers.length
		? [markers[0].lat, markers[0].lng]
		: [12.5, 104.9];
	return (
		<section className={`${PAD} ${toneBg(p.tone)}`}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} />
				<div className="overflow-hidden rounded-2xl border border-border shadow-sm">
					<MapView markers={markers} center={center} zoom={7} />
				</div>
			</Container>
		</section>
	);
}

function Directory(p: P) {
	const rows: any[] = Array.isArray(p.data) ? p.data : [];
	const cols = rows.length
		? Object.keys(rows[0]).filter((k) => k !== "id")
		: [];
	return (
		<section className={`${PAD} ${toneBg(p.tone)}`}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} />
				{rows.length === 0 ? (
					<Empty>Nothing to list yet.</Empty>
				) : (
					<div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
						<table className="w-full text-sm">
							<thead className="bg-muted/60 text-left">
								<tr>
									{cols.map((c) => (
										<th
											key={c}
											className="px-4 py-3 font-semibold capitalize text-foreground/70"
										>
											{c.replace(/([A-Z])/g, " $1")}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{rows.map((r, n) => (
									<tr key={r.id ?? n} className="hover:bg-muted/30 transition">
										{cols.map((c) => (
											<td key={c} className="px-4 py-3 text-foreground/80">
												{String(r[c] ?? "")}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Container>
		</section>
	);
}

function Partners(p: P) {
	const rows: any[] = Array.isArray(p.data) ? p.data : [];
	const byCat = new Map<string, any[]>();
	for (const r of rows) {
		const k = r.category || "Partners";
		byCat.set(k, [...(byCat.get(k) ?? []), r]);
	}
	return (
		<section className={`${PAD} ${toneBg(p.tone)}`}>
			<Container>
				<Heading eyebrow={p.eyebrow} title={p.title} />
				{rows.length === 0 ? (
					<Empty>No partners listed yet.</Empty>
				) : (
					// Category rows: a label column on the left, logos flowing to the right,
					// hairline-separated. Even, scannable, and no empty cards for small groups.
					<div className="mt-10 divide-y divide-border border-y border-border">
						{[...byCat.entries()].map(([cat, list]) => (
							<div
								key={cat}
								className="grid gap-3 py-6 md:grid-cols-[minmax(0,190px)_1fr] md:gap-8 md:py-7"
							>
								<h3 className="t-eyebrow text-[var(--accent)] md:pt-2.5">
									{cat.replace(/-/g, " ")}
								</h3>
								<div className="flex flex-wrap items-center gap-3">
									{list.map((r) => {
										const badge = r.logoUrl ? (
											<span className="grid h-12 w-28 place-items-center rounded-lg bg-white p-2 ring-1 ring-border transition group-hover:ring-[var(--accent)]">
												<img
													src={r.logoUrl}
													alt={r.name}
													className="max-h-full max-w-full object-contain grayscale opacity-75 transition duration-300 group-hover:grayscale-0 group-hover:opacity-100"
												/>
											</span>
										) : (
											<span className="rounded-full border border-border bg-background/60 px-3.5 py-1.5 text-sm font-medium text-foreground/80 transition group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]">
												{r.name}
											</span>
										);
										// Only link partners that have a real URL — a missing/placeholder
										// url ("#") used to render a dead anchor that resolved to /en#.
										const realUrl = r.url && r.url !== "#" ? r.url : null;
										return realUrl ? (
											<NavLink
												key={r.id}
												href={realUrl}
												title={r.name}
												target="_blank"
												rel="noreferrer"
												className="group inline-flex"
											>
												{badge}
											</NavLink>
										) : (
											<span
												key={r.id}
												title={r.name}
												className="group inline-flex"
											>
												{badge}
											</span>
										);
									})}
								</div>
							</div>
						))}
					</div>
				)}
			</Container>
		</section>
	);
}

/** Hierarchical management tree, rendered as an n8n-style React Flow canvas. */
function OrgChart(p: P) {
	const roots: any[] = Array.isArray(p.data) ? p.data : [];
	// React Flow is client-only and we no longer render a CSS-tree fallback (it caused
	// a visible swap on hydration). Until mounted, show a same-sized empty box so the
	// canvas simply fades into an already-present container — no reflow, no jump.
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	if (roots.length === 0) {
		return (
			<section className={`${PAD} ${toneBg(p.tone)}`}>
				<Container>
					<Heading eyebrow={p.eyebrow} title={p.title} />
					<Empty>No organizational chart yet.</Empty>
				</Container>
			</section>
		);
	}

	if (mounted)
		return <PublicOrgChart roots={roots} eyebrow={p.eyebrow} title={p.title} />;

	return <div className="min-h-[640px] w-full bg-muted/20" aria-hidden />;
}

/* ------------------------------------------------------------------ */
/* Registry + renderer                                                 */
/* ------------------------------------------------------------------ */

export const sectionRegistry: Record<string, (p: P) => React.ReactNode> = {
	hero: Hero,
	richtext: RichText,
	cards: Cards,
	stats: Stats,
	cta: Cta,
	resources: Resources,
	split: Split,
	pills: Pills,
	form: FormSection,
	postList: PostList,
	videoGrid: VideoGrid,
	albumGrid: AlbumGrid,
	publicationList: PublicationList,
	people: People,
	map: MapSection,
	directory: Directory,
	partners: Partners,
	orgChart: OrgChart,
};

function UnknownSection({ type }: { type: string }) {
	return (
		<Container className="py-6">
			<div className="rounded-xl border border-dashed border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
				Unknown section type: <code>{type}</code>
			</div>
		</Container>
	);
}

export function SectionRenderer({ sections }: { sections: SectionNode[] }) {
	return (
		<>
			{sections.map((s) => {
				const Template = sectionRegistry[s.type];
				const body = Template ? (
					<Template layout={s.layout} {...(s.props ?? {})} />
				) : (
					<UnknownSection type={s.type} />
				);
				// Expose the section id as a DOM anchor (e.g. `#donate`) and offset the
				// scroll target so the sticky header never covers it.
				return (
					<div key={s.id} id={s.id} className="scroll-mt-28">
						{body}
					</div>
				);
			})}
		</>
	);
}
