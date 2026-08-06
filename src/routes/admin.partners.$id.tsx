import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
	PartnerForm,
	type PartnerFormValue,
	type TermOpt,
} from "#/components/admin/PartnerForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/partners/$id")({
	component: EditPartner,
});

type PartnerRow = NonNullable<
	Awaited<ReturnType<typeof trpcClient.adminPartners.get.query>>
>;

function EditPartner() {
	const { id } = Route.useParams();
	const pid = Number(id);
	const [data, setData] = useState<PartnerRow | null>(null);
	const [categories, setCategories] = useState<TermOpt[]>([]);
	const [notFound, setNotFound] = useState(false);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<string | null>(null);

	useEffect(() => {
		Promise.all([
			trpcClient.adminPartners.get.query({ id: pid }),
			trpcClient.terms.list.query({ taxonomy: "partner_category" }),
		]).then(([p, cats]) => {
			if (!p) setNotFound(true);
			else setData(p);
			setCategories(cats);
		});
	}, [pid]);

	async function onSubmit(v: PartnerFormValue) {
		setSaving(true);
		try {
			await trpcClient.adminPartners.update.mutate({ id: pid, ...v });
			setSavedAt(new Date().toLocaleTimeString());
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setSaving(false);
		}
	}

	if (notFound)
		return <p className="text-sm text-muted-foreground">Partner not found.</p>;
	if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
	return (
		<PartnerForm
			initial={data}
			categories={categories}
			onSubmit={onSubmit}
			saving={saving}
			title="Edit partner"
			savedAt={savedAt}
		/>
	);
}
