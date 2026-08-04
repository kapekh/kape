import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
	type LangOpt,
	PostForm,
	type PostFormValue,
	type TypeOpt,
} from "#/components/admin/PostForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/posts/$id")({
	component: EditPost,
});

type PostEdit = NonNullable<
	Awaited<ReturnType<typeof trpcClient.adminPosts.get.query>>
>;

function EditPost() {
	const { id } = Route.useParams();
	const pid = Number(id);
	const [data, setData] = useState<PostEdit | null>(null);
	const [langs, setLangs] = useState<LangOpt[]>([]);
	const [types, setTypes] = useState<TypeOpt[]>([]);
	const [notFound, setNotFound] = useState(false);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<string | null>(null);

	useEffect(() => {
		Promise.all([
			trpcClient.adminPosts.get.query({ id: pid }),
			trpcClient.i18n.languages.query(),
			trpcClient.posts.types.query(),
		]).then(([d, l, t]) => {
			if (!d) setNotFound(true);
			else setData(d);
			setLangs(l);
			setTypes(t);
		});
	}, [pid]);

	async function onSubmit(v: PostFormValue) {
		setSaving(true);
		await trpcClient.adminPosts.update.mutate({ id: pid, ...v });
		setSaving(false);
		setSavedAt(new Date().toLocaleTimeString());
	}

	if (notFound)
		return <p className="text-sm text-muted-foreground">Post not found.</p>;
	if (!data || !langs.length)
		return <p className="text-sm text-muted-foreground">Loading…</p>;

	return (
		<PostForm
			initial={data}
			languages={langs}
			contentTypes={types}
			onSubmit={onSubmit}
			saving={saving}
			title="Edit post"
			savedAt={savedAt}
		/>
	);
}
