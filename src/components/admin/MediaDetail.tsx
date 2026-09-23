import { Check, Copy, ExternalLink, FileText, Trash2, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { inputClass } from "#/components/ui/input.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { mediaDisplayName, mediaStorageName } from "#/lib/media-name";
import { formatBytes, isLowResolution, MIN_FULL_WIDTH } from "#/lib/media-size";
import { useModalPanel } from "#/lib/use-modal-panel";

type MediaUsage = Awaited<
	ReturnType<typeof trpcClient.adminMedia.usage.query>
>[number];

export type MediaDetailItem = Awaited<
	ReturnType<typeof trpcClient.adminMedia.page.query>
>[number];

function fmtDate(s: string | null | undefined) {
	if (!s) return "";
	const d = new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`);
	return Number.isNaN(d.getTime())
		? ""
		: d.toLocaleDateString(undefined, {
				day: "numeric",
				month: "short",
				year: "numeric",
			});
}

function Meta({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-4 border-b border-admin-border pb-2">
			<dt className="text-admin-ink-muted">{label}</dt>
			<dd className="text-right font-medium break-all text-admin-ink">
				{value}
			</dd>
		</div>
	);
}

function UsedIn({ usage }: { usage: MediaUsage[] | "failed" | null }) {
	return (
		<div className="mt-4">
			<div className="mb-2 flex items-center gap-2">
				<span className="text-[13px] font-medium text-admin-ink-muted">
					Used in
				</span>
				{Array.isArray(usage) && (
					<span
						className={`rounded-full px-2 py-1 text-xs font-medium leading-none ${usage.length ? "bg-admin-accent-soft text-admin-accent-ink" : "bg-admin-neutral-soft text-admin-ink-muted"}`}
					>
						{usage.length
							? `${usage.length} place${usage.length > 1 ? "s" : ""}`
							: "Unused"}
					</span>
				)}
			</div>
			{usage === null ? (
				<p className="text-[13px] text-admin-ink-muted">Checking…</p>
			) : usage === "failed" ? (
				<p className="text-[13px] text-admin-warning-ink">
					Could not check where this is used.
				</p>
			) : usage.length === 0 ? (
				<p className="text-[13px] text-admin-ink-muted">
					Not referenced anywhere, so it is safe to delete.
				</p>
			) : (
				<ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
					{usage.map((u, i) => (
						<li
							// biome-ignore lint/suspicious/noArrayIndexKey: read-only usage list, no reorder or delete while mounted
							key={i}
							className="flex items-center justify-between gap-2 rounded-lg border border-admin-border bg-admin-panel px-3 py-2 text-[13px]"
						>
							<span className="min-w-0">
								<span className="text-xs font-medium text-admin-ink-muted">
									{u.kind}
								</span>
								<span className="block truncate text-admin-ink" title={u.label}>
									{u.label}
								</span>
							</span>
							{u.href && (
								<Button asChild size="sm" variant="secondary">
									<a href={u.href}>Open</a>
								</Button>
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function Preview({ item, name }: { item: MediaDetailItem; name: string }) {
	if (item.contentType?.startsWith("image/"))
		return (
			<img
				src={item.url ?? ""}
				alt={name}
				className="max-h-[70vh] w-full object-contain"
			/>
		);
	if (item.contentType?.startsWith("video/"))
		return (
			// playable here: checking a clip is the whole reason to open it
			// biome-ignore lint/a11y/useMediaCaption: operator-uploaded clip, captions belong on the record that embeds it
			<video
				src={item.url ?? ""}
				controls
				preload="metadata"
				className="max-h-[70vh] w-full bg-black object-contain"
			/>
		);
	return (
		<FileText aria-hidden="true" className="size-12 text-admin-ink-subtle" />
	);
}

export function MediaDetail({
	item,
	copied,
	onCopy,
	onClose,
	onDelete,
}: {
	item: MediaDetailItem;
	copied: boolean;
	onCopy: () => void;
	onClose: () => void;
	onDelete: (usage: MediaUsage[] | null) => void;
}) {
	const [usage, setUsage] = useState<MediaUsage[] | "failed" | null>(null);
	const headingId = useId();
	const panelRef = useModalPanel(onClose, true);
	const name = mediaDisplayName(item);

	useEffect(() => {
		setUsage(null);
		let alive = true;
		trpcClient.adminMedia.usage
			.query({ id: item.id })
			.then((u) => {
				if (alive) setUsage(u);
			})
			// an empty list would read as "used nowhere" and send Delete down the
			// path with no warning on it, so a failure gets its own state
			.catch(() => {
				if (alive) setUsage("failed");
			});
		return () => {
			alive = false;
		};
	}, [item.id]);

	const size = formatBytes(item.size);

	return (
		<div className="fixed inset-0 z-50 grid place-items-center p-4">
			<button
				type="button"
				aria-label="Close"
				className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
				onClick={onClose}
			/>
			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				tabIndex={-1}
				aria-labelledby={headingId}
				className="relative grid w-full max-w-4xl min-w-0 overflow-hidden rounded-xl border border-admin-border bg-admin-panel-raised shadow-[var(--shadow-lift)] focus:outline-none md:grid-cols-[1fr_360px]"
			>
				<div className="grid min-h-[260px] place-items-center bg-admin-neutral-soft">
					<Preview item={item} name={name} />
				</div>
				<div className="flex min-w-0 flex-col p-6">
					<div className="mb-4 flex items-start justify-between gap-2">
						<h2
							id={headingId}
							className="text-base font-semibold break-words text-admin-ink"
						>
							{name}
						</h2>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							aria-label="Close"
							onClick={onClose}
							className="flex-none"
						>
							<X aria-hidden="true" />
						</Button>
					</div>
					<dl className="space-y-2 text-sm">
						<Meta
							label="Stored as"
							value={mediaStorageName(item) ?? `#${item.id}`}
						/>
						<Meta label="Type" value={item.contentType ?? "—"} />
						{item.width && item.height ? (
							<Meta
								label="Dimensions"
								value={`${item.width} × ${item.height}`}
							/>
						) : null}
						{size ? <Meta label="Size" value={size} /> : null}
						<Meta label="Added" value={fmtDate(item.createdAt)} />
					</dl>
					{isLowResolution(item) ? (
						<p className="mt-3 text-[13px] text-admin-warning-ink">
							Under {MIN_FULL_WIDTH}px on its long edge. A cover, hero or banner
							stretches this one and it will look soft. Fine for a logo, an
							avatar or a small card.
						</p>
					) : null}
					<div className="mt-4">
						<div className="mb-1 text-[13px] font-medium text-admin-ink-muted">
							URL
						</div>
						<input
							readOnly
							aria-label={`URL for ${name}`}
							value={item.url ?? ""}
							onFocus={(e) => e.currentTarget.select()}
							className={`${inputClass} h-10 min-w-0 text-admin-ink-muted`}
						/>
					</div>

					<UsedIn usage={usage} />

					<div className="mt-auto grid gap-2 pt-6 sm:grid-cols-2">
						<Button type="button" onClick={onCopy} className="sm:col-span-2">
							{copied ? (
								<Check aria-hidden="true" />
							) : (
								<Copy aria-hidden="true" />
							)}
							{copied ? "Copied" : "Copy URL"}
						</Button>
						<Button asChild variant="secondary">
							<a
								href={item.url ?? "#"}
								target="_blank"
								rel="noopener noreferrer"
							>
								<ExternalLink aria-hidden="true" />
								Open
							</a>
						</Button>
						<Button
							type="button"
							variant="danger"
							onClick={() => onDelete(Array.isArray(usage) ? usage : null)}
						>
							<Trash2 aria-hidden="true" />
							Delete
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
