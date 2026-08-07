import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { FormSection } from "#/components/admin/form-ui";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { useTRPC } from "#/integrations/trpc/react";
import {
	enabledModules,
	MODULES,
	MODULES_SETTING,
	type ModuleId,
	serializeModules,
} from "#/lib/modules";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/modules")({
	component: ModulesAdmin,
});

/**
 * Which domain features this install keeps. Turning one off hides its screens,
 * its permission area and its page sections; it deletes nothing, and turning it
 * back on returns the records untouched.
 */
function ModulesAdmin() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const router = useRouter();
	// null until the current setting has actually been read. An empty Set that has
	// never been loaded looks exactly like "no modules", and one click on Save would
	// then write that guess over a live site's configuration.
	const [on, setOn] = useState<Set<ModuleId> | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const load = useCallback(() => {
		setError(null);
		trpcClient.adminSettings.list
			.query()
			.then((rows) => {
				// `undefined` and `""` mean different things here: a database with no row
				// predates modules and keeps everything, an empty row means none.
				const row = rows.find((r) => r.key === MODULES_SETTING);
				setOn(enabledModules(row ? { [MODULES_SETTING]: row.value } : {}));
			})
			.catch((err) =>
				setError(
					err instanceof Error
						? err.message
						: "The settings could not be read.",
				),
			);
	}, []);

	useEffect(load, [load]);

	const toggle = (id: ModuleId) =>
		setOn((s) => {
			if (!s) return s;
			const next = new Set(s);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

	async function save() {
		if (!on) return;
		setSaving(true);
		try {
			await trpcClient.adminSettings.set.mutate({
				key: MODULES_SETTING,
				value: serializeModules(on),
			});
			// The sidebar, the role editor and the section picker all read settings out
			// of a loader that calls ensureQueryData, which serves a stale entry rather
			// than refetching it. The cached copy has to be dropped, not invalidated.
			queryClient.removeQueries({ queryKey: trpc.site.settings.queryKey() });
			await router.invalidate();
			toast("Modules saved.");
		} catch (err) {
			toast(err instanceof Error ? err.message : "Could not save modules.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="max-w-3xl space-y-5">
			<div>
				<h1 className="font-display text-2xl font-semibold text-primary">
					Modules
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Pages, posts, media, forms, menus, users and settings are always here.
					These are the extras.
				</p>
			</div>

			<FormSection
				title="Optional features"
				description="Switching one off hides its admin screens, its page sections and its permission area. Nothing is deleted, and switching it back on returns every record."
			>
				{error ? (
					<div className="space-y-3">
						<p className="text-sm text-destructive">
							This site's modules could not be read, so nothing here can be
							changed yet: {error}
						</p>
						<button
							type="button"
							onClick={load}
							className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition"
						>
							Try again
						</button>
					</div>
				) : !on ? (
					<p className="text-sm text-muted-foreground">Loading…</p>
				) : (
					<div className="space-y-3">
						{MODULES.map((m) => {
							const checked = on.has(m.id);
							return (
								<label
									key={m.id}
									className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${checked ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-border hover:border-[var(--accent)]/50"}`}
								>
									<input
										type="checkbox"
										checked={checked}
										onChange={() => toggle(m.id)}
										className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
									/>
									<span className="min-w-0">
										<span className="block text-sm font-medium text-foreground">
											{m.label}
										</span>
										<span className="block text-xs text-muted-foreground">
											{m.description}
										</span>
									</span>
								</label>
							);
						})}
						<div className="flex items-center gap-3 pt-1">
							<button
								type="button"
								onClick={save}
								disabled={saving}
								className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
							>
								{saving ? "Saving…" : "Save modules"}
							</button>
							<span className="text-xs text-muted-foreground">
								{on.size} of {MODULES.length} on ·{" "}
								<span className="font-mono">{MODULES_SETTING}</span>
							</span>
						</div>
					</div>
				)}
			</FormSection>
		</div>
	);
}
