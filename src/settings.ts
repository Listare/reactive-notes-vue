import type { DarkModePreference } from "./settings/darkMode";

export interface ReactiveNotesVueSettings {
	enabled: boolean;
	/** Vault-relative folder for `@custom-script/` imports. */
	customScriptPath: string;
	/** Dark mode for vue-interactive blocks (Tailwind `dark:` / Obsidian theme vars). */
	darkMode: DarkModePreference;
}

export const DEFAULT_SETTINGS: ReactiveNotesVueSettings = {
	enabled: true,
	customScriptPath: "",
	darkMode: "follow-obsidian",
};
