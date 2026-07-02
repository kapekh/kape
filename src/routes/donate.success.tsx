import { createFileRoute } from "@tanstack/react-router";

import { Card, Section, SubPage } from "@/components/SubPage";
import { NavLink } from "@/components/NavLink";
import { useLang } from "@/lib/i18n";
import { localizedHref } from "@/lib/i18n-config";

export const Route = createFileRoute("/donate/success")({
	validateSearch: (s: Record<string, unknown>) => ({ order: typeof s.order === "string" ? s.order : "" }),
	loaderDeps: ({ search }) => ({ order: search.order }),
	loader: async ({ context, deps }) => {
		if (!deps.order) return { status: null as string | null };
		const row = await context.queryClient.ensureQueryData(
			context.trpc.payments.status.queryOptions({ orderId: deps.order }),
		);
		return { status: row?.status ?? null };
	},
	head: () => ({ meta: [{ title: "Thank you for your donation" }, { name: "robots", content: "noindex" }] }),
	component: DonateSuccess,
});

function DonateSuccess() {
	const { status } = Route.useLoaderData();
	const { lang } = useLang();
	const paid = status === "paid";

	return (
		<SubPage section="Support KAPE" title="Thank you" badge="With gratitude" lead="Your generosity helps Cambodian children learn, dream, and rise.">
			<Section title={paid ? "Your gift is confirmed" : "We've received your donation"}>
				<Card accent>
					{paid ? (
						<p className="text-base">
							🎉 Your donation has been confirmed. Thank you for standing with KAPE — your support reaches classrooms across 15 provinces.
						</p>
					) : (
						<p className="text-base">
							Thank you! We're finalising the confirmation of your payment. If it was completed, it will be confirmed shortly — no further action is needed.
						</p>
					)}
				</Card>
				<div className="mt-6 flex flex-wrap gap-3">
					<NavLink href={localizedHref("/", lang)} className="inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
						Back to home
					</NavLink>
					<NavLink href={localizedHref("/stories", lang)} className="inline-flex items-center rounded-full border border-border px-6 py-2.5 text-sm font-semibold hover:bg-muted transition">
						See the impact
					</NavLink>
				</div>
			</Section>
		</SubPage>
	);
}
