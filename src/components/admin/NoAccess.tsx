import { Link, useNavigate } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { Button } from "#/components/ui/button";
import { EmptyState } from "#/components/ui/empty-state";
import { PageHeader } from "#/components/ui/page-header";

/**
 * The refusal is the server's; this only says so, instead of handing back the
 * sign-in form they already used, or bouncing them to the Dashboard in silence.
 *
 * `area` is set for a direct URL into one screen the caller's role lacks —
 * everything else in the admin still works, so the way back is the Dashboard,
 * not the portal/log-out choice a caller with no admin area at all gets.
 */
export function NoAccess({
	email,
	portal,
	area,
}: {
	email: string;
	portal: boolean;
	area?: string;
}) {
	const navigate = useNavigate();

	async function logout() {
		await fetch("/api/auth/logout", { method: "POST" });
		navigate({ to: "/login" });
	}

	return (
		<main className="admin grid min-h-screen place-items-center bg-admin-bg p-6 text-admin-ink">
			<div className="w-full max-w-md">
				<PageHeader
					className="mb-4 text-center"
					title={
						area
							? `You do not have access to ${area}`
							: "You do not have access to the admin"
					}
					description={
						area ? (
							<>
								You are signed in as{" "}
								<strong className="font-medium text-admin-ink">{email}</strong>,
								and that account can't reach this screen.
							</>
						) : (
							<>
								You are signed in as{" "}
								<strong className="font-medium text-admin-ink">{email}</strong>,
								and that account has no admin areas.
							</>
						)
					}
				/>
				<EmptyState
					icon={<ShieldAlert />}
					title={
						area
							? "Ask an administrator to grant it"
							: "Ask an administrator to grant one"
					}
					description={
						area
							? `Someone who can reach the Users screen can add ${area} to your role.`
							: "Someone who can reach the Users screen can give this account an area. Until then there is nothing here to show you."
					}
					action={
						area ? (
							<Button asChild>
								<Link to="/admin">Back to the dashboard</Link>
							</Button>
						) : (
							<div className="flex flex-wrap justify-center gap-2">
								{portal && (
									<Button asChild>
										<a href="/internalsources">Go to the staff portal</a>
									</Button>
								)}
								<Button
									variant={portal ? "secondary" : "primary"}
									onClick={logout}
								>
									Log out
								</Button>
							</div>
						)
					}
				/>
			</div>
		</main>
	);
}
