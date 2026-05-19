import { MarkdownRenderChild } from "obsidian";
import { compileSfc } from "../compiler/compileSfc";
import { SandboxFrame } from "./sandboxFrame";
import { buildThemeVariablesCss } from "./themeVariables";
import { renderError } from "../ui/renderError";

export class VueBlockChild extends MarkdownRenderChild {
	private sandbox: SandboxFrame | null = null;

	constructor(containerEl: HTMLElement) {
		super(containerEl);
	}

	async render(source: string): Promise<void> {
		this.onunload();
		this.containerEl.empty();
		this.containerEl.addClass("vue-interactive-root");
		this.applyThemeClass();

		const host = this.containerEl.createDiv({
			cls: "vue-interactive-sandbox-host",
		});

		try {
			const compiled = compileSfc(source);
			const sandbox = new SandboxFrame(host);
			this.sandbox = sandbox;
			await sandbox.init();
			await sandbox.renderInSandbox({
				moduleCode: compiled.moduleCode,
				styles: compiled.styles,
				scopeId: compiled.scopeId,
				themeDark: document.body.classList.contains("theme-dark"),
				themeCss: buildThemeVariablesCss(),
			});
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

	onunload(): void {
		this.sandbox?.unmount();
		this.sandbox = null;
		this.containerEl.empty();
	}
}
