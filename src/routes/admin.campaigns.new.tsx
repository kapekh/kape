import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
	CampaignForm,
	type CampaignFormValue,
} from "#/components/admin/CampaignForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/campaigns/new")({
	component: NewCampaign,
});

function NewCampaign() {
	const navigate = useNavigate();
	const [saving, setSaving] = useState(false);

	async function onSubmit(v: CampaignFormValue) {
		setSaving(true);
		try {
			const id = await trpcClient.adminCampaigns.create.mutate(v);
			navigate({ to: "/admin/campaigns/$id", params: { id: String(id) } });
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setSaving(false);
		}
	}

	return (
		<CampaignForm
			initial={null}
			onSubmit={onSubmit}
			saving={saving}
			title="New campaign"
		/>
	);
}
