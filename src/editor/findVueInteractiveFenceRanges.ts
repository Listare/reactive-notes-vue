import { iterVueInteractiveFenceMatches } from "../markdown/vueInteractiveFence";

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
	for (const fence of iterVueInteractiveFenceMatches(markdown)) {
		ranges.push({ from: fence.from, to: fence.to, text: fence.body });
	}
	return ranges;
}

/** Ranges that intersect `[viewportFrom, viewportTo)`. */
export function filterFenceRangesInViewport(
	ranges: readonly VueInteractiveFenceRange[],
	viewportFrom: number,
	viewportTo: number,
): VueInteractiveFenceRange[] {
	return ranges.filter(
		(range) => range.to > viewportFrom && range.from < viewportTo,
	);
}
