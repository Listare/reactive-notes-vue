import { describe, expect, it } from "vitest";
import {
	classifySandboxRenderReply,
	planSandboxHostMessage,
} from "../sandboxHostMessage";
import { PREPARE_MEASURE_HOST_HEIGHT_PX } from "../prepareMeasureContract";

describe("planSandboxHostMessage", () => {
	it.each([
		{
			name: "prepare-measure",
			data: {
				type: "vue-sandbox-prepare-measure" as const,
				requestId: "r1",
			},
			active: "r1",
			expected: {
				type: "prepare-measure",
				iframeHeightPx: PREPARE_MEASURE_HOST_HEIGHT_PX,
			},
		},
		{
			name: "resize clamps to >= 1",
			data: {
				type: "vue-sandbox-resize" as const,
				requestId: "r1",
				height: 0,
			},
			active: "r1",
			expected: { type: "resize", iframeHeightPx: 1 },
		},
		{
			name: "runtime-error for active request",
			data: {
				type: "vue-sandbox-runtime-error" as const,
				requestId: "r9",
				message: "boom",
				stack: "s",
			},
			active: "r9",
			expected: {
				type: "runtime-error",
				error: { message: "boom", stack: "s" },
			},
		},
		{
			name: "ignores runtime-error for other request",
			data: {
				type: "vue-sandbox-runtime-error" as const,
				requestId: "other",
				message: "boom",
			},
			active: "r9",
			expected: { type: "ignore" },
		},
		{
			name: "ignores ready",
			data: { type: "vue-sandbox-ready" as const },
			active: null,
			expected: { type: "ignore" },
		},
	])("$name", ({ data, active, expected }) => {
		const action = planSandboxHostMessage(data, active);
		if (expected.type === "prepare-measure") {
			expect(action.type).toBe("prepare-measure");
			if (action.type === "prepare-measure") {
				expect(action.iframeHeightPx).toBe(expected.iframeHeightPx);
				expect(action.remeasure).toEqual({
					type: "vue-sandbox-remeasure",
					requestId: "r1",
				});
			}
			return;
		}
		expect(action).toEqual(expected);
	});
});

describe("classifySandboxRenderReply", () => {
	it.each([
		{
			name: "rendered",
			data: { type: "vue-sandbox-rendered", requestId: "r1" },
			expected: { type: "rendered" },
		},
		{
			name: "error",
			data: {
				type: "vue-sandbox-error",
				requestId: "r1",
				message: "fail",
				stack: "trace",
			},
			expected: { type: "error", message: "fail", stack: "trace" },
		},
		{
			name: "wrong request",
			data: { type: "vue-sandbox-rendered", requestId: "other" },
			expected: { type: "ignore" },
		},
		{
			name: "unrelated",
			data: { type: "vue-sandbox-resize", requestId: "r1", height: 10 },
			expected: { type: "ignore" },
		},
	])("$name", ({ data, expected }) => {
		expect(classifySandboxRenderReply(data, "r1")).toEqual(expected);
	});
});
