import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { FormBuilder, type FormBuilderValue } from "#/components/admin/FormBuilder";
import { toast } from "@/components/Dialogs";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/forms/$id/")({ component: EditForm });

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
		await trpcClient.adminForms.update.mutate({ id: Number(id), ...v });
		setSaving(false);
		toast("Form saved.", "success");
		navigate({ to: "/admin/forms" });
	}

	if (!initial) return <div className="p-6 text-muted-foreground">Loading…</div>;
	return <FormBuilder initial={initial} onSubmit={onSubmit} saving={saving} title="Edit form" />;
}
