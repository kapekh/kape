/**
 * Renders a Schema.org JSON-LD <script>. Server-rendered so crawlers that don't
 * run JS still see it. `<` is escaped to `<` so the payload can never break
 * out of the script element.
 */
export function JsonLd({ data }: { data: unknown }) {
	const json = JSON.stringify(data).replace(/</g, "\\u003c");
	return (
		<script
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: serialized, escaped JSON-LD
			dangerouslySetInnerHTML={{ __html: json }}
		/>
	);
}
