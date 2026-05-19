import { listVueInteractiveBlocks } from "./vueInteractiveFence";

export interface VueInteractiveFenceMatch {
	name?: string;
	hide: boolean;
}

/** Locates a vue-interactive fence whose body matches `source`. */
export function findVueInteractiveBlockByContent(
	markdown: string,
	source: string,
): VueInteractiveFenceMatch | null {
	const normalized = source.trim();
	for (const block of listVueInteractiveBlocks(markdown)) {
		if (block.content.trim() !== normalized) continue;
		return {
			name: block.name,
			hide: block.hide,
		};
	}
	return null;
}
