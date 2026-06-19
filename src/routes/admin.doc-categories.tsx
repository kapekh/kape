import { createFileRoute } from "@tanstack/react-router";

import { TermsManager } from "#/components/admin/TermsManager";

export const Route = createFileRoute("/admin/doc-categories")({
	component: () => (
		<TermsManager
			taxonomy="doc_category"
			title="Document Categories"
			description="Categories for internal staff-portal documents."
		/>
	),
});
