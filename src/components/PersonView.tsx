import type { Colleague, ResolvedPerson } from "#/server/repo/people";
import { NavLink } from "@/components/NavLink";
import { RichBody } from "@/components/RichBody";
import { personRecord, SubPage } from "@/components/SubPage";
import { useLang, useT } from "@/lib/i18n";
import { localizedHref } from "@/lib/i18n-config";
import { imageFallbackRef, onImageError } from "@/lib/placeholder";

type T = ReturnType<typeof useT>;

const groupLabel = (tier: string, t: T): string => {
	switch (tier) {
		case "board":
			return t("tier.board", "Board of Directors");
		case "smt":
			return t("tier.smt", "Senior Management Team");
		case "pm":
			return t("tier.pm", "Programs & Team Leadership");
		case "team":
			return t("tier.team", "Our Team");
		default:
			return "";
	}
};

const initials = (name: string) =>
	String(name || "")
		.split(/\s+/)
		.filter((w) => /[A-Za-zក-៿]/.test(w[0] ?? ""))
		.slice(0, 2)
		.map((w) => w[0])
		.join("");

function Portrait({
	name,
	photoUrl,
	className = "",
	textClass = "text-5xl",
}: {
	name: string;
	photoUrl: string | null;
	className?: string;
	textClass?: string;
}) {
	if (photoUrl)
		return (
			<img
				src={photoUrl}
				alt={name}
				className={`h-full w-full object-cover ${className}`}
				onError={onImageError}
				ref={imageFallbackRef}
			/>
		);
	return (
		<div
			aria-hidden
			className={`grid h-full w-full place-items-center bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] font-display font-bold text-primary-foreground ${textClass} ${className}`}
		>
			{initials(name)}
		</div>
	);
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div className="px-5 py-4">
			<dt className="t-meta uppercase tracking-[0.18em] text-muted-foreground">
				{label}
			</dt>
			<dd className="mt-1 font-semibold text-primary">{value}</dd>
		</div>
	);
}

function ColleagueCard({ person }: { person: Colleague }) {
	const { lang } = useLang();
	return (
		<NavLink
			href={localizedHref(`/team/${person.slug}`, lang)}
			className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
		>
			<div className="h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-card">
				<Portrait
					name={person.name}
					photoUrl={person.photoUrl}
					textClass="text-base"
				/>
			</div>
			<div className="min-w-0">
				<div className="truncate font-semibold text-primary transition group-hover:text-[var(--accent)]">
					{person.name}
				</div>
				{person.position && (
					<div className="truncate text-sm text-muted-foreground">
						{person.position}
					</div>
				)}
			</div>
		</NavLink>
	);
}

export function PersonView({
	person,
	section,
	sectionHref,
}: {
	person: ResolvedPerson;
	section: string;
	sectionHref?: string;
}) {
	const t = useT();
	const { lang } = useLang();
	const group = groupLabel(person.tier, t);

	return (
		<SubPage
			wide
			section={section}
			sectionHref={sectionHref}
			title={person.name}
			lead={person.position || undefined}
			badge={group || undefined}
			record={personRecord(person)}
			titleField="name"
			leadField="position"
		>
			<div className="grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-12">
				<div className="mx-auto w-full max-w-xs lg:sticky lg:top-28 lg:max-w-none lg:self-start">
					<div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
						<div className="aspect-[4/5] bg-muted">
							<Portrait name={person.name} photoUrl={person.photoUrl} />
						</div>
						<dl className="divide-y divide-border">
							{group && (
								<Detail label={t("person.group", "Group")} value={group} />
							)}
							{person.program && (
								<Detail
									label={t("person.program", "Program")}
									value={person.program}
								/>
							)}
						</dl>
					</div>
					{sectionHref && (
						<NavLink
							href={localizedHref(sectionHref, lang)}
							className="tap-target mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-8 hover:text-[var(--accent)]"
						>
							{t("person.back", "← Back to the whole team")}
						</NavLink>
					)}
				</div>

				<div>
					<div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] md:p-12">
						<h2 className="t-subsection text-primary">
							{t("person.about", "About {name}", { name: person.name })}
						</h2>
						{person.bodyHtml ? (
							<RichBody className="prose-body mt-5" html={person.bodyHtml} />
						) : (
							<p className="mt-5 text-muted-foreground">
								{person.position ||
									t("person.nobio", "No profile has been written yet.")}
							</p>
						)}
					</div>

					{person.colleagues.length > 0 && (
						<section className="mt-10">
							<h2 className="t-subsection text-primary">
								{group
									? t("person.alsoin", "Also in {group}", { group })
									: t("person.more", "More of the team")}
							</h2>
							<div className="mt-5 grid gap-4 sm:grid-cols-2">
								{person.colleagues.map((c) => (
									<ColleagueCard key={c.id} person={c} />
								))}
							</div>
						</section>
					)}
				</div>
			</div>
		</SubPage>
	);
}
