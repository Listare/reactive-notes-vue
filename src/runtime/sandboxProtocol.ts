import type { StackCodeRegion } from "./stackTrace";

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
			themeDark: boolean;
			themeCss: string;
	  }
	| { type: "vue-sandbox-unmount"; requestId: string };

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
	| { type: "vue-sandbox-resize"; requestId: string; height: number };
