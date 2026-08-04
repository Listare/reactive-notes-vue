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
import { isCompileTimeError } from "./formatDisplayError";
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
import { getVueBlock, registerVueBlock } from "./vueBlockRegistry";
import {
	clearVueBlockVaultDependencies,
	setVueBlockVaultDependencies,
} from "./vueBlockDependencyIndex";
import { loadMathJaxPreamble } from "../math/loadMathJaxPreamble";
import type ReactiveNotesVuePlugin from "../main";
import { isSandboxAbortedError } from "./sandboxAbort";
import {
	findVisibleBlockIndex,
	isRenderEpochStale,
	resolveVisibleBlockSource,
	SANDBOX_TIMEOUT_BACKOFF_MS,
	shouldBackoffOnSandboxTimeout,
} from "./vueBlockSourceResolve";
import { readVaultTextCoalesced } from "../vault/vaultFileAccess";
import { prefetchEsmGraph } from "./esm/prefetchEsmGraph";
import { resolveUrlDependencies } from "./esm/resolveUrlDependencies";
import {
	applyHostMinHeight,
	persistBlockHeight,
	readPersistedBlockHeight,
	resolveLayoutHeightPx,
} from "./vueBlockHeightPersist";

export class VueBlockChild extends MarkdownRenderChild {
	private sandbox: SandboxFrame | null = null;
	private visibleBlockIndex = -1;
	private pendingVaultRefresh = false;
	private pendingRender: {
		source: string;
		markdownForIndex?: string;
	} | null = null;
	/** Bumped on each render start and on unload to drop stale async work. */
	private renderEpoch = 0;
	private renderBackoffUntil = 0;
	private backoffRetryTimer: number | null = null;
	/** Coalesces concurrent render/remount calls into one in-flight pass. */
	private activeRender: Promise<void> | null = null;
	private lastSource = "";
	private sandboxHost: HTMLElement | null = null;
	private runtimeErrorHost: HTMLElement | null = null;

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
		if (!this.containerEl.isConnected) return;
		if (this.activeRender) {
			try {
				await this.activeRender;
			} catch {
				// Prior render failed; fall through and retry when still needed.
			}
			if (!this.containerEl.isConnected) return;
			if (!this.needsRemount()) return;
		}
		if (Date.now() < this.renderBackoffUntil) return;
		if (!this.lastSource) return;
		if (!this.needsRemount()) return;

		const markdown = await this.readHostMarkdown();
		if (!this.containerEl.isConnected) return;
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
		return resolveVisibleBlockSource(
			this.lastSource,
			this.visibleBlockIndex,
			visibleBlocks,
		);
	}

	private currentTheme() {
		return resolveEffectiveTheme(this.plugin.settings.darkMode);
	}

	private async readHostMarkdown(): Promise<string | undefined> {
		const file = this.plugin.app.vault.getAbstractFileByPath(this.sourcePath);
		if (!(file instanceof TFile)) return undefined;
		return readVaultTextCoalesced(this.plugin.app, this.sourcePath);
	}

	private async resolveVaultRenderSource(): Promise<{
		source: string;
		markdown: string;
	} | null> {
		const markdown = await this.readHostMarkdown();
		if (markdown == null) return null;
		const blocks = listVisibleVueInteractiveBlocks(markdown);
		const source = this.resolveSourceForRefresh(blocks);
		if (source == null) return null;
		return { source, markdown };
	}

	/** Re-reads the host note and re-renders (e.g. after an imported file changes). */
	async refreshFromVault(): Promise<void> {
		if (this.activeRender) {
			this.pendingVaultRefresh = true;
			return this.activeRender;
		}
		const resolved = await this.resolveVaultRenderSource();
		if (!resolved) return;
		invalidateCompileCacheForNote(this.sourcePath);
		return this.scheduleRender(resolved.source, resolved.markdown);
	}

	async render(source: string, markdownForIndex?: string): Promise<void> {
		return this.scheduleRender(source, markdownForIndex);
	}

	private async scheduleRender(
		source: string,
		markdownForIndex?: string,
	): Promise<void> {
		if (this.activeRender) {
			this.pendingRender = { source, markdownForIndex };
			return this.activeRender;
		}
		this.activeRender = this.drainRenderQueue(source, markdownForIndex).finally(
			() => {
				this.activeRender = null;
			},
		);
		return this.activeRender;
	}

	private async drainRenderQueue(
		source: string,
		markdownForIndex?: string,
	): Promise<void> {
		let nextSource = source;
		let nextMarkdown = markdownForIndex;
		for (;;) {
			await this.doRender(nextSource, nextMarkdown);
			if (this.pendingVaultRefresh) {
				this.pendingVaultRefresh = false;
				this.pendingRender = null;
				const resolved = await this.resolveVaultRenderSource();
				if (!resolved) break;
				invalidateCompileCacheForNote(this.sourcePath);
				nextSource = resolved.source;
				nextMarkdown = resolved.markdown;
				continue;
			}
			if (this.pendingRender) {
				const pending = this.pendingRender;
				this.pendingRender = null;
				nextSource = pending.source;
				nextMarkdown = pending.markdownForIndex;
				continue;
			}
			break;
		}
	}

	private ensureHosts(reuseSandbox: boolean): {
		host: HTMLElement;
		runtimeErrorHost: HTMLElement;
	} {
		if (
			reuseSandbox &&
			this.sandboxHost?.isConnected &&
			this.runtimeErrorHost?.isConnected
		) {
			this.runtimeErrorHost.empty();
			this.runtimeErrorHost.removeClass("vue-interactive-error");
			return {
				host: this.sandboxHost,
				runtimeErrorHost: this.runtimeErrorHost,
			};
		}

		this.teardownSandbox();
		this.containerEl.empty();
		this.containerEl.addClass("vue-interactive-root");
		registerVueBlock(this.containerEl, this);
		this.applyThemeClass();

		this.sandboxHost = this.containerEl.createDiv({
			cls: "vue-interactive-sandbox-host",
		});
		this.runtimeErrorHost = this.containerEl.createDiv({
			cls: "vue-interactive-runtime-error-host",
		});
		this.applyReservedHostHeight(this.sandboxHost);
		return {
			host: this.sandboxHost,
			runtimeErrorHost: this.runtimeErrorHost,
		};
	}

	private applyReservedHostHeight(host: HTMLElement): void {
		const height = readPersistedBlockHeight(this.containerEl);
		if (height != null) {
			applyHostMinHeight(host, height);
		}
	}

	private rememberSandboxHeight(heightPx: number): void {
		persistBlockHeight(this.containerEl, heightPx);
	}

	private captureCurrentHeightPx(): number {
		const iframe = this.sandbox?.getIframe();
		return resolveLayoutHeightPx({
			persistedPx: readPersistedBlockHeight(this.containerEl),
			iframeStyleHeight: iframe?.style.height,
			iframeOffsetHeight: iframe?.offsetHeight,
			hostMinHeight: this.sandboxHost?.style.minHeight,
			fallbackPx: this.sandbox?.getLastHeightPx(),
		});
	}

	private scheduleRemountAfterBackoff(): void {
		if (this.backoffRetryTimer != null) {
			window.clearTimeout(this.backoffRetryTimer);
		}
		const delay = Math.max(0, this.renderBackoffUntil - Date.now()) + 50;
		this.backoffRetryTimer = window.setTimeout(() => {
			this.backoffRetryTimer = null;
			if (!this.containerEl.isConnected) return;
			void this.remountIfNeeded();
		}, delay);
	}

	private scheduleRemountSoon(): void {
		queueMicrotask(() => {
			if (!this.containerEl.isConnected) return;
			void this.remountIfNeeded();
		});
	}

	private async doRender(
		source: string,
		markdownForIndex?: string,
	): Promise<void> {
		const epoch = ++this.renderEpoch;
		this.lastSource = source;
		if (markdownForIndex != null) {
			this.visibleBlockIndex = findVisibleBlockIndex(
				source,
				markdownForIndex,
			);
		}
		persistVueBlockRemountMetadata(
			this.containerEl,
			this.sourcePath,
			this.visibleBlockIndex,
		);
		clearVueSandboxAlive(this.containerEl);

		// Never reuse a connected-but-empty / port-dead frame after virtualization.
		const reuseSandbox = this.sandbox?.isUsable() === true;
		if (!reuseSandbox) {
			this.teardownSandbox();
		}
		if (this.abortRenderIfStale(epoch)) return;

		const { host, runtimeErrorHost } = this.ensureHosts(reuseSandbox);
		this.applyThemeClass();

		const placeholder = reuseSandbox
			? null
			: renderLoadingPlaceholder(host);

		try {
			const compiled = await compileSfcWithImports(source, {
				app: this.plugin.app,
				settings: this.plugin.settings,
				sourcePath: this.sourcePath,
			});
			if (this.abortRenderIfStale(epoch)) return;
			setVueBlockVaultDependencies(this, compiled.vaultDependencies);
			if (!compiled.fromCache) {
				validateModuleSyntax(compiled.moduleCode, compiled.stackRegions);
			}

			const esmSources = this.plugin.settings.enableDiskCache
				? await prefetchEsmGraph(
						resolveUrlDependencies({
							urlDependencies: compiled.urlDependencies,
							moduleCode: compiled.moduleCode,
						}),
					)
				: {};
			if (this.abortRenderIfStale(epoch)) return;

			let sandbox = this.sandbox;
			if (!reuseSandbox || !sandbox?.isUsable()) {
				sandbox = new SandboxFrame(host, this.plugin.app);
				sandbox.setOnHeightChange((h) => this.rememberSandboxHeight(h));
				this.sandbox = sandbox;
				const initialHeight =
					readPersistedBlockHeight(this.containerEl) ?? 0;
				await sandbox.init(initialHeight);
			} else {
				sandbox.setOnHeightChange((h) => this.rememberSandboxHeight(h));
			}
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
					enableExtendedNodeBuiltins:
						this.plugin.settings.enableExtendedNodeBuiltins,
					esmSources,
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
			placeholder?.remove();
			// Keep host minHeight until SandboxFrame applies the first resize.
			// `vue-sandbox-rendered` resolves before measure; clearing here races
			// prepare-measure and collapses the block to ~1px (visible jitter).
			markVueSandboxAlive(this.containerEl);
		} catch (e) {
			if (isSandboxAbortedError(e)) {
				this.scheduleRemountSoon();
				return;
			}
			if (this.abortRenderIfStale(epoch)) return;
			clearVueSandboxAlive(this.containerEl);
			clearVueBlockVaultDependencies(this);
			this.teardownSandbox();
			this.sandboxHost = null;
			this.runtimeErrorHost = null;
			const err = e instanceof Error ? e : new Error(String(e));
			if (shouldBackoffOnSandboxTimeout(err.message)) {
				this.renderBackoffUntil = Date.now() + SANDBOX_TIMEOUT_BACKOFF_MS;
				this.scheduleRemountAfterBackoff();
			}
			const loc = parseModuleLoadErrorLocation(err.message);
			renderError(this.containerEl, err.message, {
				stack: isCompileTimeError(err) ? undefined : err.stack,
				loc,
			});
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
		if (!isRenderEpochStale(epoch, this.renderEpoch)) return false;
		this.teardownSandbox();
		this.sandboxHost = null;
		this.runtimeErrorHost = null;
		this.scheduleRemountSoon();
		return true;
	}

	/**
	 * Tear down the sandbox immediately (cancel in-flight init/render).
	 * Defer the loading shell until we know the section stayed detached —
	 * and only if this child still owns the container (avoids wiping a newer
	 * child's iframe after processor re-create).
	 */
	onunload(): void {
		this.renderEpoch++;
		const heightPx = this.captureCurrentHeightPx();
		if (heightPx > 0) {
			persistBlockHeight(this.containerEl, heightPx);
			// Reserve before removing the iframe so a still-connected section
			// does not collapse between unload and remount.
			if (this.sandboxHost) {
				applyHostMinHeight(this.sandboxHost, heightPx);
			}
		}
		clearVueSandboxAlive(this.containerEl);
		persistVueBlockRemountMetadata(
			this.containerEl,
			this.sourcePath,
			this.visibleBlockIndex,
		);
		clearVueBlockVaultDependencies(this);
		this.teardownSandbox();
		this.sandboxHost = null;
		this.runtimeErrorHost = null;

		const el = this.containerEl;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				if (el.isConnected) return;
				if (getVueBlock(el) !== this) return;
				this.restoreLoadingShellAfterUnload(heightPx);
			});
		});
	}

	/** Keeps a visible shell so reading-view virtualization can detect and remount. */
	private restoreLoadingShellAfterUnload(reservedHeightPx: number): void {
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
		this.sandboxHost = host;
		const height =
			reservedHeightPx > 0
				? reservedHeightPx
				: (readPersistedBlockHeight(this.containerEl) ?? 0);
		if (height > 0) {
			applyHostMinHeight(host, height);
		}
		renderLoadingPlaceholder(host);
	}
}
