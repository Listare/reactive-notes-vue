import { loadPrism } from "obsidian";
import {
	Decoration,
	ViewPlugin,
	type DecorationSet,
	type EditorView,
	type ViewUpdate,
} from "@codemirror/view";
import { buildVueInteractiveDecorations } from "./buildVuePrismDecorations";
import {
	findVueInteractiveFenceRanges,
	type VueInteractiveFenceRange,
} from "./findVueInteractiveFenceRanges";
import { ensurePrism, getCachedPrism } from "./prismHost";

/**
 * CM6 extension: syntax-highlight `vue-interactive` fences with Prism's `vue`
 * grammar (same as Obsidian reading-mode vue blocks), via `.cm-*` marks.
 *
 * Fence ranges are cached and recomputed only on `docChanged`; viewport
 * updates reuse the cache so scrolling does not re-scan the full document.
 */
export function createVueInteractiveHighlightExtension() {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			private fences: VueInteractiveFenceRange[];
			private destroyed = false;

			constructor(view: EditorView) {
				this.fences = findVueInteractiveFenceRanges(
					view.state.doc.toString(),
				);
				this.decorations = buildVueInteractiveDecorations(
					view,
					getCachedPrism(),
					this.fences,
				);
				void ensurePrism(() => loadPrism()).then((prism) => {
					if (this.destroyed || !prism) return;
					this.decorations = buildVueInteractiveDecorations(
						view,
						prism,
						this.fences,
					);
					view.dispatch({});
				});
			}

			update(update: ViewUpdate): void {
				if (update.docChanged) {
					this.fences = findVueInteractiveFenceRanges(
						update.view.state.doc.toString(),
					);
				}
				if (
					update.docChanged ||
					update.viewportChanged ||
					(getCachedPrism() != null &&
						this.decorations === Decoration.none)
				) {
					this.decorations = buildVueInteractiveDecorations(
						update.view,
						getCachedPrism(),
						this.fences,
					);
				}
			}

			destroy(): void {
				this.destroyed = true;
			}
		},
		{
			decorations: (value) => value.decorations,
		},
	);
}
