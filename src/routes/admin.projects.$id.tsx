import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import type { LangOpt } from "#/components/admin/PostForm";
import {
	type DonorOpt,
	ProjectForm,
	type ProjectFormValue,
} from "#/components/admin/ProjectForm";
import { useModules } from "#/components/admin/useModules";
import { EditorSkeleton } from "#/components/admin/EditorSkeleton";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

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
	const [ready, setReady] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const modules = useModules();

	useEffect(() => {
		Promise.all([
			trpcClient.adminProjects.get.query({ id: pid }),
			trpcClient.i18n.languages.query(),
			modules.list("fundraising", () => trpcClient.adminDonors.list.query()),
		])
			.then(([d, l, dn]) => {
				if (!d) setNotFound(true);
				else setData(d);
				setLangs(l);
				setDonors(dn.map((x) => ({ id: x.id, name: x.name })));
			})
			.catch((e) => setError(saveErrorMessage(e)))
			// In `finally`, so a query that fails leaves a screen that says so rather
			// than a spinner nobody can get past.
			.finally(() => setReady(true));
	}, [pid, modules.list]);

	async function onSubmit(v: ProjectFormValue) {
		setSaving(true);
		try {
			await trpcClient.adminProjects.update.mutate({ id: pid, ...v });
			setSavedAt(new Date().toLocaleTimeString());
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setSaving(false);
		}
	}

	if (notFound)
		return <p className="text-sm text-muted-foreground">Project not found.</p>;
	if (!ready) return <EditorSkeleton />;
	if (error || !data || !langs.length)
		return (
			<p className="text-sm text-destructive">
				{error ?? "This project could not be loaded."}
			</p>
		);

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
