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

export const Route = createFileRoute("/admin/forms/$id/")({
	component: EditForm,
});

type Initial = Awaited<ReturnType<typeof trpcClient.adminForms.get.query>>;

function EditForm() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const [initial, setInitial] = useState<Initial | null>(null);
	const [langs, setLangs] = useState<LangOpt[]>([]);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		Promise.all([
			trpcClient.adminForms.get.query({ id: Number(id) }),
			trpcClient.i18n.languages.query(),
		]).then(([f, languages]) => {
			setInitial(f);
			setLangs(languages);
		});
	}, [id]);

	async function onSubmit(v: FormBuilderValue) {
		setSaving(true);
		try {
			await trpcClient.adminForms.update.mutate({ id: Number(id), ...v });
			toast("Form saved.", "success");
			navigate({ to: "/admin/forms" });
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setSaving(false);
		}
	}

	if (!initial) return <EditorSkeleton />;
	return (
		<FormBuilder
			initial={initial}
			languages={langs}
			onSubmit={onSubmit}
			saving={saving}
			title="Edit form"
		/>
	);
}
