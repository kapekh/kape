import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { NavLink } from "@/components/NavLink";
import { SubPage } from "@/components/SubPage";
import { useLang } from "@/lib/i18n";
import { DEFAULT_LANG, LANGS, localizedHref } from "@/lib/i18n-config";
import { db } from "@/server/db";
import { searchSite } from "@/server/repo/search";

/**
 * Public site search. The query lives in the URL (`/km/search?q=…`) so a result
 * page is linkable, shareable and back-button-able; every result href is
 * language-prefixed for the language being read.
 */
const runSearch = createServerFn({ method: "GET" })
	.validator((input: { q: string; lang: string }) => ({
		q: String(input.q ?? ""),
		lang: String(input.lang ?? DEFAULT_LANG),
	}))
	.handler(({ data }) => searchSite(db, data.q, data.lang));

export const Route = createFileRoute("/$lang/search")({
	// `q` stays absent when empty, so a bare /en/search is not rewritten to ?q=
	validateSearch: (s: Record<string, unknown>): { q?: string } =>
		typeof s.q === "string" && s.q ? { q: s.q } : {},
	loaderDeps: ({ search }) => ({ q: search.q ?? "" }),
	loader: ({ params, location, deps }) => {
		// `/$lang/search` also matches `/foo/search`; a non-language first segment
		// is content, not a language, so send it to the default-language URL.
		if (!LANGS.includes(params.lang))
			throw redirect({
				href: `/${DEFAULT_LANG}${location.pathname}${location.searchStr}`,
				statusCode: 301,
			});
		return runSearch({ data: { q: deps.q, lang: params.lang } });
	},
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData?.query
					? `${loaderData.query} — KAPE`
					: "Search — KAPE",
			},
			// a results page is not content; keep it out of the index
			{ name: "robots", content: "noindex" },
		],
	}),
	component: SearchPage,
});

function SearchPage() {
	const { query, results, total, limit } = Route.useLoaderData();
	const { lang, t } = useLang();
	const label = t("top.search", "Search");

	return (
		<SubPage wide section={label} title={query || label}>
			<search>
				<form
					method="get"
					action={localizedHref("/search", lang)}
					className="flex flex-wrap gap-3"
				>
					<label htmlFor="q" className="sr-only">
						{label}
					</label>
					<input
						id="q"
						name="q"
						type="search"
						defaultValue={query}
						// biome-ignore lint/a11y/noAutofocus: the whole page is this one field
						autoFocus
						placeholder={t("search.placeholder", "Search KAPE")}
						className="min-w-0 flex-1 rounded-full border border-border bg-card px-5 py-3 text-base shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
					/>
					<button
						type="submit"
						className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90"
					>
						{label}
					</button>
				</form>
			</search>

			{!query ? (
				<p className="mt-10 text-muted-foreground">
					{t(
						"search.prompt",
						"Type a word above to search the site — try a project name, a place, or a title.",
					)}
				</p>
			) : results.length === 0 ? (
				<p className="mt-10 text-muted-foreground">
					{t("search.none", "Nothing matched")} “{query}”.
				</p>
			) : (
				<>
					<p className="mt-10 text-sm text-muted-foreground">
						{total} {t("search.results", "results")}
						{total > limit
							? ` — ${t("search.showingFirst", "showing the first")} ${limit}`
							: ""}
					</p>
					<ul className="mt-4 divide-y divide-border">
						{results.map((r) => (
							<li key={`${r.kind}-${r.id}`} className="py-5">
								<div className="t-eyebrow text-[var(--accent)]">
									{t(r.labelKey, r.label)}
								</div>
								<h2 className="mt-1 t-subsection">
									<NavLink
										href={localizedHref(r.href, lang)}
										className="text-primary hover:text-[var(--accent)]"
									>
										{r.title}
									</NavLink>
								</h2>
								{r.snippet && (
									<p className="mt-1 text-sm text-foreground/80">{r.snippet}</p>
								)}
							</li>
						))}
					</ul>
				</>
			)}
		</SubPage>
	);
}
