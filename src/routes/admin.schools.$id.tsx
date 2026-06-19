import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { SchoolForm, type ProjectOpt, type SchoolFormValue, type TermOpt } from "#/components/admin/SchoolForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/schools/$id")({ component: EditSchool });

type SchoolRow = NonNullable<Awaited<ReturnType<typeof trpcClient.adminSchools.get.query>>>;

function EditSchool() {
	const { id } = Route.useParams();
	const sid = Number(id);
	const [data, setData] = useState<SchoolRow | null>(null);
	const [provinces, setProvinces] = useState<TermOpt[]>([]);
	const [projects, setProjects] = useState<ProjectOpt[]>([]);
	const [notFound, setNotFound] = useState(false);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<string | null>(null);

	useEffect(() => {
		Promise.all([
			trpcClient.adminSchools.get.query({ id: sid }),
			trpcClient.terms.list.query({ taxonomy: "location" }),
			trpcClient.adminProjects.list.query(),
		]).then(([s, prov, proj]) => {
			if (!s) setNotFound(true);
			else setData(s);
			setProvinces(prov);
			setProjects(proj.map((p) => ({ id: p.id, code: p.code, name: p.name })));
		});
	}, [sid]);

	async function onSubmit(v: SchoolFormValue) {
		setSaving(true);
		await trpcClient.adminSchools.update.mutate({ id: sid, ...v });
		setSaving(false);
		setSavedAt(new Date().toLocaleTimeString());
	}

	if (notFound) return <p className="text-sm text-muted-foreground">School not found.</p>;
	if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
	return <SchoolForm initial={data} provinces={provinces} projects={projects} onSubmit={onSubmit} saving={saving} title="Edit school" savedAt={savedAt} />;
}
