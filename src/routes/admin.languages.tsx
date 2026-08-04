import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import {
	FormSection,
	fieldInput,
	fieldLabel,
} from "#/components/admin/form-ui";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/languages")({
	component: LanguagesAdmin,
});

type Lang = Awaited<
	ReturnType<typeof trpcClient.adminLanguages.list.query>
>[number];

function LanguagesAdmin() {
	const [langs, setLangs] = useState<Lang[]>([]);
	const [loading, setLoading] = useState(true);
	const [add, setAdd] = useState({
		code: "",
		name: "",
		nativeName: "",
		rtl: false,
	});

	async function refresh() {
		setLangs(await trpcClient.adminLanguages.list.query());
		setLoading(false);
	}
	useEffect(() => {
		refresh();
	}, []);

	async function create() {
		if (!add.code.trim() || !add.name.trim()) return;
		await trpcClient.adminLanguages.create.mutate({
			code: add.code.trim(),
			name: add.name.trim(),
			nativeName: add.nativeName.trim() || add.name.trim(),
			enabled: true,
			isDefault: false,
			rtl: add.rtl,
			sort: langs.length,
		});
		setAdd({ code: "", name: "", nativeName: "", rtl: false });
		refresh();
	}
	async function save(l: Lang, patch: Partial<Lang>) {
		await trpcClient.adminLanguages.update.mutate({
			code: l.code,
			name: l.name,
			nativeName: l.nativeName,
			enabled: l.enabled,
			isDefault: l.isDefault,
			rtl: l.rtl,
			sort: l.sort,
			...patch,
		});
		refresh();
	}
	async function del(code: string) {
		if (!(await confirm(`Delete language "${code}" and its translations?`)))
			return;
		await trpcClient.adminLanguages.delete.mutate({ code });
		refresh();
	}

	return (
		<div className="space-y-5">
			<div>
				<h1 className="font-display text-2xl font-semibold text-primary">
					Languages
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					A new language appears in the site switcher immediately; untranslated
					content falls back to the default language.
				</p>
			</div>

			<FormSection
				title="Add language"
				description="ISO code plus the English and native names."
			>
				<div className="flex flex-wrap items-end gap-3">
					<div className="w-20">
						<label className={fieldLabel}>Code</label>
						<input
							className={`${fieldInput} font-mono`}
							placeholder="fr"
							value={add.code}
							onChange={(e) => setAdd({ ...add, code: e.target.value })}
						/>
					</div>
					<div className="flex-1 min-w-[160px]">
						<label className={fieldLabel}>English name</label>
						<input
							className={fieldInput}
							placeholder="French"
							value={add.name}
							onChange={(e) => setAdd({ ...add, name: e.target.value })}
						/>
					</div>
					<div className="flex-1 min-w-[160px]">
						<label className={fieldLabel}>Native name</label>
						<input
							className={fieldInput}
							placeholder="Français"
							value={add.nativeName}
							onChange={(e) => setAdd({ ...add, nativeName: e.target.value })}
						/>
					</div>
					<label className="flex items-center gap-1.5 text-sm pb-2">
						<input
							type="checkbox"
							checked={add.rtl}
							onChange={(e) => setAdd({ ...add, rtl: e.target.checked })}
						/>{" "}
						RTL
					</label>
					<button
						type="button"
						onClick={create}
						className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 transition"
					>
						Add
					</button>
				</div>
			</FormSection>

			<div className="overflow-hidden rounded-xl border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-2 py-2.5">Code</th>
							<th className="px-2 py-2.5">Name / Native</th>
							<th className="px-2 py-2.5">Enabled</th>
							<th className="px-2 py-2.5">Default</th>
							<th className="px-3 py-2.5 text-right">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{loading ? (
							<tr>
								<td colSpan={5} className="px-3 py-4 text-muted-foreground">
									Loading…
								</td>
							</tr>
						) : (
							langs.map((l) => (
								<tr key={l.code} className="hover:bg-muted/20">
									<td className="px-2 font-mono">{l.code}</td>
									<td className="px-2">
										{l.name}{" "}
										<span className="text-muted-foreground">
											· {l.nativeName}
										</span>
									</td>
									<td className="px-2 text-center">
										<input
											type="checkbox"
											checked={l.enabled}
											onChange={(e) => save(l, { enabled: e.target.checked })}
										/>
									</td>
									<td className="px-2 text-center">
										{l.isDefault ? (
											<span className="text-xs font-semibold text-[var(--palm)]">
												default
											</span>
										) : (
											<button
												type="button"
												onClick={() => save(l, { isDefault: true })}
												className="text-xs text-[var(--accent)] hover:underline"
											>
												Make default
											</button>
										)}
									</td>
									<td className="px-3 py-2 text-right">
										<ActionMenu
											items={[
												{
													label: "Delete",
													danger: true,
													disabled: l.isDefault,
													onClick: () => del(l.code),
												},
											]}
										/>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
