# syntax=docker/dockerfile:1

FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# vite inlines import.meta.env.VITE_* at build time, so canonical/hreflang/OG
# absolute URLs are decided here, not by the runtime env. Unset builds a site
# that emits relative URLs only.
ARG VITE_SITE_URL=""
ENV VITE_SITE_URL=$VITE_SITE_URL
# build:app skips gen-prerender-paths: no seeded db here, and scripts/, its only reader, never ships
RUN bun run build:app

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Copy only what `bun run start` needs. The old `COPY . .` also shipped internal
# notes and tooling into the runtime image - .work/ (job briefs, reports,
# screenshots), feedback/, .claude/, .mcp.json, .cursorrules - which is
# disclosure to anyone who can pull the image. (.env and *.db were already
# excluded by .dockerignore.)
#
# server.ts serves dist/ directly. src/ still ships because the entrypoint runs
# src/server/install.ts, which migrates and seeds before the server starts.
COPY package.json server.ts tsconfig.json ./
COPY src ./src
COPY drizzle ./drizzle
COPY public ./public
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["bun", "run", "start"]
