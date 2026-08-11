import { MapPin } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { useModalPanel } from "#/lib/use-modal-panel";
import { fieldLabel } from "./form-ui";
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
			<Button
				type="button"
				variant="secondary"
				size="sm"
				onClick={() => setOpen(true)}
			>
				<MapPin aria-hidden="true" />
				{has ? (
					<span className="tabular-nums">
						{Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
					</span>
				) : (
					<span className="text-admin-ink-muted">Pick on map</span>
				)}
			</Button>

			{open && (
				<div className="fixed inset-0 z-[60] grid place-items-center p-4">
					<button
						type="button"
						aria-label={`Close ${label} picker`}
						className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
						onClick={() => setOpen(false)}
					/>
					<div
						ref={panelRef}
						role="dialog"
						aria-modal="true"
						tabIndex={-1}
						aria-labelledby={headingId}
						className="relative w-full max-w-2xl rounded-xl border border-admin-border bg-admin-panel-raised p-6 shadow-[var(--shadow-lift)] focus:outline-none"
					>
						<h3
							id={headingId}
							className="mb-1 text-base font-semibold text-admin-ink"
						>
							Set {label}
						</h3>
						<p className="mb-4 text-[13px] text-admin-ink-muted">
							Click the map to drop a pin, or drag it. You can also type exact
							coordinates below.
						</p>
						<MapPicker lat={lat} lng={lng} onPick={onChange} />
						<div className="mt-4 grid grid-cols-2 gap-4">
							<div>
								<label className={fieldLabel} htmlFor={`${headingId}-lat`}>
									Latitude
								</label>
								<Input
									id={`${headingId}-lat`}
									value={lat}
									onChange={(e) => onChange(e.target.value, lng)}
									placeholder="12.245"
								/>
							</div>
							<div>
								<label className={fieldLabel} htmlFor={`${headingId}-lng`}>
									Longitude
								</label>
								<Input
									id={`${headingId}-lng`}
									value={lng}
									onChange={(e) => onChange(lat, e.target.value)}
									placeholder="104.668"
								/>
							</div>
						</div>
						<div className="mt-6 flex items-center justify-end gap-2">
							{has && (
								<Button
									type="button"
									variant="ghost"
									onClick={() => onChange("", "")}
									className="mr-auto text-admin-danger not-disabled:hover:bg-admin-danger-soft not-disabled:hover:text-admin-danger"
								>
									Clear
								</Button>
							)}
							<Button type="button" onClick={() => setOpen(false)}>
								Done
							</Button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
