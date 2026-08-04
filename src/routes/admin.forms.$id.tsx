import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route: the editor (index) and the submissions inbox render via Outlet.
export const Route = createFileRoute("/admin/forms/$id")({
	component: () => <Outlet />,
});
