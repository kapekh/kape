import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { StaffForm, type StaffFormValue } from "#/components/admin/StaffForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/staff/new")({ component: NewStaff });

function NewStaff() {
	const navigate = useNavigate();
	const [saving, setSaving] = useState(false);

	async function onSubmit(v: StaffFormValue) {
		setSaving(true);
		const id = await trpcClient.adminStaff.create.mutate(v);
		setSaving(false);
		navigate({ to: "/admin/staff/$id", params: { id: String(id) } });
	}

	return <StaffForm initial={null} onSubmit={onSubmit} saving={saving} title="New staff member" />;
}
