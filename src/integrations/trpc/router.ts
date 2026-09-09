import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { FORM_FIELD_TYPES } from "#/lib/forms";
import {
	disallowedSections,
	moduleForRouter,
	routerEnabled,
	sourceEnabled,
	taxonomyEnabled,
} from "#/lib/modules";
import {
	ALL_AREAS,
	PERMISSION_AREAS,
	type PermissionArea,
	ROUTER_AREA,
	ungrantableAreas,
} from "#/lib/permissions";
import type { SectionNode } from "#/lib/sections";
import { checkSettingValue } from "#/lib/site-theme";
import { PAGE_TITLE_MAX } from "#/lib/slug";
import type { DB } from "#/server/db";
import { invalidateTags, tagSourceQuery } from "#/server/render-cache";
import type { PageInput } from "#/server/repo/admin";
import {
	adminListDonors,
	adminListHero,
	adminListMedia,
	adminListMediaPage,
	adminListNav,
	adminListOffices,
	adminListPages,
	adminListPartners,
	adminListPosts,
	adminListProjects,
	adminListSchools,
	adminListSettings,
	adminListStats,
	adminListTerms,
	adminMediaById,
	adminMediaByIds,
	adminMediaStats,
	adminMediaUsage,
	adminOverview,
	createDonor,
	createHero,
	createLanguage,
	createNavItem,
	createOffice,
	createPage,
	createPartner,
	createPost,
	createProject,
	createSchool,
	createStat,
	createTerm,
	deleteDonor,
	deleteHero,
	deleteLanguage,
	deleteMedia,
	deleteNavItem,
	deleteOffice,
	deletePage,
	deletePartner,
	deletePost,
	deleteProject,
	deleteSchool,
	deleteSetting,
	deleteStat,
	deleteTerm,
	getDonor,
	getOffice,
	getPageForEdit,
	getPartner,
	getPostForEdit,
	getProjectForEdit,
	getSchool,
	listAllLanguages,
	listContentTypes,
	MediaInUseError,
	movePage,
	type OfficeInput,
	readership,
	type SchoolInput,
	StaleWriteError,
	updateDonor,
	updateField,
	updateHero,
	updateLanguage,
	updateNavItem,
	updateOffice,
	updatePage,
	updatePartner,
	updatePost,
	updateProject,
	updateSchool,
	updateStat,
	updateTerm,
	upsertSetting,
} from "#/server/repo/admin";
import {
	adminListCampaigns,
	type CampaignInput,
	createCampaign,
	deleteCampaign,
	getCampaignBySlug,
	getCampaignForEdit,
	listActiveCampaigns,
	updateCampaign,
} from "#/server/repo/campaigns";
import {
	findPageRedirect,
	getAlbum,
	getPageBySlug,
	getPostBySlug,
	listAlbums,
	listAllTerms,
	listJobs,
	listPosts,
	listPublications,
	listTerms,
	listVideos,
	trackDocument,
} from "#/server/repo/content";
import {
	adminListDonations,
	adminListDonationsForCampaign,
	adminMarkDonationPaid,
	getDonationByOrderId,
} from "#/server/repo/donations";
import {
	adminListContactSubmissions,
	adminListForms,
	adminListSubmissions,
	createForm,
	deleteContactSubmission,
	deleteForm,
	deleteFormSubmission,
	getFormBySlug,
	getFormForEdit,
	isFormSlugAvailable,
	updateForm,
} from "#/server/repo/forms";
import { bootstrapI18n, listLanguages } from "#/server/repo/i18n";
import { getNavTree } from "#/server/repo/nav";
import {
	adminListOrg,
	createOrgNode,
	deleteOrgNode,
	getOrgTree,
	moveOrgNode,
	type OrgInput,
	reparentOrgNode,
	setOrgPosition,
	updateOrgNode,
} from "#/server/repo/org";
import {
	adminListPeople,
	createPerson,
	deletePerson,
	getPerson,
	listPeople,
	type PersonInput,
	setPersonPhoto,
	staffDirectory,
	updatePerson,
} from "#/server/repo/people";
import {
	getProjectBySlug,
	listProjectLocations,
	listProjectOptions,
} from "#/server/repo/projects";
import {
	reorderCampaigns,
	reorderDonors,
	reorderLanguages,
	reorderNavItems,
	reorderOffices,
	reorderPartners,
	reorderPeople,
	reorderProjects,
	reorderSchools,
	reorderSections,
	reorderTerms,
} from "#/server/repo/reorder";
import {
	adminListRoles,
	createRole,
	deleteRole,
	getRoleForEdit,
	listRolesForPicker,
	roleExists,
	updateRole,
} from "#/server/repo/roles";
import { publicPathFor, resolveRouteCached } from "#/server/repo/route";
import { resolveSections } from "#/server/repo/sections";
import {
	getSettings,
	listActiveAnnouncements,
	listHeroSlides,
	listOffices,
	listPartners,
	listStats,
	recordAndGetVisits,
	recordPageView,
} from "#/server/repo/site";
import { staffDocuments, staffEvents, staffNews } from "#/server/repo/staff";
import {
	listUiStrings,
	resetUiString,
	setUiString,
} from "#/server/repo/ui-strings";
import {
	adminListUsers,
	changeOwnPassword,
	createUser,
	deleteUser,
	getUserForEdit,
	setUserPassword,
	updateUser,
} from "#/server/repo/users";
import { renderBody } from "#/server/richtext";

import type { TRPCContext } from "./init";
import {
	adminProcedure,
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
	staffProcedure,
} from "./init";

const postInput = z.object({
	contentType: z.string().min(1),
	slug: z.string().min(1),
	status: z.enum(["draft", "published", "archived"]),
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
});

const langInput = z.object({ lang: z.string().default("en") });

// a drag sends the ids it can see, in their new order; the repo renumbers the rest
const reorderInput = z.object({ ids: z.array(z.number().int()).max(500) });

const authRouter = {
	me: publicProcedure.query(({ ctx }) =>
		ctx.user
			? {
					...ctx.user,
					permissions: ctx.permissions,
					isSuperAdmin: ctx.isSuperAdmin,
				}
			: null,
	),
	changePassword: protectedProcedure
		.input(
			z.object({
				currentPassword: z.string().min(1),
				newPassword: z.string().min(8),
			}),
		)
		.mutation(({ ctx, input }) =>
			changeOwnPassword(
				ctx.db,
				ctx.user.id,
				input.currentPassword,
				input.newPassword,
			),
		),
} satisfies TRPCRouterRecord;

const userInput = z.object({
	email: z.string().email(),
	name: z
		.string()
		.nullish()
		.transform((v) => v ?? null),
	role: z.string().min(1),
});
async function assertRole(ctx: TRPCContext, role: string) {
	// Handing out the super-role is not something the `users` area should buy —
	// otherwise any custom role granted "Users & roles" can mint an admin.
	if (role === "admin" && !ctx.isSuperAdmin)
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only an administrator can grant the Administrator role.",
		});
	if (role === "admin" || role === "staff") return; // built-in
	if (!(await roleExists(ctx.db, role)))
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "That role no longer exists.",
		});
}
const adminUsersRouter = {
	list: adminProcedure.query(({ ctx }) => adminListUsers(ctx.db)),
	get: adminProcedure
		.input(z.object({ id: z.number() }))
		.query(({ ctx, input }) => getUserForEdit(ctx.db, input.id)),
	roles: adminProcedure.query(({ ctx }) => listRolesForPicker(ctx.db)),
	create: adminProcedure
		.input(userInput.extend({ password: z.string().min(8) }))
		.mutation(async ({ ctx, input }) => {
			await assertRole(ctx, input.role);
			return createUser(ctx.db, input);
		}),
	update: adminProcedure
		.input(userInput.extend({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			await assertRole(ctx, input.role);
			return updateUser(ctx.db, input.id, input);
		}),
	resetPassword: adminProcedure
		.input(z.object({ id: z.number(), password: z.string().min(8) }))
		.mutation(async ({ ctx, input }) => {
			// Same door as assertRole: resetting an administrator's password is
			// taking their account, so it stays with administrators.
			if (!ctx.isSuperAdmin) {
				const target = await getUserForEdit(ctx.db, input.id);
				if (target?.role === "admin")
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Only an administrator can reset an administrator.",
					});
			}
			return setUserPassword(ctx.db, input.id, input.password);
		}),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => deleteUser(ctx.db, input.id, ctx.user.id)),
} satisfies TRPCRouterRecord;

const AREA_KEYS = ALL_AREAS as [PermissionArea, ...PermissionArea[]];
const roleInput = z.object({
	name: z.string().min(1),
	permissions: z.array(z.enum(AREA_KEYS)).default([]),
});
function assertGrantable(ctx: TRPCContext, requested: PermissionArea[]) {
	const over = ungrantableAreas(ctx, requested);
	if (over.length === 0) return;
	const labels = over
		.map((a) => PERMISSION_AREAS.find((p) => p.key === a)?.label ?? a)
		.join(", ");
	throw new TRPCError({
		code: "FORBIDDEN",
		message: `You can't grant access you don't have yourself: ${labels}.`,
	});
}
const adminRolesRouter = {
	list: adminProcedure.query(({ ctx }) => adminListRoles(ctx.db)),
	areas: adminProcedure.query(() => PERMISSION_AREAS),
	get: adminProcedure
		.input(z.object({ id: z.number() }))
		.query(({ ctx, input }) => getRoleForEdit(ctx.db, input.id)),
	create: adminProcedure
		.input(roleInput.extend({ key: z.string().default("") }))
		.mutation(({ ctx, input }) => {
			assertGrantable(ctx, input.permissions);
			return createRole(ctx.db, input);
		}),
	update: adminProcedure
		.input(roleInput.extend({ id: z.number() }))
		.mutation(({ ctx, input }) => {
			assertGrantable(ctx, input.permissions);
			return updateRole(ctx.db, input.id, input);
		}),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => deleteRole(ctx.db, input.id)),
} satisfies TRPCRouterRecord;

// lang is optional, not defaulted: without one the repo reads whichever language is flagged default
const termLangInput = z.object({ lang: z.string().optional() });

const termsRouter = {
	all: publicProcedure
		.input(termLangInput.optional())
		.query(({ ctx, input }) => listAllTerms(ctx.db, input?.lang)),
	list: publicProcedure
		.input(termLangInput.extend({ taxonomy: z.string() }))
		.query(({ ctx, input }) => listTerms(ctx.db, input.taxonomy, input.lang)),
} satisfies TRPCRouterRecord;

const termInput = z.object({
	taxonomy: z.string().min(1),
	key: z.string().min(1),
	sort: z.number(),
	labels: z.record(z.string(), z.string()),
});

// a taxonomy that only categorises a module's records goes with the module, or a role writes categories on a register that is switched off
async function assertTaxonomiesAllowed(
	db: DB,
	...taxonomies: (string | undefined)[]
) {
	const settings = await getSettings(db);
	for (const taxonomy of taxonomies)
		if (taxonomy && !taxonomyEnabled(settings, taxonomy))
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `The "${taxonomy}" list belongs to a module this site has not turned on.`,
			});
}

const adminTermsRouter = {
	list: adminProcedure.query(({ ctx }) => adminListTerms(ctx.db)),
	create: adminProcedure.input(termInput).mutation(async ({ ctx, input }) => {
		await assertTaxonomiesAllowed(ctx.db, input.taxonomy);
		return createTerm(ctx.db, input);
	}),
	update: adminProcedure
		.input(termInput.extend({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			// both taxonomies: a row can be moved out of a disabled one, or into it
			const row = (await adminListTerms(ctx.db)).find((t) => t.id === input.id);
			await assertTaxonomiesAllowed(ctx.db, row?.taxonomy, input.taxonomy);
			return updateTerm(ctx.db, input.id, input);
		}),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const row = (await adminListTerms(ctx.db)).find((t) => t.id === input.id);
			await assertTaxonomiesAllowed(ctx.db, row?.taxonomy);
			return deleteTerm(ctx.db, input.id);
		}),
	reorder: adminProcedure
		.input(reorderInput.extend({ taxonomy: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await assertTaxonomiesAllowed(ctx.db, input.taxonomy);
			return reorderTerms(ctx.db, input.taxonomy, input.ids);
		}),
} satisfies TRPCRouterRecord;

const siteRouter = {
	settings: publicProcedure.query(({ ctx }) => getSettings(ctx.db)),
	stats: publicProcedure
		.input(langInput)
		.query(({ ctx, input }) => listStats(ctx.db, input.lang)),
	heroSlides: publicProcedure
		.input(langInput)
		.query(({ ctx, input }) => listHeroSlides(ctx.db, input.lang)),
	announcement: publicProcedure
		.input(langInput)
		.query(({ ctx, input }) => listActiveAnnouncements(ctx.db, input.lang)),
	offices: publicProcedure
		.input(langInput)
		.query(({ ctx, input }) => listOffices(ctx.db, input.lang)),
	partners: publicProcedure.query(({ ctx }) => listPartners(ctx.db)),
	projectLocations: publicProcedure
		.input(langInput)
		.query(({ ctx, input }) => listProjectLocations(ctx.db, input.lang)),
	visits: publicProcedure
		.input(z.object({ path: z.string().max(2048).optional() }).optional())
		.query(({ ctx, input }) => recordAndGetVisits(ctx.db, input?.path)),
	// a query, not a mutation: every mutation clears the whole render cache, and
	// this one fires on each navigation
	view: publicProcedure
		.input(z.object({ path: z.string().max(2048) }))
		.query(async ({ ctx, input }) => {
			await recordPageView(ctx.db, input.path);
			return null;
		}),
} satisfies TRPCRouterRecord;

const projectsRouter = {
	bySlug: publicProcedure
		.input(langInput.extend({ slug: z.string() }))
		.query(({ ctx, input }) =>
			getProjectBySlug(ctx.db, input.slug, input.lang),
		),
	options: publicProcedure
		.input(langInput)
		.query(({ ctx, input }) => listProjectOptions(ctx.db, input.lang)),
} satisfies TRPCRouterRecord;

const i18nRouter = {
	languages: publicProcedure.query(({ ctx }) => listLanguages(ctx.db)),
	bootstrap: publicProcedure
		.input(z.object({ lang: z.string().default("") }))
		.query(({ ctx, input }) => bootstrapI18n(ctx.db, input.lang)),
} satisfies TRPCRouterRecord;

const navRouter = {
	tree: publicProcedure
		.input(langInput)
		.query(({ ctx, input }) => getNavTree(ctx.db, input.lang)),
} satisfies TRPCRouterRecord;

const formsRouter = {
	bySlug: publicProcedure
		.input(z.object({ slug: z.string() }))
		.query(async ({ ctx, input }) => {
			const form = await getFormBySlug(ctx.db, input.slug);
			if (!form) return null;
			// Pre-render author `content` blocks to HTML so the client just displays them.
			const fields = form.fields.map((f) =>
				f.type === "content" ? { ...f, contentHtml: renderBody(f.content) } : f,
			);
			return { ...form, fields };
		}),
} satisfies TRPCRouterRecord;

const formFieldSchema = z.object({
	key: z.string().min(1),
	label: z.string().min(1),
	labelKm: z.string().optional(),
	type: z.enum(FORM_FIELD_TYPES),
	required: z.boolean().optional(),
	placeholder: z.string().optional(),
	options: z.array(z.string()).optional(),
	content: z.string().optional(),
});
const formInput = z.object({
	slug: z.string().min(1),
	status: z.enum(["active", "draft"]),
	title: z.string().min(1),
	titleKm: z
		.string()
		.nullish()
		.transform((v) => v ?? null),
	intro: z
		.string()
		.nullish()
		.transform((v) => v ?? null),
	introKm: z
		.string()
		.nullish()
		.transform((v) => v ?? null),
	fields: z.array(formFieldSchema),
	deadline: z
		.string()
		.nullish()
		.transform((v) => (v?.trim() ? v.trim() : null)),
	submitLabel: z
		.string()
		.nullish()
		.transform((v) => v ?? null),
	successMessage: z
		.string()
		.nullish()
		.transform((v) => v ?? null),
	notifyEmail: z
		.string()
		.nullish()
		.transform((v) => v ?? null),
});
const adminFormsRouter = {
	list: adminProcedure.query(({ ctx }) => adminListForms(ctx.db)),
	get: adminProcedure
		.input(z.object({ id: z.number() }))
		.query(({ ctx, input }) => getFormForEdit(ctx.db, input.id)),
	slugAvailable: adminProcedure
		.input(z.object({ slug: z.string(), excludeId: z.number().optional() }))
		.query(({ ctx, input }) =>
			isFormSlugAvailable(ctx.db, input.slug, input.excludeId),
		),
	create: adminProcedure
		.input(formInput)
		.mutation(({ ctx, input }) => createForm(ctx.db, input)),
	update: adminProcedure
		.input(formInput.extend({ id: z.number() }))
		.mutation(({ ctx, input }) => updateForm(ctx.db, input.id, input)),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => deleteForm(ctx.db, input.id)),
	submissions: adminProcedure
		.input(z.object({ formId: z.number() }))
		.query(({ ctx, input }) => adminListSubmissions(ctx.db, input.formId)),
	deleteSubmission: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => deleteFormSubmission(ctx.db, input.id)),
} satisfies TRPCRouterRecord;

const campaignsRouter = {
	listActive: publicProcedure
		.input(langInput)
		.query(({ ctx, input }) => listActiveCampaigns(ctx.db, input.lang)),
	bySlug: publicProcedure
		.input(langInput.extend({ slug: z.string() }))
		.query(({ ctx, input }) =>
			getCampaignBySlug(ctx.db, input.slug, input.lang),
		),
} satisfies TRPCRouterRecord;

// intent and webhook live in /api/pay, they need the raw Request; this is read-back only
const paymentsRouter = {
	status: publicProcedure
		.input(z.object({ orderId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const row = await getDonationByOrderId(ctx.db, input.orderId);
			if (!row) return null;
			return { status: row.status, amount: row.amount, currency: row.currency };
		}),
} satisfies TRPCRouterRecord;

const orgRouter = {
	tree: publicProcedure
		.input(langInput)
		.query(({ ctx, input }) => getOrgTree(ctx.db, input.lang)),
} satisfies TRPCRouterRecord;

const orgInput = z.object({
	parentId: z.number().nullable(),
	personId: z
		.number()
		.nullish()
		.transform((v) => v ?? null),
	translations: z.array(
		z.object({ lang: z.string(), name: z.string(), title: z.string() }),
	),
}) satisfies z.ZodType<OrgInput>;

const adminOrgRouter = {
	list: adminProcedure.query(({ ctx }) => adminListOrg(ctx.db)),
	create: adminProcedure
		.input(orgInput)
		.mutation(({ ctx, input }) => createOrgNode(ctx.db, input)),
	update: adminProcedure
		.input(orgInput.extend({ id: z.number() }))
		.mutation(({ ctx, input }) => updateOrgNode(ctx.db, input.id, input)),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => deleteOrgNode(ctx.db, input.id)),
	move: adminProcedure
		.input(z.object({ id: z.number(), dir: z.enum(["up", "down"]) }))
		.mutation(({ ctx, input }) => moveOrgNode(ctx.db, input.id, input.dir)),
	setPosition: adminProcedure
		.input(z.object({ id: z.number(), x: z.number(), y: z.number() }))
		.mutation(({ ctx, input }) =>
			setOrgPosition(ctx.db, input.id, input.x, input.y),
		),
	reparent: adminProcedure
		.input(z.object({ id: z.number(), parentId: z.number().nullable() }))
		.mutation(({ ctx, input }) =>
			reparentOrgNode(ctx.db, input.id, input.parentId),
		),
} satisfies TRPCRouterRecord;

const pagesRouter = {
	bySlug: publicProcedure
		.input(langInput.extend({ slug: z.string() }))
		.query(({ ctx, input }) => getPageBySlug(ctx.db, input.slug, input.lang)),
	redirect: publicProcedure
		.input(z.object({ slug: z.string() }))
		.query(({ ctx, input }) => findPageRedirect(ctx.db, input.slug)),
} satisfies TRPCRouterRecord;

// Single resolver for the public catch-all route (page tree + flat collections + redirects).
const routesRouter = {
	resolve: publicProcedure
		.input(
			langInput.extend({
				path: z.string(),
				page: z.number().int().positive().optional(),
			}),
		)
		.query(({ ctx, input }) =>
			resolveRouteCached(ctx.db, input.path, input.lang, input.page ?? 1),
		),
} satisfies TRPCRouterRecord;

// Internal-only content types must never be served by public procedures.
const PUBLIC_BLOCKED_TYPES = new Set([
	"internal_news",
	"document",
	"event",
	"announcement",
]);

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
			const post = await getPostBySlug(ctx.db, input.slug, input.lang);
			return post && PUBLIC_BLOCKED_TYPES.has(post.contentType) ? null : post;
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
		.query(({ ctx, input }) =>
			listPublications(ctx.db, input.lang, input.category),
		),
	// public mutation, so no blanket bust: drop just the publication listings
	trackDocument: publicProcedure
		.input(z.object({ id: z.number(), kind: z.enum(["read", "download"]) }))
		.mutation(async ({ ctx, input }) => {
			await trackDocument(ctx.db, input.id, input.kind);
			await invalidateTags(ctx.db, [tagSourceQuery("publications")]);
		}),
} satisfies TRPCRouterRecord;

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
			sort: z.enum(["newest", "oldest"]).optional(),
		})
		.optional(),
});

const pageInput = z.object({
	slug: z.string().default(""), // derived from parentId + segment on the server
	segment: z.string().min(1),
	parentId: z.number().nullable().default(null),
	status: z.enum(["draft", "published"]),
	coverMediaId: z.number().nullable(),
	sections: z.array(sectionNodeSchema).default([]),
	translations: z.array(
		z.object({
			lang: z.string(),
			title: z.string().max(PAGE_TITLE_MAX),
			excerpt: z.string(),
			body: z.string(),
		}),
	),
});

const navInput = z.object({
	parentId: z.number().nullable(),
	targetKind: z.enum(["page", "post_list", "post", "url", "view", "none"]),
	targetRef: z.string(),
	visible: z.boolean(),
	imageMediaId: z.number().nullable(),
	labels: z.record(z.string(), z.string()),
	descriptions: z.record(z.string(), z.string()),
});

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
} satisfies TRPCRouterRecord;

// sections is free-form JSON from the client, so this is the boundary and not the picker; shapes already stored still pass
async function assertSectionsAllowed(
	db: DB,
	sections: SectionNode[],
	pageId?: number,
) {
	const stored = pageId
		? (((await getPageForEdit(db, pageId))?.sections ?? []) as SectionNode[])
		: [];
	const bad = disallowedSections(await getSettings(db), sections, stored);
	if (bad.length)
		throw new TRPCError({ code: "BAD_REQUEST", message: bad.join(" ") });
}

const ENTITY_ROUTER = {
	page: "adminPages",
	post: "adminPosts",
	person: "adminPeople",
	project: "adminProjects",
} as const;

// updateField writes four entities from one router, so the module and permission
// gate adminProcedure applied to `adminPages` is re-run for the router owning the row
async function assertEntityAllowed(
	ctx: TRPCContext,
	entity: keyof typeof ENTITY_ROUTER,
) {
	const key = ENTITY_ROUTER[entity];
	if (moduleForRouter(key) && !routerEnabled(await getSettings(ctx.db), key))
		throw new TRPCError({ code: "FORBIDDEN" });
	if (!ctx.isSuperAdmin && !ctx.permissions.includes(ROUTER_AREA[key]))
		throw new TRPCError({ code: "FORBIDDEN" });
}

const adminPagesRouter = {
	list: adminProcedure.query(({ ctx }) => adminListPages(ctx.db)),
	get: adminProcedure
		.input(z.object({ id: z.number() }))
		.query(({ ctx, input }) => getPageForEdit(ctx.db, input.id)),
	preview: adminProcedure
		.input(
			z.object({
				sections: z.array(sectionNodeSchema),
				lang: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// The preview runs whatever query it is handed, so it is a read path into
			// every domain table. It shows what this install can see and no more.
			const settings = await getSettings(ctx.db);
			return resolveSections(
				ctx.db,
				input.sections as SectionNode[],
				input.lang ?? "en",
				{ allowSource: (src) => sourceEnabled(settings, src) },
			);
		}),
	create: adminProcedure.input(pageInput).mutation(async ({ ctx, input }) => {
		await assertSectionsAllowed(ctx.db, input.sections as SectionNode[]);
		return createPage(ctx.db, input as PageInput);
	}),
	update: adminProcedure
		.input(
			pageInput.extend({
				id: z.number(),
				expectedUpdatedAt: z.string().nullish(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertSectionsAllowed(
				ctx.db,
				input.sections as SectionNode[],
				input.id,
			);
			try {
				return await updatePage(ctx.db, input.id, input as PageInput);
			} catch (err) {
				// The editor turns the bare code into the sentence and the reload offer.
				if (err instanceof StaleWriteError)
					throw new TRPCError({ code: "CONFLICT" });
				throw err;
			}
		}),
	// one addressed field, so an inline save cannot destroy the languages it was not told about
	updateField: adminProcedure
		.input(
			z.object({
				entity: z.enum(["page", "post", "person", "project"]),
				entityId: z.number(),
				lang: z.string().min(2),
				target: z.string().min(1),
				value: z.string(),
				expectedUpdatedAt: z.string().nullish(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertEntityAllowed(ctx, input.entity);
			try {
				return await updateField(ctx.db, input);
			} catch (err) {
				// the editor turns the bare code into the sentence and the reload offer
				if (err instanceof StaleWriteError)
					throw new TRPCError({ code: "CONFLICT" });
				throw err;
			}
		}),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => deletePage(ctx.db, input.id)),
	move: adminProcedure
		.input(
			z.object({
				id: z.number(),
				parentId: z.number().nullable(),
				index: z.number(),
			}),
		)
		.mutation(({ ctx, input }) =>
			movePage(ctx.db, input.id, input.parentId, input.index),
		),
	reorderSections: adminProcedure
		.input(
			z.object({
				id: z.number(),
				ids: z.array(z.string()).max(200),
				expectedUpdatedAt: z.string().nullish(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				return await reorderSections(
					ctx.db,
					input.id,
					input.ids,
					input.expectedUpdatedAt,
				);
			} catch (err) {
				// the editor turns the bare code into the sentence and the reload offer
				if (err instanceof StaleWriteError)
					throw new TRPCError({ code: "CONFLICT" });
				throw err;
			}
		}),
} satisfies TRPCRouterRecord;

const languageInput = z.object({
	code: z.string().min(2),
	name: z.string().min(1),
	nativeName: z.string().min(1),
	enabled: z.boolean(),
	isDefault: z.boolean(),
	rtl: z.boolean(),
	sort: z.number(),
});

// Staff portal (requires staff/admin role) — internal, never public.
const staffRouter = {
	news: staffProcedure
		.input(langInput)
		.query(({ ctx, input }) => staffNews(ctx.db, input.lang)),
	events: staffProcedure
		.input(langInput)
		.query(({ ctx, input }) => staffEvents(ctx.db, input.lang)),
	documents: staffProcedure
		.input(langInput)
		.query(({ ctx, input }) => staffDocuments(ctx.db, input.lang)),
	directory: staffProcedure.query(({ ctx }) => staffDirectory(ctx.db)),
} satisfies TRPCRouterRecord;

const personInput = z.object({
	tier: z.string(),
	isPublic: z.boolean(),
	slug: z
		.string()
		.nullish()
		.transform((v) => v ?? null),
	photoMediaId: z
		.number()
		.nullish()
		.transform((v) => v ?? null),
	staffNo: z
		.string()
		.nullish()
		.transform((v) => v ?? null),
	sex: z
		.string()
		.nullish()
		.transform((v) => v ?? null),
	phone: z
		.string()
		.nullish()
		.transform((v) => v ?? null),
	email: z
		.string()
		.nullish()
		.transform((v) => v ?? null),
	program: z
		.string()
		.nullish()
		.transform((v) => v ?? null),
	sort: z.number(),
	translations: z.array(
		z.object({
			lang: z.string(),
			name: z.string(),
			position: z.string(),
			bio: z.string(),
		}),
	),
}) satisfies z.ZodType<PersonInput>;

const adminPeopleRouter = {
	list: adminProcedure.query(({ ctx }) => adminListPeople(ctx.db)),
	get: adminProcedure
		.input(z.object({ id: z.number() }))
		.query(({ ctx, input }) => getPerson(ctx.db, input.id)),
	create: adminProcedure
		.input(personInput)
		.mutation(({ ctx, input }) => createPerson(ctx.db, input)),
	update: adminProcedure
		.input(personInput.extend({ id: z.number() }))
		.mutation(({ ctx, input }) => updatePerson(ctx.db, input.id, input)),
	setPhoto: adminProcedure
		.input(z.object({ id: z.number(), photoMediaId: z.number().nullable() }))
		.mutation(async ({ ctx, input }) => {
			const found = await setPersonPhoto(ctx.db, input.id, input.photoMediaId);
			if (!found)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "That team member no longer exists.",
				});
			return { ok: true };
		}),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => deletePerson(ctx.db, input.id)),
	reorder: adminProcedure
		.input(reorderInput)
		.mutation(({ ctx, input }) => reorderPeople(ctx.db, input.ids)),
} satisfies TRPCRouterRecord;

const partnerInput = z.object({
	name: z.string().min(1),
	category: z.string(),
	url: z.string(),
	sort: z.number(),
	logoMediaId: z.number().nullish(),
});
const officeInput = z.object({
	province: z.string(),
	phone: z.string(),
	email: z.string(),
	lat: z.string(),
	lng: z.string(),
	isHq: z.boolean(),
	sort: z.number(),
	imageMediaId: z.number().nullish(),
	translations: z.array(
		z.object({ lang: z.string(), name: z.string(), address: z.string() }),
	),
}) satisfies z.ZodType<OfficeInput>;
const statInput = z.object({
	value: z.number(),
	sort: z.number(),
	labels: z.record(z.string(), z.string()),
});

const adminRouter = {
	overview: adminProcedure.query(({ ctx }) => adminOverview(ctx.db)),
	readership: adminProcedure
		.input(langInput)
		.query(({ ctx, input }) => readership(ctx.db, input.lang)),
	publicPath: adminProcedure
		.input(
			z.object({
				kind: z.enum(["page", "post", "project", "person"]),
				id: z.number(),
			}),
		)
		.query(({ ctx, input }) => publicPathFor(ctx.db, input.kind, input.id)),
} satisfies TRPCRouterRecord;

const adminSettingsRouter = {
	list: adminProcedure.query(({ ctx }) => adminListSettings(ctx.db)),
	set: adminProcedure
		.input(z.object({ key: z.string(), value: z.string() }))
		.mutation(({ ctx, input }) => {
			// an unparseable theme value blanks every token derived from it, so refuse it
			const problem = checkSettingValue(input.key, input.value);
			if (problem)
				throw new TRPCError({ code: "BAD_REQUEST", message: problem });
			return upsertSetting(ctx.db, input.key, input.value);
		}),
	delete: adminProcedure
		.input(z.object({ key: z.string() }))
		.mutation(({ ctx, input }) => deleteSetting(ctx.db, input.key)),
	// chrome strings ride this router so they answer to `settings`, the area that
	// already covers languages
	uiStrings: adminProcedure.query(({ ctx }) => listUiStrings(ctx.db)),
	setUiString: adminProcedure
		.input(z.object({ key: z.string(), lang: z.string(), value: z.string() }))
		.mutation(({ ctx, input }) =>
			setUiString(ctx.db, input.key, input.lang, input.value),
		),
	resetUiString: adminProcedure
		.input(z.object({ key: z.string(), lang: z.string() }))
		.mutation(({ ctx, input }) => resetUiString(ctx.db, input.key, input.lang)),
} satisfies TRPCRouterRecord;

const adminPartnersRouter = {
	list: adminProcedure.query(({ ctx }) => adminListPartners(ctx.db)),
	get: adminProcedure
		.input(z.object({ id: z.number() }))
		.query(({ ctx, input }) => getPartner(ctx.db, input.id)),
	create: adminProcedure
		.input(partnerInput)
		.mutation(({ ctx, input }) => createPartner(ctx.db, input)),
	update: adminProcedure
		.input(partnerInput.extend({ id: z.number() }))
		.mutation(({ ctx, input }) => updatePartner(ctx.db, input.id, input)),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => deletePartner(ctx.db, input.id)),
	reorder: adminProcedure
		.input(reorderInput)
		.mutation(({ ctx, input }) => reorderPartners(ctx.db, input.ids)),
} satisfies TRPCRouterRecord;

const adminOfficesRouter = {
	list: adminProcedure.query(({ ctx }) => adminListOffices(ctx.db)),
	get: adminProcedure
		.input(z.object({ id: z.number() }))
		.query(({ ctx, input }) => getOffice(ctx.db, input.id)),
	create: adminProcedure
		.input(officeInput)
		.mutation(({ ctx, input }) => createOffice(ctx.db, input)),
	update: adminProcedure
		.input(officeInput.extend({ id: z.number() }))
		.mutation(({ ctx, input }) => updateOffice(ctx.db, input.id, input)),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => deleteOffice(ctx.db, input.id)),
	reorder: adminProcedure
		.input(reorderInput)
		.mutation(({ ctx, input }) => reorderOffices(ctx.db, input.ids)),
} satisfies TRPCRouterRecord;

const adminStatsRouter = {
	list: adminProcedure.query(({ ctx }) => adminListStats(ctx.db)),
	create: adminProcedure
		.input(statInput)
		.mutation(({ ctx, input }) => createStat(ctx.db, input)),
	update: adminProcedure
		.input(statInput.extend({ id: z.number() }))
		.mutation(({ ctx, input }) => updateStat(ctx.db, input.id, input)),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => deleteStat(ctx.db, input.id)),
} satisfies TRPCRouterRecord;

const heroInput = z.object({
	mediaId: z.number().nullable(),
	kind: z.string(),
	videoUrl: z.string().nullable(),
	sort: z.number(),
	translations: z.array(
		z.object({
			lang: z.string(),
			kicker: z.string(),
			title: z.string(),
			caption: z.string(),
		}),
	),
});
const donorInput = z.object({
	name: z.string().min(1),
	url: z.string(),
	sort: z.number(),
	logoMediaId: z.number().nullish(),
});
const schoolInput = z.object({
	code: z.string(),
	level: z.string(),
	province: z.string(),
	projectId: z.number().nullable(),
	coverMediaId: z.number().nullable(),
	lat: z.string(),
	lng: z.string(),
	sort: z.number(),
	translations: z.array(
		z.object({ lang: z.string(), name: z.string(), address: z.string() }),
	),
}) satisfies z.ZodType<SchoolInput>;

const adminSchoolsRouter = {
	list: adminProcedure.query(({ ctx }) => adminListSchools(ctx.db)),
	get: adminProcedure
		.input(z.object({ id: z.number() }))
		.query(({ ctx, input }) => getSchool(ctx.db, input.id)),
	create: adminProcedure
		.input(schoolInput)
		.mutation(({ ctx, input }) => createSchool(ctx.db, input)),
	update: adminProcedure
		.input(schoolInput.extend({ id: z.number() }))
		.mutation(({ ctx, input }) => updateSchool(ctx.db, input.id, input)),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => deleteSchool(ctx.db, input.id)),
	reorder: adminProcedure
		.input(reorderInput)
		.mutation(({ ctx, input }) => reorderSchools(ctx.db, input.ids)),
} satisfies TRPCRouterRecord;

const adminHeroRouter = {
	list: adminProcedure.query(({ ctx }) => adminListHero(ctx.db)),
	create: adminProcedure
		.input(heroInput)
		.mutation(({ ctx, input }) => createHero(ctx.db, input)),
	update: adminProcedure
		.input(heroInput.extend({ id: z.number() }))
		.mutation(({ ctx, input }) => updateHero(ctx.db, input.id, input)),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => deleteHero(ctx.db, input.id)),
} satisfies TRPCRouterRecord;

const campaignInput = z.object({
	slug: z.string().min(1),
	status: z.enum(["active", "draft", "ended"]),
	currency: z.enum(["USD", "KHR"]),
	goalAmount: z
		.string()
		.nullish()
		.transform((v) => (v?.trim() ? v.trim() : null)),
	coverMediaId: z.number().nullable(),
	presets: z.array(z.number()),
	allowCustom: z.boolean(),
	impactTiers: z.array(z.object({ amount: z.number(), label: z.string() })),
	showSupporters: z.boolean(),
	featured: z.boolean(),
	sort: z.number(),
	translations: z.array(
		z.object({ lang: z.string(), title: z.string(), blurb: z.string() }),
	),
}) satisfies z.ZodType<CampaignInput>;

const adminCampaignsRouter = {
	list: adminProcedure.query(({ ctx }) => adminListCampaigns(ctx.db)),
	get: adminProcedure
		.input(z.object({ id: z.number() }))
		.query(({ ctx, input }) => getCampaignForEdit(ctx.db, input.id)),
	donations: adminProcedure
		.input(z.object({ id: z.number() }))
		.query(({ ctx, input }) => adminListDonationsForCampaign(ctx.db, input.id)),
	create: adminProcedure
		.input(campaignInput)
		.mutation(({ ctx, input }) => createCampaign(ctx.db, input)),
	update: adminProcedure
		.input(campaignInput.extend({ id: z.number() }))
		.mutation(({ ctx, input }) => updateCampaign(ctx.db, input.id, input)),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => deleteCampaign(ctx.db, input.id)),
	reorder: adminProcedure
		.input(reorderInput)
		.mutation(({ ctx, input }) => reorderCampaigns(ctx.db, input.ids)),
} satisfies TRPCRouterRecord;

const adminMessagesRouter = {
	contact: adminProcedure.query(({ ctx }) =>
		adminListContactSubmissions(ctx.db),
	),
	deleteContact: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => deleteContactSubmission(ctx.db, input.id)),
} satisfies TRPCRouterRecord;

const adminDonationsRouter = {
	list: adminProcedure.query(({ ctx }) => adminListDonations(ctx.db)),
	markPaid: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => adminMarkDonationPaid(ctx.db, input.id)),
} satisfies TRPCRouterRecord;

const adminDonorsRouter = {
	list: adminProcedure.query(({ ctx }) => adminListDonors(ctx.db)),
	get: adminProcedure
		.input(z.object({ id: z.number() }))
		.query(({ ctx, input }) => getDonor(ctx.db, input.id)),
	create: adminProcedure
		.input(donorInput)
		.mutation(({ ctx, input }) => createDonor(ctx.db, input)),
	update: adminProcedure
		.input(donorInput.extend({ id: z.number() }))
		.mutation(({ ctx, input }) => updateDonor(ctx.db, input.id, input)),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => deleteDonor(ctx.db, input.id)),
	reorder: adminProcedure
		.input(reorderInput)
		.mutation(({ ctx, input }) => reorderDonors(ctx.db, input.ids)),
} satisfies TRPCRouterRecord;

const projectInput = z.object({
	code: z.string().min(1),
	slug: z.string().min(1),
	parentId: z.number().nullable().default(null),
	status: z.enum(["current", "past"]),
	sort: z.number(),
	startDate: z.string(),
	endDate: z.string(),
	targetAreas: z.array(z.string()),
	snapshots: z.array(z.object({ value: z.string(), label: z.string() })),
	translations: z.array(
		z.object({
			lang: z.string(),
			name: z.string(),
			summary: z.string(),
			body: z.string(),
		}),
	),
	donorIds: z.array(z.number()),
	locations: z.array(
		z.object({
			schoolName: z.string(),
			lat: z.string(),
			lng: z.string(),
			photoMediaId: z.number().nullable(),
		}),
	),
});

const adminProjectsRouter = {
	list: adminProcedure.query(({ ctx }) => adminListProjects(ctx.db)),
	get: adminProcedure
		.input(z.object({ id: z.number() }))
		.query(({ ctx, input }) => getProjectForEdit(ctx.db, input.id)),
	create: adminProcedure
		.input(projectInput)
		.mutation(({ ctx, input }) => createProject(ctx.db, input)),
	update: adminProcedure
		.input(projectInput.extend({ id: z.number() }))
		.mutation(({ ctx, input }) => updateProject(ctx.db, input.id, input)),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => deleteProject(ctx.db, input.id)),
	reorder: adminProcedure
		.input(reorderInput)
		.mutation(({ ctx, input }) => reorderProjects(ctx.db, input.ids)),
} satisfies TRPCRouterRecord;

const adminMediaRouter = {
	list: adminProcedure.query(({ ctx }) => adminListMedia(ctx.db)),
	page: adminProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(30),
				offset: z.number().min(0).default(0),
				query: z.string().optional(),
				type: z.enum(["all", "image", "video", "file"]).default("all"),
			}),
		)
		.query(({ ctx, input }) => adminListMediaPage(ctx.db, input)),
	stats: adminProcedure.query(({ ctx }) => adminMediaStats(ctx.db)),
	byId: adminProcedure
		.input(z.object({ id: z.number() }))
		.query(({ ctx, input }) => adminMediaById(ctx.db, input.id)),
	byIds: adminProcedure
		.input(z.object({ ids: z.array(z.number()) }))
		.query(({ ctx, input }) => adminMediaByIds(ctx.db, input.ids)),
	usage: adminProcedure
		.input(z.object({ id: z.number() }))
		.query(({ ctx, input }) => adminMediaUsage(ctx.db, input.id)),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			try {
				await deleteMedia(ctx.db, input.id);
			} catch (e) {
				// BAD_REQUEST so the repo's message reaches the operator, not a generic failure
				if (e instanceof MediaInUseError)
					throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
				throw e;
			}
		}),
} satisfies TRPCRouterRecord;

const adminLanguagesRouter = {
	list: adminProcedure.query(({ ctx }) => listAllLanguages(ctx.db)),
	create: adminProcedure
		.input(languageInput)
		.mutation(({ ctx, input }) => createLanguage(ctx.db, input)),
	update: adminProcedure
		.input(languageInput)
		.mutation(({ ctx, input }) => updateLanguage(ctx.db, input.code, input)),
	delete: adminProcedure
		.input(z.object({ code: z.string() }))
		.mutation(({ ctx, input }) => deleteLanguage(ctx.db, input.code)),
	reorder: adminProcedure
		.input(z.object({ codes: z.array(z.string()).max(50) }))
		.mutation(({ ctx, input }) => reorderLanguages(ctx.db, input.codes)),
} satisfies TRPCRouterRecord;

const adminNavRouter = {
	list: adminProcedure.query(({ ctx }) => adminListNav(ctx.db)),
	create: adminProcedure
		.input(navInput)
		.mutation(({ ctx, input }) => createNavItem(ctx.db, input)),
	update: adminProcedure
		.input(navInput.omit({ parentId: true }).extend({ id: z.number() }))
		.mutation(({ ctx, input }) => updateNavItem(ctx.db, input.id, input)),
	delete: adminProcedure
		.input(z.object({ id: z.number() }))
		.mutation(({ ctx, input }) => deleteNavItem(ctx.db, input.id)),
	reorder: adminProcedure
		.input(reorderInput)
		.mutation(({ ctx, input }) => reorderNavItems(ctx.db, input.ids)),
} satisfies TRPCRouterRecord;

export const trpcRouter = createTRPCRouter({
	auth: authRouter,
	site: siteRouter,
	projects: projectsRouter,
	terms: termsRouter,
	adminTerms: adminTermsRouter,
	i18n: i18nRouter,
	nav: navRouter,
	forms: formsRouter,
	campaigns: campaignsRouter,
	payments: paymentsRouter,
	org: orgRouter,
	pages: pagesRouter,
	routes: routesRouter,
	posts: postsRouter,
	adminPosts: adminPostsRouter,
	adminPages: adminPagesRouter,
	adminNav: adminNavRouter,
	adminOrg: adminOrgRouter,
	adminMedia: adminMediaRouter,
	adminLanguages: adminLanguagesRouter,
	admin: adminRouter,
	adminSettings: adminSettingsRouter,
	adminPartners: adminPartnersRouter,
	adminOffices: adminOfficesRouter,
	adminStats: adminStatsRouter,
	adminHero: adminHeroRouter,
	adminCampaigns: adminCampaignsRouter,
	adminUsers: adminUsersRouter,
	adminRoles: adminRolesRouter,
	adminForms: adminFormsRouter,
	adminMessages: adminMessagesRouter,
	adminDonations: adminDonationsRouter,
	adminDonors: adminDonorsRouter,
	adminProjects: adminProjectsRouter,
	adminSchools: adminSchoolsRouter,
	staff: staffRouter,
	adminPeople: adminPeopleRouter,
});
export type TRPCRouter = typeof trpcRouter;
