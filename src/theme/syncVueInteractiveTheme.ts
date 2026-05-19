import type ReactiveNotesVuePlugin from "../main";
import { applyThemeToElement } from "./applyVueInteractiveTheme";
import { resolveEffectiveTheme } from "./getTheme";

export function syncVueInteractiveTheme(plugin: ReactiveNotesVuePlugin): void {
	const theme = resolveEffectiveTheme(plugin.settings.darkMode);
	document.querySelectorAll(".vue-interactive-root").forEach((node) => {
		applyThemeToElement(node as HTMLElement, theme);
	});
}
