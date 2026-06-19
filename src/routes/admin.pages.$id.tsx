import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PageForm, type PageFormValue } from "#/components/admin/PageForm";
import type { LangOpt } from "#/components/admin/PostForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/pages/$id")({
	component: EditPage,
});

type PageEdit = NonNullable<Awaited<ReturnType<typeof trpcClient.adminPages.get.query>>>;

function EditPage() {
	const { id } = Route.useParams();
	const pid = Number(id);
	const [data, setData] = useState<PageEdit | null>(null);
	const [langs, setLangs] = useState<LangOpt[]>([]);
	const [notFound, setNotFound] = useState(false);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<string | null>(null);

	useEffect(() => {
		Promise.all([
			trpcClient.adminPages.get.query({ id: pid }),
			trpcClient.i18n.languages.query(),
		]).then(([d, l]) => {
			if (!d) setNotFound(true);
			else setData(d);
			setLangs(l);
		});
	}, [pid]);

	async function onSubmit(v: PageFormValue) {
		setSaving(true);
		await trpcClient.adminPages.update.mutate({ id: pid, ...v });
		setSaving(false);
		setSavedAt(new Date().toLocaleTimeString());
	}

	if (notFound) return <p className="text-sm text-muted-foreground">Page not found.</p>;
	if (!data || !langs.length) return <p className="text-sm text-muted-foreground">Loading…</p>;

	return <PageForm initial={data} languages={langs} onSubmit={onSubmit} saving={saving} title="Edit page" savedAt={savedAt} />;
}
