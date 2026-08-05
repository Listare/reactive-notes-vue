import { parseFenceInfo } from "./extractNamedCodeBlock";
import { isVueSfcLanguage } from "./isVueSfcLanguage";

export const VUE_INTERACTIVE_FENCE_RE =
	/^```vue-interactive([^\n]*)\r?\n([\s\S]*?)^```/gm;

export interface VueInteractiveBlockInfo {
	content: string;
	name?: string;
	hide: boolean;
}

/** One regex match over a vue-interactive fence, with absolute body offsets. */
export interface VueInteractiveFenceMatch {
	/** Absolute offset of fence body start (after opening fence line). */
	from: number;
	/** Absolute offset of fence body end (before closing ```). */
	to: number;
	/** Raw fence body (`markdown.slice(from, to)`), keeps trailing newline. */
	body: string;
	/** Capture after `vue-interactive` on the opening fence line. */
	infoSuffix: string;
}

/**
 * Yields every `vue-interactive` fence match in document order.
 * Shared by listing (processor) and absolute-range scanning (editor highlight).
 */
export function* iterVueInteractiveFenceMatches(
	markdown: string,
): Generator<VueInteractiveFenceMatch> {
	const re = new RegExp(
		VUE_INTERACTIVE_FENCE_RE.source,
		VUE_INTERACTIVE_FENCE_RE.flags,
	);
	let match: RegExpExecArray | null;
	while ((match = re.exec(markdown)) !== null) {
		const body = match[2] ?? "";
		// match[0] === openingFenceLine + body + "```"
		const bodyOffsetInMatch = match[0].length - body.length - 3;
		if (bodyOffsetInMatch < 0) continue;
		const from = match.index + bodyOffsetInMatch;
		const to = from + body.length;
		yield {
			from,
			to,
			body,
			infoSuffix: match[1] ?? "",
		};
	}
}

/** All vue-interactive fences in document order. */
export function listVueInteractiveBlocks(
	markdown: string,
): VueInteractiveBlockInfo[] {
	const blocks: VueInteractiveBlockInfo[] = [];
	for (const fence of iterVueInteractiveFenceMatches(markdown)) {
		const content = fence.body.replace(/\n$/, "");
		const info = parseFenceInfo(`vue-interactive${fence.infoSuffix}`);
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
