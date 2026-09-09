import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { useModalPanel } from "#/lib/use-modal-panel";
import { GUIDE_GROUPS } from "./guides";
import { forgetTours, seenTours, startTour } from "./Tour";
import { TOURS, type TourId } from "./tours";

export function GuidePanel({
	open,
	onClose,
	canOpen,
}: {
	open: boolean;
	onClose: () => void;
	/** Whether this account may open a screen; guides for the rest are left out. */
	canOpen: (path: string) => boolean;
}) {
	const navigate = useNavigate();
	const here = useRouterState({
		select: (s) => s.location.pathname + s.location.searchStr,
	});
	const [seen, setSeen] = useState<Set<TourId>>(() => new Set());
	const headingId = useId();
	const ref = useModalPanel(onClose, open);

	useEffect(() => {
		if (open) setSeen(seenTours());
	}, [open]);

	if (!open) return null;

	const groups = GUIDE_GROUPS.map((g) => ({
		...g,
		guides: g.guides.filter((x) => canOpen(x.path)),
	})).filter((g) => g.guides.length > 0);
	const all = groups.flatMap((g) => g.guides);
	const taken = all.filter((g) => seen.has(g.id)).length;

	async function start(id: TourId, path: string) {
		onClose();
		if (here !== path) await navigate({ href: path });
		startTour(id);
	}

	return (
		<>
			<button
				type="button"
				aria-label="Close guides"
				onClick={onClose}
				className="fixed inset-0 z-[170] cursor-default bg-black/40"
			/>
			<div
				ref={ref}
				role="dialog"
				aria-modal="true"
				aria-labelledby={headingId}
				tabIndex={-1}
				className="fixed inset-y-0 right-0 z-[180] flex w-[min(100vw,28rem)] flex-col border-l border-admin-border bg-admin-panel-raised shadow-[var(--shadow-lift)] focus:outline-none"
			>
				<div className="flex items-start justify-between gap-3 border-b border-admin-border px-5 py-4">
					<div>
						<h2
							id={headingId}
							className="text-base font-semibold text-admin-ink"
						>
							Guides
						</h2>
						<p className="mt-1 text-[13px] text-admin-ink-muted">
							A short walkthrough of each screen. {taken} of {all.length} taken.
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close guides"
						className="grid size-9 shrink-0 place-items-center rounded-lg text-admin-ink-muted transition-colors duration-150 ease-out hover:bg-admin-accent-soft hover:text-admin-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
					>
						<X className="size-4" aria-hidden="true" />
					</button>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
					{groups.map((g) => (
						<section key={g.label} className="mb-4">
							<h3 className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-ink-subtle">
								{g.label}
							</h3>
							<ul className="space-y-1">
								{g.guides.map((x) => {
									const done = seen.has(x.id);
									return (
										<li
											key={x.id}
											className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors duration-150 ease-out hover:bg-admin-accent-soft/60"
										>
											<span
												aria-hidden="true"
												className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full border ${done ? "border-admin-live bg-admin-live-soft text-admin-live-ink" : "border-admin-border text-transparent"}`}
											>
												<Check className="size-3" />
											</span>
											<div className="min-w-0 flex-1">
												<div className="text-sm font-medium text-admin-ink">
													{TOURS[x.id].title}
													{done && <span className="sr-only"> (taken)</span>}
												</div>
												<p className="mt-0.5 text-[13px] text-admin-ink-muted">
													{x.summary}
												</p>
												{x.note && (
													<p className="mt-0.5 text-[12px] text-admin-ink-subtle">
														{x.note}
													</p>
												)}
											</div>
											<Button
												type="button"
												size="sm"
												variant={done ? "secondary" : "primary"}
												onClick={() => start(x.id, x.path)}
											>
												{done ? "Again" : "Start"}
											</Button>
										</li>
									);
								})}
							</ul>
						</section>
					))}
				</div>
				<div className="flex items-center justify-between gap-3 border-t border-admin-border px-5 py-3">
					<p className="text-[13px] text-admin-ink-muted">
						N next, P back, Esc ends a tour.
					</p>
					<Button
						type="button"
						size="sm"
						variant="ghost"
						onClick={() => {
							forgetTours();
							setSeen(new Set());
						}}
					>
						Reset first-visit tours
					</Button>
				</div>
			</div>
		</>
	);
}
