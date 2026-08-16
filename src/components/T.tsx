import { type TParams, useLang } from "#/lib/i18n";
import { useInlineEdit } from "#/lib/inline-edit";

/**
 * A UI string that an admin in edit mode can type over where it is printed.
 * `t()` stays as it is: it returns a bare string and half its call sites are
 * `alt`, `title` and `aria-label`, where a node cannot go.
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
	const { editing, may, revision } = useInlineEdit();
	const text = t(k, fallback, params);
	if (!editing || !may("settings")) return <>{text}</>;

	return (
		// biome-ignore lint/a11y/useSemanticElements: these strings sit inside links, where a nested <button> is invalid
		<span
			// keyed: typing replaces the text node React holds, so it remounts
			key={revision}
			role="button"
			tabIndex={0}
			title={k}
			data-cms-ui-string={k}
			// unfilled: an editor must see the {slots} a translation has to keep
			data-cms-source={t(k, fallback)}
			className="cursor-text rounded-sm outline-1 outline-primary/50 outline-dashed outline-offset-2 hover:bg-primary/10 hover:outline-primary"
		>
			{text}
		</span>
	);
}
