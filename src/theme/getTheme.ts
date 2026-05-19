import type { DarkModePreference } from "../settings/darkMode";

export type VueInteractiveTheme = "dark" | "light";

type ObsidianBody = HTMLElement & { hasClass?: (name: string) => boolean };

/** Matches ReactiveNotes: `document.body.hasClass('theme-dark') ? 'dark' : 'light'`. */
export function getObsidianTheme(doc: Document = document): VueInteractiveTheme {
	const body = doc.body as ObsidianBody;
	if (typeof body.hasClass === "function") {
		return body.hasClass("theme-dark") ? "dark" : "light";
	}
	return body.classList.contains("theme-dark") ? "dark" : "light";
}

export function resolveEffectiveTheme(
	preference: DarkModePreference,
	doc: Document = document,
): VueInteractiveTheme {
	if (preference === "dark") return "dark";
	if (preference === "light") return "light";
	return getObsidianTheme(doc);
}

export function isDarkTheme(theme: VueInteractiveTheme): boolean {
	return theme === "dark";
}
