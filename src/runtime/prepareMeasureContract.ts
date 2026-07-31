import type { SandboxInbound, SandboxOutbound } from "./sandboxProtocol";

/**
 * Host iframe height while measuring content.
 * Use 1px (not 0): some engines report scrollHeight 0 for a 0-tall frame.
 */
export const PREPARE_MEASURE_HOST_HEIGHT_PX = 1;

/** Outbound message that asks the host to collapse before remeasure. */
export function createPrepareMeasureOutbound(
	requestId: string,
): Extract<SandboxOutbound, { type: "vue-sandbox-prepare-measure" }> {
	return { type: "vue-sandbox-prepare-measure", requestId };
}

/**
 * Host response to `vue-sandbox-prepare-measure`: collapse the iframe, then
 * ask the sandbox to measure and report height.
 */
export function createPrepareMeasureHostAction(requestId: string): {
	iframeHeightPx: number;
	remeasure: Extract<SandboxInbound, { type: "vue-sandbox-remeasure" }>;
} {
	return {
		iframeHeightPx: PREPARE_MEASURE_HOST_HEIGHT_PX,
		remeasure: { type: "vue-sandbox-remeasure", requestId },
	};
}
