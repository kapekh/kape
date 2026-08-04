import { createFileRoute } from "@tanstack/react-router";

import { ContactForm } from "@/components/ContactForm";
import { type MapMarker, MapView } from "@/components/MapView";
import { Card, Grid, SubPage } from "@/components/SubPage";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/contact")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(
			context.trpc.site.offices.queryOptions(),
		),
	head: () => ({
		meta: [
			{ title: "Contact KAPE" },
			{
				name: "description",
				content:
					"Reach KAPE's head office in Kampong Cham and provincial teams across Cambodia.",
			},
		],
	}),
	component: ContactPage,
});

function ContactPage() {
	const offices = Route.useLoaderData();
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
			title="Contact Us"
			lead="Get in touch with KAPE's head office or any of our provincial teams."
			badge="Say hello"
		>
			{/* Top: message form ‹› head office + map */}
			<div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
				<div className={`${panel} flex flex-col`}>
					<h2 className="t-subsection text-primary">Send us a message</h2>
					<p className="mt-1 mb-5 text-sm text-muted-foreground">
						We usually reply within a couple of working days.
					</p>
					<ContactForm />
				</div>

				{hq && (
					<div className={panel}>
						<h2 className="t-subsection text-primary">Head office</h2>
						<div className="mt-4 space-y-1 text-sm text-foreground/85">
							{hq.address && (
								<div>
									<strong className="text-foreground">Address:</strong>{" "}
									{hq.address}
								</div>
							)}
							{hq.phone && (
								<div>
									<strong className="text-foreground">Telephone:</strong>{" "}
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
									<strong className="text-foreground">Email:</strong>{" "}
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
								<MapView markers={markers} center={[12.2, 105.0]} zoom={7} />
							</div>
						)}
					</div>
				)}
			</div>

			{/* Provincial offices */}
			{provincial.length > 0 && (
				<section className="mt-12">
					<h2 className="t-subsection text-primary">Provincial offices</h2>
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
									<div className="t-eyebrow text-[var(--accent)] mb-1">
										{o.province}
									</div>
								)}
								{o.address && <div className="mb-1">{o.address}</div>}
								{o.phone && (
									<div>
										Phone:{" "}
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
										Email:{" "}
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
