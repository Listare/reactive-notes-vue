import type { VueBlockChild } from "./VueBlockChild";

const blocksByContainer = new WeakMap<HTMLElement, VueBlockChild>();

export function registerVueBlock(
	containerEl: HTMLElement,
	child: VueBlockChild,
): void {
	blocksByContainer.set(containerEl, child);
}

export function getVueBlock(
	containerEl: HTMLElement,
): VueBlockChild | undefined {
	return blocksByContainer.get(containerEl);
}
