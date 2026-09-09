import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/admin/offices/$id")({
	component: EditOffice,
});

type OfficeRow = NonNullable<
	Awaited<ReturnType<typeof trpcClient.adminOffices.get.query>>
>;

function EditOffice() {
	const { id } = Route.useParams();
	const oid = Number(id);
	const [data, setData] = useState<OfficeRow | null>(null);
	const [provinces, setProvinces] = useState<TermOpt[]>([]);
	const [langs, setLangs] = useState<LangOpt[]>([]);
	const [notFound, setNotFound] = useState(false);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<string | null>(null);

	useEffect(() => {
		Promise.all([
			trpcClient.adminOffices.get.query({ id: oid }),
			trpcClient.terms.list.query({ taxonomy: "location" }),
			trpcClient.i18n.languages.query(),
		]).then(([o, prov, languages]) => {
			if (!o) setNotFound(true);
			else setData(o);
			setProvinces(prov);
			setLangs(languages);
		});
	}, [oid]);

	async function onSubmit(v: OfficeFormValue) {
		setSaving(true);
		try {
			await trpcClient.adminOffices.update.mutate({ id: oid, ...v });
			setSavedAt(new Date().toLocaleTimeString());
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setSaving(false);
		}
	}

	if (notFound)
		return <p className="text-sm text-muted-foreground">Office not found.</p>;
	if (!data) return <EditorSkeleton />;
	return (
		<OfficeForm
			initial={data}
			provinces={provinces}
			languages={langs}
			onSubmit={onSubmit}
			saving={saving}
			title="Edit office"
			savedAt={savedAt}
		/>
	);
}
