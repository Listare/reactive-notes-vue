import { VUE_INTERACTIVE_FENCE_RE } from "../markdown/vueInteractiveFence";

export interface VueInteractiveFenceRange {
	/** Absolute doc offset of fence body start (after opening fence line). */
	from: number;
	/** Absolute doc offset of fence body end (before closing ```). */
	to: number;
	/** Fence body text (`doc.sliceString(from, to)`). */
	text: string;
}

/**
 * Locates every `vue-interactive` fenced body in `markdown` as absolute
 * `[from, to)` ranges (info strings like `{name=Foo}` are allowed).
 */
export function findVueInteractiveFenceRanges(
	markdown: string,
): VueInteractiveFenceRange[] {
	const ranges: VueInteractiveFenceRange[] = [];
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
		ranges.push({ from, to, text: body });
	}
	return ranges;
}

/** Ranges that intersect `[viewportFrom, viewportTo)`. */
export function filterFenceRangesInViewport(
	ranges: VueInteractiveFenceRange[],
	viewportFrom: number,
	viewportTo: number,
): VueInteractiveFenceRange[] {
	return ranges.filter(
		(range) => range.to > viewportFrom && range.from < viewportTo,
	);
}
