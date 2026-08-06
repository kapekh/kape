import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PageForm, type PageFormValue } from "#/components/admin/PageForm";
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

	useEffect(() => {
		trpcClient.i18n.languages.query().then(setLangs);
	}, []);

	async function onSubmit(v: PageFormValue) {
		setSaving(true);
		try {
			const id = await trpcClient.adminPages.create.mutate(v);
			navigate({ to: "/admin/pages/$id", params: { id: String(id) } });
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setSaving(false);
		}
	}

	if (!langs.length)
		return <p className="text-sm text-muted-foreground">Loading…</p>;

	return (
		<PageForm
			initial={null}
			languages={langs}
			onSubmit={onSubmit}
			saving={saving}
			title="New page"
		/>
	);
}
