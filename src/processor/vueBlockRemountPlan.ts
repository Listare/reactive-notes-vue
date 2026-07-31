import { listVisibleVueInteractiveBlocks } from "../markdown/vueInteractiveFence";

export const VUE_BLOCK_SELECTOR = ".block-language-vue-interactive";

/**
 * Skip code-block shells that were never mounted (processor owns first mount).
 * Registry-backed roots may still remount after virtualization.
 */
export function shouldSkipUnregisteredBlock(options: {
	hasVueBlock: boolean;
	isBlockLanguage: boolean;
	mountedAttr: string | null;
}): boolean {
	return (
		!options.hasVueBlock &&
		options.isBlockLanguage &&
		options.mountedAttr !== "1"
	);
}

/** Whether a preview node should be queued for remount / ensure-mounted. */
export function shouldScheduleVueBlockRemount(options: {
	hasLiveSandbox: boolean;
	hasVueBlock: boolean;
	isBlockLanguage: boolean;
	mountedAttr: string | null;
	needsRemount: boolean;
}): boolean {
	if (options.hasLiveSandbox) return false;
	if (
		shouldSkipUnregisteredBlock({
			hasVueBlock: options.hasVueBlock,
			isBlockLanguage: options.isBlockLanguage,
			mountedAttr: options.mountedAttr,
		})
	) {
		return false;
	}
	return options.needsRemount;
}

/** Whether a `code.language-vue-interactive` container should start a remount. */
export function shouldRemountFromCodeSource(options: {
	containerNeedsRemount: boolean;
	hasVueBlock: boolean;
	isBlockLanguage: boolean;
	mountedAttr: string | null;
	source: string;
	alreadyScheduled: boolean;
}): boolean {
	if (!options.containerNeedsRemount) return false;
	if (options.hasVueBlock) return false;
	if (
		shouldSkipUnregisteredBlock({
			hasVueBlock: false,
			isBlockLanguage: options.isBlockLanguage,
			mountedAttr: options.mountedAttr,
		})
	) {
		return false;
	}
	if (!options.source.trim()) return false;
	if (options.alreadyScheduled) return false;
	return true;
}

/**
 * Pick SFC source from vault markdown using stored index, then preview DOM index.
 */
export function pickVueBlockSourceFromMarkdown(
	markdown: string,
	options: {
		indexAttr?: string | null;
		previewIndex?: number;
	},
): string | null {
	const blocks = listVisibleVueInteractiveBlocks(markdown);

	if (options.indexAttr != null) {
		const idx = Number.parseInt(options.indexAttr, 10);
		if (!Number.isNaN(idx)) {
			const block = blocks[idx];
			if (block) return block.content;
		}
	}

	if (options.previewIndex != null && options.previewIndex >= 0) {
		const block = blocks[options.previewIndex];
		if (block) return block.content;
	}

	return null;
}

export function blockIndexInPreview(
	el: HTMLElement,
	root: ParentNode,
	selector = VUE_BLOCK_SELECTOR,
): number {
	return Array.from(root.querySelectorAll(selector)).indexOf(el);
}

export function resolveCodeBlockContainer(code: HTMLElement): HTMLElement {
	const block = code.closest(VUE_BLOCK_SELECTOR);
	if (block instanceof HTMLElement) return block;
	const pre = code.closest("pre");
	if (pre?.parentElement instanceof HTMLElement) return pre.parentElement;
	return code.parentElement ?? code;
}
