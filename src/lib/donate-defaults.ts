// derived per read, never stored: they ride the settings map because it already
// reaches the header and the donate pages on every route (server/donate-open.ts)
export const DONATE_OPEN = "donate_open";
export const DONATE_PAYMENTS = "donate_payments";

/** Is the site taking gifts right now? Whatever offers Donate asks this. */
export const donateOpen = (settings: Record<string, string>): boolean =>
	settings[DONATE_OPEN] === "1";

/** Can a gift reach the gateway at all? False turns the giving form into a notice. */
export const donatePaymentsConfigured = (
	settings: Record<string, string>,
): boolean => settings[DONATE_PAYMENTS] === "1";

export const DONATE_DEFAULTS: Record<string, string> = {
	donate_eyebrow: "Support our work",
	donate_title: "Give to what moves you",
	donate_intro:
		"Choose a campaign below. Every gift goes directly to the work it names.",
};
