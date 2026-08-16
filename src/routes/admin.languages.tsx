import { createFileRoute } from "@tanstack/react-router";
import { Languages as LanguagesIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import { FormSection, fieldLabel } from "#/components/admin/form-ui";
import { TableScroll } from "#/components/admin/list-ui";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { EmptyState } from "#/components/ui/empty-state";
import { Input } from "#/components/ui/input";
import { PageHeader } from "#/components/ui/page-header";
import { SkeletonRows } from "#/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "#/components/ui/table";
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
			<PageHeader
				title="Languages"
				description="Untranslated content falls back to the default language. A language the site can already serve appears in the visitor switcher as soon as you enable it; any other one is marked below and needs a developer first."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Languages" }]}
			/>

			<div data-tour="lang-add">
				<FormSection
					title="Add language"
					description="ISO code plus the English and native names."
				>
					<div className="flex flex-wrap items-end gap-3">
						<div className="w-20">
							<label className={fieldLabel} htmlFor="lang-code">
								Code
							</label>
							<Input
								id="lang-code"
								className="font-mono"
								placeholder="fr"
								value={add.code}
								onChange={(e) => setAdd({ ...add, code: e.target.value })}
							/>
						</div>
						<div className="flex-1 min-w-[160px]">
							<label className={fieldLabel} htmlFor="lang-name">
								English name
							</label>
							<Input
								id="lang-name"
								placeholder="French"
								value={add.name}
								onChange={(e) => setAdd({ ...add, name: e.target.value })}
							/>
						</div>
						<div className="flex-1 min-w-[160px]">
							<label className={fieldLabel} htmlFor="lang-native">
								Native name
							</label>
							<Input
								id="lang-native"
								placeholder="Français"
								value={add.nativeName}
								onChange={(e) => setAdd({ ...add, nativeName: e.target.value })}
							/>
						</div>
						<label className="flex min-h-6 items-center gap-2 pb-2 text-sm text-admin-ink">
							<input
								type="checkbox"
								checked={add.rtl}
								onChange={(e) => setAdd({ ...add, rtl: e.target.checked })}
								className="size-4 accent-admin-accent"
							/>
							Right to left
						</label>
						<Button onClick={create} disabled={busy === "add"}>
							{busy === "add" ? "Adding…" : "Add language"}
						</Button>
					</div>
				</FormSection>
			</div>

			<div data-tour="lang-table">
				{loading ? (
					<SkeletonRows rows={3} />
				) : langs.length === 0 ? (
					<EmptyState
						icon={<LanguagesIcon />}
						title="No languages yet"
						description="The site needs at least one. The first you add becomes the default, and everything untranslated falls back to it."
					/>
				) : (
					<TableScroll label="Languages">
						<Table>
							<THead>
								<TR>
									<TH width={90}>Code</TH>
									<TH>Name</TH>
									<TH width={110}>Enabled</TH>
									<TH width={150}>Default</TH>
									<TH align="right" width={80}>
										Actions
									</TH>
								</TR>
							</THead>
							<TBody>
								{langs.map((l) => (
									<TR key={l.code}>
										<TD label="Code" className="font-mono">
											{l.code}
										</TD>
										<TD label="Name">
											<span className="text-admin-ink">{l.name}</span>{" "}
											<span className="text-admin-ink-muted">
												· {l.nativeName}
											</span>
											{routable(l.code) ? null : (
												<span className="mt-1 block text-[13px] text-admin-warning-ink">
													Not served to visitors. {needsDeveloper(l.code)}
												</span>
											)}
										</TD>
										<TD label="Enabled">
											<label className="flex min-h-6 items-center gap-2 text-[13px] text-admin-ink-muted">
												<input
													type="checkbox"
													aria-label={`Enable ${l.name}`}
													disabled={busy === l.code}
													checked={l.enabled}
													onChange={(e) =>
														save(l, { enabled: e.target.checked })
													}
													className="size-4 accent-admin-accent"
												/>
												{l.enabled ? "On the site" : "Off"}
											</label>
										</TD>
										<TD label="Default">
											{l.isDefault ? (
												<Badge tone="live">Default</Badge>
											) : (
												<Button
													variant="ghost"
													size="sm"
													onClick={() => save(l, { isDefault: true })}
													disabled={busy === l.code || !routable(l.code)}
													disabledReason={
														routable(l.code)
															? undefined
															: needsDeveloper(l.code)
													}
													aria-label={`Make ${l.name} the default language`}
												>
													Make default
												</Button>
											)}
										</TD>
										<TD align="right">
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
										</TD>
									</TR>
								))}
							</TBody>
						</Table>
					</TableScroll>
				)}
			</div>
		</div>
	);
}
