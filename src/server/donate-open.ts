import { enabledModules } from "#/lib/modules";
import type { SiteSettings } from "#/lib/site-identity";

import { barayConfig } from "./baray";
import type { DB } from "./db";
import { hasGivableCampaign } from "./repo/campaigns";

/** Are the gateway credentials in place? Without them `/api/pay/donate` answers 503. */
export const paymentsConfigured = (): boolean => barayConfig() != null;

/**
 * Can a visitor give anything right now? The campaign predicate is the one the
 * /donate hub lists by, so button and hub agree on whether anything is givable.
 * The button is stricter by the credential leg: the hub still renders for a
 * direct visit with payments unconfigured, and says giving is unavailable.
 */
export async function donationsOpen(
	db: DB,
	settings: SiteSettings,
): Promise<boolean> {
	if (!enabledModules(settings).has("fundraising")) return false;
	if (!paymentsConfigured()) return false;
	return hasGivableCampaign(db);
}
