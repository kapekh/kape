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
COPY . .
RUN rm -f build.db
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["bun", "run", "start"]
