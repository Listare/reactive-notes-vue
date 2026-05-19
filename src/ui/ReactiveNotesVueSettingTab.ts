import { App, PluginSettingTab, Setting } from "obsidian";
import type ReactiveNotesVuePlugin from "../main";
import {
	DARK_MODE_OPTIONS,
	type DarkModePreference,
} from "../settings/darkMode";
import { normalizeCustomScriptPath } from "../settings/normalizeCustomScriptPath";
import { applyVueInteractiveThemeSync } from "../theme/registerObsidianThemeSync";

export class ReactiveNotesVueSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: ReactiveNotesVuePlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Reactive Notes Vue")
			.setHeading();

		new Setting(containerEl)
			.setName("暗色模式")
			.setDesc(
				"控制 vue-interactive 块与 Tailwind dark: 变体。默认跟随 Obsidian 主题。",
			)
			.addDropdown((dropdown) => {
				for (const opt of DARK_MODE_OPTIONS) {
					dropdown.addOption(opt.value, opt.label);
				}
				dropdown.setValue(this.plugin.settings.darkMode);
				dropdown.onChange(async (value) => {
					this.plugin.settings.darkMode = value as DarkModePreference;
					await this.plugin.saveSettings();
					applyVueInteractiveThemeSync(this.plugin);
				});
			});

		new Setting(containerEl)
			.setName("自定义脚本路径")
			.setDesc(
				"库内文件夹路径，用于 @custom-script/ 导入（例如 scripts）。仅在使用该前缀导入且路径无效时会报错；未使用时可留空。",
			)
			.addText((text) =>
				text
					.setPlaceholder("例如 scripts")
					.setValue(this.plugin.settings.customScriptPath)
					.onChange(async (value) => {
						this.plugin.settings.customScriptPath =
							normalizeCustomScriptPath(value);
						await this.plugin.saveSettings();
					}),
			);
	}
}
