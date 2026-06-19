import { createFileRoute } from "@tanstack/react-router";

import { ProjectView } from "@/components/ProjectView";

export const Route = createFileRoute("/past-projects/$slug")({
	loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
	loader: ({ context, deps, params }) =>
		context.queryClient.ensureQueryData(
			context.trpc.projects.bySlug.queryOptions({ slug: params.slug, lang: deps.lang }),
		),
	head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.name} — KAPE` : "Project — KAPE" }] }),
	component: () => <ProjectView project={Route.useLoaderData()} section="Past Projects" />,
});
