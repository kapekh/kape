import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { DonorForm, type DonorFormValue } from "#/components/admin/DonorForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/donors/new")({
	component: NewDonor,
});

function NewDonor() {
	const navigate = useNavigate();
	const [saving, setSaving] = useState(false);

	async function onSubmit(v: DonorFormValue) {
		setSaving(true);
		const id = await trpcClient.adminDonors.create.mutate(v);
		setSaving(false);
		navigate({ to: "/admin/donors/$id", params: { id: String(id) } });
	}

	return (
		<DonorForm
			initial={null}
			onSubmit={onSubmit}
			saving={saving}
			title="New donor"
		/>
	);
}
