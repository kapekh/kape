import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import type { LangOpt } from "#/components/admin/PostForm";
import {
	type DonorOpt,
	ProjectForm,
	type ProjectFormValue,
} from "#/components/admin/ProjectForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/projects/$id")({
	component: EditProject,
});

type ProjectEdit = NonNullable<
	Awaited<ReturnType<typeof trpcClient.adminProjects.get.query>>
>;

function EditProject() {
	const { id } = Route.useParams();
	const pid = Number(id);
	const [data, setData] = useState<ProjectEdit | null>(null);
	const [langs, setLangs] = useState<LangOpt[]>([]);
	const [donors, setDonors] = useState<DonorOpt[]>([]);
	const [notFound, setNotFound] = useState(false);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<string | null>(null);

	useEffect(() => {
		Promise.all([
			trpcClient.adminProjects.get.query({ id: pid }),
			trpcClient.i18n.languages.query(),
			trpcClient.adminDonors.list.query(),
		]).then(([d, l, dn]) => {
			if (!d) setNotFound(true);
			else setData(d);
			setLangs(l);
			setDonors(dn.map((x) => ({ id: x.id, name: x.name })));
		});
	}, [pid]);

	async function onSubmit(v: ProjectFormValue) {
		setSaving(true);
		await trpcClient.adminProjects.update.mutate({ id: pid, ...v });
		setSaving(false);
		setSavedAt(new Date().toLocaleTimeString());
	}

	if (notFound)
		return <p className="text-sm text-muted-foreground">Project not found.</p>;
	if (!data || !langs.length)
		return <p className="text-sm text-muted-foreground">Loading…</p>;

	return (
		<ProjectForm
			initial={data}
			languages={langs}
			donors={donors}
			onSubmit={onSubmit}
			saving={saving}
			title="Edit project"
			savedAt={savedAt}
		/>
	);
}
