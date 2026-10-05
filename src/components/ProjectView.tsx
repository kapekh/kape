import type { ResolvedProject } from "#/server/repo/projects";
import { InlineRichText } from "@/components/InlineRichText";
import { Picture } from "@/components/Picture";
import { projectRecord, Section, SubPage } from "@/components/SubPage";
import { useT } from "@/lib/i18n";
import { OPEN_ENDED } from "@/lib/project-dates";

function formatDate(iso: string) {
	const d = new Date(`${iso}T00:00:00Z`);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
}

function DateBox({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border border-border bg-background/60 p-3">
			<div className="text-[10px] uppercase tracking-wider text-muted-foreground">
				{label}
			</div>
			<div className="font-medium text-foreground">{value}</div>
		</div>
	);
}

export function ProjectView({
	project,
	section,
	sectionHref,
}: {
	project: ResolvedProject | null;
	section: string;
	sectionHref?: string;
}) {
	const t = useT();
	if (!project) {
		return (
			<SubPage
				section={section}
				sectionHref={sectionHref}
				title={t("project.notfound.title", "Project not found")}
			>
				<p className="text-muted-foreground">
					{t(
						"project.notfound.body",
						"This project doesn't exist or was moved.",
					)}
				</p>
			</SubPage>
		);
	}
	const hasDates = Boolean(project.startDate || project.endDate);
	return (
		<SubPage
			section={section}
			sectionHref={sectionHref}
			title={project.name}
			lead={project.summary || undefined}
			record={projectRecord(project)}
			titleField="name"
			leadField="summary"
			badge={
				project.status === "current"
					? t("project.current", "Current project")
					: t("project.past", "Past project")
			}
		>
			{(project.donors.length > 0 || hasDates) && (
				<div className="mb-8 space-y-4 rounded-2xl border border-border bg-muted/40 px-4 py-3">
					{project.donors.length > 0 && (
						<div className="flex flex-wrap items-center gap-3 text-sm">
							<span className="font-semibold text-primary">
								{t("project.donors", "Supported by")}
							</span>
							{project.donors.map((d) =>
								d.logoUrl ? (
									<span
										key={d.name}
										title={d.name}
										className="grid h-10 w-24 place-items-center rounded-lg border border-border bg-white p-1.5 shadow-sm"
									>
										<Picture
											src={d.logoUrl}
											width={d.logoWidth}
											alt={d.name}
											sizes="96px"
											className="max-h-full max-w-full object-contain"
										/>
									</span>
								) : (
									<span
										key={d.name}
										className="rounded-full bg-card px-3 py-1 text-xs font-medium text-foreground/80 shadow-sm"
									>
										{d.name}
									</span>
								),
							)}
						</div>
					)}
					{hasDates && (
						<div className="grid gap-3 text-sm sm:grid-cols-2">
							{project.startDate && (
								<DateBox
									label={t("project.startDate", "Start date")}
									value={formatDate(project.startDate)}
								/>
							)}
							{project.endDate && (
								<DateBox
									label={t("project.endDate", "End date")}
									value={
										project.endDate === OPEN_ENDED
											? t("project.openEnded", "Open-ended")
											: formatDate(project.endDate)
									}
								/>
							)}
						</div>
					)}
				</div>
			)}
			<InlineRichText
				html={project.bodyHtml}
				className="prose-body"
				entity="project"
				entityId={project.id}
				target="field:body"
				label="Body"
			/>
			{project.targetAreas.length > 0 && (
				<Section title={t("project.targetAreas", "Target areas")}>
					<div className="flex flex-wrap gap-2">
						{project.targetAreas.map((area) => (
							<span
								key={area}
								className="rounded-full border border-border bg-background/70 px-4 py-1.5 text-sm text-foreground/85"
							>
								{area}
							</span>
						))}
					</div>
				</Section>
			)}
			{project.snapshots.length > 0 && (
				<Section title={t("project.snapshots", "Snapshots")}>
					<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
						{project.snapshots.map((s) => (
							<div
								key={s.label}
								className="rounded-2xl border border-border bg-card p-4 text-center"
							>
								<div className="font-display text-2xl font-semibold text-[var(--accent)]">
									{s.value}
								</div>
								<div className="mt-1 text-xs text-muted-foreground">
									{s.label}
								</div>
							</div>
						))}
					</div>
				</Section>
			)}
		</SubPage>
	);
}
