/**
 * Bundled to sandbox-runner.js (IIFE). Runs inside a sandboxed iframe (allow-scripts only).
 */
import { createApp, type App as VueApp, type Component } from "vue";
import { rewriteScopedCssForMountRoot, scopeDataAttribute } from "../compiler/rewriteScopedCss";
import { buildThemeVariablesCss } from "./themeVariables";
import { createObsidianSandboxModule } from "./obsidian/proxyClient";
import { executeModule } from "./executeModule";
import { rewriteRuntimeStack } from "./stackTrace";
import type {
	SandboxInbound,
	SandboxOutbound,
	SandboxStyleChunk,
} from "./sandboxProtocol";

let vueApp: VueApp | null = null;
const styleEls: HTMLStyleElement[] = [];
let resizeObserver: ResizeObserver | null = null;
let obsidianPort: MessagePort | null = null;
function post(message: SandboxOutbound): void {
	parent.postMessage(message, "*");
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

function clearMount(): void {
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

function injectThemeVariables(themeCss: string): void {
	if (!themeCss) return;
	const el = document.createElement("style");
	el.setAttribute("data-vue-interactive", "theme-vars");
	el.textContent = themeCss;
	document.head.appendChild(el);
	styleEls.push(el);
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

function applyTheme(themeDark: boolean): void {
	document.body.classList.toggle("theme-dark", themeDark);
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
	applyTheme(msg.themeDark);
	injectThemeVariables(msg.themeCss);
	injectStyles(msg.styles, msg.scopeId);
	if (!obsidianPort) {
		throw new Error("Obsidian API 桥接未就绪。");
	}
	const obsidian = createObsidianSandboxModule(obsidianPort);
	const component: Component = await executeModule(msg.moduleCode, obsidian);
	const mountEl = ensureMountElement();
	applyScopeRoot(mountEl, msg.scopeId);
	vueApp = createApp(component);
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
	}
});

ensureMountElement();
post({ type: "vue-sandbox-ready" });
