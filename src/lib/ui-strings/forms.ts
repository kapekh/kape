// forms.email runs the other way: the sign-in form defines it in pages.ts and the contact form reads it there
export const forms: Record<string, { en: string; km?: string }> = {
	"common.loading": { en: "Loading…" },

	"contact.address": { en: "Address:" },
	"contact.badge": { en: "Say hello" },
	"contact.email": { en: "Email:" },
	"contact.form.note": {
		en: "We usually reply within a couple of working days.",
	},
	"contact.form.sent": {
		en: "Thank you — your message has been sent. We'll be in touch.",
	},
	"contact.form.title": { en: "Send us a message" },
	"contact.hq": { en: "Head office" },
	"contact.lead": {
		en: "Get in touch with {site} at our head office or any of our regional teams.",
	},
	"contact.metaDescription": {
		en: "Reach our head office and regional teams.",
	},
	"contact.metaTitle": { en: "Contact {site}" },
	"contact.phone": { en: "Phone:" },
	"contact.provincial": { en: "Provincial offices" },
	"contact.title": { en: "Contact Us" },

	"error.generic": { en: "Something went wrong. Please try again." },
	"error.networkConnection": {
		en: "Network error. Please check your connection and try again.",
	},

	"forms.closed": {
		en: "This form is now closed and no longer accepting responses. Thank you for your interest.",
	},
	"forms.closesOn": { en: "Closes {date}" },
	"forms.fileHint": { en: "Up to {max} · {types}" },
	"forms.fileTooLarge": { en: "“{name}” is too large (max {max})." },
	"forms.message": { en: "Message" },
	"forms.name": { en: "Full name" },
	"forms.phoneOptional": { en: "Phone (optional)" },
	"forms.select": { en: "— Select —" },
	"forms.send": { en: "Send message", km: "ផ្ញើសារ" },
	"forms.sending": { en: "Sending…", km: "កំពុងផ្ញើ…" },
	"forms.sent": { en: "Thank you — your response has been recorded." },
	"forms.submit": { en: "Submit", km: "ដាក់ស្នើ" },

	"map.current": { en: "Current" },
	"map.past": { en: "Past" },
	"map.viewProject": { en: "View project" },
};
