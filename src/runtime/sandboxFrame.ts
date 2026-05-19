import { buildSandboxSrcdoc } from "./sandboxSrcdoc";
import { getSandboxRunnerScript } from "./sandboxRunnerBundle";
import { buildThemeVariablesCss } from "./themeVariables";
import type { SandboxInbound, SandboxOutbound, SandboxStyleChunk } from "./sandboxProtocol";

export class SandboxFrame {
	private iframe: HTMLIFrameElement | null = null;
	private readyPromise: Promise<void> | null = null;
	private messageHandler: ((event: MessageEvent) => void) | null = null;
	private requestCounter = 0;

	constructor(private readonly container: HTMLElement) {}

	async init(): Promise<void> {
		if (this.readyPromise) {
			return this.readyPromise;
		}

		const runnerScript = getSandboxRunnerScript();
		const iframe = document.createElement("iframe");
		iframe.className = "vue-interactive-sandbox";
		iframe.setAttribute(
			"sandbox",
			"allow-scripts",
		);
		iframe.setAttribute("title", "vue-interactive sandbox");
		iframe.style.border = "none";
		iframe.style.width = "100%";
		iframe.style.display = "block";
		iframe.srcdoc = buildSandboxSrcdoc(runnerScript);

		this.iframe = iframe;
		this.container.appendChild(iframe);

		this.readyPromise = new Promise((resolve, reject) => {
			const timeout = window.setTimeout(() => {
				cleanup();
				reject(new Error("沙盒初始化超时。"));
			}, 15_000);

			const onMessage = (event: MessageEvent) => {
				if (event.source !== iframe.contentWindow) return;
				const data = event.data as SandboxOutbound;
				if (data?.type === "vue-sandbox-ready") {
					cleanup();
					resolve();
				}
			};

			const cleanup = () => {
				window.clearTimeout(timeout);
				window.removeEventListener("message", onMessage);
			};

			window.addEventListener("message", onMessage);
		});

		this.messageHandler = (event: MessageEvent) => {
			if (event.source !== iframe.contentWindow) return;
			const data = event.data as SandboxOutbound;
			if (data?.type === "vue-sandbox-resize") {
				iframe.style.height = `${Math.max(data.height, 1)}px`;
			}
		};
		window.addEventListener("message", this.messageHandler);

		return this.readyPromise;
	}

	renderInSandbox(options: {
		moduleCode: string;
		styles: SandboxStyleChunk[];
		scopeId: string;
		themeDark: boolean;
		themeCss: string;
	}): Promise<void> {
		return this.postRender(options);
	}

	private postRender(options: {
		moduleCode: string;
		styles: SandboxStyleChunk[];
		scopeId: string;
		themeDark: boolean;
		themeCss: string;
	}): Promise<void> {
		const iframe = this.iframe;
		const targetWindow = iframe?.contentWindow;
		if (!iframe || !targetWindow) {
			return Promise.reject(new Error("沙盒 iframe 未就绪。"));
		}

		const requestId = `r${++this.requestCounter}`;
		const message: SandboxInbound = {
			type: "vue-sandbox-render",
			requestId,
			moduleCode: options.moduleCode,
			styles: options.styles,
			scopeId: options.scopeId,
			themeDark: options.themeDark,
			themeCss: options.themeCss,
		};

		return new Promise((resolve, reject) => {
			const timeout = window.setTimeout(() => {
				cleanup();
				reject(new Error("沙盒渲染超时。"));
			}, 30_000);

			const onMessage = (event: MessageEvent) => {
				if (event.source !== targetWindow) return;
				const data = event.data as SandboxOutbound;
				if (
					!data ||
					!("requestId" in data) ||
					data.requestId !== requestId
				) {
					return;
				}

				if (data.type === "vue-sandbox-rendered") {
					cleanup();
					resolve();
				} else if (data.type === "vue-sandbox-error") {
					cleanup();
					const err = new Error(data.message);
					if (data.stack) {
						err.stack = data.stack;
					}
					reject(err);
				}
			};

			const cleanup = () => {
				window.clearTimeout(timeout);
				window.removeEventListener("message", onMessage);
			};

			window.addEventListener("message", onMessage);
			targetWindow.postMessage(message, "*");
		});
	}

	unmount(): void {
		const iframe = this.iframe;
		if (iframe?.contentWindow) {
			const requestId = `u${++this.requestCounter}`;
			iframe.contentWindow.postMessage(
				{ type: "vue-sandbox-unmount", requestId } satisfies SandboxInbound,
				"*",
			);
		}
		if (this.messageHandler) {
			window.removeEventListener("message", this.messageHandler);
			this.messageHandler = null;
		}
		iframe?.remove();
		this.iframe = null;
		this.readyPromise = null;
	}
}
