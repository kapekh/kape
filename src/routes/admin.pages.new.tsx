import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
	PageForm,
	type PageFormValue,
	StudioSkeleton,
} from "#/components/admin/PageForm";
import type { LangOpt } from "#/components/admin/PostForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/pages/new")({
	component: NewPage,
});

function NewPage() {
	const navigate = useNavigate();
	const [langs, setLangs] = useState<LangOpt[]>([]);
	const [saving, setSaving] = useState(false);
	// A refusal used to arrive as a toast in the far corner and leave after 4.5s,
	// with the author still looking at the field that caused it.
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		trpcClient.i18n.languages.query().then(setLangs);
	}, []);

	async function onSubmit(v: PageFormValue) {
		setSaving(true);
		setError(null);
		try {
			const id = await trpcClient.adminPages.create.mutate(v);
			toast("Page created.", "success");
			navigate({ to: "/admin/pages/$id", params: { id: String(id) } });
		} catch (e) {
			setError(saveErrorMessage(e));
		} finally {
			setSaving(false);
		}
	}

	if (!langs.length) return <StudioSkeleton label="Loading the editor…" />;

	return (
		<PageForm
			initial={null}
			languages={langs}
			onSubmit={onSubmit}
			saving={saving}
			title="New page"
			error={error}
		/>
	);
}
