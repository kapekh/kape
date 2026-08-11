// absolute URLs only once VITE_SITE_URL is set; an unfilled field is omitted rather than guessed
import {
	declaredShortName,
	type SiteSettings,
	siteDescription,
	siteLogo,
	siteName,
	socialSiteName,
} from "./site-identity";

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(
	/\/$/,
	"",
);

// schema.org/telephone holds one number, and two in the field is invalid
const firstPhone = (v: string) =>
	v
		.split(/[/;,·]/)
		.map((p) => p.trim())
		.find((p) => /\d/.test(p)) ?? "";

const absolute = (url: string) =>
	url.startsWith("http") ? url : `${SITE_URL}${url}`;

const REGION_WORD = /\s+(province|region|state|prefecture|governorate)$/i;
const sameArea = (part: string, value: string) =>
	!!value &&
	part.replace(REGION_WORD, "").toLowerCase() ===
		value.replace(REGION_WORD, "").toLowerCase();

// dropped from the tail by comparison, never by substring: "Kampong Cham Town" is street and "Kampong Cham Province" is the region
function streetLine(address: string, areas: string[]) {
	const parts = address
		.split(",")
		.map((p) => p.trim())
		.filter(Boolean);
	while (
		parts.length > 1 &&
		areas.some((a) => sameArea(parts[parts.length - 1], a))
	)
		parts.pop();
	return parts.join(", ");
}

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
	const areaServed = s.area_served?.trim() ?? "";
	// schema.org/areaServed takes a place, and a bare string leaves a crawler to
	// guess what kind. The setting is the country the organisation works in.
	if (areaServed) ld.areaServed = { "@type": "Country", name: areaServed };
	const region = s.address_region?.trim() ?? "";
	const country = s.address_country?.trim() ?? "";
	const street = streetLine(s.address?.trim() ?? "", [
		region,
		country,
		areaServed,
	]);
	const address = {
		...(street ? { streetAddress: street } : {}),
		...(region ? { addressRegion: region } : {}),
		...(country ? { addressCountry: country } : {}),
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
		// An unsigned piece is bylined to the name the site publishes under, which
		// is what the page itself shows next to the date.
		author: { "@type": "Organization", name: a.author || socialSiteName(s) },
		publisher,
	};
}
