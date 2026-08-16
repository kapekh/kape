const BLOCK = new Set(["DIV", "P", "LI", "H1", "H2", "H3", "H4", "H5", "H6"]);

/**
 * The stored source behind a rendered node: `*asterisks*` back around an accent
 * span, a newline back out of a `<br>`. The inverse of `renderTitle`, so a node
 * edited in place round-trips to the string the studio's own form would save.
 */
export function sourceOf(node: Element): string {
	let out = "";
	const walk = (parent: Node) => {
		for (const child of parent.childNodes) {
			if (child.nodeType === Node.TEXT_NODE) {
				out += child.nodeValue ?? "";
				continue;
			}
			if (!(child instanceof Element)) continue;
			if (child.tagName === "BR") {
				out += "\n";
				continue;
			}
			if (child.hasAttribute("data-cms-accent")) {
				const inner = (child.textContent ?? "").trim();
				out += inner ? `*${inner}*` : "";
				continue;
			}
			if (BLOCK.has(child.tagName) && out && !out.endsWith("\n")) out += "\n";
			walk(child);
		}
	};
	walk(node);
	// a contenteditable pads with nbsp, and browsers leave a trailing break behind
	return out.replace(/\u00a0/g, " ").replace(/\s+$/, "");
}
