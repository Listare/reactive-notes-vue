import type ReactiveNotesVuePlugin from "../main";
import { forEachVueBlock } from "../runtime/vueBlockRegistry";

/** Re-renders all visible vue-interactive blocks (e.g. after preamble path changes). */
export function refreshVueInteractiveBlocksForMathJax(
	_plugin: ReactiveNotesVuePlugin,
): void {
	queueMicrotask(() => {
		const tasks: Promise<void>[] = [];
		forEachVueBlock((child) => {
			tasks.push(child.refreshFromVault());
		});
		if (tasks.length === 0) return;
		void Promise.all(tasks).catch((e) => {
			const err = e instanceof Error ? e : new Error(String(e));
			console.error("refresh vue-interactive blocks for MathJax", err);
		});
	});
}
