/**
 * Schema.org JSON-LD builders. Structured data is how AI answer engines
 * (Perplexity, Google AI Overviews, Bing Copilot) and search crawlers reliably
 * understand the organisation and its articles. Absolute URLs are included only
 * when VITE_SITE_URL is configured (relative ones aren't useful in JSON-LD).
 */

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "");

/** Organisation identity — emitted site-wide. */
export function organizationLd(): Record<string, unknown> {
	const ld: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: "Kampuchea Action to Promote Education",
		alternateName: "KAPE",
		description: "KAPE advances equitable, transformative education for children across Cambodia.",
		email: "kape@kapekh.org",
		telephone: "+855-42-941-481",
		areaServed: { "@type": "Country", name: "Cambodia" },
		address: {
			"@type": "PostalAddress",
			streetAddress: "PTTC, National Road 7, Kampong Cham Town",
			addressRegion: "Kampong Cham",
			addressCountry: "KH",
		},
	};
	if (SITE_URL) {
		ld.url = SITE_URL;
		ld.logo = `${SITE_URL}/logo.png`;
	}
	return ld;
}

/** A news/article page. */
export function articleLd(a: {
	title: string;
	description?: string;
	image?: string | null;
	datePublished?: string | null;
	author?: string | null;
}): Record<string, unknown> {
	const image = a.image && SITE_URL && !a.image.startsWith("http") ? `${SITE_URL}${a.image}` : a.image;
	const publisher: Record<string, unknown> = { "@type": "Organization", name: "KAPE" };
	if (SITE_URL) publisher.logo = { "@type": "ImageObject", url: `${SITE_URL}/logo.png` };
	return {
		"@context": "https://schema.org",
		"@type": "NewsArticle",
		headline: a.title,
		...(a.description ? { description: a.description } : {}),
		...(image ? { image: [image] } : {}),
		...(a.datePublished ? { datePublished: a.datePublished } : {}),
		author: { "@type": "Organization", name: a.author || "KAPE Cambodia" },
		publisher,
	};
}
