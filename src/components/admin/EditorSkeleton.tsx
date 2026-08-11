import { Card } from "#/components/ui/card.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";

const ROWS = ["a", "b", "c", "d"];

function SectionSkeleton({ fields }: { fields: number }) {
	return (
		<Card padding="none" className="overflow-hidden">
			<div className="border-b border-admin-border px-4 py-4">
				<Skeleton className="h-5 w-40" />
				<Skeleton className="mt-2 h-3 w-64" />
			</div>
			<div className="space-y-6 p-4">
				{ROWS.slice(0, fields).map((k) => (
					<div key={k}>
						<Skeleton className="h-3 w-24" />
						<Skeleton className="mt-2 h-10 w-full" />
					</div>
				))}
			</div>
		</Card>
	);
}

/** The editor's own shape while it loads, so the page does not jump when it arrives. */
export function EditorSkeleton({ label = "Loading the editor…" }: { label?: string }) {
	return (
		<div>
			<output className="sr-only">{label}</output>
			<Card
				padding="none"
				className="mx-auto mb-6 flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3"
			>
				<Skeleton className="h-7 w-48" />
				<div className="flex items-center gap-2">
					<Skeleton className="h-10 w-20" />
					<Skeleton className="h-10 w-28" />
				</div>
			</Card>
			<div className="mx-auto grid max-w-5xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
				<div className="min-w-0 space-y-6">
					<SectionSkeleton fields={3} />
					<SectionSkeleton fields={1} />
				</div>
				<aside className="space-y-6 self-start">
					<SectionSkeleton fields={2} />
					<SectionSkeleton fields={3} />
				</aside>
			</div>
		</div>
	);
}
