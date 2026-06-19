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
				<div className="mb-6 text-sm">
					<span className="font-semibold text-primary">Donor(s): </span>
					{project.donors.join(" · ")}
				</div>
			)}
			{/* biome-ignore lint/security/noDangerouslySetInnerHtml: trusted, server-rendered */}
			<div className="prose-kape" dangerouslySetInnerHTML={{ __html: project.bodyHtml }} />
		</SubPage>
	);
}
