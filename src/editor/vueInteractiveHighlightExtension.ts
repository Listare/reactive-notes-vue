import { loadPrism } from "obsidian";
import {
	Decoration,
	ViewPlugin,
	type DecorationSet,
	type EditorView,
	type ViewUpdate,
} from "@codemirror/view";
import { buildVueInteractiveDecorations } from "./buildVuePrismDecorations";
import { ensurePrism, getCachedPrism } from "./prismHost";

/**
 * CM6 extension: syntax-highlight `vue-interactive` fences with Prism's `vue`
 * grammar (same as Obsidian reading-mode vue blocks), via `.cm-*` marks.
 */
export function createVueInteractiveHighlightExtension() {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			private destroyed = false;

			constructor(view: EditorView) {
				this.decorations = buildVueInteractiveDecorations(
					view,
					getCachedPrism(),
				);
				void ensurePrism(() => loadPrism()).then((prism) => {
					if (this.destroyed || !prism) return;
					this.decorations = buildVueInteractiveDecorations(
						view,
						prism,
					);
					view.dispatch({});
				});
			}

			update(update: ViewUpdate): void {
				if (
					update.docChanged ||
					update.viewportChanged ||
					(getCachedPrism() != null &&
						this.decorations === Decoration.none)
				) {
					this.decorations = buildVueInteractiveDecorations(
						update.view,
						getCachedPrism(),
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
