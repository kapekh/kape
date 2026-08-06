import { Link, useLoaderData } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { visibleAreas } from "#/lib/modules";
import type { PermissionArea } from "#/lib/permissions";
import type { SiteSettings } from "#/lib/site-identity";
import {
	cancelButtonClass,
	EditorGrid,
	EditorHeader,
	FormSection,
	fieldInput,
	fieldLabel,
} from "./form-ui";
import { useDirtyGuard } from "./useDirty";

export type RoleFormValue = { name: string; permissions: PermissionArea[] };

type Initial = {
	key: string;
	name: string;
	permissions: string[];
	isSystem: boolean;
} | null;

export function RoleForm({
	initial,
	onSubmit,
	saving,
	title,
}: {
	initial: Initial;
	onSubmit: (v: RoleFormValue) => void;
	saving?: boolean;
	title: string;
}) {
	const isSuper = initial?.key === "admin"; // super-role: always all areas, locked
	const [name, setName] = useState(initial?.name ?? "");
	const [perms, setPerms] = useState<Set<PermissionArea>>(
		new Set((initial?.permissions ?? []) as PermissionArea[]),
	);

	// Only the areas this install can reach: a module nobody turned on has no
	// screens, so offering to grant access to it would be offering nothing.
	const { settings } = useLoaderData({ from: "__root__" }) as {
		settings?: SiteSettings;
	};
	const areas = useMemo(() => visibleAreas(settings ?? {}), [settings]);
	// A role may still hold an area whose module is off. That grant is kept on save,
	// so turning the module back on restores it, but the counter must only speak for
	// the boxes on screen.
	const shown = useMemo(() => new Set(areas.map((a) => a.key)), [areas]);

	const groups = useMemo(() => {
		const order: string[] = [];
		const by: Record<string, typeof areas> = {};
		for (const a of areas) {
			if (!by[a.group]) {
				by[a.group] = [];
				order.push(a.group);
			}
			by[a.group].push(a);
		}
		return order.map((g) => ({ group: g, areas: by[g] }));
	}, [areas]);

	const toggle = (k: PermissionArea) =>
		setPerms((s) => {
			const next = new Set(s);
			next.has(k) ? next.delete(k) : next.add(k);
			return next;
		});

	function submit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit({ name: name.trim(), permissions: [...perms] });
	}

	const dirty = useDirtyGuard(JSON.stringify({ name, perms: [...perms] }));

	return (
		<form onSubmit={submit}>
			<EditorHeader
				title={title}
				saving={saving}
				saveLabel="Save role"
				dirty={dirty}
			>
				<Link to="/admin/roles" className={cancelButtonClass}>
					Cancel
				</Link>
			</EditorHeader>
			<EditorGrid
				main={
					<FormSection
						title="Permissions"
						description="Tick the areas this role can manage in the admin."
					>
						{isSuper ? (
							<p className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3 text-sm text-foreground/80">
								The <strong>Administrator</strong> role always has full access
								to every area — including new ones added later. Its permissions
								can’t be limited.
							</p>
						) : (
							<div className="space-y-5">
								{groups.map((g) => (
									<div key={g.group}>
										<div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
											{g.group}
										</div>
										<div className="grid gap-2 sm:grid-cols-2">
											{g.areas.map((a) => {
												const on = perms.has(a.key);
												return (
													<label
														key={a.key}
														className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition ${on ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-border hover:border-[var(--accent)]/50"}`}
													>
														<input
															type="checkbox"
															checked={on}
															onChange={() => toggle(a.key)}
															className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
														/>
														<span className="text-sm font-medium text-foreground">
															{a.label}
														</span>
													</label>
												);
											})}
										</div>
									</div>
								))}
							</div>
						)}
					</FormSection>
				}
				aside={
					<FormSection title="Role" description="A label staff will recognise.">
						<div className="space-y-4">
							<div>
								<label className={fieldLabel}>Name</label>
								<input
									className={fieldInput}
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="e.g. Editor, Fundraiser"
									required
								/>
							</div>
							{initial?.isSystem && (
								<p className="text-xs text-muted-foreground">
									This is a built-in role — it can be renamed
									{isSuper ? "" : " and re-scoped"} but not deleted.
								</p>
							)}
							{!isSuper && (
								<p className="text-xs text-muted-foreground">
									{[...perms].filter((p) => shown.has(p)).length} of{" "}
									{areas.length} areas selected.
								</p>
							)}
						</div>
					</FormSection>
				}
			/>
		</form>
	);
}
