import { MarkdownPostProcessorContext, TFile } from "obsidian";
import type ReactiveNotesVuePlugin from "../main";
import { findVueInteractiveBlockByContent } from "../markdown/findVueInteractiveBlockByContent";
import { VueBlockChild } from "../runtime/VueBlockChild";
import { registerVueBlock } from "../runtime/vueBlockRegistry";
import { registerObsidianThemeSync } from "../theme/registerObsidianThemeSync";

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
	let markdown: string | undefined;
	if (file instanceof TFile) {
		markdown = await plugin.app.vault.read(file);
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
	registerVueBlock(el, child);
	ctx.addChild(child);
	await child.render(source, markdown);
}

export { registerObsidianThemeSync as registerThemeSync };
