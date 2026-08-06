import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	// `bun:sqlite` is a Bun runtime builtin (used by drizzle-orm/bun-sqlite).
	// Keep it out of bundling/pre-bundling so Bun resolves it at runtime.
	optimizeDeps: { exclude: ["bun:sqlite"] },
	ssr: { external: ["bun:sqlite"] },
	// `vite preview` (our production server, see package.json `start`) rejects
	// unknown Host headers by default — name the deployed domain(s) in
	// ALLOWED_HOSTS, comma separated, or every request 403s with "Blocked request".
	preview: {
		allowedHosts:
			process.env.ALLOWED_HOSTS?.split(",")
				.map((h) => h.trim())
				.filter(Boolean) ?? [],
	},
	plugins: [
		devtools(),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
		babel({ presets: [reactCompilerPreset()] }),
	],
});

export default config;
