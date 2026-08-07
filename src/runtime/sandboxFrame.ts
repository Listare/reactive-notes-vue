import type { App } from "obsidian";
import { ObsidianBridgeSession } from "./obsidian/ObsidianBridgeSession";
import { NodeBridgeSession } from "./node/NodeBridgeSession";
import { buildSandboxSrcdoc } from "./sandboxSrcdoc";
import { getSandboxRunnerScript } from "./sandboxRunnerBundle";
import { getSandboxTailwindAssets } from "./sandboxTailwindBundle";
import type {
	SandboxInbound,
	SandboxOutbound,
	SandboxStyleChunk,
} from "./sandboxProtocol";
import { isSandboxOutbound } from "./sandboxProtocol";
import {
	classifySandboxRenderReply,
	planSandboxHostMessage,
	type SandboxRuntimeError,
} from "./sandboxHostMessage";
import type { VueInteractiveTheme } from "../theme/getTheme";
import type { StackCodeRegion } from "./stackTrace";
import { SandboxAbortedError } from "./sandboxAbort";
import { isSandboxMountEmpty } from "./vueBlockRemountMetadata";
import {
	applyHostMinHeight,
	commitMeasuredIframeHeight,
	resolveLayoutHeightPx,
} from "./vueBlockHeightPersist";

export type { SandboxRuntimeError };

export class SandboxFrame {
	private iframe: HTMLIFrameElement | null = null;
	private readyPromise: Promise<void> | null = null;
	private messageHandler: ((event: MessageEvent) => void) | null = null;
	private requestCounter = 0;
	private obsidianBridge: ObsidianBridgeSession | null = null;
	private nodeBridge: NodeBridgeSession | null = null;
	private bridgePortsTransferred = false;
	private activeRequestId: string | null = null;
	private onRuntimeError: ((error: SandboxRuntimeError) => void) | null =
		null;
	private cancelReadyInit: (() => void) | null = null;
	private cancelActiveRender: (() => void) | null = null;
	private lastHeightPx = 0;
	private onHeightChange: ((heightPx: number) => void) | null = null;

	constructor(
		private readonly container: HTMLElement,
		private readonly app: App,
	) {}

	/** Last stable content height reported by the sandbox (0 if never resized). */
	getLastHeightPx(): number {
		return this.lastHeightPx;
	}

	setOnHeightChange(handler: ((heightPx: number) => void) | null): void {
		this.onHeightChange = handler;
	}

	async init(initialHeightPx = 0): Promise<void> {
		if (this.readyPromise) return this.readyPromise;

		for (const stale of Array.from(
			this.container.querySelectorAll("iframe.vue-interactive-sandbox"),
		)) {
			stale.remove();
		}

		const startHeight = 1;
		if (initialHeightPx > 0) {
			this.lastHeightPx = Math.ceil(initialHeightPx);
			// Reserve layout on the host; keep the iframe at 1px until measure
			// (large pre-ready iframe height can stall srcdoc init in Electron).
			applyHostMinHeight(this.container, this.lastHeightPx);
		}

		const runnerScript = getSandboxRunnerScript();
		const iframe = document.createElement("iframe");
		iframe.className = "vue-interactive-sandbox";
		iframe.setAttribute(
			"sandbox",
			"allow-scripts allow-same-origin",
		);
		iframe.setAttribute("title", "Vue-interactive sandbox");
		iframe.setAttribute("scrolling", "no");
		iframe.style.border = "none";
		iframe.style.width = "100%";
		iframe.style.height = `${startHeight}px`;
		iframe.style.display = "block";
		iframe.style.overflow = "hidden";
		iframe.srcdoc = buildSandboxSrcdoc(
			runnerScript,
			getSandboxTailwindAssets(),
		);

		this.iframe = iframe;
		this.obsidianBridge = new ObsidianBridgeSession(this.app);
		this.nodeBridge = new NodeBridgeSession(false);

		const awaitReady = (): Promise<void> =>
			new Promise<void>((resolve, reject) => {
				let settled = false;
				const timeout = window.setTimeout(() => {
					if (settled) return;
					settled = true;
					cleanup();
					reject(new Error("沙盒初始化超时。"));
				}, 30_000);

				const onMessage = (event: MessageEvent) => {
					if (event.source !== iframe.contentWindow) return;
					const data = event.data as SandboxOutbound;
					if (data?.type === "vue-sandbox-ready") {
						if (settled) return;
						settled = true;
						cleanup();
						resolve();
					}
				};

				const cleanup = () => {
					window.clearTimeout(timeout);
					window.removeEventListener("message", onMessage);
					this.cancelReadyInit = null;
				};

				this.cancelReadyInit = () => {
					if (settled) return;
					settled = true;
					cleanup();
					reject(new SandboxAbortedError());
				};

				window.addEventListener("message", onMessage);
			});

		this.readyPromise = awaitReady();
		this.container.appendChild(iframe);

		const targetWindow = iframe.contentWindow;
		if (targetWindow) {
			targetWindow.postMessage(
				{ type: "vue-sandbox-resync-ready" } satisfies SandboxInbound,
				"*",
			);
		}

		this.messageHandler = (event: MessageEvent) => {
			if (event.source !== iframe.contentWindow) return;
			const data: unknown = event.data;
			if (!isSandboxOutbound(data)) return;
			const action = planSandboxHostMessage(data, this.activeRequestId);
			if (action.type === "prepare-measure") {
				// Keep page layout stable while the iframe collapses for measure.
				const reserve = resolveLayoutHeightPx({
					persistedPx: this.lastHeightPx,
					iframeStyleHeight: iframe.style.height,
					iframeOffsetHeight: iframe.offsetHeight,
					hostMinHeight: this.container.style.minHeight,
				});
				if (reserve > 0) {
					applyHostMinHeight(this.container, reserve);
				}
				iframe.style.height = `${action.iframeHeightPx}px`;
				iframe.contentWindow?.postMessage(action.remeasure, "*");
				return;
			}
			if (action.type === "resize") {
				commitMeasuredIframeHeight(
					this.container,
					iframe,
					action.iframeHeightPx,
				);
				this.lastHeightPx = action.iframeHeightPx;
				this.onHeightChange?.(action.iframeHeightPx);
				return;
			}
			if (action.type === "runtime-error" && this.onRuntimeError) {
				this.onRuntimeError(action.error);
			}
		};
		window.addEventListener("message", this.messageHandler);

		try {
			await this.readyPromise;
		} catch (e) {
			this.readyPromise = null;
			throw e;
		}
	}

	renderInSandbox(
		options: {
			moduleCode: string;
			stackRegions: StackCodeRegion[];
			styles: SandboxStyleChunk[];
			scopeId: string;
			theme: VueInteractiveTheme;
			mathJaxPreamble: string;
			enableExtendedNodeBuiltins: boolean;
			esmSources?: Record<string, string>;
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
		enableExtendedNodeBuiltins: boolean;
		esmSources?: Record<string, string>;
	}): Promise<void> {
		const iframe = this.iframe;
		const targetWindow = iframe?.contentWindow;
		if (!iframe || !targetWindow) {
			return Promise.reject(new Error("沙盒 iframe 未就绪。"));
		}

		this.nodeBridge?.setAllowExtended(options.enableExtendedNodeBuiltins);

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
			enableExtendedNodeBuiltins: options.enableExtendedNodeBuiltins,
			esmSources: options.esmSources ?? {},
		};

		return new Promise((resolve, reject) => {
			let settled = false;
			const timeout = window.setTimeout(() => {
				if (settled) return;
				settled = true;
				cleanup();
				this.activeRequestId = null;
				reject(new Error("沙盒渲染超时。"));
			}, 30_000);

			const onMessage = (event: MessageEvent) => {
				if (event.source !== targetWindow) return;
				const reply = classifySandboxRenderReply(event.data, requestId);
				if (reply.type === "rendered") {
					if (settled) return;
					settled = true;
					this.activeRequestId = requestId;
					cleanup();
					resolve();
				} else if (reply.type === "error") {
					if (settled) return;
					settled = true;
					cleanup();
					this.activeRequestId = null;
					const err = new Error(reply.message);
					if (reply.stack) {
						err.stack = reply.stack;
					}
					reject(err);
				}
			};

			const cleanup = () => {
				window.clearTimeout(timeout);
				window.removeEventListener("message", onMessage);
				this.cancelActiveRender = null;
			};

			this.cancelActiveRender = () => {
				if (settled) return;
				settled = true;
				cleanup();
				this.activeRequestId = null;
				reject(new SandboxAbortedError());
			};

			window.addEventListener("message", onMessage);
			const transfer: MessagePort[] = [];
			if (!this.bridgePortsTransferred) {
				if (this.obsidianBridge) {
					transfer.push(this.obsidianBridge.transferPort);
				}
				if (this.nodeBridge) {
					transfer.push(this.nodeBridge.transferPort);
				}
				this.bridgePortsTransferred = true;
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

	getIframe(): HTMLIFrameElement | null {
		return this.iframe;
	}

	/**
	 * True when the iframe is connected, finished ready handshake, and still
	 * has mounted Vue output. A connected-but-empty frame (after virtualization
	 * detach) must not be reused — MessagePorts are already transferred.
	 */
	isUsable(): boolean {
		const iframe = this.iframe;
		if (
			iframe == null ||
			!iframe.isConnected ||
			this.readyPromise == null
		) {
			return false;
		}
		return !isSandboxMountEmpty(iframe);
	}

	unmount(): void {
		this.cancelReadyInit?.();
		this.cancelReadyInit = null;
		this.cancelActiveRender?.();
		this.cancelActiveRender = null;
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
		this.nodeBridge?.dispose();
		this.nodeBridge = null;
		this.bridgePortsTransferred = false;
		this.iframe = null;
		this.readyPromise = null;
	}
}
