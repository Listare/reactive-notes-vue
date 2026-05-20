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
import {
	clearVueSandboxAlive,
	isSandboxMountEmpty,
	markVueSandboxAlive,
	persistVueBlockRemountMetadata,
	vueSandboxNeedsRemount,
} from "./vueBlockRemountMetadata";
import { registerVueBlock } from "./vueBlockRegistry";
import {
	clearVueBlockVaultDependencies,
	setVueBlockVaultDependencies,
} from "./vueBlockDependencyIndex";
import { loadMathJaxPreamble } from "../math/loadMathJaxPreamble";
import type ReactiveNotesVuePlugin from "../main";
import { isSandboxAbortedError } from "./sandboxAbort";

export class VueBlockChild extends MarkdownRenderChild {
	private sandbox: SandboxFrame | null = null;
	private visibleBlockIndex = -1;
	private pendingVaultRefresh = false;
	/** Bumped on each render start and on unload to drop stale async work. */
	private renderEpoch = 0;
	private renderBackoffUntil = 0;
	/** Coalesces concurrent render/remount calls into one in-flight pass. */
	private activeRender: Promise<void> | null = null;

	constructor(
		containerEl: HTMLElement,
		private readonly plugin: ReactiveNotesVuePlugin,
		readonly sourcePath: string,
		initialSource: string,
	) {
		super(containerEl);
		this.lastSource = initialSource;
	}

	onload(): void {
		void this.remountIfNeeded();
	}

	/** Restores content after virtualization unload or DOM re-insert without onload. */
	async remountIfNeeded(): Promise<void> {
		if (this.activeRender) return this.activeRender;
		if (Date.now() < this.renderBackoffUntil) return;
		if (!this.lastSource) return;
		if (!this.needsRemount()) return;

		const file = this.plugin.app.vault.getAbstractFileByPath(this.sourcePath);
		let markdown: string | undefined;
		if (file instanceof TFile) {
			markdown = await this.plugin.app.vault.read(file);
		}
		await this.scheduleRender(this.lastSource, markdown);
	}

	/** True when this child still owns a connected sandbox with mounted Vue output. */
	hasLiveSandbox(): boolean {
		const iframe = this.sandbox?.getIframe();
		if (!(iframe instanceof HTMLIFrameElement) || !iframe.isConnected) {
			return false;
		}
		return !isSandboxMountEmpty(iframe);
	}

	private needsRemount(): boolean {
		if (this.hasLiveSandbox()) return false;
		return vueSandboxNeedsRemount(this.containerEl);
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
		if (this.activeRender) {
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
		return this.scheduleRender(source, markdownForIndex);
	}

	private async scheduleRender(
		source: string,
		markdownForIndex?: string,
	): Promise<void> {
		if (this.activeRender) return this.activeRender;
		this.activeRender = this.doRender(source, markdownForIndex).finally(() => {
			this.activeRender = null;
		});
		return this.activeRender;
	}

	private async doRender(
		source: string,
		markdownForIndex?: string,
	): Promise<void> {
		const epoch = ++this.renderEpoch;
		this.lastSource = source;
		if (markdownForIndex != null) {
			this.rememberBlockIndex(source, markdownForIndex);
		}
		persistVueBlockRemountMetadata(
			this.containerEl,
			this.sourcePath,
			this.visibleBlockIndex,
		);
		clearVueSandboxAlive(this.containerEl);
		this.teardownSandbox();
		if (this.abortRenderIfStale(epoch)) return;

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
			if (this.abortRenderIfStale(epoch)) return;
			setVueBlockVaultDependencies(this, compiled.vaultDependencies);
			validateModuleSyntax(compiled.moduleCode, compiled.stackRegions);
			const sandbox = new SandboxFrame(host, this.plugin.app);
			this.sandbox = sandbox;
			await sandbox.init();
			if (this.abortRenderIfStale(epoch)) return;
			const theme = this.currentTheme();
			const mathJaxPreamble = await loadMathJaxPreamble(
				this.plugin.app,
				this.plugin.settings.mathJaxPreamblePath,
			);
			if (this.abortRenderIfStale(epoch)) return;
			await sandbox.renderInSandbox(
				{
					moduleCode: compiled.moduleCode,
					stackRegions: compiled.stackRegions,
					styles: compiled.styles,
					scopeId: compiled.scopeId,
					theme,
					mathJaxPreamble,
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
			markVueSandboxAlive(this.containerEl);
		} catch (e) {
			if (this.abortRenderIfStale(epoch)) return;
			if (isSandboxAbortedError(e)) return;
			clearVueSandboxAlive(this.containerEl);
			clearVueBlockVaultDependencies(this);
			const err = e instanceof Error ? e : new Error(String(e));
			if (
				err.message.includes("沙盒初始化超时") ||
				err.message.includes("沙盒渲染超时")
			) {
				this.renderBackoffUntil = Date.now() + 60_000;
			}
			const loc = parseModuleLoadErrorLocation(err.message);
			renderError(this.containerEl, err.message, {
				stack: err.stack,
				loc,
			});
		} finally {
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

	private abortRenderIfStale(epoch: number): boolean {
		if (epoch === this.renderEpoch) return false;
		this.teardownSandbox();
		return true;
	}

	onunload(): void {
		const el = this.containerEl;
		// Obsidian may call onunload after the section is re-inserted (scroll back).
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				if (el.isConnected) return;
				this.performUnload();
			});
		});
	}

	private performUnload(): void {
		this.renderEpoch++;
		clearVueSandboxAlive(this.containerEl);
		persistVueBlockRemountMetadata(
			this.containerEl,
			this.sourcePath,
			this.visibleBlockIndex,
		);
		clearVueBlockVaultDependencies(this);
		this.teardownSandbox();
		this.restoreLoadingShellAfterUnload();
	}

	/** Keeps a visible shell so reading-view virtualization can detect and remount. */
	private restoreLoadingShellAfterUnload(): void {
		const existing = this.containerEl.querySelector(
			".vue-interactive-sandbox-host",
		);
		let host: HTMLElement;
		if (existing instanceof HTMLElement) {
			host = existing;
			host.empty();
		} else {
			this.containerEl.empty();
			this.containerEl.addClass("vue-interactive-root");
			host = this.containerEl.createDiv({
				cls: "vue-interactive-sandbox-host",
			});
		}
		renderLoadingPlaceholder(host);
	}
}
