import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { FormBuilder, type FormBuilderValue } from "#/components/admin/FormBuilder";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/forms/new")({ component: NewForm });

function NewForm() {
	const navigate = useNavigate();
	const [saving, setSaving] = useState(false);
	async function onSubmit(v: FormBuilderValue) {
		setSaving(true);
		const id = await trpcClient.adminForms.create.mutate(v);
		setSaving(false);
		navigate({ to: "/admin/forms/$id", params: { id: String(id) } });
	}
	return <FormBuilder initial={null} onSubmit={onSubmit} saving={saving} title="New form" />;
}
