import type { StackCodeRegion } from "./stackTrace";
import type { SandboxInbound, SandboxOutbound } from "./sandboxProtocol";
import type { VueInteractiveTheme } from "../theme/getTheme";

export type SandboxRunnerInboundAction =
	| {
			type: "render";
			message: Extract<SandboxInbound, { type: "vue-sandbox-render" }>;
	  }
	| { type: "unmount" }
	| { type: "theme"; theme: VueInteractiveTheme }
	| { type: "remeasure"; requestId: string }
	| { type: "resync-ready" }
	| { type: "ignore" };

/** Pure routing for parent → sandbox inbound messages (ports handled separately). */
export function planSandboxRunnerInbound(
	data: unknown,
): SandboxRunnerInboundAction {
	if (!data || typeof data !== "object" || !("type" in data)) {
		return { type: "ignore" };
	}
	const typed = data as SandboxInbound;
	switch (typed.type) {
		case "vue-sandbox-render":
			return { type: "render", message: typed };
		case "vue-sandbox-unmount":
			return { type: "unmount" };
		case "vue-sandbox-theme":
			return { type: "theme", theme: typed.theme };
		case "vue-sandbox-remeasure":
			return { type: "remeasure", requestId: typed.requestId };
		case "vue-sandbox-resync-ready":
			return { type: "resync-ready" };
		default:
			return { type: "ignore" };
	}
}

export interface PortAssignmentPlan {
	assignObsidian: boolean;
	assignNode: boolean;
}

/** First port = Obsidian bridge; second = Node bridge. */
export function planBridgePortAssignment(portCount: number): PortAssignmentPlan {
	return {
		assignObsidian: portCount >= 1,
		assignNode: portCount >= 2,
	};
}

export function clampSandboxReportedHeight(height: number): number {
	return Math.max(height, 1);
}

export function shouldReportRuntimeError(
	hasActiveRender: boolean,
): boolean {
	return hasActiveRender;
}

export function buildSandboxRenderErrorOutbound(options: {
	requestId: string;
	message: string;
	stack?: string;
}): Extract<SandboxOutbound, { type: "vue-sandbox-error" }> {
	return {
		type: "vue-sandbox-error",
		requestId: options.requestId,
		message: options.message,
		stack: options.stack,
	};
}

export function buildSandboxRuntimeErrorOutbound(options: {
	requestId: string;
	message: string;
	stack?: string;
}): Extract<SandboxOutbound, { type: "vue-sandbox-runtime-error" }> {
	return {
		type: "vue-sandbox-runtime-error",
		requestId: options.requestId,
		message: options.message,
		stack: options.stack,
	};
}

export type ActiveRenderSession = {
	requestId: string;
	stackRegions: StackCodeRegion[];
};
