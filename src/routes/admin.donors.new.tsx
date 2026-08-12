import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { DonorForm, type DonorFormValue } from "#/components/admin/DonorForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/donors/new")({
	component: NewDonor,
});

function NewDonor() {
	const navigate = useNavigate();
	const [saving, setSaving] = useState(false);

	async function onSubmit(v: DonorFormValue) {
		setSaving(true);
		try {
			const id = await trpcClient.adminDonors.create.mutate(v);
			toast("Donor created.", "success");
			navigate({ to: "/admin/donors/$id", params: { id: String(id) } });
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setSaving(false);
		}
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
