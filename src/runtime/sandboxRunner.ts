/**
 * Bundled to sandbox-runner.js (IIFE). Runs inside a sandboxed iframe (allow-scripts only).
 */
import { createApp, ref, type App as VueApp, type Component, type Ref } from "vue";
import { rewriteScopedCssForMountRoot, scopeDataAttribute } from "../compiler/rewriteScopedCss";
import { applyThemeToElement } from "../theme/applyVueInteractiveTheme";
import type { VueInteractiveTheme } from "../theme/getTheme";
import { createGetThemeSandboxModule } from "./getThemeSandboxModule";
import { createObsidianSandboxModule } from "./obsidian/proxyClient";
import { executeModule } from "./executeModule";
import { rewriteRuntimeStack } from "./stackTrace";
import type { StackCodeRegion } from "./stackTrace";
import type {
	SandboxInbound,
	SandboxOutbound,
	SandboxStyleChunk,
} from "./sandboxProtocol";

let vueApp: VueApp | null = null;
type ActiveRenderSession = {
	requestId: string;
	stackRegions: StackCodeRegion[];
};
let activeRender: ActiveRenderSession | null = null;
const styleEls: HTMLStyleElement[] = [];
let resizeObserver: ResizeObserver | null = null;
let obsidianPort: MessagePort | null = null;
const themeRef: Ref<VueInteractiveTheme> = ref("light");

function post(message: SandboxOutbound): void {
	parent.postMessage(message, "*");
}

function getTheme(): VueInteractiveTheme {
	return themeRef.value;
}

function ensureMountElement(): HTMLElement {
	let mount = document.getElementById("vue-interactive-mount");
	if (!mount) {
		mount = document.createElement("div");
		mount.id = "vue-interactive-mount";
		document.body.appendChild(mount);
	}
	return mount;
}

function normalizeError(err: unknown): Error {
	return err instanceof Error ? err : new Error(String(err));
}

function reportRuntimeError(err: unknown, detail?: string): void {
	if (!activeRender) return;
	const error = normalizeError(err);
	const message = detail
		? `${error.message} (${detail})`
		: error.message;
	post({
		type: "vue-sandbox-runtime-error",
		requestId: activeRender.requestId,
		message,
		stack:
			rewriteRuntimeStack(error.stack, activeRender.stackRegions) ??
			error.stack,
	});
}

function clearMount(): void {
	activeRender = null;
	if (vueApp) {
		vueApp.unmount();
		vueApp = null;
	}
	for (const el of styleEls) {
		el.remove();
	}
	styleEls.length = 0;
	const mount = document.getElementById("vue-interactive-mount");
	if (mount) {
		mount.replaceChildren();
	}
}

function injectStyles(styles: SandboxStyleChunk[], scopeId: string): void {
	for (const style of styles) {
		const el = document.createElement("style");
		el.setAttribute("data-vue-interactive", scopeId);
		const css = style.scoped
			? rewriteScopedCssForMountRoot(style.css, scopeId)
			: style.css;
		el.textContent = css;
		document.head.appendChild(el);
		styleEls.push(el);
	}
}

function applyScopeRoot(mountEl: HTMLElement, scopeId: string): void {
	mountEl.setAttribute(scopeDataAttribute(scopeId), "");
}

function applySandboxTheme(theme: VueInteractiveTheme): void {
	themeRef.value = theme;
	for (const el of [
		document.documentElement,
		document.body,
		document.getElementById("vue-interactive-mount"),
	]) {
		if (el instanceof HTMLElement) {
			applyThemeToElement(el, theme);
		}
	}
}

function reportResize(requestId: string): void {
	const height = Math.ceil(document.documentElement.scrollHeight);
	post({ type: "vue-sandbox-resize", requestId, height });
}

function watchResize(requestId: string): void {
	resizeObserver?.disconnect();
	resizeObserver = new ResizeObserver(() => {
		reportResize(requestId);
	});
	resizeObserver.observe(document.documentElement);
	reportResize(requestId);
}

async function handleRender(
	msg: Extract<SandboxInbound, { type: "vue-sandbox-render" }>,
): Promise<void> {
	clearMount();
	applySandboxTheme(msg.theme);
	injectStyles(msg.styles, msg.scopeId);
	if (!obsidianPort) {
		throw new Error("Obsidian API 桥接未就绪。");
	}
	const obsidian = createObsidianSandboxModule(obsidianPort);
	const component: Component = await executeModule(
		msg.moduleCode,
		obsidian,
		createGetThemeSandboxModule(getTheme),
	);
	const mountEl = ensureMountElement();
	applyScopeRoot(mountEl, msg.scopeId);
	applySandboxTheme(msg.theme);
	// activeRender before mount: onMounted runs inside mount() (post-flush), so
	// lifecycle errors must be reportable before vue-sandbox-rendered is posted.
	activeRender = {
		requestId: msg.requestId,
		stackRegions: msg.stackRegions,
	};
	vueApp = createApp(component);
	vueApp.config.errorHandler = (err, _instance, info) => {
		reportRuntimeError(err, info);
	};
	vueApp.mount(mountEl);
	post({ type: "vue-sandbox-rendered", requestId: msg.requestId });
	watchResize(msg.requestId);
}

window.addEventListener("message", (event: MessageEvent) => {
	if (event.ports[0]) {
		obsidianPort?.close();
		obsidianPort = event.ports[0];
		obsidianPort.start();
	}

	const data = event.data as SandboxInbound;
	if (!data || typeof data !== "object" || !("type" in data)) {
		return;
	}

	if (data.type === "vue-sandbox-render") {
		void handleRender(data).catch((e) => {
			clearMount();
			const err = e instanceof Error ? e : new Error(String(e));
			post({
				type: "vue-sandbox-error",
				requestId: data.requestId,
				message: err.message,
				stack: rewriteRuntimeStack(err.stack, data.stackRegions) ?? err.stack,
			});
		});
		return;
	}

	if (data.type === "vue-sandbox-unmount") {
		resizeObserver?.disconnect();
		resizeObserver = null;
		clearMount();
		return;
	}

	if (data.type === "vue-sandbox-theme") {
		applySandboxTheme(data.theme);
	}
});

window.addEventListener("error", (event) => {
	if (!activeRender) return;
	reportRuntimeError(event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
	if (!activeRender) return;
	reportRuntimeError(event.reason);
});

ensureMountElement();
post({ type: "vue-sandbox-ready" });
