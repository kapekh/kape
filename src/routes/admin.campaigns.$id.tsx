import { Outlet, createFileRoute } from "@tanstack/react-router";

/**
 * Layout route for a single campaign. The edit form lives in
 * admin.campaigns.$id.index.tsx and the donations ledger in
 * admin.campaigns.$id.donations.tsx — they render here through the Outlet.
 */
export const Route = createFileRoute("/admin/campaigns/$id")({
	component: () => <Outlet />,
});
