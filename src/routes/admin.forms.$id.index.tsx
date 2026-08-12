import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EditorSkeleton } from "#/components/admin/EditorSkeleton";
import {
	FormBuilder,
	type FormBuilderValue,
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
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		trpcClient.adminForms.get.query({ id: Number(id) }).then(setInitial);
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
			onSubmit={onSubmit}
			saving={saving}
			title="Edit form"
		/>
	);
}
