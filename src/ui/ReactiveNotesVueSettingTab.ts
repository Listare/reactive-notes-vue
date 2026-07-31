import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type ReactiveNotesVuePlugin from "../main";
import { clearAllVueInteractiveCaches } from "../cache/vueInteractiveCaches";
import {
	DARK_MODE_OPTIONS,
	type DarkModePreference,
} from "../settings/darkMode";
import { normalizeCustomScriptPath } from "../settings/normalizeCustomScriptPath";
import {
	DEFAULT_DISK_CACHE_PATH,
	normalizeDiskCachePath,
} from "../settings/normalizeDiskCachePath";
import { normalizeMathJaxPreamblePath } from "../settings/normalizeMathJaxPreamblePath";
import { refreshVueInteractiveBlocksForMathJax } from "../math/refreshMathJaxBlocks";
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

		new Setting(containerEl)
			.setName("MathJax 前置文件")
			.setDesc(
				"库内 TeX 文件路径，在渲染公式前执行（例如 preamble.sty，可写 \\newcommand）。留空则不加载；修改文件后打开笔记的块会自动刷新。",
			)
			.addText((text) =>
				text
					.setPlaceholder("例如 preamble.sty")
					.setValue(this.plugin.settings.mathJaxPreamblePath)
					.onChange(async (value) => {
						this.plugin.settings.mathJaxPreamblePath =
							normalizeMathJaxPreamblePath(value);
						await this.plugin.saveSettings();
						refreshVueInteractiveBlocksForMathJax(this.plugin);
					}),
			);

		new Setting(containerEl)
			.setName("允许扩展 Node 内置模块")
			.setDesc(
				"默认仅允许安全子集（如 node:path、node:url）。开启后可通过 node:fs 等访问本机能力，请仅信任自己的笔记脚本。",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableExtendedNodeBuiltins)
					.onChange(async (value) => {
						this.plugin.settings.enableExtendedNodeBuiltins = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("启用磁盘缓存")
			.setDesc(
				"将编译结果与 ESM CDN 模块缓存到库内文件夹，重启后可跳过重复编译与下载。默认关闭。",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableDiskCache)
					.onChange(async (value) => {
						this.plugin.settings.enableDiskCache = value;
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		const diskPathSetting = new Setting(containerEl)
			.setName("磁盘缓存路径")
			.setDesc(
				`库内文件夹路径（默认 ${DEFAULT_DISK_CACHE_PATH}）。缓存写入该目录下的 reactive-notes-vue/ 子文件夹。`,
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_DISK_CACHE_PATH)
					.setValue(this.plugin.settings.diskCachePath)
					.setDisabled(!this.plugin.settings.enableDiskCache)
					.onChange(async (value) => {
						this.plugin.settings.diskCachePath =
							normalizeDiskCachePath(value);
						await this.plugin.saveSettings();
					}),
			);
		if (!this.plugin.settings.enableDiskCache) {
			diskPathSetting.setDisabled(true);
		}

		new Setting(containerEl)
			.setName("清除磁盘缓存")
			.setDesc("清空内存缓存，并删除磁盘缓存路径下的插件缓存文件夹。")
			.addButton((button) =>
				button
					.setButtonText("清除缓存")
					.setWarning()
					.onClick(async () => {
						button.setDisabled(true);
						try {
							await clearAllVueInteractiveCaches();
							new Notice("已清除 vue-interactive 缓存。");
						} catch (e) {
							const err =
								e instanceof Error ? e : new Error(String(e));
							console.error("clear disk cache failed", err);
							new Notice(`清除缓存失败：${err.message}`);
						} finally {
							button.setDisabled(false);
						}
					}),
			);
	}
}
