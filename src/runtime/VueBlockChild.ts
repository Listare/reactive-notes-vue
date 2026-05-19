import { MarkdownRenderChild, TFile } from "obsidian";
import { invalidateCompileCacheForNote } from "../cache/vueInteractiveCaches";
import { compileSfcWithImports } from "../compiler/compileSfcWithImports";
import {
	listVisibleVueInteractiveBlocks,
	type VueInteractiveBlockInfo,
} from "../markdown/vueInteractiveFence";
import { applyThemeToElement } from "../theme/applyVueInteractiveTheme";
import { resolveEffectiveTheme } from "../theme/getTheme";
import { parseModuleLoadErrorLocation } from "../ui/parseModuleLoadError";
import { renderError } from "../ui/renderError";
import { validateModuleSyntax } from "./validateModuleSyntax";
import { renderLoadingPlaceholder } from "../ui/renderLoadingPlaceholder";
import { SandboxFrame } from "./sandboxFrame";
import { registerVueBlock } from "./vueBlockRegistry";
import {
	clearVueBlockVaultDependencies,
	setVueBlockVaultDependencies,
} from "./vueBlockDependencyIndex";
import type ReactiveNotesVuePlugin from "../main";

export class VueBlockChild extends MarkdownRenderChild {
	private sandbox: SandboxFrame | null = null;
	private visibleBlockIndex = -1;
	private rendering = false;
	private pendingVaultRefresh = false;

	constructor(
		containerEl: HTMLElement,
		private readonly plugin: ReactiveNotesVuePlugin,
		readonly sourcePath: string,
	) {
		super(containerEl);
	}

	/** Resolves latest block source from vault markdown for refresh. */
	resolveSourceForRefresh(
		visibleBlocks: VueInteractiveBlockInfo[],
	): string | null {
		if (
			this.visibleBlockIndex >= 0 &&
			this.visibleBlockIndex < visibleBlocks.length
		) {
			return visibleBlocks[this.visibleBlockIndex]!.content;
		}
		const normalized = this.lastSource.trim();
		const byContent = visibleBlocks.find(
			(b) => b.content.trim() === normalized,
		);
		return byContent?.content ?? null;
	}

	private lastSource = "";

	private rememberBlockIndex(source: string, markdown: string): void {
		const normalized = source.trim();
		let visibleIdx = 0;
		for (const block of listVisibleVueInteractiveBlocks(markdown)) {
			if (block.content.trim() === normalized) {
				this.visibleBlockIndex = visibleIdx;
				return;
			}
			visibleIdx++;
		}
		this.visibleBlockIndex = -1;
	}

	private currentTheme() {
		return resolveEffectiveTheme(this.plugin.settings.darkMode);
	}

	/** Re-reads the host note and re-renders (e.g. after an imported file changes). */
	async refreshFromVault(): Promise<void> {
		if (this.rendering) {
			this.pendingVaultRefresh = true;
			return;
		}
		const file = this.plugin.app.vault.getAbstractFileByPath(this.sourcePath);
		if (!(file instanceof TFile)) return;
		const markdown = await this.plugin.app.vault.read(file);
		const blocks = listVisibleVueInteractiveBlocks(markdown);
		const source = this.resolveSourceForRefresh(blocks);
		if (source == null) return;
		invalidateCompileCacheForNote(this.sourcePath);
		await this.render(source, markdown);
	}

	async render(source: string, markdownForIndex?: string): Promise<void> {
		this.rendering = true;
		this.lastSource = source;
		if (markdownForIndex != null) {
			this.rememberBlockIndex(source, markdownForIndex);
		}
		this.teardownSandbox();
		this.containerEl.empty();
		this.containerEl.addClass("vue-interactive-root");
		registerVueBlock(this.containerEl, this);
		this.applyThemeClass();

		const host = this.containerEl.createDiv({
			cls: "vue-interactive-sandbox-host",
		});
		const runtimeErrorHost = this.containerEl.createDiv({
			cls: "vue-interactive-runtime-error-host",
		});
		const placeholder = renderLoadingPlaceholder(host);

		try {
			const compiled = await compileSfcWithImports(source, {
				app: this.plugin.app,
				settings: this.plugin.settings,
				sourcePath: this.sourcePath,
			});
			setVueBlockVaultDependencies(this, compiled.vaultDependencies);
			validateModuleSyntax(compiled.moduleCode, compiled.stackRegions);
			const sandbox = new SandboxFrame(host, this.plugin.app);
			this.sandbox = sandbox;
			await sandbox.init();
			const theme = this.currentTheme();
			await sandbox.renderInSandbox(
				{
					moduleCode: compiled.moduleCode,
					stackRegions: compiled.stackRegions,
					styles: compiled.styles,
					scopeId: compiled.scopeId,
					theme,
				},
				(error) => {
					const loc = parseModuleLoadErrorLocation(error.message);
					renderError(runtimeErrorHost, error.message, {
						stack: error.stack,
						loc,
						title: "运行时错误",
					});
				},
			);
			placeholder.remove();
		} catch (e) {
			clearVueBlockVaultDependencies(this);
			const err = e instanceof Error ? e : new Error(String(e));
			const loc = parseModuleLoadErrorLocation(err.message);
			renderError(this.containerEl, err.message, {
				stack: err.stack,
				loc,
			});
		} finally {
			this.rendering = false;
			if (this.pendingVaultRefresh) {
				this.pendingVaultRefresh = false;
				await this.refreshFromVault();
			}
		}
	}

	applyThemeClass(): void {
		applyThemeToElement(this.containerEl, this.currentTheme());
	}

	/** Re-applies theme on the host and live sandbox without recompiling. */
	syncTheme(): void {
		this.applyThemeClass();
		this.sandbox?.setTheme(this.currentTheme());
	}

	private teardownSandbox(): void {
		this.sandbox?.unmount();
		this.sandbox = null;
	}

	onunload(): void {
		clearVueBlockVaultDependencies(this);
		this.teardownSandbox();
		this.containerEl.empty();
	}
}
