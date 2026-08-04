import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
	PartnerForm,
	type PartnerFormValue,
	type TermOpt,
} from "#/components/admin/PartnerForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

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
		const id = await trpcClient.adminPartners.create.mutate(v);
		setSaving(false);
		navigate({ to: "/admin/partners/$id", params: { id: String(id) } });
	}

	if (!ready) return <p className="text-sm text-muted-foreground">Loading…</p>;
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
