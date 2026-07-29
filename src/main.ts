import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, type ReactiveNotesVueSettings } from "./settings";
import { normalizeDarkModePreference } from "./settings/darkMode";
import { normalizeCustomScriptPath } from "./settings/normalizeCustomScriptPath";
import { registerCommands } from "./commands/registerCommands";
import {
	registerVueInteractiveProcessor,
	registerThemeSync,
} from "./processor/registerVueInteractive";
import { registerVaultImportWatch } from "./processor/registerVaultImportWatch";
import { ReactiveNotesVueSettingTab } from "./ui/ReactiveNotesVueSettingTab";
import { syncVueInteractiveTheme } from "./theme/syncVueInteractiveTheme";
import { configurePiniaPersistHost } from "./runtime/pinia/persistHost";
import { installSharedVueRuntimeOnWindow } from "./runtime/sharedRuntime";

export default class ReactiveNotesVuePlugin extends Plugin {
	settings: ReactiveNotesVueSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		installSharedVueRuntimeOnWindow();
		await this.loadSettings();
		configurePiniaPersistHost({
			app: this.app,
			getCustomScriptPath: () =>
				normalizeCustomScriptPath(this.settings.customScriptPath),
		});
		syncVueInteractiveTheme(this);
		this.addSettingTab(new ReactiveNotesVueSettingTab(this.app, this));
		registerVueInteractiveProcessor(this);
		registerVaultImportWatch(this);
		registerThemeSync(this);
		registerCommands(this);
	}

	onunload(): void {}

	async loadSettings(): Promise<void> {
		const data =
			((await this.loadData()) as Partial<ReactiveNotesVueSettings> | null) ??
			{};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
		this.settings.darkMode = normalizeDarkModePreference(data.darkMode);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
