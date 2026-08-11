import type * as LType from "leaflet";
import { useEffect, useRef } from "react";

import { useLang } from "@/lib/i18n";
import { localizedHref } from "@/lib/i18n-config";

export type MapMarker = {
	lat: number;
	lng: number;
	label: string;
	sublabel?: string | null;
	photoUrl?: string | null;
	href?: string | null;
	status?: string | null;
};

// site logo only where a marker is the organisation itself
const pinHtml = (
	logo: string,
) => `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
	<div style="height:38px;width:38px;border-radius:9999px;background:#fff;border:2px solid var(--accent);box-shadow:0 4px 12px rgb(0 0 0 / 0.28);overflow:hidden;display:grid;place-items:center">
		<img src="${logo}" alt="" style="height:100%;width:100%;object-fit:contain;padding:3px" />
	</div>
	<div style="width:0;height:0;margin-top:-2px;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid var(--accent)"></div>
</div>`;

function popupCard(
	m: MapMarker,
	href: string | undefined,
	t: (key: string, fallback?: string) => string,
): HTMLElement {
	const card = document.createElement("div");
	card.className = "w-56 space-y-1";

	if (m.photoUrl) {
		const img = document.createElement("img");
		img.src = m.photoUrl;
		img.alt = m.label;
		img.className = "mb-2 h-24 w-full rounded-lg object-cover";
		card.append(img);
	}
	if (m.status) {
		const tag = document.createElement("span");
		tag.textContent =
			m.status === "past" ? t("map.past", "Past") : t("map.current", "Current");
		tag.className = `inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background ${
			m.status === "past" ? "bg-[var(--muted-foreground)]" : "bg-[var(--palm)]"
		}`;
		card.append(tag);
	}
	const title = document.createElement("div");
	title.textContent = m.label;
	title.className = "font-semibold text-primary leading-snug";
	card.append(title);

	if (m.sublabel) {
		const sub = document.createElement("div");
		sub.textContent = m.sublabel;
		sub.className = "text-xs text-muted-foreground";
		card.append(sub);
	}
	if (href) {
		const link = document.createElement("a");
		link.href = href;
		link.textContent = `${t("map.viewProject", "View project")} →`;
		link.className =
			"mt-1 inline-block text-xs font-semibold text-[var(--accent)] hover:underline";
		card.append(link);
	}
	return card;
}

// leaflet touches window, so it is imported inside an effect, never on the server
export function MapView({
	markers,
	center,
	zoom = 7,
	logoUrl = "/logo.png",
}: {
	markers: MapMarker[];
	center: [number, number];
	zoom?: number;
	logoUrl?: string;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const { lang, t } = useLang();

	useEffect(() => {
		if (!ref.current || typeof window === "undefined") return;
		let map: LType.Map | undefined;
		let cancelled = false;

		(async () => {
			// Load Leaflet CSS once (CDN).
			if (!document.getElementById("leaflet-css")) {
				const link = document.createElement("link");
				link.id = "leaflet-css";
				link.rel = "stylesheet";
				link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
				document.head.appendChild(link);
			}
			const L = await import("leaflet");
			if (cancelled || !ref.current) return;

			map = L.map(ref.current, { zoomControl: false }).setView(center, zoom);
			// Leaflet names its own buttons in English; the option sets both the
			// title and the aria-label
			L.control
				.zoom({
					zoomInTitle: t("map.zoomIn", "Zoom in"),
					zoomOutTitle: t("map.zoomOut", "Zoom out"),
				})
				.addTo(map);
			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution: "&copy; OpenStreetMap contributors",
				maxZoom: 19,
			}).addTo(map);

			const icon = L.divIcon({
				className: "map-pin",
				html: pinHtml(logoUrl),
				iconSize: [1, 1],
				iconAnchor: [0, 0],
			});
			for (const m of markers) {
				// only same-origin paths become links — a marker href is CMS data
				const href = m.href?.startsWith("/")
					? localizedHref(m.href, lang)
					: undefined;
				L.marker([m.lat, m.lng], { icon })
					.addTo(map)
					.bindPopup(popupCard(m, href, t));
			}
		})();

		return () => {
			cancelled = true;
			if (map) map.remove();
		};
	}, [markers, center, zoom, lang, logoUrl, t]);

	return (
		<div
			ref={ref}
			className="h-80 w-full rounded-2xl border border-border overflow-hidden z-0"
		/>
	);
}
