/**
 * Schema.org JSON-LD builders. Structured data is how AI answer engines
 * (Perplexity, Google AI Overviews, Bing Copilot) and search crawlers reliably
 * understand the organisation and its articles. Absolute URLs are included only
 * when VITE_SITE_URL is configured (relative ones aren't useful in JSON-LD).
 *
 * Identity comes from `site_settings`; a field an operator has not filled in is
 * omitted rather than guessed.
 */
import {
	declaredShortName,
	type SiteSettings,
	siteDescription,
	siteLogo,
	siteName,
} from "./site-identity";

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(
	/\/$/,
	"",
);

// schema.org/telephone holds one number; a site that publishes a switchboard and
// a second line lists both in the same setting, and two in the field is invalid.
// An entry with no digits in it is not a number, so nothing is emitted at all.
const firstPhone = (v: string) =>
	v
		.split(/[/;,·]/)
		.map((p) => p.trim())
		.find((p) => /\d/.test(p)) ?? "";

const absolute = (url: string) =>
	url.startsWith("http") ? url : `${SITE_URL}${url}`;

/** Organisation identity — emitted site-wide. */
export function organizationLd(s: SiteSettings): Record<string, unknown> {
	const name = siteName(s);
	// Only a name the operator gave: alternateName asserts the organisation is
	// genuinely known by it, and an acronym we worked out is not evidence of that.
	const short = declaredShortName(s);
	const description = siteDescription(s);
	const ld: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": "Organization",
		name,
	};
	if (short && short !== name) ld.alternateName = short;
	if (description) ld.description = description;
	if (s.contact_email?.trim()) ld.email = s.contact_email.trim();
	const phone = firstPhone(s.contact_phone ?? "");
	if (phone) ld.telephone = phone;
	if (s.area_served?.trim()) ld.areaServed = s.area_served.trim();
	const address = {
		...(s.address?.trim() ? { streetAddress: s.address.trim() } : {}),
		...(s.address_region?.trim()
			? { addressRegion: s.address_region.trim() }
			: {}),
		...(s.address_country?.trim()
			? { addressCountry: s.address_country.trim() }
			: {}),
	};
	if (Object.keys(address).length)
		ld.address = { "@type": "PostalAddress", ...address };
	if (SITE_URL) {
		ld.url = SITE_URL;
		ld.logo = absolute(siteLogo(s));
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
	// The publisher is a named body, so it carries a name the operator gave.
	const publisherName = declaredShortName(s) || siteName(s);
	const publisher: Record<string, unknown> = {
		"@type": "Organization",
		name: publisherName,
	};
	if (SITE_URL)
		publisher.logo = { "@type": "ImageObject", url: absolute(siteLogo(s)) };
	return {
		"@context": "https://schema.org",
		"@type": "NewsArticle",
		headline: a.title,
		...(a.description ? { description: a.description } : {}),
		...(image ? { image: [image] } : {}),
		...(a.datePublished ? { datePublished: a.datePublished } : {}),
		author: { "@type": "Organization", name: a.author || publisherName },
		publisher,
	};
}
