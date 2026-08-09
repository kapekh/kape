import type * as LType from "leaflet";
import { useEffect, useRef } from "react";

/**
 * Click-to-pick location map (keyless Leaflet + OSM). Click to drop a pin or
 * drag it; emits lat/lng as fixed-6 strings. Stays in sync when the linked
 * text inputs change. Client-only — Leaflet is imported inside an effect.
 */
export function MapPicker({
	lat,
	lng,
	onPick,
}: {
	lat: string;
	lng: string;
	onPick: (lat: string, lng: string) => void;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const mapRef = useRef<LType.Map | undefined>(undefined);
	const placeRef = useRef<((la: number, ln: number) => void) | undefined>(
		undefined,
	);
	const onPickRef = useRef(onPick);
	onPickRef.current = onPick;

	// Initialise the map once.
	// biome-ignore lint/correctness/useExhaustiveDependencies: lat/lng seed the initial centre only; re-running would rebuild the map on every keystroke
	useEffect(() => {
		if (!ref.current || typeof window === "undefined") return;
		let cancelled = false;
		const hasInitial =
			lat !== "" &&
			lng !== "" &&
			!Number.isNaN(Number(lat)) &&
			!Number.isNaN(Number(lng));
		const startLat = hasInitial ? Number(lat) : 12.5; // Cambodia
		const startLng = hasInitial ? Number(lng) : 104.9;

		(async () => {
			if (!document.getElementById("leaflet-css")) {
				const link = document.createElement("link");
				link.id = "leaflet-css";
				link.rel = "stylesheet";
				link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
				document.head.appendChild(link);
			}
			const L = await import("leaflet");
			if (cancelled || !ref.current) return;

			const map = L.map(ref.current).setView(
				[startLat, startLng],
				hasInitial ? 13 : 7,
			);
			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution: "&copy; OpenStreetMap contributors",
				maxZoom: 19,
			}).addTo(map);
			const icon = L.icon({
				iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
				iconRetinaUrl:
					"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
				shadowUrl:
					"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
				iconSize: [25, 41],
				iconAnchor: [12, 41],
				popupAnchor: [1, -34],
				shadowSize: [41, 41],
			});

			let marker: LType.Marker | undefined;
			// Place/move the marker WITHOUT emitting (used to reflect external input).
			placeRef.current = (la, ln) => {
				if (marker) marker.setLatLng([la, ln]);
				else {
					marker = L.marker([la, ln], { icon, draggable: true }).addTo(map);
					marker.on("dragend", () => {
						const p = marker?.getLatLng();
						if (p) onPickRef.current(p.lat.toFixed(6), p.lng.toFixed(6));
					});
				}
			};
			if (hasInitial) placeRef.current(startLat, startLng);

			map.on("click", (e: LType.LeafletMouseEvent) => {
				placeRef.current?.(e.latlng.lat, e.latlng.lng);
				onPickRef.current(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6));
			});
			mapRef.current = map;
		})();

		return () => {
			cancelled = true;
			mapRef.current?.remove();
			mapRef.current = undefined;
			placeRef.current = undefined;
		};
		// Init once — value sync is handled by the effect below.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Reflect external value changes (typing in the lat/lng inputs) onto the pin.
	useEffect(() => {
		const la = Number(lat);
		const ln = Number(lng);
		if (lat === "" || lng === "" || Number.isNaN(la) || Number.isNaN(ln))
			return;
		placeRef.current?.(la, ln);
	}, [lat, lng]);

	return (
		<div
			ref={ref}
			className="h-72 w-full rounded-lg border border-border overflow-hidden z-0"
		/>
	);
}
