import type { DarkModePreference } from "./settings/darkMode";
import { DEFAULT_DISK_CACHE_PATH } from "./settings/normalizeDiskCachePath";

export interface ReactiveNotesVueSettings {
	enabled: boolean;
	/** Vault-relative folder for `@custom-script/` imports. */
	customScriptPath: string;
	/** Vault-relative file loaded as MathJax TeX preamble (`\newcommand`, etc.). */
	mathJaxPreamblePath: string;
	/** Dark mode for vue-interactive blocks (Tailwind `dark:` / Obsidian theme vars). */
	darkMode: DarkModePreference;
	/**
	 * When true, allow non-safe Node builtins (`node:fs`, etc.) via host bridge.
	 * Default is safe subset only (`node:path`, `node:url`, …).
	 */
	enableExtendedNodeBuiltins: boolean;
	/** Persist compile/module caches under `diskCachePath` (off by default). */
	enableDiskCache: boolean;
	/** Vault-relative folder for on-disk caches (default `.cache`). */
	diskCachePath: string;
}

export const DEFAULT_SETTINGS: ReactiveNotesVueSettings = {
	enabled: true,
	customScriptPath: "",
	mathJaxPreamblePath: "",
	darkMode: "follow-obsidian",
	enableExtendedNodeBuiltins: false,
	enableDiskCache: false,
	diskCachePath: DEFAULT_DISK_CACHE_PATH,
};
