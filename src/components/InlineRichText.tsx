import { SquarePen } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { useRefreshAfterSave } from "#/lib/after-save";
import { useLang } from "#/lib/i18n";
import {
	type EditableEntity,
	ENTITY_AREA,
	rememberVersion,
	useInlineEdit,
	versionFor,
} from "#/lib/inline-edit";
import { saveErrorMessage } from "#/lib/save-error";
import { cn } from "#/lib/utils";
import { RichBody } from "./RichBody";

// admin-only, so tiptap stays out of the public bundle until the switch is on
const RichTextEditor = lazy(() =>
	import("./admin/RichTextEditor").then((m) => ({
		default: m.RichTextEditor,
	})),
);

type Source = { value: string; fellBack: boolean };

type State =
	| { kind: "closed" }
	| { kind: "loading" }
	| { kind: "open"; from: string; draft: string; fellBack: boolean }
	| { kind: "saving"; from: string; draft: string; fellBack: boolean };

const BUTTON =
	"inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-wait disabled:opacity-60";

/**
 * A rich text body that an editor can change where it stands. `field:<name>` bodies
 * fetch their source on open; a section's comes with the section.
 */
export function InlineRichText({
	html,
	className,
	entity,
	entityId,
	target,
	label,
	source,
}: {
	html: string;
	className?: string;
	entity: EditableEntity;
	entityId: number;
	/** `field:<name>` or `section:<id>:props.<field>`, as `updateField` takes it. */
	target: string;
	label: string;
	source?: Source;
}) {
	const { editing, may, setStatus } = useInlineEdit();
	const { lang, languages } = useLang();
	const refresh = useRefreshAfterSave();
	const [state, setState] = useState<State>({ kind: "closed" });
	const [error, setError] = useState<string | null>(null);
	const active = editing && may(ENTITY_AREA[entity]);
	const dirty =
		(state.kind === "open" || state.kind === "saving") &&
		state.draft !== state.from;

	useEffect(() => {
		if (!dirty) return;
		const hold = (e: BeforeUnloadEvent) => e.preventDefault();
		window.addEventListener("beforeunload", hold);
		return () => window.removeEventListener("beforeunload", hold);
	}, [dirty]);

	useEffect(() => {
		if (!active) setState({ kind: "closed" });
	}, [active]);

	if (!active) return <RichBody className={className} html={html} />;

	const langName =
		languages.find((l) => l.code === lang)?.nativeName ?? lang.toUpperCase();

	const open = async () => {
		setError(null);
		setState({ kind: "loading" });
		try {
			const field = /^field:(\w+)$/.exec(target)?.[1];
			const s: Source =
				source ??
				(await trpcClient.adminPages.richFieldSource.query({
					entity,
					entityId,
					lang,
					field: field ?? "",
				}));
			// a fallback is shown to start from, and saved only once changed
			setState({
				kind: "open",
				from: s.value,
				draft: s.value,
				fellBack: s.fellBack,
			});
			setStatus({ kind: "editing", label, multiline: true });
		} catch (err) {
			setState({ kind: "closed" });
			setStatus({ kind: "error", label, message: saveErrorMessage(err) });
		}
	};

	const close = () => {
		setError(null);
		setState({ kind: "closed" });
		setStatus({ kind: "idle" });
	};

	const cancel = () => {
		if (dirty && !window.confirm("Discard your changes to this text?")) return;
		close();
	};

	const save = async () => {
		if (state.kind !== "open") return;
		// an untouched fallback must not be copied into this language
		if (!dirty) return close();
		setError(null);
		setState({ ...state, kind: "saving" });
		setStatus({ kind: "saving", label });
		try {
			const result = await trpcClient.adminPages.updateField.mutate({
				entity,
				entityId,
				lang,
				target,
				value: state.draft,
				expectedUpdatedAt: versionFor(entity, entityId),
			});
			rememberVersion(entity, entityId, result.updatedAt);
			setState({ kind: "closed" });
			await refresh(label);
		} catch (err) {
			const message = saveErrorMessage(err);
			setState({ ...state, kind: "open" });
			setError(message);
			setStatus({ kind: "error", label, message });
		}
	};

	if (state.kind === "open" || state.kind === "saving") {
		const saving = state.kind === "saving";
		return (
			<section
				aria-label={`Editing ${label}`}
				className="admin -mx-2 rounded-xl border-2 border-primary bg-background p-2 shadow-lg print:hidden"
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						e.preventDefault();
						cancel();
					} else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
						e.preventDefault();
						void save();
					}
				}}
			>
				<Suspense fallback={<RichBody className={className} html={html} />}>
					<RichTextEditor
						value={state.draft}
						onChange={(draft) =>
							setState((s) => (s.kind === "open" ? { ...s, draft } : s))
						}
					/>
				</Suspense>
				{state.fellBack && (
					<p className="mt-2 px-1 text-sm text-muted-foreground">
						No {langName} text is stored yet, so this starts from the default
						language. What you save becomes the {langName} version.
					</p>
				)}
				{error && (
					<p
						role="alert"
						className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
					>
						{error}
					</p>
				)}
				{/* long table scrolls this away; above the edit bar on phones */}
				<div className="sticky bottom-4 z-40 mt-2 ml-auto max-sm:bottom-40 flex w-fit items-center gap-2 rounded-full border border-border bg-background/95 p-1 shadow-lg backdrop-blur">
					<button
						type="button"
						onClick={cancel}
						disabled={saving}
						className={cn(
							BUTTON,
							"border border-border bg-background text-foreground hover:bg-muted",
						)}
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => void save()}
						disabled={saving}
						className={cn(
							BUTTON,
							"bg-primary text-primary-foreground hover:bg-primary/90",
						)}
					>
						{saving ? "Saving…" : "Save"}
					</button>
				</div>
			</section>
		);
	}

	return (
		<div className="relative rounded-lg outline-dashed outline-2 outline-offset-8 outline-primary/40 hover:outline-primary">
			<button
				type="button"
				onClick={() => void open()}
				disabled={state.kind === "loading"}
				className={cn(
					BUTTON,
					"absolute -top-5 right-0 z-30 bg-primary text-primary-foreground shadow-md hover:bg-primary/90 print:hidden",
				)}
			>
				<SquarePen className="size-4" aria-hidden />
				{state.kind === "loading" ? "Opening…" : `Edit ${label.toLowerCase()}`}
			</button>
			{html ? (
				<RichBody className={className} html={html} />
			) : (
				<p className="py-6 text-center text-sm text-muted-foreground">
					No {label.toLowerCase()} yet.
				</p>
			)}
		</div>
	);
}
