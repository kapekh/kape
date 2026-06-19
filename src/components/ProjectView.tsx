import { SubPage } from "@/components/SubPage";

import type { ResolvedProject } from "#/server/repo/projects";

export function ProjectView({ project, section }: { project: ResolvedProject | null; section: string }) {
	if (!project) {
		return (
			<SubPage section={section} title="Project not found">
				<p className="text-muted-foreground">This project doesn't exist or was moved.</p>
			</SubPage>
		);
	}
	return (
		<SubPage
			section={section}
			title={project.name}
			lead={project.summary || undefined}
			badge={project.status === "current" ? "Current project" : "Past project"}
		>
			{project.donors.length > 0 && (
				<div className="mb-8 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm">
					<span className="font-semibold text-primary">Supported by</span>
					{project.donors.map((d) => (
						<span key={d} className="rounded-full bg-card px-3 py-1 text-xs font-medium text-foreground/80 shadow-sm">{d}</span>
					))}
				</div>
			)}
			{/* biome-ignore lint/security/noDangerouslySetInnerHtml: trusted, server-rendered */}
			<div className="prose-kape" dangerouslySetInnerHTML={{ __html: project.bodyHtml }} />
		</SubPage>
	);
}
