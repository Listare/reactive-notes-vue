import { parseFenceInfo } from "./extractNamedCodeBlock";
import { isVueSfcLanguage } from "./isVueSfcLanguage";

export const VUE_INTERACTIVE_FENCE_RE =
	/^```vue-interactive([^\n]*)\r?\n([\s\S]*?)^```/gm;

export interface VueInteractiveBlockInfo {
	content: string;
	name?: string;
	hide: boolean;
}

/** All vue-interactive fences in document order. */
export function listVueInteractiveBlocks(
	markdown: string,
): VueInteractiveBlockInfo[] {
	const blocks: VueInteractiveBlockInfo[] = [];
	let match: RegExpExecArray | null;
	VUE_INTERACTIVE_FENCE_RE.lastIndex = 0;
	while ((match = VUE_INTERACTIVE_FENCE_RE.exec(markdown)) !== null) {
		const content = (match[2] ?? "").replace(/\n$/, "");
		const info = parseFenceInfo(`vue-interactive${match[1] ?? ""}`);
		if (!isVueSfcLanguage(info.lang || "vue-interactive")) continue;
		blocks.push({
			content,
			name: info.name,
			hide: info.hide === true,
		});
	}
	return blocks;
}

export function listVisibleVueInteractiveBlocks(
	markdown: string,
): VueInteractiveBlockInfo[] {
	return listVueInteractiveBlocks(markdown).filter((b) => !b.hide);
}
