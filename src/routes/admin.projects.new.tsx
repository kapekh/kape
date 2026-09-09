import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EditorSkeleton } from "#/components/admin/EditorSkeleton";
import type { LangOpt } from "#/components/admin/PostForm";
import {
	type DonorOpt,
	type ParentOpt,
	ProjectForm,
	type ProjectFormValue,
	parentOptions,
} from "#/components/admin/ProjectForm";
import { useModules } from "#/components/admin/useModules";
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
	const [parents, setParents] = useState<ParentOpt[]>([]);
	const [saving, setSaving] = useState(false);
	const [ready, setReady] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const modules = useModules();

	useEffect(() => {
		Promise.all([
			trpcClient.i18n.languages.query(),
			modules.list("fundraising", () => trpcClient.adminDonors.list.query()),
			trpcClient.adminProjects.list.query(),
		])
			.then(([l, d, ps]) => {
				setLangs(l);
				setDonors(d.map((x) => ({ id: x.id, name: x.name })));
				setParents(parentOptions(ps, null));
			})
			.catch((e) => setError(saveErrorMessage(e)))
			// In `finally`, so a query that fails leaves a screen that says so rather
			// than a spinner nobody can get past.
			.finally(() => setReady(true));
	}, [modules.list]);

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

	if (!ready) return <EditorSkeleton />;
	// No languages means no title can be authored, so offer the reason rather than a
	// form whose save is guaranteed to fail.
	if (error || !langs.length)
		return (
			<p className="text-sm text-destructive">
				{error ??
					"No languages are set up, so a project cannot be created yet."}
			</p>
		);
	return (
		<ProjectForm
			initial={null}
			languages={langs}
			donors={donors}
			parents={parents}
			onSubmit={onSubmit}
			saving={saving}
			title="New project"
		/>
	);
}
