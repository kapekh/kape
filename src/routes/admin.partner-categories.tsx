import { createFileRoute } from "@tanstack/react-router";

import { TermsManager } from "#/components/admin/TermsManager";

export const Route = createFileRoute("/admin/partner-categories")({
	component: () => (
		<TermsManager
			taxonomy="partner_category"
			title="Partner Categories"
			description="Groupings for the Our Partners page (Government, NGOs, Foundations…)."
		/>
	),
});
