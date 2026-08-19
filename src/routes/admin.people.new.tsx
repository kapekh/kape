import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EditorSkeleton } from "#/components/admin/EditorSkeleton";
import {
	PeopleForm,
	type PersonFormValue,
} from "#/components/admin/PeopleForm";
import type { LangOpt } from "#/components/admin/PostForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

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
		try {
			const id = await trpcClient.adminPeople.create.mutate(v);
			navigate({ to: "/admin/people/$id", params: { id: String(id) } });
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setSaving(false);
		}
	}

	if (!languages.length) return <EditorSkeleton />;
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
