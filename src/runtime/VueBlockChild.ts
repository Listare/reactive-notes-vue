import { MarkdownRenderChild } from "obsidian";
import { createApp, type App as VueApp, type Component } from "vue";
import { compileSfc } from "../compiler/compileSfc";
import { executeModule } from "./executeModule";
import { renderError } from "../ui/renderError";

export class VueBlockChild extends MarkdownRenderChild {
	private vueApp: VueApp | null = null;
	private styleEls: HTMLStyleElement[] = [];
	private mountEl: HTMLElement | null = null;

	constructor(containerEl: HTMLElement) {
		super(containerEl);
	}

	async render(source: string): Promise<void> {
		this.containerEl.empty();
		this.containerEl.addClass("vue-interactive-root");
		this.applyThemeClass();

		this.mountEl = this.containerEl.createDiv({
			cls: "vue-interactive-mount",
		});

		try {
			const compiled = compileSfc(source);
			this.injectStyles(compiled.styles, compiled.scopeId);
			const component = executeModule(compiled.moduleCode);
			this.mountComponent(component);
		} catch (e) {
			const err = e instanceof Error ? e : new Error(String(e));
			renderError(this.containerEl, err.message, { stack: err.stack });
		}
	}

	private applyThemeClass(): void {
		if (document.body.classList.contains("theme-dark")) {
			this.containerEl.addClass("theme-dark");
		} else {
			this.containerEl.removeClass("theme-dark");
		}
	}

	private injectStyles(
		styles: { css: string; scoped: boolean }[],
		scopeId: string,
	): void {
		for (const style of styles) {
			// Scoped SFC styles are generated per block at runtime.
			// eslint-disable-next-line obsidianmd/no-forbidden-elements
			const el = document.createElement("style");
			el.setAttribute("data-vue-interactive", scopeId);
			el.textContent = style.css;
			document.head.appendChild(el);
			this.styleEls.push(el);
		}
	}

	private mountComponent(component: Component): void {
		if (!this.mountEl) return;
		this.vueApp = createApp(component);
		this.vueApp.mount(this.mountEl);
	}

	onunload(): void {
		if (this.vueApp) {
			this.vueApp.unmount();
			this.vueApp = null;
		}
		for (const el of this.styleEls) {
			el.remove();
		}
		this.styleEls = [];
		this.containerEl.empty();
	}
}
