import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import {
	FormSection,
	fieldInput,
	fieldLabel,
} from "#/components/admin/form-ui";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { LANGS } from "#/lib/i18n-config";
import { saveErrorMessage } from "#/lib/save-error";
import { confirm, toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/languages")({
	component: LanguagesAdmin,
});

type Lang = Awaited<
	ReturnType<typeof trpcClient.adminLanguages.list.query>
>[number];

const routable = (code: string) => LANGS.includes(code);

const needsDeveloper = (code: string) =>
	`The site can't serve /${code}/ yet: a developer has to add "${code}" to LANGS in src/lib/i18n-config.ts. Until then it stays out of the visitor language switcher, and you can already translate content into it.`;

function LanguagesAdmin() {
	const [langs, setLangs] = useState<Lang[]>([]);
	const [loading, setLoading] = useState(true);
	const [add, setAdd] = useState({
		code: "",
		name: "",
		nativeName: "",
		rtl: false,
	});

	const refresh = useCallback(async () => {
		setLangs(await trpcClient.adminLanguages.list.query());
		setLoading(false);
	}, []);
	useEffect(() => {
		refresh();
	}, [refresh]);

	// Keyed by language code so one row's toggle does not freeze the whole table.
	const [busy, setBusy] = useState<string | null>(null);

	async function create() {
		if (!add.code.trim() || !add.name.trim()) return;
		setBusy("add");
		const code = add.code.trim();
		const name = add.name.trim();
		try {
			await trpcClient.adminLanguages.create.mutate({
				code,
				name,
				nativeName: add.nativeName.trim() || name,
				enabled: true,
				isDefault: false,
				rtl: add.rtl,
				sort: langs.length,
			});
			setAdd({ code: "", name: "", nativeName: "", rtl: false });
			await refresh();
			if (routable(code)) toast(`${name} added.`, "success");
			else toast(`${name} added. ${needsDeveloper(code)}`, "info");
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setBusy(null);
		}
	}
	async function save(l: Lang, patch: Partial<Lang>) {
		setBusy(l.code);
		try {
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
			await refresh();
			toast(`${l.name} saved.`, "success");
		} catch (e) {
			// refresh anyway: a refused toggle leaves the checkbox showing the state
			// the operator asked for rather than the one the server still holds
			toast(saveErrorMessage(e), "error");
			await refresh();
		} finally {
			setBusy(null);
		}
	}
	async function del(code: string) {
		if (!(await confirm(`Delete language "${code}" and its translations?`)))
			return;
		setBusy(code);
		try {
			await trpcClient.adminLanguages.delete.mutate({ code });
			await refresh();
			toast(`Language ${code} deleted.`, "success");
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setBusy(null);
		}
	}

	return (
		<div className="space-y-5">
			<div>
				<h1 className="font-display text-2xl font-semibold text-primary">
					Languages
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Untranslated content falls back to the default language. A language
					the site can already serve appears in the visitor switcher as soon as
					you enable it; any other one is marked below and needs a developer
					first.
				</p>
			</div>

			<FormSection
				title="Add language"
				description="ISO code plus the English and native names."
			>
				<div className="flex flex-wrap items-end gap-3">
					<div className="w-20">
						<label className="block">
							<span className={fieldLabel}>Code</span>
							<input
								className={`${fieldInput} font-mono`}
								placeholder="fr"
								value={add.code}
								onChange={(e) => setAdd({ ...add, code: e.target.value })}
							/>
						</label>
					</div>
					<div className="flex-1 min-w-[160px]">
						<label className="block">
							<span className={fieldLabel}>English name</span>
							<input
								className={fieldInput}
								placeholder="French"
								value={add.name}
								onChange={(e) => setAdd({ ...add, name: e.target.value })}
							/>
						</label>
					</div>
					<div className="flex-1 min-w-[160px]">
						<label className="block">
							<span className={fieldLabel}>Native name</span>
							<input
								className={fieldInput}
								placeholder="Français"
								value={add.nativeName}
								onChange={(e) => setAdd({ ...add, nativeName: e.target.value })}
							/>
						</label>
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
						disabled={busy === "add"}
						className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
					>
						{busy === "add" ? "Adding…" : "Add"}
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
						) : langs.length === 0 ? (
							<tr>
								<td colSpan={5} className="px-3 py-4 text-muted-foreground">
									No languages yet — add one above. The site needs at least one,
									and the first you add becomes the default.
								</td>
							</tr>
						) : (
							langs.map((l) => (
								<tr key={l.code} className="hover:bg-muted/20">
									<td className="px-2 font-mono">{l.code}</td>
									<td className="px-2 py-2">
										{l.name}{" "}
										<span className="text-muted-foreground">
											· {l.nativeName}
										</span>
										{routable(l.code) ? null : (
											<span className="mt-1 block text-xs text-destructive">
												Not served to visitors. {needsDeveloper(l.code)}
											</span>
										)}
									</td>
									<td className="px-2 text-center">
										<input
											type="checkbox"
											aria-label={`Enable ${l.name}`}
											disabled={busy === l.code}
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
												disabled={busy === l.code || !routable(l.code)}
												title={
													routable(l.code) ? undefined : needsDeveloper(l.code)
												}
												aria-label={`Make ${l.name} the default language`}
												className="text-xs text-[var(--accent)] hover:underline disabled:opacity-40"
											>
												Make default
											</button>
										)}
									</td>
									<td className="px-3 py-2 text-right">
										<ActionMenu
											label={`Actions for ${l.name}`}
											items={[
												{
													label: "Delete",
													danger: true,
													disabled: l.isDefault || busy === l.code,
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
