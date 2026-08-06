import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import type { LangOpt } from "#/components/admin/PostForm";
import {
	type DonorOpt,
	ProjectForm,
	type ProjectFormValue,
} from "#/components/admin/ProjectForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/projects/new")({
	component: NewProject,
});

function NewProject() {
	const navigate = useNavigate();
	const [langs, setLangs] = useState<LangOpt[]>([]);
	const [donors, setDonors] = useState<DonorOpt[]>([]);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		Promise.all([
			trpcClient.i18n.languages.query(),
			trpcClient.adminDonors.list.query(),
		]).then(([l, d]) => {
			setLangs(l);
			setDonors(d.map((x) => ({ id: x.id, name: x.name })));
		});
	}, []);

	async function onSubmit(v: ProjectFormValue) {
		setSaving(true);
		try {
			const id = await trpcClient.adminProjects.create.mutate(v);
			navigate({ to: "/admin/projects/$id", params: { id: String(id) } });
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setSaving(false);
		}
	}

	if (!langs.length)
		return <p className="text-sm text-muted-foreground">Loading…</p>;
	return (
		<ProjectForm
			initial={null}
			languages={langs}
			donors={donors}
			onSubmit={onSubmit}
			saving={saving}
			title="New project"
		/>
	);
}
