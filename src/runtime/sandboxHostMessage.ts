import { createPrepareMeasureHostAction } from "./prepareMeasureContract";
import type { SandboxInbound, SandboxOutbound } from "./sandboxProtocol";

export type SandboxRuntimeError = {
	message: string;
	stack?: string;
};

export type SandboxHostFrameAction =
	| {
			type: "prepare-measure";
			iframeHeightPx: number;
			remeasure: Extract<SandboxInbound, { type: "vue-sandbox-remeasure" }>;
	  }
	| { type: "resize"; iframeHeightPx: number }
	| { type: "runtime-error"; error: SandboxRuntimeError }
	| { type: "ignore" };

/**
 * Plan host-side handling for a validated sandbox → parent outbound message.
 * DOM side effects stay in `SandboxFrame`; this is pure routing.
 */
export function planSandboxHostMessage(
	data: SandboxOutbound,
	activeRequestId: string | null,
): SandboxHostFrameAction {
	if (data.type === "vue-sandbox-prepare-measure") {
		const action = createPrepareMeasureHostAction(data.requestId);
		return {
			type: "prepare-measure",
			iframeHeightPx: action.iframeHeightPx,
			remeasure: action.remeasure,
		};
	}
	if (data.type === "vue-sandbox-resize") {
		return {
			type: "resize",
			iframeHeightPx: Math.max(data.height, 1),
		};
	}
	if (
		data.type === "vue-sandbox-runtime-error" &&
		data.requestId === activeRequestId
	) {
		return {
			type: "runtime-error",
			error: { message: data.message, stack: data.stack },
		};
	}
	return { type: "ignore" };
}

export type SandboxRenderReply =
	| { type: "rendered" }
	| { type: "error"; message: string; stack?: string }
	| { type: "ignore" };

/** Classify a postMessage reply for an in-flight `vue-sandbox-render`. */
export function classifySandboxRenderReply(
	data: unknown,
	requestId: string,
): SandboxRenderReply {
	if (
		typeof data !== "object" ||
		data === null ||
		!("requestId" in data) ||
		(data as { requestId?: unknown }).requestId !== requestId
	) {
		return { type: "ignore" };
	}
	const typed = data as { type?: string; message?: string; stack?: string };
	if (typed.type === "vue-sandbox-rendered") {
		return { type: "rendered" };
	}
	if (typed.type === "vue-sandbox-error" && typeof typed.message === "string") {
		return {
			type: "error",
			message: typed.message,
			stack: typeof typed.stack === "string" ? typed.stack : undefined,
		};
	}
	return { type: "ignore" };
}
