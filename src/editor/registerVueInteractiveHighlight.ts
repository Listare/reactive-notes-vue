import type { Plugin } from "obsidian";
import { createVueInteractiveHighlightExtension } from "./vueInteractiveHighlightExtension";

/** Registers CM6 highlighting for `vue-interactive` fences (editor / Live Preview). */
export function registerVueInteractiveHighlight(plugin: Plugin): void {
	plugin.registerEditorExtension(createVueInteractiveHighlightExtension());
}
