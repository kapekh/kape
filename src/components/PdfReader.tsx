import { type MouseEvent, useEffect, useRef, useState } from "react";

import { useT } from "@/lib/i18n";

export type PdfDoc = { url: string; title?: string | null };

/** True for hrefs the reader can open. Query and hash are ignored. */
export function isPdfUrl(url?: string | null): boolean {
	if (!url) return false;
	return /\.pdf$/i.test(url.split(/[?#]/)[0]);
}

// Android Chrome draws nothing for a PDF in an iframe and iOS Safari draws only
// the first page, so a coarse pointer keeps the plain link it would have had.
function canEmbedPdf(): boolean {
	if (typeof window === "undefined") return false;
	if (window.navigator.pdfViewerEnabled === false) return false;
	return !window.matchMedia?.("(pointer: coarse)").matches;
}

// stays mounted while closed: unmounting skips the native focus restore
export function PdfReader({
	doc,
	onClose,
}: {
	doc: PdfDoc | null;
	onClose: () => void;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	const [failed, setFailed] = useState(false);
	const t = useT();
	const label = t("pdf.title", "Document viewer");

	useEffect(() => {
		setFailed(false);
		const d = ref.current;
		if (!d) return;
		if (doc === null) {
			if (d.open) d.close();
		} else if (!d.open) {
			d.showModal();
		}
	}, [doc]);

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click only, Esc is the dialog's own
		<dialog
			ref={ref}
			aria-label={label}
			onClose={onClose}
			onClick={(e) => {
				if (e.target === ref.current) onClose();
			}}
			className="m-0 h-full max-h-none w-full max-w-none bg-black/90 p-4 text-white backdrop-blur-sm open:flex open:items-stretch open:justify-center"
		>
			{doc && (
				<div className="flex h-full w-full max-w-6xl flex-col">
					<div className="flex items-center gap-3 pb-3">
						<h2 className="min-w-0 flex-1 truncate text-sm font-medium md:text-base">
							{doc.title}
						</h2>
						<a
							href={doc.url}
							target="_blank"
							rel="noreferrer"
							className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
						>
							{t("pdf.newTab", "Open in new tab")}
						</a>
						<button
							type="button"
							onClick={onClose}
							aria-label={t("pdf.close", "Close")}
							className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-2xl transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
						>
							×
						</button>
					</div>
					{failed ? (
						<p className="grid flex-1 place-items-center rounded-xl bg-white/10 p-8 text-center text-sm">
							{t(
								"pdf.failed",
								"This document could not be loaded. It may have been moved or removed.",
							)}
						</p>
					) : (
						// <object> is the one embed that errors on a cross-origin miss; it also swallows Esc, hence the open-in-new-tab link
						<object
							key={doc.url}
							ref={(el) => {
								if (!el) return;
								const fail = () => setFailed(true);
								el.addEventListener("error", fail);
								return () => el.removeEventListener("error", fail);
							}}
							data={doc.url}
							type="application/pdf"
							title={doc.title || label}
							tabIndex={-1}
							className="h-full w-full rounded-xl bg-white"
						/>
					)}
				</div>
			)}
		</dialog>
	);
}

// a non-PDF href, a missing plugin or a modified click is left to the anchor
export function usePdfReader() {
	const [doc, setDoc] = useState<PdfDoc | null>(null);
	const [embeddable, setEmbeddable] = useState(false);

	useEffect(() => setEmbeddable(canEmbedPdf()), []);

	function openPdf(e: MouseEvent<HTMLElement>, next: PdfDoc) {
		if (!embeddable || !isPdfUrl(next.url)) return;
		if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
			return;
		e.preventDefault();
		setDoc(next);
	}

	return {
		openPdf,
		reader: <PdfReader doc={doc} onClose={() => setDoc(null)} />,
	};
}
