# Roadmap

What is left to build, in the order it makes sense to build it.

`docs/CMS-CORE-REFERENCE.md` grades the current stage and is the authority on whether a thing is done.
This file is the sequence, and it starts where that document stops: the reference deliberately does not grade runtime content-type design or a public delivery API.
`docs/CONTENT-MODEL.md` describes the schema those stages extend.

> Stack: Bun, TanStack Start (SSR), Drizzle over `bun:sqlite`, tRPC, R2 via `Bun.S3Client`, shadcn/ui.
> `bun:sqlite` is an on-disk file, so the app server has to be a persistent host, not an edge runtime.
> R2 is HTTP object storage and is fine anywhere.

## Stage B - finish the core

The reference's exit test: a second organisation is provisioned from nothing, with zero edits to `src/`.
Its nine sections are the work list and its "baseline today" lines are where each one stands.
The largest open items are tenancy resolved from the request, editorial safety (revisions, audit, soft delete, scheduled publishing), media validation by content rather than extension, and admin usability.

Two things in this branch's own way:

- **Languages are data everywhere except the router.**
  `LANGS` in `src/lib/i18n-config.ts` is a constant because route definitions are synchronous.
  The sitemap and the prerenderer read the `languages` table; the `$lang` guards and the hreflang block do not.
  Closing it means resolving the language server-side before the router needs it, and giving the sync helpers - `detectLang`, `stripLang`, `localizedHref` - the list from context instead of module scope.
- **RTL is stored, edited, validated and then dropped** before it reaches the client, so `languages.rtl` is a column that does nothing.

## Stage C - content types become data

The point at which an operator, not a developer, decides what kinds of content the site has.

- **Field definitions.**
  `content_types` is already a table rather than an enum.
  It gains `field_defs(content_type_id, key, label, kind, required, localized, config JSON, relation_target, sort)`, with kinds for text, rich text, number, boolean, date, media, relation, select and JSON.
- **Typed values.**
  Content rows store values per field, and any field marked localized flows through the existing `translations` table rather than a parallel mechanism.
- **A generic admin.**
  Create, edit and list views generated from `field_defs`, replacing the hand-built per-type screens.
  Validation is derived from the same definitions rather than written twice.
- **Schema evolution.**
  Adding, renaming, retyping and deleting a field has to be safe on a database with rows in it.
  This is the part that makes Stage C hard, and it is worth designing before the first field definition ships.

## Stage D - delivery

- **A read API** over the content types, stable enough to be a contract: REST first, GraphQL only if something needs it.
  tRPC stays the internal and admin surface.
- **Webhooks** on content events, and **draft preview tokens** so an unpublished page is shareable without being public.
- **Cache invalidation** that an external CDN can act on, alongside `render_cache`.

## Stage E - platform

Only if reuse across many sites is an actual goal.
Each of these is a product in itself.

- **Multi-tenancy beyond the seam.** Every table already carries `tenant_id`. The open question is whether isolation should become a database per tenant on libSQL, which is cleaner and scales further, or stay row-level. Per-tenant domains, themes, languages, users and media prefixes either way.
- **Granular authorization.** Permissions per content type, field and action; scoped API tokens; optional SSO.
- **Digital asset management.** Transforms, variants, focal point, format negotiation on top of R2.
- **Extensibility.** Lifecycle hooks, custom field types, custom admin views.
- **Operations.** Quotas, import and export, per-tenant backup and restore, observability, and a datastore that outlives a single file.

> Before committing to Stage E, price building it against adopting an existing headless CMS.
> Stages B through D are a good CMS. Stage E is a different company.
