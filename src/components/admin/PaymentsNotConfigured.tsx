import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";

/**
 * Says why publishing a campaign changes nothing on the public site: without
 * gateway credentials no campaign can take a gift, and the Donate button stays
 * hidden. The credentials are server environment, so no other screen shows them.
 */
export function PaymentsNotConfigured() {
	const [missing, setMissing] = useState(false);

	useEffect(() => {
		let live = true;
		// an unreachable notice is not worth an error state on a screen that works,
		// but a silent one turns a broken check into a false all-clear
		trpcClient.adminCampaigns.paymentsConfigured
			.query()
			.then((configured) => {
				if (live) setMissing(!configured);
			})
			.catch((cause: unknown) => {
				console.error(
					"[campaigns] payment check failed, so unconfigured payments cannot be reported:",
					cause,
				);
			});
		return () => {
			live = false;
		};
	}, []);

	if (!missing) return null;
	return (
		<output className="block space-y-1 rounded-xl border border-admin-warning/40 bg-admin-warning-soft px-4 py-3 text-[13px] text-admin-warning-ink">
			<p>
				Payments are not configured, so no campaign can take a gift and the
				Donate button stays hidden across the site.
			</p>
			<p>
				A campaign published now is still not givable. Ask whoever runs the
				server to set the Baray credentials in its environment.
			</p>
		</output>
	);
}
