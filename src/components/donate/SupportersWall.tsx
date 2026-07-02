import { money } from "./CampaignProgress";

type Supporter = { name: string; amount: number; currency: string; message: string | null; paidAt: string | null };

const initials = (name: string) =>
	name
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0])
		.join("")
		.toUpperCase();

/** A warm, deterministic gradient per name so each donor avatar feels distinct. */
function hueFor(name: string) {
	let h = 0;
	for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
	return h;
}

function SupporterAvatar({ name }: { name: string }) {
	const h = hueFor(name);
	return (
		<div
			className="grid h-11 w-11 flex-none place-items-center rounded-full text-sm font-bold text-white shadow-sm"
			style={{ background: `linear-gradient(135deg, hsl(${h} 60% 45%), hsl(${(h + 40) % 360} 65% 55%))` }}
			aria-hidden
		>
			{initials(name) || "♡"}
		</div>
	);
}

/** Recent public donors with their messages — social proof for the campaign. */
export function SupportersWall({ supporters }: { supporters: Supporter[] }) {
	if (supporters.length === 0) {
		return <p className="text-sm text-muted-foreground">Be the first to support this campaign.</p>;
	}
	return (
		<ul className="space-y-3">
			{supporters.map((s, i) => (
				<li key={i} className="flex items-start gap-3 rounded-2xl border border-border bg-background/40 p-4">
					<SupporterAvatar name={s.name} />
					<div className="min-w-0 flex-1">
						<div className="flex items-baseline justify-between gap-2">
							<span className="truncate font-semibold text-foreground">{s.name}</span>
							<span className="flex-none text-sm font-semibold text-[var(--accent)] tabular-nums">{money(s.amount, s.currency)}</span>
						</div>
						{s.message && <p className="mt-0.5 text-sm italic text-muted-foreground">“{s.message}”</p>}
					</div>
				</li>
			))}
		</ul>
	);
}
