# syntax=docker/dockerfile:1

FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# gen-prerender-paths.ts (run by `bun run build`) imports src/server/db.ts,
# which self-migrates on import. This throwaway DB is only used for the
# build — the actual production data lives on a volume-mounted DATABASE_PATH
# at runtime.
ENV DATABASE_PATH=/app/build.db
RUN bun run build

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prerender-paths.json ./prerender-paths.json
# Copy only what `bun run start` (vite preview) needs. The old `COPY . .` also
# shipped internal notes and tooling into the runtime image - .work/ (job briefs,
# reports, screenshots), feedback/, .claude/, .mcp.json, .cursorrules - which is
# disclosure to anyone who can pull the image. (.env and *.db were already
# excluded by .dockerignore.)
#
# src/ has to ship: the @tanstack/react-start vite plugin resolves the router
# entry from /app/src when `vite preview` boots, so the built dist/ alone won't
# start. Dropping src/ needs a different production entrypoint (run
# dist/server/server.js directly) - a separate decision, not this change.
COPY package.json vite.config.ts tsconfig.json tsr.config.json ./
COPY src ./src
COPY drizzle ./drizzle
COPY public ./public
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["bun", "run", "start"]
