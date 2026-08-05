import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, type ReactiveNotesVueSettings } from "./settings";
import { normalizeDarkModePreference } from "./settings/darkMode";
import { normalizeCustomScriptPath } from "./settings/normalizeCustomScriptPath";
import {
	DEFAULT_DISK_CACHE_PATH,
	normalizeDiskCachePath,
} from "./settings/normalizeDiskCachePath";
import { normalizeMathJaxPreamblePath } from "./settings/normalizeMathJaxPreamblePath";
import { registerCommands } from "./commands/registerCommands";
import {
	registerVueInteractiveProcessor,
	registerThemeSync,
} from "./processor/registerVueInteractive";
import { registerVaultImportWatch } from "./processor/registerVaultImportWatch";
import { registerVueInteractiveHighlight } from "./editor/registerVueInteractiveHighlight";
import { ReactiveNotesVueSettingTab } from "./ui/ReactiveNotesVueSettingTab";
import { syncVueInteractiveTheme } from "./theme/syncVueInteractiveTheme";
import { configurePiniaPersistHost } from "./runtime/pinia/persistHost";
import { configureDiskCacheHost } from "./cache/diskCacheHost";
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
		configureDiskCacheHost({
			app: this.app,
			isEnabled: () => this.settings.enableDiskCache,
			getRootPath: () =>
				normalizeDiskCachePath(this.settings.diskCachePath),
		});
		syncVueInteractiveTheme(this);
		this.addSettingTab(new ReactiveNotesVueSettingTab(this.app, this));
		registerVueInteractiveProcessor(this);
		registerVueInteractiveHighlight(this);
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
		this.settings.customScriptPath = normalizeCustomScriptPath(
			data.customScriptPath ?? DEFAULT_SETTINGS.customScriptPath,
		);
		this.settings.mathJaxPreamblePath = normalizeMathJaxPreamblePath(
			data.mathJaxPreamblePath ?? DEFAULT_SETTINGS.mathJaxPreamblePath,
		);
		this.settings.diskCachePath = normalizeDiskCachePath(
			data.diskCachePath ?? DEFAULT_DISK_CACHE_PATH,
		);
		this.settings.enableDiskCache = data.enableDiskCache === true;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
