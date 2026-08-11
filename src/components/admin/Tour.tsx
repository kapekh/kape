import { X } from "lucide-react";
import {
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useState,
} from "react";

import { Button } from "#/components/ui/button.tsx";
import { useModalPanel } from "#/lib/use-modal-panel";
import { type TourId, TOURS } from "./tours";

const SEEN = "admin-tour-seen:";
const PAD = 6;
const CARD_W = 340;
const GAP = 12;

const listeners = new Set<(id: TourId | null) => void>();
let running: TourId | null = null;
const emit = () => {
	for (const l of listeners) l(running);
};

export function startTour(id: TourId) {
	running = id;
	emit();
}

/**
 * First visit only, and never over a tour already running: two screens both
 * asking on the same load would leave whichever mounted last talking about a
 * control the other one is pointing at.
 */
export function startTourOnce(id: TourId) {
	if (running) return;
	try {
		if (localStorage.getItem(SEEN + id)) return;
	} catch {
		return; // storage refused; a tour that cannot remember is a tour that nags
	}
	startTour(id);
}

export function TourHost() {
	const [id, setId] = useState<TourId | null>(null);
	useEffect(() => {
		listeners.add(setId);
		// A screen below the Outlet runs its effects before this host's, so a tour
		// it asked for has already been emitted into an empty listener set.
		setId(running);
		return () => {
			listeners.delete(setId);
		};
	}, []);
	return id ? <TourRun key={id} id={id} /> : null;
}

type Box = { top: number; left: number; width: number; height: number };

const same = (a: Box | null, b: Box | null) =>
	a === b ||
	(!!a &&
		!!b &&
		a.top === b.top &&
		a.left === b.left &&
		a.width === b.width &&
		a.height === b.height);

function TourRun({ id }: { id: TourId }) {
	const tour = TOURS[id];
	const [i, setI] = useState(0);
	const [box, setBox] = useState<Box | null>(null);
	const [cardH, setCardH] = useState(0);
	const [card, setCard] = useState<HTMLDivElement | null>(null);
	const headingId = useId();
	const step = tour.steps[i];

	const end = useCallback(() => {
		try {
			localStorage.setItem(SEEN + id, "1");
		} catch {}
		running = null;
		emit();
	}, [id]);

	const panelRef = useModalPanel(end, true);

	useLayoutEffect(() => {
		if (!step.target) {
			setBox(null);
			return;
		}
		const el = document.querySelector<HTMLElement>(step.target);
		if (!el) {
			setBox(null);
			return;
		}
		const reduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		el.scrollIntoView({
			block: "center",
			inline: "nearest",
			behavior: reduced ? "auto" : "smooth",
		});
		const measure = () => {
			const r = el.getBoundingClientRect();
			// off-screen or collapsed: the drawer rail below `lg` is translated out
			// rather than unmounted, and spotlighting it would frame empty air
			const visible =
				r.width > 0 &&
				r.height > 0 &&
				r.right > 0 &&
				r.bottom > 0 &&
				r.left < window.innerWidth &&
				r.top < window.innerHeight;
			const next = visible
				? { top: r.top, left: r.left, width: r.width, height: r.height }
				: null;
			setBox((prev) => (same(prev, next) ? prev : next));
		};
		measure();
		const settle = setTimeout(measure, 350); // after a smooth scroll lands
		window.addEventListener("resize", measure);
		window.addEventListener("scroll", measure, true);
		return () => {
			clearTimeout(settle);
			window.removeEventListener("resize", measure);
			window.removeEventListener("scroll", measure, true);
		};
	}, [step.target]);

	// Observed rather than measured per step: the card is the same element all
	// the way through, so a longer step's text is a resize, not a remount.
	useLayoutEffect(() => {
		if (!card) return;
		const measure = () => setCardH(card.getBoundingClientRect().height);
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(card);
		return () => ro.disconnect();
	}, [card]);

	const last = i === tour.steps.length - 1;
	const width = Math.min(CARD_W, window.innerWidth - 32);
	const frame = box && {
		top: box.top - PAD,
		left: box.left - PAD,
		width: box.width + PAD * 2,
		height: box.height + PAD * 2,
	};

	const clamp = (v: number, max: number) => Math.max(16, Math.min(v, max - 16));

	let cardStyle: React.CSSProperties;
	if (!frame) {
		cardStyle = {
			width,
			left: (window.innerWidth - width) / 2,
			top: Math.max(16, (window.innerHeight - cardH) / 2),
		};
	} else if (frame.height > window.innerHeight * 0.55) {
		// A full-height target — the sidebar — has no room above or below, and a
		// card laid over the thing it is describing explains nothing. Beside it.
		const right = frame.left + frame.width + GAP;
		const left =
			right + width <= window.innerWidth - 16
				? right
				: frame.left - GAP - width;
		cardStyle = {
			width,
			left: clamp(left, window.innerWidth - width),
			top: clamp(
				frame.top + frame.height / 2 - cardH / 2,
				window.innerHeight - cardH,
			),
		};
	} else {
		const below = frame.top + frame.height + GAP;
		const fits = below + cardH <= window.innerHeight - 16;
		cardStyle = {
			width,
			left: clamp(frame.left, window.innerWidth - width),
			top: fits
				? below
				: clamp(frame.top - GAP - cardH, window.innerHeight - cardH),
		};
	}

	const scrim = "fixed z-[190] bg-black/50";

	return (
		<>
			{frame ? (
				<>
					<div
						className={scrim}
						style={{
							top: 0,
							left: 0,
							right: 0,
							height: Math.max(0, frame.top),
						}}
					/>
					<div
						className={scrim}
						style={{
							top: frame.top + frame.height,
							left: 0,
							right: 0,
							bottom: 0,
						}}
					/>
					<div
						className={scrim}
						style={{
							top: frame.top,
							left: 0,
							width: Math.max(0, frame.left),
							height: frame.height,
						}}
					/>
					<div
						className={scrim}
						style={{
							top: frame.top,
							left: frame.left + frame.width,
							right: 0,
							height: frame.height,
						}}
					/>
					<div
						aria-hidden="true"
						className="pointer-events-none fixed z-[195] rounded-lg ring-2 ring-admin-accent motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out"
						style={frame}
					/>
				</>
			) : (
				<div className={`${scrim} inset-0`} />
			)}

			<div
				ref={(node) => {
					panelRef.current = node;
					setCard(node);
				}}
				role="dialog"
				aria-modal="true"
				aria-labelledby={headingId}
				tabIndex={-1}
				className="fixed z-[200] rounded-xl border border-admin-border bg-admin-panel-raised p-4 shadow-[var(--shadow-lift)] focus:outline-none"
				style={cardStyle}
			>
				<div className="flex items-start justify-between gap-3">
					<p id={headingId} className="text-base font-semibold text-admin-ink">
						{step.title}
					</p>
					<Button
						type="button"
						size="icon"
						variant="ghost"
						aria-label="End tour"
						onClick={end}
						className="-mr-2 -mt-2 flex-none"
					>
						<X aria-hidden="true" />
					</Button>
				</div>
				<p className="mt-2 text-[13px] text-admin-ink-muted">{step.body}</p>
				<div className="mt-4 flex items-center justify-between gap-3">
					<p className="text-[13px] text-admin-ink-muted">
						Step {i + 1} of {tour.steps.length}
					</p>
					<div className="flex items-center gap-2">
						{i > 0 && (
							<Button
								type="button"
								size="sm"
								variant="secondary"
								onClick={() => setI(i - 1)}
							>
								Back
							</Button>
						)}
						<Button
							type="button"
							size="sm"
							onClick={() => (last ? end() : setI(i + 1))}
						>
							{last ? "Done" : "Next"}
						</Button>
					</div>
				</div>
			</div>
		</>
	);
}
