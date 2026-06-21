import { z } from 'zod'

import {
  adminListDonors,
  adminListHero,
  adminListProjects,
  adminListSchools,
  adminOverview,
  createSchool,
  deleteSchool,
  getSchool,
  updateSchool,
  createProject,
  deleteProject,
  getProjectForEdit,
  updateProject,
  adminListMedia,
  adminListNav,
  adminListOffices,
  adminListPages,
  adminListPartners,
  adminListPosts,
  adminListSettings,
  adminListStats,
  adminListTerms,
  createDonor,
  createHero,
  createLanguage,
  createOffice,
  createPartner,
  createStat,
  deleteDonor,
  deleteHero,
  deleteOffice,
  deletePartner,
  deleteSetting,
  deleteStat,
  updateDonor,
  updateHero,
  updateOffice,
  updatePartner,
  updateStat,
  upsertSetting,
  createNavItem,
  createPage,
  createPost,
  createTerm,
  deleteLanguage,
  deleteMedia,
  deleteNavItem,
  deletePage,
  movePage,
  deletePost,
  deleteTerm,
  getPageForEdit,
  getPostForEdit,
  listAllLanguages,
  listContentTypes,
  moveNavItem,
  updateLanguage,
  updateNavItem,
  updatePage,
  updatePost,
  updateTerm,
} from '#/server/repo/admin'
import {
  adminListStaff,
  createStaff,
  deleteStaff,
  updateStaff,
} from '#/server/repo/admin'
import type { PageInput } from '#/server/repo/admin'
import { resolveSections } from '#/server/repo/sections'
import { resolveRouteCached } from '#/server/repo/route'
import type { SectionNode } from '#/lib/sections'
import {
  findPageRedirect,
  getAlbum,
  getPageBySlug,
  getPostBySlug,
  listAlbums,
  listAllTerms,
  listJobs,
  listPeople,
  listPosts,
  listPublications,
  listTerms,
  listVideos,
  trackDownload,
} from '#/server/repo/content'
import { bootstrapI18n, listLanguages } from '#/server/repo/i18n'
import { getNavTree } from '#/server/repo/nav'
import { getProjectBySlug, listProjectLocations, listProjectOptions } from '#/server/repo/projects'
import {
  getActiveAnnouncement,
  getSettings,
  listHeroSlides,
  listOffices,
  listPartners,
  listStats,
  recordAndGetVisits,
} from '#/server/repo/site'
import {
  staffDirectory,
  staffDocuments,
  staffEvents,
  staffNews,
} from '#/server/repo/staff'
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
  staffProcedure,
} from './init'

import type { TRPCRouterRecord } from '@trpc/server'

const postInput = z.object({
  contentType: z.string().min(1),
  slug: z.string().min(1),
  status: z.enum(['draft', 'published', 'archived']),
  author: z.string().nullish(),
  publishedAt: z.string().nullish(),
  coverMediaId: z.number().nullish(),
  media: z.array(z.number()).optional(),
  meta: z.record(z.string(), z.unknown()).nullish(),
  translations: z.array(
    z.object({
      lang: z.string(),
      title: z.string(),
      excerpt: z.string(),
      body: z.string(),
    }),
  ),
})

const langInput = z.object({ lang: z.string().default('en') })

const authRouter = {
  me: publicProcedure.query(({ ctx }) => ctx.user),
} satisfies TRPCRouterRecord

const termsRouter = {
  all: publicProcedure.query(({ ctx }) => listAllTerms(ctx.db)),
  list: publicProcedure
    .input(z.object({ taxonomy: z.string() }))
    .query(({ ctx, input }) => listTerms(ctx.db, input.taxonomy)),
} satisfies TRPCRouterRecord

const termInput = z.object({
  taxonomy: z.string().min(1),
  key: z.string().min(1),
  label: z.string().min(1),
  sort: z.number(),
})

const adminTermsRouter = {
  list: adminProcedure.query(({ ctx }) => adminListTerms(ctx.db)),
  create: adminProcedure.input(termInput).mutation(({ ctx, input }) => createTerm(ctx.db, input)),
  update: adminProcedure
    .input(termInput.extend({ id: z.number() }))
    .mutation(({ ctx, input }) => updateTerm(ctx.db, input.id, input)),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteTerm(ctx.db, input.id)),
} satisfies TRPCRouterRecord

const siteRouter = {
  settings: publicProcedure.query(({ ctx }) => getSettings(ctx.db)),
  stats: publicProcedure.input(langInput).query(({ ctx, input }) => listStats(ctx.db, input.lang)),
  heroSlides: publicProcedure.input(langInput).query(({ ctx, input }) => listHeroSlides(ctx.db, input.lang)),
  announcement: publicProcedure.input(langInput).query(({ ctx, input }) => getActiveAnnouncement(ctx.db, input.lang)),
  offices: publicProcedure.query(({ ctx }) => listOffices(ctx.db)),
  partners: publicProcedure.query(({ ctx }) => listPartners(ctx.db)),
  projectLocations: publicProcedure.input(langInput).query(({ ctx, input }) => listProjectLocations(ctx.db, input.lang)),
  visits: publicProcedure.query(({ ctx }) => recordAndGetVisits(ctx.db)),
} satisfies TRPCRouterRecord

const projectsRouter = {
  bySlug: publicProcedure
    .input(langInput.extend({ slug: z.string() }))
    .query(({ ctx, input }) => getProjectBySlug(ctx.db, input.slug, input.lang)),
  options: publicProcedure.input(langInput).query(({ ctx, input }) => listProjectOptions(ctx.db, input.lang)),
} satisfies TRPCRouterRecord

const i18nRouter = {
  languages: publicProcedure.query(({ ctx }) => listLanguages(ctx.db)),
  bootstrap: publicProcedure
    .input(z.object({ lang: z.string().default('') }))
    .query(({ ctx, input }) => bootstrapI18n(ctx.db, input.lang)),
} satisfies TRPCRouterRecord

const navRouter = {
  tree: publicProcedure
    .input(langInput)
    .query(({ ctx, input }) => getNavTree(ctx.db, input.lang)),
} satisfies TRPCRouterRecord

const pagesRouter = {
  bySlug: publicProcedure
    .input(langInput.extend({ slug: z.string() }))
    .query(({ ctx, input }) => getPageBySlug(ctx.db, input.slug, input.lang)),
  redirect: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) => findPageRedirect(ctx.db, input.slug)),
} satisfies TRPCRouterRecord

// Single resolver for the public catch-all route (page tree + flat collections + redirects).
const routesRouter = {
  resolve: publicProcedure
    .input(langInput.extend({ path: z.string() }))
    .query(({ ctx, input }) => resolveRouteCached(ctx.db, input.path, input.lang)),
} satisfies TRPCRouterRecord

// Internal-only content types must never be served by public procedures.
const PUBLIC_BLOCKED_TYPES = new Set(['internal_news', 'document', 'event', 'announcement'])

const postsRouter = {
  list: publicProcedure
    .input(langInput.extend({ type: z.string(), limit: z.number().optional() }))
    .query(({ ctx, input }) =>
      PUBLIC_BLOCKED_TYPES.has(input.type)
        ? []
        : listPosts(ctx.db, input.type, input.lang, input.limit),
    ),
  bySlug: publicProcedure
    .input(langInput.extend({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await getPostBySlug(ctx.db, input.slug, input.lang)
      return post && PUBLIC_BLOCKED_TYPES.has(post.contentType) ? null : post
    }),
  types: publicProcedure.query(({ ctx }) => listContentTypes(ctx.db)),
  people: publicProcedure
    .input(langInput)
    .query(({ ctx, input }) => listPeople(ctx.db, input.lang)),
  jobs: publicProcedure
    .input(langInput)
    .query(({ ctx, input }) => listJobs(ctx.db, input.lang)),
  videos: publicProcedure
    .input(langInput)
    .query(({ ctx, input }) => listVideos(ctx.db, input.lang)),
  albums: publicProcedure
    .input(langInput)
    .query(({ ctx, input }) => listAlbums(ctx.db, input.lang)),
  album: publicProcedure
    .input(langInput.extend({ slug: z.string() }))
    .query(({ ctx, input }) => getAlbum(ctx.db, input.slug, input.lang)),
  publications: publicProcedure
    .input(langInput.extend({ category: z.string() }))
    .query(({ ctx, input }) => listPublications(ctx.db, input.lang, input.category)),
  trackDownload: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => trackDownload(ctx.db, input.id)),
} satisfies TRPCRouterRecord

const sectionNodeSchema: z.ZodType = z.object({
  id: z.string(),
  type: z.string(),
  layout: z.string().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  query: z
    .object({
      source: z.string(),
      contentType: z.string().optional(),
      status: z.string().optional(),
      category: z.string().optional(),
      limit: z.number().optional(),
      sort: z.enum(['newest', 'oldest']).optional(),
    })
    .optional(),
})

const pageInput = z.object({
  slug: z.string().default(''), // derived from parentId + segment on the server
  segment: z.string().min(1),
  parentId: z.number().nullable().default(null),
  status: z.enum(['draft', 'published']),
  coverMediaId: z.number().nullable(),
  sections: z.array(sectionNodeSchema).default([]),
  translations: z.array(z.object({ lang: z.string(), title: z.string(), excerpt: z.string(), body: z.string() })),
})

const navInput = z.object({
  parentId: z.number().nullable(),
  targetKind: z.enum(['page', 'post_list', 'post', 'url', 'view', 'none']),
  targetRef: z.string(),
  visible: z.boolean(),
  imageMediaId: z.number().nullable(),
  labels: z.record(z.string(), z.string()),
  descriptions: z.record(z.string(), z.string()),
})

// Admin-only post management (requires the admin role).
const adminPostsRouter = {
  list: adminProcedure.query(({ ctx }) => adminListPosts(ctx.db)),
  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => getPostForEdit(ctx.db, input.id)),
  create: adminProcedure
    .input(postInput)
    .mutation(({ ctx, input }) => createPost(ctx.db, input)),
  update: adminProcedure
    .input(postInput.extend({ id: z.number() }))
    .mutation(({ ctx, input }) => updatePost(ctx.db, input.id, input)),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deletePost(ctx.db, input.id)),
} satisfies TRPCRouterRecord

const adminPagesRouter = {
  list: adminProcedure.query(({ ctx }) => adminListPages(ctx.db)),
  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => getPageForEdit(ctx.db, input.id)),
  preview: adminProcedure
    .input(z.object({ sections: z.array(sectionNodeSchema), lang: z.string().optional() }))
    .query(({ ctx, input }) => resolveSections(ctx.db, input.sections as SectionNode[], input.lang ?? 'en')),
  create: adminProcedure.input(pageInput).mutation(({ ctx, input }) => createPage(ctx.db, input as PageInput)),
  update: adminProcedure
    .input(pageInput.extend({ id: z.number() }))
    .mutation(({ ctx, input }) => updatePage(ctx.db, input.id, input as PageInput)),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deletePage(ctx.db, input.id)),
  move: adminProcedure
    .input(z.object({ id: z.number(), parentId: z.number().nullable(), index: z.number() }))
    .mutation(({ ctx, input }) => movePage(ctx.db, input.id, input.parentId, input.index)),
} satisfies TRPCRouterRecord

const languageInput = z.object({
  code: z.string().min(2),
  name: z.string().min(1),
  nativeName: z.string().min(1),
  enabled: z.boolean(),
  isDefault: z.boolean(),
  rtl: z.boolean(),
  sort: z.number(),
})

const staffInput = z.object({
  staffNo: z.string(),
  nameKm: z.string(),
  nameEn: z.string(),
  sex: z.string(),
  phone: z.string(),
  email: z.string(),
  program: z.string(),
  sort: z.number(),
})

// Staff portal (requires staff/admin role) — internal, never public.
const staffRouter = {
  news: staffProcedure.input(langInput).query(({ ctx, input }) => staffNews(ctx.db, input.lang)),
  events: staffProcedure.input(langInput).query(({ ctx, input }) => staffEvents(ctx.db, input.lang)),
  documents: staffProcedure.input(langInput).query(({ ctx, input }) => staffDocuments(ctx.db, input.lang)),
  directory: staffProcedure.query(({ ctx }) => staffDirectory(ctx.db)),
} satisfies TRPCRouterRecord

const adminStaffRouter = {
  list: adminProcedure.query(({ ctx }) => adminListStaff(ctx.db)),
  create: adminProcedure.input(staffInput).mutation(({ ctx, input }) => createStaff(ctx.db, input)),
  update: adminProcedure
    .input(staffInput.extend({ id: z.number() }))
    .mutation(({ ctx, input }) => updateStaff(ctx.db, input.id, input)),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteStaff(ctx.db, input.id)),
} satisfies TRPCRouterRecord

const partnerInput = z.object({ name: z.string().min(1), category: z.string(), url: z.string(), sort: z.number() })
const officeInput = z.object({
  name: z.string().min(1), province: z.string(), address: z.string(), phone: z.string(),
  email: z.string(), lat: z.string(), lng: z.string(), isHq: z.boolean(), sort: z.number(),
})
const statInput = z.object({ value: z.number(), sort: z.number(), labels: z.record(z.string(), z.string()) })

const adminRouter = {
  overview: adminProcedure.query(({ ctx }) => adminOverview(ctx.db)),
} satisfies TRPCRouterRecord

const adminSettingsRouter = {
  list: adminProcedure.query(({ ctx }) => adminListSettings(ctx.db)),
  set: adminProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(({ ctx, input }) => upsertSetting(ctx.db, input.key, input.value)),
  delete: adminProcedure
    .input(z.object({ key: z.string() }))
    .mutation(({ ctx, input }) => deleteSetting(ctx.db, input.key)),
} satisfies TRPCRouterRecord

const adminPartnersRouter = {
  list: adminProcedure.query(({ ctx }) => adminListPartners(ctx.db)),
  create: adminProcedure.input(partnerInput).mutation(({ ctx, input }) => createPartner(ctx.db, input)),
  update: adminProcedure.input(partnerInput.extend({ id: z.number() })).mutation(({ ctx, input }) => updatePartner(ctx.db, input.id, input)),
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => deletePartner(ctx.db, input.id)),
} satisfies TRPCRouterRecord

const adminOfficesRouter = {
  list: adminProcedure.query(({ ctx }) => adminListOffices(ctx.db)),
  create: adminProcedure.input(officeInput).mutation(({ ctx, input }) => createOffice(ctx.db, input)),
  update: adminProcedure.input(officeInput.extend({ id: z.number() })).mutation(({ ctx, input }) => updateOffice(ctx.db, input.id, input)),
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => deleteOffice(ctx.db, input.id)),
} satisfies TRPCRouterRecord

const adminStatsRouter = {
  list: adminProcedure.query(({ ctx }) => adminListStats(ctx.db)),
  create: adminProcedure.input(statInput).mutation(({ ctx, input }) => createStat(ctx.db, input)),
  update: adminProcedure.input(statInput.extend({ id: z.number() })).mutation(({ ctx, input }) => updateStat(ctx.db, input.id, input)),
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => deleteStat(ctx.db, input.id)),
} satisfies TRPCRouterRecord

const heroInput = z.object({
  mediaId: z.number().nullable(),
  kind: z.string(),
  videoUrl: z.string().nullable(),
  sort: z.number(),
  translations: z.array(z.object({ lang: z.string(), kicker: z.string(), title: z.string(), caption: z.string() })),
})
const donorInput = z.object({ name: z.string().min(1), url: z.string(), sort: z.number() })
const schoolInput = z.object({
  name: z.string().min(1),
  code: z.string(),
  level: z.string(),
  province: z.string(),
  projectId: z.number().nullable(),
  coverMediaId: z.number().nullable(),
  address: z.string(),
  lat: z.string(),
  lng: z.string(),
  sort: z.number(),
})

const adminSchoolsRouter = {
  list: adminProcedure.query(({ ctx }) => adminListSchools(ctx.db)),
  get: adminProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => getSchool(ctx.db, input.id)),
  create: adminProcedure.input(schoolInput).mutation(({ ctx, input }) => createSchool(ctx.db, input)),
  update: adminProcedure.input(schoolInput.extend({ id: z.number() })).mutation(({ ctx, input }) => updateSchool(ctx.db, input.id, input)),
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => deleteSchool(ctx.db, input.id)),
} satisfies TRPCRouterRecord

const adminHeroRouter = {
  list: adminProcedure.query(({ ctx }) => adminListHero(ctx.db)),
  create: adminProcedure.input(heroInput).mutation(({ ctx, input }) => createHero(ctx.db, input)),
  update: adminProcedure.input(heroInput.extend({ id: z.number() })).mutation(({ ctx, input }) => updateHero(ctx.db, input.id, input)),
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => deleteHero(ctx.db, input.id)),
} satisfies TRPCRouterRecord

const adminDonorsRouter = {
  list: adminProcedure.query(({ ctx }) => adminListDonors(ctx.db)),
  create: adminProcedure.input(donorInput).mutation(({ ctx, input }) => createDonor(ctx.db, input)),
  update: adminProcedure.input(donorInput.extend({ id: z.number() })).mutation(({ ctx, input }) => updateDonor(ctx.db, input.id, input)),
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => deleteDonor(ctx.db, input.id)),
} satisfies TRPCRouterRecord

const projectInput = z.object({
  code: z.string().min(1),
  slug: z.string().min(1),
  status: z.enum(['current', 'past']),
  sort: z.number(),
  translations: z.array(z.object({ lang: z.string(), name: z.string(), summary: z.string(), body: z.string() })),
  donorIds: z.array(z.number()),
  locations: z.array(z.object({ schoolName: z.string(), lat: z.string(), lng: z.string() })),
})

const adminProjectsRouter = {
  list: adminProcedure.query(({ ctx }) => adminListProjects(ctx.db)),
  get: adminProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => getProjectForEdit(ctx.db, input.id)),
  create: adminProcedure.input(projectInput).mutation(({ ctx, input }) => createProject(ctx.db, input)),
  update: adminProcedure.input(projectInput.extend({ id: z.number() })).mutation(({ ctx, input }) => updateProject(ctx.db, input.id, input)),
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => deleteProject(ctx.db, input.id)),
} satisfies TRPCRouterRecord

const adminMediaRouter = {
  list: adminProcedure.query(({ ctx }) => adminListMedia(ctx.db)),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteMedia(ctx.db, input.id)),
} satisfies TRPCRouterRecord

const adminLanguagesRouter = {
  list: adminProcedure.query(({ ctx }) => listAllLanguages(ctx.db)),
  create: adminProcedure.input(languageInput).mutation(({ ctx, input }) => createLanguage(ctx.db, input)),
  update: adminProcedure
    .input(languageInput)
    .mutation(({ ctx, input }) => updateLanguage(ctx.db, input.code, input)),
  delete: adminProcedure
    .input(z.object({ code: z.string() }))
    .mutation(({ ctx, input }) => deleteLanguage(ctx.db, input.code)),
} satisfies TRPCRouterRecord

const adminNavRouter = {
  list: adminProcedure.query(({ ctx }) => adminListNav(ctx.db)),
  create: adminProcedure.input(navInput).mutation(({ ctx, input }) => createNavItem(ctx.db, input)),
  update: adminProcedure
    .input(navInput.omit({ parentId: true }).extend({ id: z.number() }))
    .mutation(({ ctx, input }) => updateNavItem(ctx.db, input.id, input)),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteNavItem(ctx.db, input.id)),
  move: adminProcedure
    .input(z.object({ id: z.number(), dir: z.enum(['up', 'down']) }))
    .mutation(({ ctx, input }) => moveNavItem(ctx.db, input.id, input.dir)),
} satisfies TRPCRouterRecord

export const trpcRouter = createTRPCRouter({
  auth: authRouter,
  site: siteRouter,
  projects: projectsRouter,
  terms: termsRouter,
  adminTerms: adminTermsRouter,
  i18n: i18nRouter,
  nav: navRouter,
  pages: pagesRouter,
  routes: routesRouter,
  posts: postsRouter,
  adminPosts: adminPostsRouter,
  adminPages: adminPagesRouter,
  adminNav: adminNavRouter,
  adminMedia: adminMediaRouter,
  adminLanguages: adminLanguagesRouter,
  admin: adminRouter,
  adminSettings: adminSettingsRouter,
  adminPartners: adminPartnersRouter,
  adminOffices: adminOfficesRouter,
  adminStats: adminStatsRouter,
  adminHero: adminHeroRouter,
  adminDonors: adminDonorsRouter,
  adminProjects: adminProjectsRouter,
  adminSchools: adminSchoolsRouter,
  staff: staffRouter,
  adminStaff: adminStaffRouter,
})
export type TRPCRouter = typeof trpcRouter
