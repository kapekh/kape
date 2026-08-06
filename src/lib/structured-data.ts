/**
 * Schema.org JSON-LD builders. Structured data is how AI answer engines
 * (Perplexity, Google AI Overviews, Bing Copilot) and search crawlers reliably
 * understand the organisation and its articles. Absolute URLs are included only
 * when VITE_SITE_URL is configured (relative ones aren't useful in JSON-LD).
 *
 * Identity comes from `site_settings`; a field an operator has not filled in is
 * omitted rather than guessed.
 */
import { type SiteSettings, siteDescription, siteName } from "./site-identity";

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(
	/\/$/,
	"",
);

/** Organisation identity — emitted site-wide. */
export function organizationLd(s: SiteSettings): Record<string, unknown> {
	const name = siteName(s);
	const short = s.site_name_short?.trim();
	const description = siteDescription(s);
	const ld: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": "Organization",
		name,
	};
	if (short && short !== name) ld.alternateName = short;
	if (description) ld.description = description;
	if (s.contact_email?.trim()) ld.email = s.contact_email.trim();
	if (s.contact_phone?.trim()) ld.telephone = s.contact_phone.trim();
	if (s.address?.trim())
		ld.address = {
			"@type": "PostalAddress",
			streetAddress: s.address.trim(),
		};
	if (SITE_URL) {
		ld.url = SITE_URL;
		ld.logo = `${SITE_URL}/logo.png`;
	}
	return ld;
}

/** A news/article page. */
export function articleLd(
	a: {
		title: string;
		description?: string;
		image?: string | null;
		datePublished?: string | null;
		author?: string | null;
	},
	s: SiteSettings,
): Record<string, unknown> {
	const image =
		a.image && SITE_URL && !a.image.startsWith("http")
			? `${SITE_URL}${a.image}`
			: a.image;
	const publisher: Record<string, unknown> = {
		"@type": "Organization",
		name: siteName(s),
	};
	if (SITE_URL)
		publisher.logo = { "@type": "ImageObject", url: `${SITE_URL}/logo.png` };
	return {
		"@context": "https://schema.org",
		"@type": "NewsArticle",
		headline: a.title,
		...(a.description ? { description: a.description } : {}),
		...(image ? { image: [image] } : {}),
		...(a.datePublished ? { datePublished: a.datePublished } : {}),
		author: { "@type": "Organization", name: a.author || siteName(s) },
		publisher,
	};
}
