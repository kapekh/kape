import { useEffect, useRef } from "react";

import type * as LType from "leaflet";

export type MapMarker = { lat: number; lng: number; label: string };

/**
 * Keyless map via Leaflet + OpenStreetMap tiles. Client-only: Leaflet touches
 * `window`, so we dynamically import it inside an effect (never on the server).
 */
export function MapView({
	markers,
	center,
	zoom = 7,
}: {
	markers: MapMarker[];
	center: [number, number];
	zoom?: number;
}) {
	const ref = useRef<HTMLDivElement>(null);

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

			map = L.map(ref.current).setView(center, zoom);
			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution: "&copy; OpenStreetMap contributors",
				maxZoom: 19,
			}).addTo(map);

			// Explicit icon URLs (bundlers break Leaflet's default icon paths).
			const icon = L.icon({
				iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
				iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
				shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
				iconSize: [25, 41],
				iconAnchor: [12, 41],
				popupAnchor: [1, -34],
				shadowSize: [41, 41],
			});
			for (const m of markers) {
				L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(m.label);
			}
		})();

		return () => {
			cancelled = true;
			if (map) map.remove();
		};
	}, [markers, center, zoom]);

	return <div ref={ref} className="h-80 w-full rounded-2xl border border-border overflow-hidden z-0" />;
}
