import { Node } from "@tiptap/core";

const LIST_CLASS =
	"my-6 grid grid-cols-1 gap-x-6 text-[0.95em] sm:grid-cols-[minmax(6rem,max-content)_1fr]";
const TERM_CLASS =
	"pt-1 font-semibold text-primary sm:border-b sm:border-border/50 sm:py-1.5";
const DETAILS_CLASS =
	"border-b border-border/50 pb-1 text-foreground/85 sm:py-1.5";

export const DescriptionList = Node.create({
	name: "descriptionList",
	group: "block",
	content: "(descriptionTerm descriptionDetails)+",
	defining: true,

	parseHTML() {
		return [{ tag: "dl" }];
	},

	renderHTML() {
		return ["dl", { class: LIST_CLASS }, 0];
	},
});

export const DescriptionTerm = Node.create({
	name: "descriptionTerm",
	content: "inline*",
	defining: true,

	parseHTML() {
		return [{ tag: "dt" }];
	},

	renderHTML() {
		return ["dt", { class: TERM_CLASS }, 0];
	},

	addKeyboardShortcuts() {
		return {
			Enter: () => {
				const { $from } = this.editor.state.selection;
				if ($from.parent.type.name !== this.name) return false;
				return this.editor.commands.setTextSelection($from.after() + 1);
			},
		};
	},
});

export const DescriptionDetails = Node.create({
	name: "descriptionDetails",
	content: "inline*",
	defining: true,

	parseHTML() {
		return [{ tag: "dd" }];
	},

	renderHTML() {
		return ["dd", { class: DETAILS_CLASS }, 0];
	},

	addKeyboardShortcuts() {
		return {
			Enter: () => {
				const { $from } = this.editor.state.selection;
				if ($from.parent.type.name !== this.name) return false;
				const pos = $from.after();
				return this.editor
					.chain()
					.insertContentAt(pos, [
						{ type: "descriptionTerm" },
						{ type: "descriptionDetails" },
					])
					.setTextSelection(pos + 1)
					.run();
			},
		};
	},
});

export const emptyDescriptionList = {
	type: "descriptionList",
	content: [{ type: "descriptionTerm" }, { type: "descriptionDetails" }],
};
