import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { EditorSkeleton } from "#/components/admin/EditorSkeleton";
import {
	FormBuilder,
	type FormBuilderValue,
	type LangOpt,
} from "#/components/admin/FormBuilder";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/forms/new")({
	component: NewForm,
});

function NewForm() {
	const navigate = useNavigate();
	const [langs, setLangs] = useState<LangOpt[]>([]);
	const [ready, setReady] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		trpcClient.i18n.languages.query().then((languages) => {
			setLangs(languages);
			setReady(true);
		});
	}, []);

	async function onSubmit(v: FormBuilderValue) {
		setSaving(true);
		try {
			const id = await trpcClient.adminForms.create.mutate(v);
			toast("Form created.", "success");
			navigate({ to: "/admin/forms/$id", params: { id: String(id) } });
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setSaving(false);
		}
	}

	if (!ready) return <EditorSkeleton />;
	return (
		<FormBuilder
			initial={null}
			languages={langs}
			onSubmit={onSubmit}
			saving={saving}
			title="New form"
		/>
	);
}
