/**
 * Bundled to sandbox-runner.js (IIFE). Runs inside a sandboxed iframe (allow-scripts only).
 * Vue is externalized and resolved from the host shared runtime (see esbuild banner).
 */
import type { App as VueApp, Component, Ref } from "vue";
import { rewriteScopedCssForMountRoot, scopeDataAttribute } from "../compiler/rewriteScopedCss";
import { applyThemeToElement } from "../theme/applyVueInteractiveTheme";
import type { VueInteractiveTheme } from "../theme/getTheme";
import { createGetThemeSandboxModule } from "./getThemeSandboxModule";
import { prepareMathJax } from "../math/renderLatex";
import { createMathSandboxModule } from "./mathSandboxModule";
import { createObsidianSandboxModule } from "./obsidian/proxyClient";
import { createNodeSandboxModules } from "./node/proxyClient";
import { executeModule } from "./executeModule";
import { mountWithSuspense } from "./mountWithSuspense";
import { resolveSharedRuntime } from "./resolveSharedRuntime";
import { enhanceModuleLoadError, rewriteRuntimeStack } from "./stackTrace";
import { createPrepareMeasureOutbound } from "./prepareMeasureContract";
import type {
	SandboxInbound,
	SandboxOutbound,
	SandboxStyleChunk,
} from "./sandboxProtocol";
import { measureMountHeight } from "./measureMountHeight";
import {
	type ActiveRenderSession,
	buildSandboxRenderErrorOutbound,
	buildSandboxRuntimeErrorOutbound,
	clampSandboxReportedHeight,
	planBridgePortAssignment,
	planSandboxRunnerInbound,
	shouldReportRuntimeError,
} from "./sandboxRunnerPlan";

const { Vue } = resolveSharedRuntime();

let vueApp: VueApp | null = null;
let activeRender: ActiveRenderSession | null = null;
let activeScopeId: string | null = null;
const styleEls: HTMLStyleElement[] = [];
let resizeObserver: ResizeObserver | null = null;
let pendingResizeFrame = 0;
let obsidianPort: MessagePort | null = null;
let nodePort: MessagePort | null = null;
const themeRef: Ref<VueInteractiveTheme> = Vue.ref("light");

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

function reportRuntimeError(err: unknown): void {
	if (!shouldReportRuntimeError(activeRender != null) || !activeRender) {
		return;
	}
	const error = normalizeError(err);
	post(
		buildSandboxRuntimeErrorOutbound({
			requestId: activeRender.requestId,
			message: error.message,
			stack:
				rewriteRuntimeStack(error.stack, activeRender.stackRegions) ??
				error.stack,
		}),
	);
}

function clearScopeRoots(): void {
	if (!activeScopeId) return;
	const attr = scopeDataAttribute(activeScopeId);
	document.body.removeAttribute(attr);
	const mount = document.getElementById("vue-interactive-mount");
	mount?.removeAttribute(attr);
	activeScopeId = null;
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
	clearScopeRoots();
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
	clearScopeRoots();
	activeScopeId = scopeId;
	const attr = scopeDataAttribute(scopeId);
	mountEl.setAttribute(attr, "");
	// So scoped ancestor selectors still match content Teleported to body.
	document.body.setAttribute(attr, "");
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

function measureSandboxContentHeight(): number {
	const mount = document.getElementById("vue-interactive-mount");
	if (!mount) return 0;
	return measureMountHeight(mount);
}

function reportResize(requestId: string): void {
	const height = clampSandboxReportedHeight(measureSandboxContentHeight());
	post({ type: "vue-sandbox-resize", requestId, height });
}

function requestMeasure(requestId: string): void {
	post(createPrepareMeasureOutbound(requestId));
}

function scheduleReportResize(requestId: string): void {
	if (pendingResizeFrame) {
		cancelAnimationFrame(pendingResizeFrame);
	}
	pendingResizeFrame = requestAnimationFrame(() => {
		pendingResizeFrame = requestAnimationFrame(() => {
			pendingResizeFrame = 0;
			requestMeasure(requestId);
		});
	});
}

function stopResizeWatch(): void {
	resizeObserver?.disconnect();
	resizeObserver = null;
	if (pendingResizeFrame) {
		cancelAnimationFrame(pendingResizeFrame);
		pendingResizeFrame = 0;
	}
}

function watchResize(requestId: string): void {
	stopResizeWatch();
	const mount = ensureMountElement();
	resizeObserver = new ResizeObserver(() => {
		scheduleReportResize(requestId);
	});
	resizeObserver.observe(mount);
	// Teleported nodes live under body outside mount.
	resizeObserver.observe(document.body);
	requestMeasure(requestId);
	scheduleReportResize(requestId);
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
	if (!nodePort) {
		throw new Error("Node 内置模块桥接未就绪。");
	}
	const obsidian = createObsidianSandboxModule(obsidianPort);
	const nodeModules = createNodeSandboxModules(nodePort);
	await prepareMathJax(msg.mathJaxPreamble);
	const component: Component = await executeModule(
		msg.moduleCode,
		obsidian,
		createGetThemeSandboxModule(getTheme),
		createMathSandboxModule(),
		nodeModules,
		msg.stackRegions,
		msg.esmSources ?? {},
	);
	const mountEl = ensureMountElement();
	applyScopeRoot(mountEl, msg.scopeId);
	applySandboxTheme(msg.theme);
	// activeRender before mount: onMounted runs inside mount() (post-flush).
	activeRender = {
		requestId: msg.requestId,
		stackRegions: msg.stackRegions,
	};
	const { app, whenReady } = mountWithSuspense(component, mountEl, {
		onRuntimeError: (err) => {
			reportRuntimeError(err);
		},
	});
	vueApp = app;
	await whenReady;
	post({ type: "vue-sandbox-rendered", requestId: msg.requestId });
	watchResize(msg.requestId);
}

function assignBridgePorts(ports: readonly MessagePort[]): void {
	const plan = planBridgePortAssignment(ports.length);
	if (plan.assignObsidian && ports[0]) {
		obsidianPort?.close();
		obsidianPort = ports[0];
		obsidianPort.start();
	}
	if (plan.assignNode && ports[1]) {
		nodePort?.close();
		nodePort = ports[1];
		nodePort.start();
	}
}

window.addEventListener("message", (event: MessageEvent) => {
	if (event.ports.length > 0) {
		assignBridgePorts(event.ports);
	}

	const action = planSandboxRunnerInbound(event.data);
	switch (action.type) {
		case "render": {
			const msg = action.message;
			void handleRender(msg).catch((e) => {
				clearMount();
				const err = enhanceModuleLoadError(e, msg.stackRegions);
				post(
					buildSandboxRenderErrorOutbound({
						requestId: msg.requestId,
						message: err.message,
						stack:
							rewriteRuntimeStack(err.stack, msg.stackRegions) ??
							err.stack,
					}),
				);
			});
			return;
		}
		case "unmount":
			stopResizeWatch();
			clearMount();
			return;
		case "theme":
			applySandboxTheme(action.theme);
			return;
		case "remeasure":
			reportResize(action.requestId);
			return;
		case "resync-ready":
			post({ type: "vue-sandbox-ready" });
			return;
		case "ignore":
			return;
	}
});

window.addEventListener("error", (event) => {
	if (!shouldReportRuntimeError(activeRender != null)) return;
	reportRuntimeError(event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
	if (!shouldReportRuntimeError(activeRender != null)) return;
	reportRuntimeError(event.reason);
});

ensureMountElement();
post({ type: "vue-sandbox-ready" });
