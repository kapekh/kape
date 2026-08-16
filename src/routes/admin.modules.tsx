import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { FormSection } from "#/components/admin/form-ui";
import { startTourOnce } from "#/components/admin/Tour";
import { Button } from "#/components/ui/button.tsx";
import { PageHeader } from "#/components/ui/page-header.tsx";
import { SkeletonRows } from "#/components/ui/skeleton.tsx";
import { Switch } from "#/components/ui/switch.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { useTRPC } from "#/integrations/trpc/react";
import {
	enabledModules,
	MODULES,
	MODULES_SETTING,
	type ModuleDef,
	type ModuleId,
	serializeModules,
} from "#/lib/modules";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/modules")({
	component: ModulesAdmin,
});

// read off navPaths, not a second list here: a copy of the labels would drift on the first rename
const screensOf = (m: ModuleDef) =>
	m.navPaths.map((p) => {
		const last = p.split("/").pop() ?? p;
		const words = last.replace(/-/g, " ");
		return words.charAt(0).toUpperCase() + words.slice(1);
	});

const list = (names: string[]) =>
	names.length < 2
		? names.join("")
		: `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

// turning one off hides its screens, its permission area and its sections; it deletes nothing
function ModulesAdmin() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const router = useRouter();
	// null until read: an empty set looks like "no modules" and one Save writes that guess over a live site
	const [on, setOn] = useState<Set<ModuleId> | null>(null);
	// What is stored, kept beside what is on screen so the screen can say which
	// switches are about to change. It is never sent; `on` is still the payload.
	const [stored, setStored] = useState<Set<ModuleId> | null>(null);
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
				const now = enabledModules(row ? { [MODULES_SETTING]: row.value } : {});
				setOn(now);
				setStored(new Set(now));
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

	useEffect(() => {
		startTourOnce("modules");
	}, []);

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
			setStored(new Set(on));
			// ensureQueryData serves a stale entry, so the cached copy has to be dropped, not invalidated
			queryClient.removeQueries({ queryKey: trpc.site.settings.queryKey() });
			await router.invalidate();
			toast("Modules saved.");
		} catch (err) {
			toast(err instanceof Error ? err.message : "Could not save modules.");
		} finally {
			setSaving(false);
		}
	}

	const goingOff = MODULES.filter(
		(m) => stored?.has(m.id) && on && !on.has(m.id),
	);
	const goingOn = MODULES.filter(
		(m) => on?.has(m.id) && stored && !stored.has(m.id),
	);

	return (
		<div className="max-w-3xl" data-admin-width="prose">
			<PageHeader
				title="Modules"
				description="Pages, posts, media, forms, menus, users and settings are always here. These are the extras."
			/>

			<FormSection
				title="Optional features"
				description="Switching one off hides its admin screens, its page sections and its permission area. Nothing is deleted, and switching it back on returns every record."
			>
				{error ? (
					<div className="space-y-3">
						<p className="text-sm text-admin-danger-ink">
							This site's modules could not be read, so nothing here can be
							changed yet: {error}
						</p>
						<Button type="button" variant="secondary" onClick={load}>
							Try again
						</Button>
					</div>
				) : !on ? (
					<div aria-busy="true">
						<span className="sr-only">Loading…</span>
						<SkeletonRows rows={MODULES.length} />
					</div>
				) : (
					<div className="space-y-3">
						{MODULES.map((m, card) => {
							const checked = on.has(m.id);
							const screens = screensOf(m);
							return (
								<div
									key={m.id}
									data-tour={card === 0 ? "module-card" : undefined}
									className={`flex items-start gap-4 rounded-xl border p-4 transition-colors duration-150 ease-out ${checked ? "border-admin-accent bg-admin-accent-soft" : "border-admin-border"}`}
								>
									<Switch
										id={`module-${m.id}`}
										checked={checked}
										onCheckedChange={() => toggle(m.id)}
										className="mt-1"
									/>
									<div className="min-w-0">
										<label
											htmlFor={`module-${m.id}`}
											className="block cursor-pointer text-sm font-medium text-admin-ink"
										>
											{m.label}
										</label>
										<p className="mt-1 text-[13px] text-admin-ink-muted">
											{m.description}
										</p>
										<p className="mt-2 text-[13px] text-admin-ink-subtle">
											Off, this takes {list(screens)} out of the sidebar
											{m.sources.length > 0
												? " and off the page builder's section list"
												: ""}
											.
										</p>
									</div>
								</div>
							);
						})}

						{(goingOff.length > 0 || goingOn.length > 0) && (
							<p className="rounded-xl border border-admin-warning/40 bg-admin-warning-soft px-4 py-3 text-[13px] text-admin-warning-ink">
								{goingOff.length > 0 &&
									`Saving will take ${list(goingOff.flatMap(screensOf))} out of the sidebar. `}
								{goingOn.length > 0 &&
									`Saving will bring back ${list(goingOn.flatMap(screensOf))}. `}
								Nothing is deleted either way.
							</p>
						)}

						<div
							data-tour="module-save"
							className="flex flex-wrap items-center gap-3 pt-1"
						>
							<Button type="button" onClick={save} disabled={saving}>
								{saving ? "Saving…" : "Save modules"}
							</Button>
							<span className="text-[13px] text-admin-ink-muted">
								{on.size} of {MODULES.length} on
							</span>
						</div>
					</div>
				)}
			</FormSection>
		</div>
	);
}
