import { db } from "../db";
import {
	donors,
	projectDonors,
	projectLocations,
	projects,
	schools,
} from "../schema";
import { addTranslations, doc, TENANT } from "./helpers";

export async function seedDonors() {
	const donorIds: Record<string, number> = {};
	for (const [i, name] of [
		"Ministry of Education, Youth and Sport (MoEYS)",
		"European Union",
		"USAID",
		"Franks Family Foundation",
		"BMZ",
	].entries()) {
		const [row] = await db
			.insert(donors)
			.values({ tenantId: TENANT, name, sort: i })
			.returning({ id: donors.id });
		donorIds[name] = row.id;
	}
	return donorIds;
}

/** Projects (the "programs"). Returns the project ids keyed by code. */
export async function seedProjects(donorIds: Record<string, number>) {
	const projectSeed: {
		code: string;
		slug: string;
		status: string;
		donors: string[];
		name: { en: string; km: string };
	}[] = [
		// Current
		{
			code: "NGS",
			slug: "ngs",
			status: "current",
			donors: [
				"Ministry of Education, Youth and Sport (MoEYS)",
				"Franks Family Foundation",
			],
			name: { en: "New Generation Schools", km: "សាលាជំនាន់ថ្មី" },
		},
		{
			code: "NGPRC",
			slug: "ngprc",
			status: "current",
			donors: ["Ministry of Education, Youth and Sport (MoEYS)"],
			name: {
				en: "New Generation Pedagogical Research Center",
				km: "មជ្ឈមណ្ឌលស្រាវជ្រាវគរុកោសល្យជំនាន់ថ្មី",
			},
		},
		{
			code: "HCC",
			slug: "hcc",
			status: "current",
			donors: ["BMZ"],
			name: { en: "Happy Cambodian Children", km: "កុមារកម្ពុជាសប្បាយ" },
		},
		{
			code: "CLASS",
			slug: "class",
			status: "current",
			donors: ["BMZ"],
			name: { en: "CLASS", km: "CLASS" },
		},
		{
			code: "IEP",
			slug: "iep",
			status: "current",
			donors: [],
			name: { en: "Inclusive Education Project", km: "គម្រោងអប់រំបរិយាប័ន្ន" },
		},
		{
			code: "DEP",
			slug: "dep",
			status: "current",
			donors: [],
			name: { en: "Digital Education Project", km: "គម្រោងអប់រំឌីជីថល" },
		},
		{
			code: "MLDP",
			slug: "mldp",
			status: "current",
			donors: [],
			name: { en: "MLDP", km: "MLDP" },
		},
		{
			code: "EQUAL-i3L",
			slug: "equal-i3l",
			status: "current",
			donors: ["European Union"],
			name: { en: "EQUAL-i3L", km: "EQUAL-i3L" },
		},
		{
			code: "LLSE",
			slug: "llse",
			status: "current",
			donors: [],
			name: { en: "Life-Long Skills Education", km: "ការអប់រំជំនាញពេញមួយជីវិត" },
		},
		// Past
		{
			code: "IBEC",
			slug: "ibec",
			status: "past",
			donors: ["USAID"],
			name: {
				en: "Improved Basic Education in Cambodia",
				km: "ការកែលម្អការអប់រំមូលដ្ឋាននៅកម្ពុជា",
			},
		},
		{
			code: "E2L",
			slug: "e2l",
			status: "past",
			donors: ["USAID"],
			name: {
				en: "Enabling Education for Learning",
				km: "ការអនុញ្ញាតការអប់រំសម្រាប់ការសិក្សា",
			},
		},
		{
			code: "LSLAG",
			slug: "lslag",
			status: "past",
			donors: [],
			name: { en: "LSLAG", km: "LSLAG" },
		},
		{
			code: "SEEK",
			slug: "seek",
			status: "past",
			donors: [],
			name: { en: "SEEK", km: "SEEK" },
		},
		{
			code: "KYLA",
			slug: "kyla",
			status: "past",
			donors: [],
			name: { en: "KYLA", km: "KYLA" },
		},
		{
			code: "SfE",
			slug: "sfe",
			status: "past",
			donors: [],
			name: { en: "Schools for Empowerment", km: "សាលាសម្រាប់ការផ្តល់អំណាច" },
		},
		{
			code: "BfC",
			slug: "bfc",
			status: "past",
			donors: [],
			name: { en: "Books for Cambodia", km: "សៀវភៅសម្រាប់កម្ពុជា" },
		},
		{
			code: "ESCUP",
			slug: "escup",
			status: "past",
			donors: ["USAID"],
			name: { en: "ESCUP", km: "ESCUP" },
		},
		{
			code: "BSI",
			slug: "bsi",
			status: "past",
			donors: [],
			name: { en: "Beacon Schools Initiative", km: "គំនិតផ្តួចផ្តើមសាលាគំរូ" },
		},
	];
	const projectIds: Record<string, number> = {};
	for (const p of projectSeed) {
		const [row] = await db
			.insert(projects)
			.values({
				tenantId: TENANT,
				code: p.code,
				slug: p.slug,
				status: p.status,
				sort: 0,
			})
			.returning({ id: projects.id });
		projectIds[p.code] = row.id;
		await addTranslations("project", row.id, {
			name: p.name,
			summary: {
				en: `${p.name.en} — a KAPE ${p.status} project.`,
				km: `${p.name.km} — គម្រោង${p.status === "current" ? "បច្ចុប្បន្ន" : "ពីមុន"}របស់ខេប។`,
			},
			body: {
				en: doc(`${p.name.en} overview and outcomes.`),
				km: doc(`ទិដ្ឋភាពទូទៅ និងលទ្ធផលនៃ${p.name.km}។`),
			},
		});
		for (const d of p.donors) {
			if (donorIds[d])
				await db
					.insert(projectDonors)
					.values({ projectId: row.id, donorId: donorIds[d] });
		}
	}
	return projectIds;
}

/** Project map locations. */
export async function seedProjectLocations(projectIds: Record<string, number>) {
	await db.insert(projectLocations).values([
		{
			tenantId: TENANT,
			projectId: projectIds.NGS,
			schoolName: "Hun Sen Rolea B'ier High School",
			lat: "12.245",
			lng: "104.668",
			sort: 0,
		},
		{
			tenantId: TENANT,
			projectId: projectIds.HCC,
			schoolName: "Rompok Primary School, Kratie",
			lat: "12.488",
			lng: "106.019",
			sort: 1,
		},
	]);
}

/** Schools KAPE supports (cover images reuse seeded media #1–#5). */
export async function seedSchools(projectIds: Record<string, number>) {
	await db.insert(schools).values([
		{
			tenantId: TENANT,
			name: "Hun Sen Rolea B'ier High School",
			code: "NGS-001",
			level: "high",
			province: "Kampong Cham",
			projectId: projectIds.NGS,
			coverMediaId: 1,
			address: "Rolea B'ier, Kampong Chhnang",
			lat: "12.245",
			lng: "104.668",
			sort: 0,
		},
		{
			tenantId: TENANT,
			name: "Preah Sisowath High School",
			code: "NGS-002",
			level: "high",
			province: "Phnom Penh",
			projectId: projectIds.NGS,
			coverMediaId: 2,
			address: "Phnom Penh",
			lat: "11.563",
			lng: "104.928",
			sort: 1,
		},
		{
			tenantId: TENANT,
			name: "Rompok Primary School",
			code: "HCC-014",
			level: "primary",
			province: "Kratie",
			projectId: projectIds.HCC,
			coverMediaId: 3,
			address: "Rompok, Kratie",
			lat: "12.488",
			lng: "106.019",
			sort: 2,
		},
		{
			tenantId: TENANT,
			name: "Hun Sen Kampong Cham Preschool",
			code: "HCC-021",
			level: "preschool",
			province: "Kampong Cham",
			projectId: projectIds.HCC,
			coverMediaId: 4,
			address: "Kampong Cham Town",
			lat: "11.992",
			lng: "105.463",
			sort: 3,
		},
		{
			tenantId: TENANT,
			name: "Battambang Regional Teacher Training Center",
			code: "EYE-003",
			level: "higher",
			province: "Battambang",
			projectId: projectIds.EYE ?? null,
			coverMediaId: 5,
			address: "Battambang",
			lat: "13.095",
			lng: "103.203",
			sort: 4,
		},
	]);
}
