import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
	CampaignForm,
	type CampaignFormValue,
	type LangOpt,
} from "#/components/admin/CampaignForm";
import { EditorSkeleton } from "#/components/admin/EditorSkeleton";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/campaigns/new")({
	component: NewCampaign,
});

function NewCampaign() {
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

	if (!ready) return <EditorSkeleton />;
	return (
		<CampaignForm
			initial={null}
			languages={langs}
			onSubmit={onSubmit}
			saving={saving}
			title="New campaign"
		/>
	);
}
