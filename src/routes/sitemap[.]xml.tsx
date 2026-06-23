import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { COLLECTIONS } from '#/lib/collections'
import { LANGS } from '#/lib/i18n-config'
import { db } from '#/server/db'
import { siteOrigin } from '#/server/origin'
import { pages, posts } from '#/server/schema'

// Content types that are intentionally not public (mirrors the route resolver).
const BLOCKED = new Set(['internal_news', 'document', 'announcement', 'event'])

// content_type -> URL prefix (e.g. "news" -> "news", "story" -> "stories").
const PREFIX_BY_TYPE: Record<string, string> = {}
for (const c of Object.values(COLLECTIONS)) if (c.contentType) PREFIX_BY_TYPE[c.contentType] = c.prefix

const xmlEscape = (s: string) => s.replace(/[&<>'"]/g, (c) => `&#${c.charCodeAt(0)};`)

async function handler({ request }: { request: Request }) {
  // Collect language-agnostic paths, then expand per language below.
  const paths = new Set<string>(['/'])

  // Public collection landings (skip blocked types like /events).
  for (const c of Object.values(COLLECTIONS)) {
    if (c.contentType && BLOCKED.has(c.contentType)) continue
    paths.add(`/${c.prefix}`)
  }

  try {
    const pubPages = await db
      .select({ slug: pages.slug })
      .from(pages)
      .where(eq(pages.status, 'published'))
    for (const p of pubPages) if (p.slug) paths.add(`/${p.slug}`)
  } catch (e) {
    console.error('[sitemap] pages query failed', e)
  }

  try {
    const pubPosts = await db
      .select({ slug: posts.slug, contentType: posts.contentType })
      .from(posts)
      .where(eq(posts.status, 'published'))
    for (const p of pubPosts) {
      if (BLOCKED.has(p.contentType)) continue
      const prefix = PREFIX_BY_TYPE[p.contentType]
      if (prefix && p.slug) paths.add(`/${prefix}/${p.slug}`)
    }
  } catch (e) {
    console.error('[sitemap] posts query failed', e)
  }

  const base = siteOrigin(request)
  const urls: string[] = []
  for (const p of paths) {
    for (const lang of LANGS) {
      const loc = `${base}/${lang}${p === '/' ? '' : p}`
      urls.push(`  <url><loc>${xmlEscape(loc)}</loc></url>`)
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: handler,
    },
  },
})
