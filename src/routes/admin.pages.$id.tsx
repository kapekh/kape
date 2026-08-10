import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { PageForm, type PageFormValue } from "#/components/admin/PageForm";
import type { LangOpt } from "#/components/admin/PostForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";

export const Route = createFileRoute("/admin/pages/$id")({
	component: EditPage,
});

type PageEdit = NonNullable<
	Awaited<ReturnType<typeof trpcClient.adminPages.get.query>>
>;

/** tRPC sends the code as the whole message when the throw site gives no text. */
const STALE = "CONFLICT";

function EditPage() {
	const { id } = Route.useParams();
	const pid = Number(id);
	const [data, setData] = useState<PageEdit | null>(null);
	const [langs, setLangs] = useState<LangOpt[]>([]);
	const [notFound, setNotFound] = useState(false);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [stale, setStale] = useState(false);
	// The version this editor loaded. The server refuses a save when the stored
	// value has moved on, which is how a second tab used to overwrite the first.
	const [version, setVersion] = useState<string | null>(null);
	// Remounts the form so a reload replaces every field, drafts included.
	const [formKey, setFormKey] = useState(0);

	const load = useCallback(async () => {
		const d = await trpcClient.adminPages.get.query({ id: pid });
		if (!d) {
			setNotFound(true);
			return null;
		}
		setData(d);
		setVersion(d.updatedAt);
		return d;
	}, [pid]);

	useEffect(() => {
		Promise.all([load(), trpcClient.i18n.languages.query()]).then(([, l]) =>
			setLangs(l),
		);
	}, [load]);

	async function onSubmit(v: PageFormValue) {
		setSaving(true);
		setError(null);
		setStale(false);
		try {
			const updatedAt = await trpcClient.adminPages.update.mutate({
				id: pid,
				...v,
				expectedUpdatedAt: version,
			});
			setVersion(updatedAt);
			setSavedAt(new Date().toLocaleTimeString());
		} catch (e) {
			setError(saveErrorMessage(e));
			setStale(e instanceof Error && e.message === STALE);
		} finally {
			setSaving(false);
		}
	}

	async function reload() {
		setError(null);
		setStale(false);
		setSavedAt(null);
		if (await load()) setFormKey((k) => k + 1);
	}

	if (notFound)
		return <p className="text-sm text-muted-foreground">Page not found.</p>;
	if (!data || !langs.length)
		return <p className="text-sm text-muted-foreground">Loading…</p>;

	return (
		<PageForm
			key={formKey}
			initial={data}
			languages={langs}
			onSubmit={onSubmit}
			saving={saving}
			title="Edit page"
			savedAt={savedAt}
			error={error}
			onReload={stale ? reload : undefined}
		/>
	);
}
