import { MarkdownView } from "obsidian";
import type ReactiveNotesVuePlugin from "../main";

const scrollListenerAttached = new WeakSet<HTMLElement>();

export function forEachMarkdownPreview(
	plugin: ReactiveNotesVuePlugin,
	fn: (root: HTMLElement, sourcePath: string) => void,
): void {
	plugin.app.workspace.iterateAllLeaves((leaf) => {
		const { view } = leaf;
		if (!(view instanceof MarkdownView) || !view.file) return;
		if (view.getMode() === "source") return;
		const root = view.previewMode?.containerEl ?? view.contentEl;
		fn(root, view.file.path);
	});
}

export function attachPreviewScrollListeners(
	plugin: ReactiveNotesVuePlugin,
	scheduleRemount: () => void,
): void {
	forEachMarkdownPreview(plugin, (root) => {
		const scrollers = [
			root,
			root.querySelector(".markdown-preview-view"),
			root.querySelector(".markdown-preview-sizer"),
		];
		for (const el of scrollers) {
			if (!(el instanceof HTMLElement)) continue;
			if (scrollListenerAttached.has(el)) continue;
			scrollListenerAttached.add(el);
			plugin.registerDomEvent(el, "scroll", scheduleRemount, {
				passive: true,
			});
		}
	});
}
