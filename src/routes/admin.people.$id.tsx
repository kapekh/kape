import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/admin/people/$id")({
	component: EditPerson,
});

type PersonRow = NonNullable<
	Awaited<ReturnType<typeof trpcClient.adminPeople.get.query>>
>;

function EditPerson() {
	const { id } = Route.useParams();
	const pid = Number(id);
	const [data, setData] = useState<PersonRow | null>(null);
	const [languages, setLanguages] = useState<LangOpt[]>([]);
	const [notFound, setNotFound] = useState(false);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<string | null>(null);

	useEffect(() => {
		Promise.all([
			trpcClient.adminPeople.get.query({ id: pid }),
			trpcClient.i18n.languages.query(),
		]).then(([p, langs]) => {
			if (!p) setNotFound(true);
			else setData(p);
			setLanguages(langs);
		});
	}, [pid]);

	async function onSubmit(v: PersonFormValue) {
		setSaving(true);
		try {
			await trpcClient.adminPeople.update.mutate({ id: pid, ...v });
			setSavedAt(new Date().toLocaleTimeString());
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setSaving(false);
		}
	}

	if (notFound)
		return <p className="text-sm text-muted-foreground">Person not found.</p>;
	if (!data || !languages.length) return <EditorSkeleton />;
	return (
		<PeopleForm
			initial={data}
			languages={languages}
			onSubmit={onSubmit}
			saving={saving}
			title="Edit person"
			savedAt={savedAt}
		/>
	);
}
