import type { VueBlockChild } from "./VueBlockChild";

const blocksByContainer = new WeakMap<HTMLElement, VueBlockChild>();

export function registerVueBlock(
	containerEl: HTMLElement,
	child: VueBlockChild,
): void {
	blocksByContainer.set(containerEl, child);
}

const INSERT_REMOUNT_ATTR = "data-vue-interactive-insert-remount";

/** Obsidian may re-insert off-screen blocks without calling MarkdownRenderChild.onload again. */
export function registerVueBlockInsertRemount(containerEl: HTMLElement): void {
	if (containerEl.getAttr(INSERT_REMOUNT_ATTR) === "1") return;
	containerEl.setAttr(INSERT_REMOUNT_ATTR, "1");
	containerEl.onNodeInserted(() => {
		queueMicrotask(() => {
			const block = getVueBlock(containerEl);
			if (!block) return;
			void block.remountIfNeeded();
		});
	});
}

export function getVueBlock(
	containerEl: HTMLElement,
): VueBlockChild | undefined {
	return blocksByContainer.get(containerEl);
}

export function forEachVueBlock(
	fn: (child: VueBlockChild) => void,
): void {
	for (const el of Array.from(
		document.querySelectorAll(".vue-interactive-root"),
	)) {
		const child = getVueBlock(el as HTMLElement);
		if (child) fn(child);
	}
}
