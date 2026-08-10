/**
 * Slice 5: the donate hub, a campaign page, the giving form and the receipt.
 *
 * Mostly `donate.`, plus the three keys only this slice renders: `dialog.close`
 * and `dialog.back` from the confirm modal, and `forms.yourName` from the donor
 * field. The module is storage, not a namespace — a key lives with the slice
 * that renders it, whatever it is called.
 *
 * Singular/plural ship as two keys because `{ en, km }` has no plural forms; the
 * call site picks. Khmer needs only one of each pair.
 *
 * English only. A key with no `km` falls back to English, which is honest;
 * invented Khmer is not.
 */
export const donate: Record<string, { en: string; km?: string }> = {
	"dialog.back": { en: "Back" },
	"dialog.close": { en: "Close" },
	"forms.yourName": { en: "Your name" },

	// hub, campaign cards and the progress bar
	"donate.badge": { en: "Stand with us" },
	"donate.beFirst": { en: "Be the first to give" },
	"donate.beFirstShort": { en: "Be the first" },
	"donate.campaigns": { en: "Campaigns" },
	"donate.closed.badge": { en: "Campaign closed" },
	"donate.cta.campaign": { en: "Donate to this campaign" },
	"donate.donor": { en: "donor" },
	"donate.donors": { en: "donors" },
	"donate.empty.body": { en: "Please check back soon, or {link}." },
	"donate.empty.link": { en: "learn more about our work" },
	"donate.empty.title": { en: "No active campaigns right now" },
	"donate.ended.body": {
		en: "Thank you to everyone who gave. Explore other ways to give.",
	},
	"donate.ended.cta": { en: "See active campaigns" },
	"donate.ended.title": { en: "This campaign has ended" },
	"donate.featured": { en: "Featured" },
	"donate.getMoving": { en: "Your gift gets this campaign moving." },
	"donate.give": { en: "Give" },
	"donate.goal": { en: "{amount} goal" },
	"donate.helpReach": { en: "Help reach the {goal} goal." },
	"donate.metaDescription": { en: "Support this campaign." },
	"donate.metaTitleCampaign": { en: "{title} — Donate" },
	"donate.metaTitleHub": { en: "Donate to {site}" },
	"donate.more": { en: "More campaigns" },
	"donate.new": { en: "New campaign" },
	"donate.ofGoal": { en: "of {goal}" },
	"donate.pctFunded": { en: "{pct}% funded" },
	"donate.raised": { en: "raised" },
	"donate.raisedOfGoal": { en: "raised of {goal} goal" },
	"donate.recentSupporters": { en: "Recent supporters" },
	"donate.stat.campaign": { en: "campaign" },
	"donate.stat.campaigns": { en: "campaigns" },
	"donate.supporter": { en: "supporter" },
	"donate.supporters": { en: "supporters" },
	"donate.title": { en: "Donate" },
	"donate.wall.empty": { en: "Be the first to support this campaign." },

	// the giving form
	"donate.anonymous": { en: "Anonymous" },
	"donate.confirm.campaign": { en: "Campaign" },
	"donate.confirm.creditedAs": { en: "Credited as" },
	"donate.confirm.title": { en: "Confirm your gift" },
	"donate.confirmPay": { en: "Confirm & pay" },
	"donate.customNamePlaceholder": { en: "e.g. A family or a team name" },
	"donate.form.title": { en: "Make your gift" },
	"donate.funds": { en: "Funds {tier}" },
	"donate.messageOptional": { en: "Leave a message of support (optional)" },
	"donate.minimum": { en: "Minimum donation is {amount}." },
	"donate.oneTime": { en: "One-time gift" },
	"donate.otherAmount": { en: "Other amount" },
	// the gateway the product integrates, kept out of the sentence so a site on
	// another one edits a word rather than a translated sentence
	"donate.provider": { en: "Baray" },
	"donate.receiptEmail": { en: "Email for your receipt" },
	"donate.redirecting": { en: "Redirecting…" },
	"donate.secured": {
		en: "Secured by {provider} — KHQR, card, or mobile wallet",
	},
	"donate.step1": { en: "Choose your impact" },
	"donate.step2": { en: "Your details" },
	"donate.submit": { en: "Donate {amount}" },
	"donate.wall.custom": { en: "Custom" },
	"donate.wall.name": { en: "My name" },
	"donate.wallAs": { en: "Show me on the supporters wall as…" },
	"donate.yourNameOptional": { en: "Your name (optional)" },

	// receipt page
	"donate.success.badge": { en: "With gratitude" },
	"donate.success.confirmed": { en: "Your gift is confirmed" },
	"donate.success.confirmedBody": {
		en: "Your donation has been confirmed. Thank you for your support.",
	},
	"donate.success.lead": {
		en: "Your generosity goes straight into the work this campaign names.",
	},
	"donate.success.metaTitle": { en: "Thank you for your donation" },
	"donate.success.pending": { en: "We've received your donation" },
	"donate.success.pendingBody": {
		en: "Thank you! We're finalising the confirmation of your payment. If it was completed, it will be confirmed shortly — no further action is needed.",
	},
	"donate.success.stories": { en: "See the impact" },
	"donate.success.title": { en: "Thank you" },
};
