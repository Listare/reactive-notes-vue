import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, type ReactiveNotesVueSettings } from "./settings";
import { registerCommands } from "./commands/registerCommands";
import {
	registerVueInteractiveProcessor,
	registerThemeSync,
} from "./processor/registerVueInteractive";
import { ReactiveNotesVueSettingTab } from "./ui/ReactiveNotesVueSettingTab";

export default class ReactiveNotesVuePlugin extends Plugin {
	settings: ReactiveNotesVueSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new ReactiveNotesVueSettingTab(this.app, this));
		registerVueInteractiveProcessor(this);
		registerThemeSync(this);
		registerCommands(this);
	}

	onunload(): void {}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<ReactiveNotesVueSettings>,
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
