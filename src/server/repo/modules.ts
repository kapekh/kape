// derived once, on the first boot that finds no row, from whether the module's own tables hold anything
import { count } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

import {
	MODULES_SETTING,
	type ModuleId,
	serializeModules,
} from "#/lib/modules";
import type { DB } from "../db";
import {
	campaigns,
	donations,
	donors,
	offices,
	orgNodes,
	partners,
	projectLocations,
	projects,
	schools,
	siteSettings,
} from "../schema";
import { TENANT } from "../seed/helpers";

// Record<ModuleId, …> rather than a lookup, so adding a module is a type error here until its tables are named
export const MODULE_TABLES: Record<ModuleId, SQLiteTable[]> = {
	projects: [projects, projectLocations],
	schools: [schools],
	fundraising: [campaigns, donations, donors],
	partners: [partners],
	offices: [offices],
	orgChart: [orgNodes],
};

const anyRows = async (db: DB, tables: SQLiteTable[]) => {
	for (const t of tables) {
		const [row] = await db.select({ c: count() }).from(t);
		if ((row?.c ?? 0) > 0) return true;
	}
	return false;
};

export async function modulesInUse(db: DB): Promise<ModuleId[]> {
	const ids: ModuleId[] = [];
	for (const [id, tables] of Object.entries(MODULE_TABLES))
		if (await anyRows(db, tables)) ids.push(id as ModuleId);
	return ids;
}

export async function readModulesSetting(db: DB): Promise<string | undefined> {
	const rows = await db.select().from(siteSettings);
	return rows.find((r) => r.tenantId === TENANT && r.key === MODULES_SETTING)
		?.value;
}

export async function writeModulesSetting(db: DB, value: string) {
	await db
		.insert(siteSettings)
		.values({ tenantId: TENANT, key: MODULES_SETTING, value })
		.onConflictDoUpdate({
			target: [siteSettings.tenantId, siteSettings.key],
			set: { value },
		});
}

export type Backfill =
	| { state: "already-set"; value: string }
	| { state: "written"; enabled: ModuleId[] };

/** Idempotent: a database that already answers the question is left alone. */
export async function backfillModules(db: DB): Promise<Backfill> {
	const current = await readModulesSetting(db);
	if (current !== undefined) return { state: "already-set", value: current };
	const enabled = await modulesInUse(db);
	await writeModulesSetting(db, serializeModules(enabled));
	return { state: "written", enabled };
}
