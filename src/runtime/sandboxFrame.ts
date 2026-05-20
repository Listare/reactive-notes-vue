import type { App } from "obsidian";
import { ObsidianBridgeSession } from "./obsidian/ObsidianBridgeSession";
import { buildSandboxSrcdoc } from "./sandboxSrcdoc";
import { getSandboxRunnerScript } from "./sandboxRunnerBundle";
import { getSandboxTailwindCss } from "./sandboxTailwindBundle";
import type {
	SandboxInbound,
	SandboxOutbound,
	SandboxStyleChunk,
} from "./sandboxProtocol";
import type { VueInteractiveTheme } from "../theme/getTheme";
import type { StackCodeRegion } from "./stackTrace";

export type SandboxRuntimeError = {
	message: string;
	stack?: string;
};

export class SandboxFrame {
	private iframe: HTMLIFrameElement | null = null;
	private readyPromise: Promise<void> | null = null;
	private messageHandler: ((event: MessageEvent) => void) | null = null;
	private requestCounter = 0;
	private obsidianBridge: ObsidianBridgeSession | null = null;
	private obsidianPortTransferred = false;
	private activeRequestId: string | null = null;
	private onRuntimeError: ((error: SandboxRuntimeError) => void) | null =
		null;

	constructor(
		private readonly container: HTMLElement,
		private readonly app: App,
	) {}

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
		iframe.srcdoc = buildSandboxSrcdoc(
			runnerScript,
			getSandboxTailwindCss(),
		);

		this.iframe = iframe;
		this.container.appendChild(iframe);

		this.obsidianBridge = new ObsidianBridgeSession(this.app);

		this.readyPromise = new Promise((resolve, reject) => {
			const timeout = window.setTimeout(() => {
				cleanup();
				reject(new Error("沙盒初始化超时。"));
			}, 30_000);

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
				return;
			}
			if (
				data?.type === "vue-sandbox-runtime-error" &&
				data.requestId === this.activeRequestId &&
				this.onRuntimeError
			) {
				this.onRuntimeError({
					message: data.message,
					stack: data.stack,
				});
			}
		};
		window.addEventListener("message", this.messageHandler);

		return this.readyPromise;
	}

	renderInSandbox(
		options: {
			moduleCode: string;
			stackRegions: StackCodeRegion[];
			styles: SandboxStyleChunk[];
			scopeId: string;
			theme: VueInteractiveTheme;
			mathJaxPreamble: string;
		},
		onRuntimeError?: (error: SandboxRuntimeError) => void,
	): Promise<void> {
		this.onRuntimeError = onRuntimeError ?? null;
		return this.postRender(options);
	}

	private postRender(options: {
		moduleCode: string;
		stackRegions: StackCodeRegion[];
		styles: SandboxStyleChunk[];
		scopeId: string;
		theme: VueInteractiveTheme;
		mathJaxPreamble: string;
	}): Promise<void> {
		const iframe = this.iframe;
		const targetWindow = iframe?.contentWindow;
		if (!iframe || !targetWindow) {
			return Promise.reject(new Error("沙盒 iframe 未就绪。"));
		}

		const requestId = `r${++this.requestCounter}`;
		this.activeRequestId = requestId;
		const message: SandboxInbound = {
			type: "vue-sandbox-render",
			requestId,
			moduleCode: options.moduleCode,
			stackRegions: options.stackRegions,
			styles: options.styles,
			scopeId: options.scopeId,
			theme: options.theme,
			mathJaxPreamble: options.mathJaxPreamble,
		};

		return new Promise((resolve, reject) => {
			const timeout = window.setTimeout(() => {
				cleanup();
				this.activeRequestId = null;
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
					this.activeRequestId = requestId;
					cleanup();
					resolve();
				} else if (data.type === "vue-sandbox-error") {
					cleanup();
					this.activeRequestId = null;
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
			const transfer: MessagePort[] = [];
			if (this.obsidianBridge && !this.obsidianPortTransferred) {
				transfer.push(this.obsidianBridge.transferPort);
				this.obsidianPortTransferred = true;
			}
			targetWindow.postMessage(message, "*", transfer);
		});
	}

	setTheme(theme: VueInteractiveTheme): void {
		const targetWindow = this.iframe?.contentWindow;
		if (!targetWindow) return;
		const requestId = `t${++this.requestCounter}`;
		targetWindow.postMessage(
			{
				type: "vue-sandbox-theme",
				requestId,
				theme,
			} satisfies SandboxInbound,
			"*",
		);
	}

	unmount(): void {
		this.activeRequestId = null;
		this.onRuntimeError = null;
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
		this.obsidianBridge?.dispose();
		this.obsidianBridge = null;
		this.obsidianPortTransferred = false;
		this.iframe = null;
		this.readyPromise = null;
	}
}
