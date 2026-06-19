import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // `bun:sqlite` is a Bun runtime builtin (used by drizzle-orm/bun-sqlite).
  // Keep it out of bundling/pre-bundling so Bun resolves it at runtime.
  optimizeDeps: { exclude: ['bun:sqlite'] },
  ssr: { external: ['bun:sqlite'] },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
})

export default config
