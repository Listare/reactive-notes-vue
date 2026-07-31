import { describe, expect, it } from "vitest";
import {
	buildSandboxRenderErrorOutbound,
	buildSandboxRuntimeErrorOutbound,
	clampSandboxReportedHeight,
	planBridgePortAssignment,
	planSandboxRunnerInbound,
	shouldReportRuntimeError,
} from "../sandboxRunnerPlan";

describe("planSandboxRunnerInbound", () => {
	it.each([
		{
			name: "render",
			data: {
				type: "vue-sandbox-render",
				requestId: "r1",
				moduleCode: "return {}",
				stackRegions: [],
				styles: [],
				scopeId: "s",
				theme: "light",
				mathJaxPreamble: "",
				enableExtendedNodeBuiltins: false,
			},
			expectedType: "render",
		},
		{
			name: "unmount",
			data: { type: "vue-sandbox-unmount", requestId: "u1" },
			expectedType: "unmount",
		},
		{
			name: "theme",
			data: {
				type: "vue-sandbox-theme",
				requestId: "t1",
				theme: "dark",
			},
			expectedType: "theme",
		},
		{
			name: "remeasure",
			data: { type: "vue-sandbox-remeasure", requestId: "r1" },
			expectedType: "remeasure",
		},
		{
			name: "resync-ready",
			data: { type: "vue-sandbox-resync-ready" },
			expectedType: "resync-ready",
		},
		{ name: "null", data: null, expectedType: "ignore" },
		{ name: "unknown", data: { type: "nope" }, expectedType: "ignore" },
	])("$name", ({ data, expectedType }) => {
		expect(planSandboxRunnerInbound(data).type).toBe(expectedType);
	});

	it("carries theme and requestId payloads", () => {
		const theme = planSandboxRunnerInbound({
			type: "vue-sandbox-theme",
			requestId: "t1",
			theme: "dark",
		});
		expect(theme).toEqual({ type: "theme", theme: "dark" });

		const rem = planSandboxRunnerInbound({
			type: "vue-sandbox-remeasure",
			requestId: "r9",
		});
		expect(rem).toEqual({ type: "remeasure", requestId: "r9" });
	});
});

describe("planBridgePortAssignment", () => {
	it("maps first/second ports to Obsidian/Node", () => {
		expect(planBridgePortAssignment(0)).toEqual({
			assignObsidian: false,
			assignNode: false,
		});
		expect(planBridgePortAssignment(1)).toEqual({
			assignObsidian: true,
			assignNode: false,
		});
		expect(planBridgePortAssignment(2)).toEqual({
			assignObsidian: true,
			assignNode: true,
		});
	});
});

describe("sandbox runner helpers", () => {
	it("clamps height and gates runtime errors", () => {
		expect(clampSandboxReportedHeight(0)).toBe(1);
		expect(clampSandboxReportedHeight(40)).toBe(40);
		expect(shouldReportRuntimeError(false)).toBe(false);
		expect(shouldReportRuntimeError(true)).toBe(true);
	});

	it("builds error outbounds", () => {
		expect(
			buildSandboxRenderErrorOutbound({
				requestId: "r1",
				message: "fail",
				stack: "s",
			}),
		).toEqual({
			type: "vue-sandbox-error",
			requestId: "r1",
			message: "fail",
			stack: "s",
		});
		expect(
			buildSandboxRuntimeErrorOutbound({
				requestId: "r1",
				message: "rt",
			}),
		).toEqual({
			type: "vue-sandbox-runtime-error",
			requestId: "r1",
			message: "rt",
			stack: undefined,
		});
	});
});
