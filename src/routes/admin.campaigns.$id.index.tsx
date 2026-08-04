import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
	CampaignForm,
	type CampaignFormValue,
} from "#/components/admin/CampaignForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/campaigns/$id/")({
	component: EditCampaign,
});

type Initial = Awaited<ReturnType<typeof trpcClient.adminCampaigns.get.query>>;

function EditCampaign() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const [initial, setInitial] = useState<Initial>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		trpcClient.adminCampaigns.get.query({ id: Number(id) }).then(setInitial);
	}, [id]);

	async function onSubmit(v: CampaignFormValue) {
		setSaving(true);
		await trpcClient.adminCampaigns.update.mutate({ id: Number(id), ...v });
		setSaving(false);
		navigate({ to: "/admin/campaigns" });
	}

	if (!initial)
		return <div className="p-6 text-muted-foreground">Loading…</div>;
	return (
		<CampaignForm
			initial={initial}
			onSubmit={onSubmit}
			saving={saving}
			title="Edit campaign"
		/>
	);
}
