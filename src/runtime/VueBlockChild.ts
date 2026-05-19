import { MarkdownRenderChild } from "obsidian";
import { compileSfcWithImports } from "../compiler/compileSfcWithImports";
import {
	listVisibleVueInteractiveBlocks,
	type VueInteractiveBlockInfo,
} from "../markdown/vueInteractiveFence";
import { applyThemeToElement } from "../theme/applyVueInteractiveTheme";
import { resolveEffectiveTheme } from "../theme/getTheme";
import { renderError } from "../ui/renderError";
import { SandboxFrame } from "./sandboxFrame";
import { registerVueBlock } from "./vueBlockRegistry";
import type ReactiveNotesVuePlugin from "../main";

export class VueBlockChild extends MarkdownRenderChild {
	private sandbox: SandboxFrame | null = null;
	private visibleBlockIndex = -1;

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

	async render(source: string, markdownForIndex?: string): Promise<void> {
		this.lastSource = source;
		if (markdownForIndex != null) {
			this.rememberBlockIndex(source, markdownForIndex);
		}
		this.onunload();
		this.containerEl.empty();
		this.containerEl.addClass("vue-interactive-root");
		registerVueBlock(this.containerEl, this);
		this.applyThemeClass();

		const host = this.containerEl.createDiv({
			cls: "vue-interactive-sandbox-host",
		});

		try {
			const compiled = await compileSfcWithImports(source, {
				app: this.plugin.app,
				settings: this.plugin.settings,
				sourcePath: this.sourcePath,
			});
			const sandbox = new SandboxFrame(host, this.plugin.app);
			this.sandbox = sandbox;
			await sandbox.init();
			const theme = this.currentTheme();
			await sandbox.renderInSandbox({
				moduleCode: compiled.moduleCode,
				stackRegions: compiled.stackRegions,
				styles: compiled.styles,
				scopeId: compiled.scopeId,
				theme,
			});
		} catch (e) {
			const err = e instanceof Error ? e : new Error(String(e));
			renderError(this.containerEl, err.message, { stack: err.stack });
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

	onunload(): void {
		this.sandbox?.unmount();
		this.sandbox = null;
		this.containerEl.empty();
	}
}
