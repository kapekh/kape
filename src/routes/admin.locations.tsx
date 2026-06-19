import { createFileRoute } from "@tanstack/react-router";

import { TermsManager } from "#/components/admin/TermsManager";

export const Route = createFileRoute("/admin/locations")({
	component: () => (
		<TermsManager
			taxonomy="location"
			title="Locations / Provinces"
			description="Used by job vacancies and office records."
		/>
	),
});
