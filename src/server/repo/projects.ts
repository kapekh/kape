import { and, asc, eq } from "drizzle-orm";

import type { DB } from "../db";
import { renderBody } from "../richtext";
import {
	donors,
	type ProjectSnapshot,
	projectDonors,
	projectLocations,
	projects,
} from "../schema";
import { resolveOne, resolveTranslations } from "./i18n";
import { attachMediaUrl } from "./media-util";

const TENANT = 1;

export type ResolvedProject = {
	id: number;
	code: string;
	slug: string;
	status: string;
	name: string;
	summary: string;
	bodyHtml: string;
	startDate: string | null;
	endDate: string | null;
	targetAreas: string[];
	snapshots: ProjectSnapshot[];
	donors: { name: string; logoUrl: string | null }[];
};

export async function getProjectBySlug(
	db: DB,
	slug: string,
	lang: string,
): Promise<ResolvedProject | null> {
	const [p] = await db
		.select()
		.from(projects)
		.where(and(eq(projects.tenantId, TENANT), eq(projects.slug, slug)))
		.limit(1);
	if (!p) return null;
	const f = await resolveOne(db, "project", p.id, lang);
	const ds = await db
		.select({ name: donors.name, logoMediaId: donors.logoMediaId })
		.from(projectDonors)
		.innerJoin(donors, eq(projectDonors.donorId, donors.id))
		.where(eq(projectDonors.projectId, p.id));
	const dsWithLogo = await attachMediaUrl(db, ds, "logoMediaId", "logoUrl");
	return {
		id: p.id,
		code: p.code,
		slug: p.slug,
		status: p.status,
		name: f.name ?? "",
		summary: f.summary ?? "",
		bodyHtml: renderBody(f.body ?? null),
		startDate: p.startDate,
		endDate: p.endDate,
		targetAreas: p.targetAreas ?? [],
		snapshots: p.snapshots ?? [],
		donors: dsWithLogo.map((d) => ({ name: d.name, logoUrl: d.logoUrl })),
	};
}

/** {code, name} options for the post editor's program relation select. */
export async function listProjectOptions(db: DB, lang: string) {
	const rows = await db
		.select({ id: projects.id, code: projects.code })
		.from(projects)
		.where(eq(projects.tenantId, TENANT))
		.orderBy(asc(projects.sort));
	const names = await resolveTranslations(
		db,
		"project",
		rows.map((r) => r.id),
		lang,
	);
	return rows.map((r) => ({
		code: r.code,
		name: names.get(r.id)?.name ?? r.code,
	}));
}

export type ProjectCard = {
	id: number;
	slug: string;
	code: string;
	status: string;
	name: string;
	summary: string;
	image: string | null;
	startDate: string | null;
	endDate: string | null;
};

/** Public project cards for the `projectList` section, optionally filtered by status. */
export async function listProjectCards(
	db: DB,
	lang: string,
	status?: string,
	limit?: number,
): Promise<ProjectCard[]> {
	const rows = await db
		.select()
		.from(projects)
		.where(
			status
				? and(eq(projects.tenantId, TENANT), eq(projects.status, status))
				: eq(projects.tenantId, TENANT),
		)
		.orderBy(asc(projects.sort));
	const capped = limit ? rows.slice(0, limit) : rows;
	const names = await resolveTranslations(
		db,
		"project",
		capped.map((r) => r.id),
		lang,
	);
	const withLogo = await attachMediaUrl(db, capped, "logoMediaId", "logoUrl");
	return withLogo.map((r) => ({
		id: r.id,
		slug: r.slug,
		code: r.code,
		status: r.status,
		name: names.get(r.id)?.name ?? r.code,
		summary: names.get(r.id)?.summary ?? "",
		image: r.logoUrl,
		startDate: r.startDate,
		endDate: r.endDate,
	}));
}

export type ProjectPin = {
	id: number;
	lat: number;
	lng: number;
	schoolName: string;
	projectName: string;
};

export async function listProjectLocations(
	db: DB,
	lang: string,
): Promise<ProjectPin[]> {
	const rows = await db
		.select()
		.from(projectLocations)
		.where(eq(projectLocations.tenantId, TENANT))
		.orderBy(asc(projectLocations.sort));
	const projectIds = rows
		.map((r) => r.projectId)
		.filter((x): x is number => x != null);
	const names = await resolveTranslations(db, "project", projectIds, lang);
	return rows.map((r) => ({
		id: r.id,
		lat: Number(r.lat),
		lng: Number(r.lng),
		schoolName: r.schoolName ?? "",
		projectName: r.projectId ? (names.get(r.projectId)?.name ?? "") : "",
	}));
}
