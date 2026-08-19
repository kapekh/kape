import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EditorSkeleton } from "#/components/admin/EditorSkeleton";
import {
	PartnerForm,
	type PartnerFormValue,
	type TermOpt,
} from "#/components/admin/PartnerForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/partners/new")({
	component: NewPartner,
});

function NewPartner() {
	const navigate = useNavigate();
	const [categories, setCategories] = useState<TermOpt[]>([]);
	const [ready, setReady] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		trpcClient.terms.list
			.query({ taxonomy: "partner_category" })
			.then((cats) => {
				setCategories(cats);
				setReady(true);
			});
	}, []);

	async function onSubmit(v: PartnerFormValue) {
		setSaving(true);
		try {
			const id = await trpcClient.adminPartners.create.mutate(v);
			navigate({ to: "/admin/partners/$id", params: { id: String(id) } });
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setSaving(false);
		}
	}

	if (!ready) return <EditorSkeleton />;
	return (
		<PartnerForm
			initial={null}
			categories={categories}
			onSubmit={onSubmit}
			saving={saving}
			title="New partner"
		/>
	);
}
