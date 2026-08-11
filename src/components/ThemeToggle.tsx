import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import type { SiteSettings } from "@/lib/site-identity";
import { darkModeAvailable } from "@/lib/site-theme";

// the class is set pre-paint by the root's inline script; this only flips it
export function ThemeToggle({
	settings,
	className = "",
}: {
	settings: SiteSettings;
	className?: string;
}) {
	const [dark, setDark] = useState(false);
	const t = useT();
	useEffect(() => {
		const root = document.documentElement;
		setDark(
			root.classList.contains("dark") ||
				(!root.classList.contains("light") &&
					matchMedia("(prefers-color-scheme: dark)").matches),
		);
	}, []);

	function toggle() {
		const next = !dark;
		document.documentElement.classList.toggle("dark", next);
		document.documentElement.classList.toggle("light", !next);
		try {
			localStorage.setItem("theme", next ? "dark" : "light");
		} catch {
			/* storage unavailable */
		}
		setDark(next);
	}

	if (!darkModeAvailable(settings)) return null;

	return (
		<button
			type="button"
			onClick={toggle}
			aria-label={
				dark
					? t("theme.toLight", "Switch to light mode")
					: t("theme.toDark", "Switch to dark mode")
			}
			title={
				dark ? t("theme.light", "Light mode") : t("theme.dark", "Dark mode")
			}
			className={`grid place-items-center rounded-full transition hover:text-[var(--gold)] ${className}`}
		>
			{dark ? (
				<svg
					aria-hidden="true"
					className="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<circle cx="12" cy="12" r="4" />
					<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
				</svg>
			) : (
				<svg
					aria-hidden="true"
					className="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
				</svg>
			)}
		</button>
	);
}
