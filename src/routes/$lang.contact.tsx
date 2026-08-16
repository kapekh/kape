import { createFileRoute, redirect } from "@tanstack/react-router";

import { ContactForm } from "@/components/ContactForm";
import { type MapMarker, MapView } from "@/components/MapView";
import { Card, Grid, SubPage } from "@/components/SubPage";
import { useLang } from "@/lib/i18n";
import { DEFAULT_LANG, LANGS } from "@/lib/i18n-config";
import { siteLogo, siteShortName } from "@/lib/site-identity";

export const Route = createFileRoute("/$lang/contact")({
	loader: async ({ context, params, location }) => {
		if (!LANGS.includes(params.lang))
			throw redirect({
				href: `/${DEFAULT_LANG}${location.pathname}${location.searchStr}`,
				statusCode: 301,
			});
		const [offices, settings, i18n] = await Promise.all([
			context.queryClient.ensureQueryData(
				context.trpc.site.offices.queryOptions(),
			),
			context.queryClient.ensureQueryData(
				context.trpc.site.settings.queryOptions(),
			),
			// head() runs outside the LanguageProvider, so the two meta strings
			// travel with the loader instead of through useT()
			context.queryClient.ensureQueryData(
				context.trpc.i18n.bootstrap.queryOptions({ lang: params.lang }),
			),
		]);
		return {
			offices,
			settings,
			meta: {
				title: i18n.strings["contact.metaTitle"],
				description: i18n.strings["contact.metaDescription"],
			},
		};
	},
	head: ({ loaderData }) => ({
		meta: [
			{
				title: (loaderData?.meta.title ?? "Contact {site}").replace(
					"{site}",
					siteShortName(loaderData?.settings ?? {}),
				),
			},
			{
				name: "description",
				content:
					loaderData?.meta.description ??
					"Reach our head office and regional teams.",
			},
		],
	}),
	component: ContactPage,
});

function ContactPage() {
	const { offices, settings } = Route.useLoaderData();
	const { t } = useLang();
	const hq = offices.find((o) => o.isHq) ?? offices[0];
	const provincial = offices.filter((o) => o.id !== hq?.id);
	const markers: MapMarker[] = offices
		.filter((o) => o.lat && o.lng)
		.map((o) => ({ lat: Number(o.lat), lng: Number(o.lng), label: o.name }));

	const panel =
		"rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)] p-6 md:p-8";

	return (
		<SubPage
			wide
			section={t("nav.contact")}
			title={t("contact.title", "Contact Us")}
			lead={t(
				"contact.lead",
				"Get in touch with {site} at our head office or any of our regional teams.",
				{ site: siteShortName(settings) },
			)}
			badge={t("contact.badge", "Say hello")}
		>
			{/* Top: message form ‹› head office + map */}
			<div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
				<div className={`${panel} flex flex-col`}>
					<h2 className="t-subsection text-primary">
						{t("contact.form.title", "Send us a message")}
					</h2>
					<p className="mt-1 mb-5 text-sm text-muted-foreground">
						{t(
							"contact.form.note",
							"We usually reply within a couple of working days.",
						)}
					</p>
					<ContactForm />
				</div>

				{hq && (
					<div className={panel}>
						<h2 className="t-subsection text-primary">
							{t("contact.hq", "Head office")}
						</h2>
						<div className="mt-4 space-y-1 text-sm text-foreground/85">
							{hq.address && (
								<div>
									<strong className="text-foreground">
										{t("contact.address", "Address:")}
									</strong>{" "}
									{hq.address}
								</div>
							)}
							{hq.phone && (
								<div>
									<strong className="text-foreground">
										{t("contact.phone", "Phone:")}
									</strong>{" "}
									<a
										href={`tel:${hq.phone}`}
										className="hover:text-[var(--accent)]"
									>
										{hq.phone}
									</a>
								</div>
							)}
							{hq.email && (
								<div>
									<strong className="text-foreground">
										{t("contact.email", "Email:")}
									</strong>{" "}
									<a
										href={`mailto:${hq.email}`}
										className="hover:text-[var(--accent)]"
									>
										{hq.email}
									</a>
								</div>
							)}
						</div>
						{markers.length > 0 && (
							<div className="mt-5 overflow-hidden rounded-2xl border border-border">
								<MapView
									markers={markers}
									center={[12.2, 105.0]}
									zoom={7}
									logoUrl={siteLogo(settings)}
								/>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Provincial offices */}
			{provincial.length > 0 && (
				<section className="mt-12">
					<h2 className="t-subsection text-primary">
						{t("contact.provincial", "Provincial offices")}
					</h2>
					<Grid cols={3}>
						{provincial.map((o) => (
							<Card key={o.id} title={o.name}>
								{o.imageUrl && (
									<img
										src={o.imageUrl}
										alt={o.name}
										className="mb-3 aspect-video w-full rounded-lg object-cover"
									/>
								)}
								{o.province && (
									<div className="t-eyebrow text-[var(--accent-ink)] mb-1">
										{o.province}
									</div>
								)}
								{o.address && <div className="mb-1">{o.address}</div>}
								{o.phone && (
									<div>
										{t("contact.phone", "Phone:")}{" "}
										<a
											href={`tel:${o.phone}`}
											className="hover:text-[var(--accent)]"
										>
											{o.phone}
										</a>
									</div>
								)}
								{o.email && (
									<div>
										{t("contact.email", "Email:")}{" "}
										<a
											href={`mailto:${o.email}`}
											className="hover:text-[var(--accent)]"
										>
											{o.email}
										</a>
									</div>
								)}
							</Card>
						))}
					</Grid>
				</section>
			)}
		</SubPage>
	);
}
