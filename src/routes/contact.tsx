import { createFileRoute } from "@tanstack/react-router";

import { ContactForm } from "@/components/ContactForm";
import { MapView, type MapMarker } from "@/components/MapView";
import { Card, Grid, Section, SubPage } from "@/components/SubPage";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/contact")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(context.trpc.site.offices.queryOptions()),
	head: () => ({
		meta: [
			{ title: "Contact KAPE" },
			{ name: "description", content: "Reach KAPE's head office in Kampong Cham and provincial teams across Cambodia." },
		],
	}),
	component: ContactPage,
});

function ContactPage() {
	const offices = Route.useLoaderData();
	const { t } = useLang();
	const hq = offices.find((o) => o.isHq) ?? offices[0];
	const markers: MapMarker[] = offices
		.filter((o) => o.lat && o.lng)
		.map((o) => ({ lat: Number(o.lat), lng: Number(o.lng), label: o.name }));

	return (
		<SubPage section={t("nav.contact")} title="Contact Us" lead="Get in touch with KAPE's head office or any of our provincial teams." badge="Say hello">
			<Section title="Send us a message">
				<ContactForm />
			</Section>

			{hq && (
				<Section title="Head office">
					<Card accent>
						<div className="space-y-1">
							{hq.address && <div><strong>Address:</strong> {hq.address}</div>}
							{hq.phone && <div><strong>Telephone:</strong> {hq.phone}</div>}
							{hq.email && <div><strong>Email:</strong> {hq.email}</div>}
						</div>
					</Card>
					{markers.length > 0 && (
						<div className="mt-4">
							<MapView markers={markers} center={[12.2, 105.0]} zoom={7} />
						</div>
					)}
				</Section>
			)}

			<Section title="Provincial offices">
				<Grid cols={3}>
					{offices.filter((o) => !o.isHq).map((o) => (
						<Card key={o.id} title={o.name}>
							{o.phone && <>Phone: {o.phone}<br /></>}
							{o.email && <>Email: {o.email}</>}
						</Card>
					))}
				</Grid>
			</Section>
		</SubPage>
	);
}
