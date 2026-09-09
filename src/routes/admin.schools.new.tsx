import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EditorSkeleton } from "#/components/admin/EditorSkeleton";
import {
	type LangOpt,
	type ProjectOpt,
	SchoolForm,
	type SchoolFormValue,
	type TermOpt,
} from "#/components/admin/SchoolForm";
import { useModules } from "#/components/admin/useModules";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/schools/new")({
	component: NewSchool,
});

function NewSchool() {
	const navigate = useNavigate();
	const [provinces, setProvinces] = useState<TermOpt[]>([]);
	const [projects, setProjects] = useState<ProjectOpt[]>([]);
	const [langs, setLangs] = useState<LangOpt[]>([]);
	const [ready, setReady] = useState(false);
	const [saving, setSaving] = useState(false);
	const modules = useModules();

	useEffect(() => {
		Promise.all([
			trpcClient.terms.list.query({ taxonomy: "location" }),
			modules.list("projects", () => trpcClient.adminProjects.list.query()),
			trpcClient.i18n.languages.query(),
		])
			.then(([prov, proj, languages]) => {
				setProvinces(prov);
				setProjects(
					proj.map((p) => ({ id: p.id, code: p.code, name: p.name })),
				);
				setLangs(languages);
			})
			// In `finally`, so a query that fails for any other reason leaves a usable
			// form rather than a spinner nobody can get past.
			.finally(() => setReady(true));
	}, [modules.list]);

	async function onSubmit(v: SchoolFormValue) {
		setSaving(true);
		try {
			const id = await trpcClient.adminSchools.create.mutate(v);
			navigate({ to: "/admin/schools/$id", params: { id: String(id) } });
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setSaving(false);
		}
	}

	if (!ready) return <EditorSkeleton />;
	return (
		<SchoolForm
			initial={null}
			provinces={provinces}
			projects={projects}
			languages={langs}
			onSubmit={onSubmit}
			saving={saving}
			title="New school"
		/>
	);
}
