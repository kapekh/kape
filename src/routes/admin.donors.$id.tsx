import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { DonorForm, type DonorFormValue } from "#/components/admin/DonorForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/donors/$id")({ component: EditDonor });

type DonorRow = NonNullable<Awaited<ReturnType<typeof trpcClient.adminDonors.get.query>>>;

function EditDonor() {
	const { id } = Route.useParams();
	const did = Number(id);
	const [data, setData] = useState<DonorRow | null>(null);
	const [notFound, setNotFound] = useState(false);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<string | null>(null);

	useEffect(() => {
		trpcClient.adminDonors.get.query({ id: did }).then((d) => {
			if (!d) setNotFound(true);
			else setData(d);
		});
	}, [did]);

	async function onSubmit(v: DonorFormValue) {
		setSaving(true);
		await trpcClient.adminDonors.update.mutate({ id: did, ...v });
		setSaving(false);
		setSavedAt(new Date().toLocaleTimeString());
	}

	if (notFound) return <p className="text-sm text-muted-foreground">Donor not found.</p>;
	if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
	return <DonorForm initial={data} onSubmit={onSubmit} saving={saving} title="Edit donor" savedAt={savedAt} />;
}
