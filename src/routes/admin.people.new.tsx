import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
	PeopleForm,
	type PersonFormValue,
} from "#/components/admin/PeopleForm";
import type { LangOpt } from "#/components/admin/PostForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/people/new")({
	component: NewPerson,
});

function NewPerson() {
	const navigate = useNavigate();
	const [languages, setLanguages] = useState<LangOpt[]>([]);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		trpcClient.i18n.languages.query().then(setLanguages);
	}, []);

	async function onSubmit(v: PersonFormValue) {
		setSaving(true);
		const id = await trpcClient.adminPeople.create.mutate(v);
		setSaving(false);
		navigate({ to: "/admin/people/$id", params: { id: String(id) } });
	}

	if (!languages.length)
		return <p className="text-sm text-muted-foreground">Loading…</p>;
	return (
		<PeopleForm
			initial={null}
			languages={languages}
			onSubmit={onSubmit}
			saving={saving}
			title="New person"
		/>
	);
}
