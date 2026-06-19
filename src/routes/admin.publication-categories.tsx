import { createFileRoute } from "@tanstack/react-router";

import { TermsManager } from "#/components/admin/TermsManager";

export const Route = createFileRoute("/admin/publication-categories")({
	component: () => (
		<TermsManager
			taxonomy="publication_category"
			title="Publication Categories"
			description="The key must match the Media & Publications page route (e.g. annual-report)."
		/>
	),
});
