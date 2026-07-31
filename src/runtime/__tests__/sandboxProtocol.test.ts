import { describe, expect, it } from "vitest";
import {
	createPrepareMeasureHostAction,
	createPrepareMeasureOutbound,
	PREPARE_MEASURE_HOST_HEIGHT_PX,
} from "../prepareMeasureContract";
import { isSandboxInbound, isSandboxOutbound } from "../sandboxProtocol";

describe("sandbox protocol guards", () => {
	it("accepts ready / resize / prepare-measure outbound", () => {
		expect(isSandboxOutbound({ type: "vue-sandbox-ready" })).toBe(true);
		expect(
			isSandboxOutbound({
				type: "vue-sandbox-resize",
				requestId: "r1",
				height: 42,
			}),
		).toBe(true);
		expect(
			isSandboxOutbound({
				type: "vue-sandbox-prepare-measure",
				requestId: "r1",
			}),
		).toBe(true);
	});

	it("rejects malformed outbound", () => {
		expect(isSandboxOutbound(null)).toBe(false);
		expect(isSandboxOutbound({ type: "vue-sandbox-resize" })).toBe(false);
		expect(
			isSandboxOutbound({
				type: "vue-sandbox-resize",
				requestId: "r1",
				height: Number.NaN,
			}),
		).toBe(false);
		expect(
			isSandboxOutbound({ type: "vue-sandbox-unknown", requestId: "r1" }),
		).toBe(false);
	});

	it("accepts remeasure / resync inbound", () => {
		expect(isSandboxInbound({ type: "vue-sandbox-resync-ready" })).toBe(
			true,
		);
		expect(
			isSandboxInbound({
				type: "vue-sandbox-remeasure",
				requestId: "r1",
			}),
		).toBe(true);
	});

	it("validates render inbound shape", () => {
		expect(
			isSandboxInbound({
				type: "vue-sandbox-render",
				requestId: "r1",
				moduleCode: "return {}",
				stackRegions: [],
				styles: [],
				scopeId: "s1",
				theme: "dark",
				mathJaxPreamble: "",
				enableExtendedNodeBuiltins: false,
			}),
		).toBe(true);
		expect(
			isSandboxInbound({
				type: "vue-sandbox-render",
				requestId: "r1",
				moduleCode: "return {}",
			}),
		).toBe(false);
	});
});

describe("prepare-measure contract", () => {
	it("pairs prepare-measure outbound with host remeasure action", () => {
		const outbound = createPrepareMeasureOutbound("req-9");
		expect(isSandboxOutbound(outbound)).toBe(true);
		expect(outbound).toEqual({
			type: "vue-sandbox-prepare-measure",
			requestId: "req-9",
		});

		const action = createPrepareMeasureHostAction(outbound.requestId);
		expect(action.iframeHeightPx).toBe(PREPARE_MEASURE_HOST_HEIGHT_PX);
		expect(action.iframeHeightPx).toBe(1);
		expect(isSandboxInbound(action.remeasure)).toBe(true);
		expect(action.remeasure).toEqual({
			type: "vue-sandbox-remeasure",
			requestId: "req-9",
		});
	});
});
