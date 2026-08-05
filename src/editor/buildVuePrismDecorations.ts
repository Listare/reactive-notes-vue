import type { Range } from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	type EditorView,
} from "@codemirror/view";
import type { PrismLike } from "./prismHost";
import {
	filterFenceRangesInViewport,
	type VueInteractiveFenceRange,
} from "./findVueInteractiveFenceRanges";
import {
	tokenRangesForCode,
	type PrismTokenNode,
} from "./prismTokenRanges";

function resolveVueGrammar(prism: PrismLike): unknown {
	const languages = prism.languages;
	return languages.vue ?? languages.markup ?? languages.html ?? null;
}

/**
 * Builds CM decorations for vue-interactive fences intersecting the viewport.
 * Pass `fences` from a doc-change cache so viewport updates skip full-doc scans.
 */
export function buildVueInteractiveDecorations(
	view: EditorView,
	prism: PrismLike | null,
	fences: readonly VueInteractiveFenceRange[],
): DecorationSet {
	if (!prism) return Decoration.none;

	const grammar = resolveVueGrammar(prism);
	if (grammar == null) return Decoration.none;

	const inViewport = filterFenceRangesInViewport(
		fences,
		view.viewport.from,
		view.viewport.to,
	);

	const builder: Range<Decoration>[] = [];
	for (const fence of inViewport) {
		const relative = tokenRangesForCode(
			fence.text,
			(text, g) =>
				prism.tokenize(text, g) as Array<string | PrismTokenNode>,
			grammar,
		);
		for (const range of relative) {
			const from = fence.from + range.from;
			const to = fence.from + range.to;
			if (from >= to) continue;
			if (to > view.state.doc.length) continue;
			builder.push(
				Decoration.mark({ class: range.className }).range(from, to),
			);
		}
	}

	return Decoration.set(builder, true);
}
