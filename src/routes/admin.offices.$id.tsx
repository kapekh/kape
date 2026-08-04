import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
	OfficeForm,
	type OfficeFormValue,
	type TermOpt,
} from "#/components/admin/OfficeForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

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
	const [notFound, setNotFound] = useState(false);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<string | null>(null);

	useEffect(() => {
		Promise.all([
			trpcClient.adminOffices.get.query({ id: oid }),
			trpcClient.terms.list.query({ taxonomy: "location" }),
		]).then(([o, prov]) => {
			if (!o) setNotFound(true);
			else setData(o);
			setProvinces(prov);
		});
	}, [oid]);

	async function onSubmit(v: OfficeFormValue) {
		setSaving(true);
		await trpcClient.adminOffices.update.mutate({ id: oid, ...v });
		setSaving(false);
		setSavedAt(new Date().toLocaleTimeString());
	}

	if (notFound)
		return <p className="text-sm text-muted-foreground">Office not found.</p>;
	if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
	return (
		<OfficeForm
			initial={data}
			provinces={provinces}
			onSubmit={onSubmit}
			saving={saving}
			title="Edit office"
			savedAt={savedAt}
		/>
	);
}
