import { Outlet, createFileRoute } from "@tanstack/react-router";

/**
 * Layout route for the /donate branch. The hub lives in donate.index.tsx, the
 * scoped campaign page in donate.$campaign.tsx, and the receipt in
 * donate.success.tsx — they render here through the Outlet.
 */
export const Route = createFileRoute("/donate")({
	component: () => <Outlet />,
});
