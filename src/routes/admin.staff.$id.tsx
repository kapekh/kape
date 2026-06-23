import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { StaffForm, type StaffFormValue } from "#/components/admin/StaffForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/staff/$id")({ component: EditStaff });

type StaffRow = NonNullable<Awaited<ReturnType<typeof trpcClient.adminStaff.get.query>>>;

function EditStaff() {
	const { id } = Route.useParams();
	const sid = Number(id);
	const [data, setData] = useState<StaffRow | null>(null);
	const [notFound, setNotFound] = useState(false);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<string | null>(null);

	useEffect(() => {
		trpcClient.adminStaff.get.query({ id: sid }).then((s) => {
			if (!s) setNotFound(true);
			else setData(s);
		});
	}, [sid]);

	async function onSubmit(v: StaffFormValue) {
		setSaving(true);
		await trpcClient.adminStaff.update.mutate({ id: sid, ...v });
		setSaving(false);
		setSavedAt(new Date().toLocaleTimeString());
	}

	if (notFound) return <p className="text-sm text-muted-foreground">Staff member not found.</p>;
	if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
	return <StaffForm initial={data} onSubmit={onSubmit} saving={saving} title="Edit staff member" savedAt={savedAt} />;
}
