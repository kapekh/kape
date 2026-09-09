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

export const Route = createFileRoute("/admin/campaigns/$id/")({
	component: EditCampaign,
});

type Initial = Awaited<ReturnType<typeof trpcClient.adminCampaigns.get.query>>;

function EditCampaign() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const [initial, setInitial] = useState<Initial>(null);
	const [langs, setLangs] = useState<LangOpt[]>([]);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		Promise.all([
			trpcClient.adminCampaigns.get.query({ id: Number(id) }),
			trpcClient.i18n.languages.query(),
		]).then(([c, languages]) => {
			setInitial(c);
			setLangs(languages);
		});
	}, [id]);

	async function onSubmit(v: CampaignFormValue) {
		setSaving(true);
		try {
			await trpcClient.adminCampaigns.update.mutate({ id: Number(id), ...v });
			toast("Campaign saved.", "success");
			navigate({ to: "/admin/campaigns" });
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setSaving(false);
		}
	}

	if (!initial) return <EditorSkeleton />;
	return (
		<CampaignForm
			initial={initial}
			languages={langs}
			onSubmit={onSubmit}
			saving={saving}
			title="Edit campaign"
		/>
	);
}
