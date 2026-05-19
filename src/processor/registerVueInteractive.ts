import { MarkdownPostProcessorContext, TFile } from "obsidian";
import type ReactiveNotesVuePlugin from "../main";
import { findVueInteractiveBlockByContent } from "../markdown/findVueInteractiveBlockByContent";
import { VueBlockChild } from "../runtime/VueBlockChild";

export function registerVueInteractiveProcessor(
	plugin: ReactiveNotesVuePlugin,
): void {
	plugin.registerMarkdownCodeBlockProcessor(
		"vue-interactive",
		(source, el, ctx: MarkdownPostProcessorContext) => {
			void renderVueInteractiveBlock(plugin, source, el, ctx);
		},
	);
}

async function renderVueInteractiveBlock(
	plugin: ReactiveNotesVuePlugin,
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
): Promise<void> {
	const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (file instanceof TFile) {
		const markdown = await plugin.app.vault.read(file);
		const fence = findVueInteractiveBlockByContent(markdown, source);
		if (fence?.hide) {
			el.addClass("vue-interactive-hidden");
			if (fence.name) {
				el.setAttr("data-export-name", fence.name);
			}
			return;
		}
	}

	const child = new VueBlockChild(el, plugin, ctx.sourcePath);
	ctx.addChild(child);
	await child.render(source);
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
