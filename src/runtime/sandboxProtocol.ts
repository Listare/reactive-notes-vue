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
	  }
	| { type: "vue-sandbox-unmount"; requestId: string }
	| {
			type: "vue-sandbox-theme";
			requestId: string;
			theme: VueInteractiveTheme;
	  }
	| { type: "vue-sandbox-resync-ready" };

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
	| { type: "vue-sandbox-resize"; requestId: string; height: number };
