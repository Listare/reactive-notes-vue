import type { VueInteractiveTheme } from "./getTheme";

/** Apply theme classes the same way as ReactiveNotes `updateTheme()`. */
export function applyThemeToElement(
	el: HTMLElement,
	theme: VueInteractiveTheme,
): void {
	if (theme === "dark") {
		el.classList.add("theme-dark", "dark");
		el.classList.remove("theme-light");
	} else {
		el.classList.add("theme-light");
		el.classList.remove("dark", "theme-dark");
	}
}
