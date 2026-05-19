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
