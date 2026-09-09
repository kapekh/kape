import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EditorSkeleton } from "#/components/admin/EditorSkeleton";
import {
	type LangOpt,
	OfficeForm,
	type OfficeFormValue,
	type TermOpt,
} from "#/components/admin/OfficeForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/offices/new")({
	component: NewOffice,
});

function NewOffice() {
	const navigate = useNavigate();
	const [provinces, setProvinces] = useState<TermOpt[]>([]);
	const [langs, setLangs] = useState<LangOpt[]>([]);
	const [ready, setReady] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		Promise.all([
			trpcClient.terms.list.query({ taxonomy: "location" }),
			trpcClient.i18n.languages.query(),
		]).then(([prov, languages]) => {
			setProvinces(prov);
			setLangs(languages);
			setReady(true);
		});
	}, []);

	async function onSubmit(v: OfficeFormValue) {
		setSaving(true);
		try {
			const id = await trpcClient.adminOffices.create.mutate(v);
			navigate({ to: "/admin/offices/$id", params: { id: String(id) } });
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setSaving(false);
		}
	}

	if (!ready) return <EditorSkeleton />;
	return (
		<OfficeForm
			initial={null}
			provinces={provinces}
			languages={langs}
			onSubmit={onSubmit}
			saving={saving}
			title="New office"
		/>
	);
}
