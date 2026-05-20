import type { DarkModePreference } from "./settings/darkMode";

export interface ReactiveNotesVueSettings {
	enabled: boolean;
	/** Vault-relative folder for `@custom-script/` imports. */
	customScriptPath: string;
	/** Vault-relative file loaded as MathJax TeX preamble (`\newcommand`, etc.). */
	mathJaxPreamblePath: string;
	/** Dark mode for vue-interactive blocks (Tailwind `dark:` / Obsidian theme vars). */
	darkMode: DarkModePreference;
}

export const DEFAULT_SETTINGS: ReactiveNotesVueSettings = {
	enabled: true,
	customScriptPath: "",
	mathJaxPreamblePath: "",
	darkMode: "follow-obsidian",
};
