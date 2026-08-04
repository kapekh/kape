import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
	type LangOpt,
	PostForm,
	type PostFormValue,
	type TypeOpt,
} from "#/components/admin/PostForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/posts/new")({
	validateSearch: (s: Record<string, unknown>): { type?: string } => ({
		type: typeof s.type === "string" ? s.type : undefined,
	}),
	component: NewPost,
});

function NewPost() {
	const navigate = useNavigate();
	const { type } = Route.useSearch();
	const [langs, setLangs] = useState<LangOpt[]>([]);
	const [types, setTypes] = useState<TypeOpt[]>([]);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		Promise.all([
			trpcClient.i18n.languages.query(),
			trpcClient.posts.types.query(),
		]).then(([l, t]) => {
			setLangs(l);
			setTypes(t);
		});
	}, []);

	async function onSubmit(v: PostFormValue) {
		setSaving(true);
		const id = await trpcClient.adminPosts.create.mutate(v);
		setSaving(false);
		navigate({ to: "/admin/posts/$id", params: { id: String(id) } });
	}

	if (!langs.length)
		return <p className="text-sm text-muted-foreground">Loading…</p>;

	return (
		<PostForm
			initial={null}
			languages={langs}
			contentTypes={types}
			defaultType={type}
			onSubmit={onSubmit}
			saving={saving}
			title="New post"
		/>
	);
}
