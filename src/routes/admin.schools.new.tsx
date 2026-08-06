import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
	type ProjectOpt,
	SchoolForm,
	type SchoolFormValue,
	type TermOpt,
} from "#/components/admin/SchoolForm";
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
	const [ready, setReady] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		Promise.all([
			trpcClient.terms.list.query({ taxonomy: "location" }),
			trpcClient.adminProjects.list.query(),
		]).then(([prov, proj]) => {
			setProvinces(prov);
			setProjects(proj.map((p) => ({ id: p.id, code: p.code, name: p.name })));
			setReady(true);
		});
	}, []);

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

	if (!ready) return <p className="text-sm text-muted-foreground">Loading…</p>;
	return (
		<SchoolForm
			initial={null}
			provinces={provinces}
			projects={projects}
			onSubmit={onSubmit}
			saving={saving}
			title="New school"
		/>
	);
}
