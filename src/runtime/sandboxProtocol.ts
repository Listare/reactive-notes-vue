import type { StackCodeRegion } from "./stackTrace";
import type { VueInteractiveTheme } from "../theme/getTheme";

export type SandboxStyleChunk = {
	css: string;
	scoped: boolean;
};

/** Parent → sandbox iframe */
export type SandboxInbound =
	| {
			type: "vue-sandbox-render";
			requestId: string;
			moduleCode: string;
			stackRegions: StackCodeRegion[];
			styles: SandboxStyleChunk[];
			scopeId: string;
			theme: VueInteractiveTheme;
			/** TeX preamble executed before rendering (empty if unset). */
			mathJaxPreamble: string;
			/** Allow non-safe Node builtins via host bridge. */
			enableExtendedNodeBuiltins: boolean;
	  }
	| { type: "vue-sandbox-unmount"; requestId: string }
	| {
			type: "vue-sandbox-theme";
			requestId: string;
			theme: VueInteractiveTheme;
	  }
	| { type: "vue-sandbox-resync-ready" }
	| { type: "vue-sandbox-remeasure"; requestId: string };

/** Sandbox iframe → parent */
export type SandboxOutbound =
	| { type: "vue-sandbox-ready" }
	| { type: "vue-sandbox-rendered"; requestId: string }
	| {
			type: "vue-sandbox-error";
			requestId: string;
			message: string;
			stack?: string;
	  }
	| {
			type: "vue-sandbox-runtime-error";
			requestId: string;
			message: string;
			stack?: string;
	  }
	| { type: "vue-sandbox-resize"; requestId: string; height: number }
	| { type: "vue-sandbox-prepare-measure"; requestId: string };

const INBOUND_TYPES = new Set<SandboxInbound["type"]>([
	"vue-sandbox-render",
	"vue-sandbox-unmount",
	"vue-sandbox-theme",
	"vue-sandbox-resync-ready",
	"vue-sandbox-remeasure",
]);

const OUTBOUND_TYPES = new Set<SandboxOutbound["type"]>([
	"vue-sandbox-ready",
	"vue-sandbox-rendered",
	"vue-sandbox-error",
	"vue-sandbox-runtime-error",
	"vue-sandbox-resize",
	"vue-sandbox-prepare-measure",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isVueInteractiveTheme(value: unknown): value is VueInteractiveTheme {
	return value === "dark" || value === "light";
}

/** Runtime guard for parent → iframe messages. */
export function isSandboxInbound(data: unknown): data is SandboxInbound {
	if (!isRecord(data) || typeof data.type !== "string") return false;
	if (!INBOUND_TYPES.has(data.type as SandboxInbound["type"])) return false;
	switch (data.type) {
		case "vue-sandbox-resync-ready":
			return true;
		case "vue-sandbox-unmount":
		case "vue-sandbox-remeasure":
			return typeof data.requestId === "string";
		case "vue-sandbox-theme":
			return (
				typeof data.requestId === "string" &&
				isVueInteractiveTheme(data.theme)
			);
		case "vue-sandbox-render":
			return (
				typeof data.requestId === "string" &&
				typeof data.moduleCode === "string" &&
				Array.isArray(data.stackRegions) &&
				Array.isArray(data.styles) &&
				typeof data.scopeId === "string" &&
				isVueInteractiveTheme(data.theme) &&
				typeof data.mathJaxPreamble === "string" &&
				typeof data.enableExtendedNodeBuiltins === "boolean"
			);
		default:
			return false;
	}
}

/** Runtime guard for iframe → parent messages. */
export function isSandboxOutbound(data: unknown): data is SandboxOutbound {
	if (!isRecord(data) || typeof data.type !== "string") return false;
	if (!OUTBOUND_TYPES.has(data.type as SandboxOutbound["type"])) return false;
	switch (data.type) {
		case "vue-sandbox-ready":
			return true;
		case "vue-sandbox-rendered":
		case "vue-sandbox-prepare-measure":
			return typeof data.requestId === "string";
		case "vue-sandbox-error":
		case "vue-sandbox-runtime-error":
			return (
				typeof data.requestId === "string" &&
				typeof data.message === "string" &&
				(data.stack === undefined || typeof data.stack === "string")
			);
		case "vue-sandbox-resize":
			return (
				typeof data.requestId === "string" &&
				typeof data.height === "number" &&
				Number.isFinite(data.height)
			);
		default:
			return false;
	}
}
