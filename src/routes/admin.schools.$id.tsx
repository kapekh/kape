import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
	type ProjectOpt,
	SchoolForm,
	type SchoolFormValue,
	type TermOpt,
} from "#/components/admin/SchoolForm";
import { useModules } from "#/components/admin/useModules";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/schools/$id")({
	component: EditSchool,
});

type SchoolRow = NonNullable<
	Awaited<ReturnType<typeof trpcClient.adminSchools.get.query>>
>;

function EditSchool() {
	const { id } = Route.useParams();
	const sid = Number(id);
	const [data, setData] = useState<SchoolRow | null>(null);
	const [provinces, setProvinces] = useState<TermOpt[]>([]);
	const [projects, setProjects] = useState<ProjectOpt[]>([]);
	const [notFound, setNotFound] = useState(false);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<string | null>(null);
	const modules = useModules();

	useEffect(() => {
		Promise.all([
			trpcClient.adminSchools.get.query({ id: sid }),
			trpcClient.terms.list.query({ taxonomy: "location" }),
			modules.list("projects", () => trpcClient.adminProjects.list.query()),
		]).then(([s, prov, proj]) => {
			if (!s) setNotFound(true);
			else setData(s);
			setProvinces(prov);
			setProjects(proj.map((p) => ({ id: p.id, code: p.code, name: p.name })));
		});
	}, [sid, modules.list]);

	async function onSubmit(v: SchoolFormValue) {
		setSaving(true);
		try {
			await trpcClient.adminSchools.update.mutate({ id: sid, ...v });
			setSavedAt(new Date().toLocaleTimeString());
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setSaving(false);
		}
	}

	if (notFound)
		return <p className="text-sm text-muted-foreground">School not found.</p>;
	if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
	return (
		<SchoolForm
			initial={data}
			provinces={provinces}
			projects={projects}
			onSubmit={onSubmit}
			saving={saving}
			title="Edit school"
			savedAt={savedAt}
		/>
	);
}
