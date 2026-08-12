import { type TParams, useLang } from "#/lib/i18n";
import { useInlineEdit } from "#/lib/inline-edit";

/**
 * A UI string that an admin in edit mode can click. `t()` stays as it is: it
 * returns a bare string and half its call sites are `alt`, `title` and
 * `aria-label`, where a node cannot go.
 */
export function T({
	k,
	fallback,
	params,
}: {
	k: string;
	fallback?: string;
	params?: TParams;
}) {
	const { t } = useLang();
	const { editing, may, target, setTarget } = useInlineEdit();
	const text = t(k, fallback, params);
	if (!editing || !may("settings")) return <>{text}</>;

	const selected = target?.kind === "uiString" && target.key === k;
	// unfilled: the editor must show the {slots} a translation has to keep, not this page's numbers
	const open = () =>
		setTarget({ kind: "uiString", key: k, shown: t(k, fallback) });
	return (
		// biome-ignore lint/a11y/useSemanticElements: these strings sit inside links, where a nested <button> is invalid
		<span
			role="button"
			tabIndex={0}
			title={k}
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				open();
			}}
			onKeyDown={(e) => {
				if (e.key !== "Enter" && e.key !== " ") return;
				e.preventDefault();
				e.stopPropagation();
				open();
			}}
			className={`cursor-pointer rounded-sm outline-offset-2 ${
				selected
					? "bg-primary/15 outline outline-2 outline-primary"
					: "outline-dashed outline-1 outline-primary/50"
			}`}
		>
			{text}
		</span>
	);
}
