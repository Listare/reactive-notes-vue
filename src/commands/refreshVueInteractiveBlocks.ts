import { MarkdownView, Notice, TFile } from "obsidian";
import { invalidateVueInteractiveCaches } from "../cache/vueInteractiveCaches";
import { listVisibleVueInteractiveBlocks } from "../markdown/vueInteractiveFence";
import { getVueBlock } from "../runtime/vueBlockRegistry";
import type ReactiveNotesVuePlugin from "../main";

export async function refreshVueInteractiveBlocksOnActivePage(
	plugin: ReactiveNotesVuePlugin,
): Promise<void> {
	const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!view?.file) {
		new Notice("请先打开一篇笔记。");
		return;
	}

	if (view.getMode() === "source") {
		new Notice("请切换到阅读模式或实时预览后再刷新。");
		return;
	}

	const roots = view.contentEl.querySelectorAll(".vue-interactive-root");
	if (roots.length === 0) {
		new Notice("当前页面中没有可刷新的 vue-interactive 块。");
		return;
	}

	invalidateVueInteractiveCaches();

	const markdownByPath = new Map<string, string>();

	const readMarkdown = async (sourcePath: string): Promise<string | null> => {
		const cached = markdownByPath.get(sourcePath);
		if (cached != null) return cached;
		const file = plugin.app.vault.getAbstractFileByPath(sourcePath);
		if (!(file instanceof TFile)) return null;
		const markdown = await plugin.app.vault.read(file);
		markdownByPath.set(sourcePath, markdown);
		return markdown;
	};

	const tasks: Promise<void>[] = [];
	for (const root of Array.from(roots)) {
		const el = root as HTMLElement;
		const child = getVueBlock(el);
		if (!child) continue;
		const markdown = await readMarkdown(child.sourcePath);
		if (markdown == null) continue;
		const blocks = listVisibleVueInteractiveBlocks(markdown);
		const source = child.resolveSourceForRefresh(blocks);
		if (source == null) continue;
		tasks.push(child.render(source, markdown));
	}

	if (tasks.length === 0) {
		new Notice("未能刷新 vue-interactive 块（内部状态已失效，请重新打开笔记）。");
		return;
	}

	await Promise.all(tasks);
	new Notice(`已刷新 ${tasks.length} 个 vue-interactive 块。`);
}
