import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
	OfficeForm,
	type OfficeFormValue,
	type TermOpt,
} from "#/components/admin/OfficeForm";
import { EditorSkeleton } from "#/components/admin/EditorSkeleton";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/offices/new")({
	component: NewOffice,
});

function NewOffice() {
	const navigate = useNavigate();
	const [provinces, setProvinces] = useState<TermOpt[]>([]);
	const [ready, setReady] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		trpcClient.terms.list.query({ taxonomy: "location" }).then((prov) => {
			setProvinces(prov);
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
			onSubmit={onSubmit}
			saving={saving}
			title="New office"
		/>
	);
}
