import type { MarkdownPostProcessorContext } from "obsidian";
import type ReactiveNotesVuePlugin from "../main";
import { VueBlockChild } from "../runtime/VueBlockChild";

export function registerVueInteractiveProcessor(
	plugin: ReactiveNotesVuePlugin,
): void {
	plugin.registerMarkdownCodeBlockProcessor(
		"vue-interactive",
		(source, el, ctx: MarkdownPostProcessorContext) => {
			const child = new VueBlockChild(el);
			ctx.addChild(child);
			void child.render(source);
		},
	);
}

export function registerThemeSync(plugin: ReactiveNotesVuePlugin): void {
	plugin.registerEvent(
		plugin.app.workspace.on("css-change", () => {
			document.querySelectorAll(".vue-interactive-root").forEach((node) => {
				if (document.body.classList.contains("theme-dark")) {
					node.classList.add("theme-dark");
				} else {
					node.classList.remove("theme-dark");
				}
			});
		}),
	);
}
