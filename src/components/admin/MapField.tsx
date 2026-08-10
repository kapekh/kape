import { useId, useState } from "react";

import { useModalPanel } from "#/lib/use-modal-panel";
import { fieldInput, fieldLabel } from "./form-ui";
import { MapPicker } from "./MapPicker";

/**
 * Compact map location field for table rows / lists: a button showing the
 * current coordinates that opens a modal with the click-to-pick map (the same
 * MapPicker the school editor uses) plus manual lat/lng inputs.
 */
export function MapField({
	lat,
	lng,
	onChange,
	label = "location",
}: {
	lat: string;
	lng: string;
	onChange: (lat: string, lng: string) => void;
	label?: string;
}) {
	const [open, setOpen] = useState(false);
	const headingId = useId();
	const panelRef = useModalPanel(() => setOpen(false), open);
	const has =
		lat !== "" &&
		lng !== "" &&
		!Number.isNaN(Number(lat)) &&
		!Number.isNaN(Number(lng));

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition hover:border-[var(--accent)] hover:bg-muted"
			>
				<span aria-hidden>📍</span>
				{has ? (
					<span className="tabular-nums">
						{Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
					</span>
				) : (
					<span className="text-muted-foreground">Pick on map</span>
				)}
			</button>

			{open && (
				<div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
					<button
						type="button"
						aria-label={`Close ${label} picker`}
						className="absolute inset-0 cursor-default"
						onClick={() => setOpen(false)}
					/>
					<div
						ref={panelRef}
						role="dialog"
						aria-modal="true"
						tabIndex={-1}
						aria-labelledby={headingId}
						className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-lift)] focus:outline-none"
					>
						<h3
							id={headingId}
							className="mb-1 font-display text-lg font-semibold text-primary"
						>
							Set {label}
						</h3>
						<p className="mb-3 text-xs text-muted-foreground">
							Click the map to drop a pin, or drag it. You can also type exact
							coordinates below.
						</p>
						<MapPicker lat={lat} lng={lng} onPick={onChange} />
						<div className="mt-3 grid grid-cols-2 gap-3">
							<label className="block">
								<span className={fieldLabel}>Latitude</span>
								<input
									className={fieldInput}
									value={lat}
									onChange={(e) => onChange(e.target.value, lng)}
									placeholder="12.245"
								/>
							</label>
							<label className="block">
								<span className={fieldLabel}>Longitude</span>
								<input
									className={fieldInput}
									value={lng}
									onChange={(e) => onChange(lat, e.target.value)}
									placeholder="104.668"
								/>
							</label>
						</div>
						<div className="mt-4 flex items-center justify-end gap-2">
							{has && (
								<button
									type="button"
									onClick={() => onChange("", "")}
									className="mr-auto rounded-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
								>
									Clear
								</button>
							)}
							<button
								type="button"
								onClick={() => setOpen(false)}
								className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90"
							>
								Done
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
