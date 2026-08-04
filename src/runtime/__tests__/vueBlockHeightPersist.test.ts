import { describe, expect, it } from "vitest";
import {
	applyHostMinHeight,
	clearHostMinHeight,
	clearPersistedBlockHeight,
	commitMeasuredIframeHeight,
	DATA_VUE_LAST_HEIGHT,
	parsePositiveCssPx,
	persistBlockHeight,
	readPersistedBlockHeight,
	resolveLayoutHeightPx,
} from "../vueBlockHeightPersist";

describe("vueBlockHeightPersist", () => {
	it("parses positive CSS pixel values", () => {
		expect(parsePositiveCssPx("120px")).toBe(120);
		expect(parsePositiveCssPx("120.4")).toBe(121);
		expect(parsePositiveCssPx("0")).toBeNull();
		expect(parsePositiveCssPx("-3")).toBeNull();
		expect(parsePositiveCssPx("")).toBeNull();
		expect(parsePositiveCssPx(null)).toBeNull();
	});

	it("persists and reads block height on the container", () => {
		const el = document.createElement("div");
		persistBlockHeight(el, 240.2);
		expect(el.getAttribute(DATA_VUE_LAST_HEIGHT)).toBe("241");
		expect(readPersistedBlockHeight(el)).toBe(241);
		clearPersistedBlockHeight(el);
		expect(readPersistedBlockHeight(el)).toBeNull();
	});

	it("applies and clears host min-height", () => {
		const host = document.createElement("div");
		applyHostMinHeight(host, 180);
		expect(host.style.minHeight).toBe("180px");
		clearHostMinHeight(host);
		expect(host.style.minHeight).toBe("");
	});

	it("commits measured iframe height and clears reserve atomically", () => {
		const host = document.createElement("div");
		const iframe = document.createElement("iframe");
		applyHostMinHeight(host, 400);
		iframe.style.height = "1px";

		commitMeasuredIframeHeight(host, iframe, 400.2);

		expect(iframe.style.height).toBe("401px");
		expect(host.style.minHeight).toBe("");
	});

	it("ignores non-positive measured heights when committing", () => {
		const host = document.createElement("div");
		const iframe = document.createElement("iframe");
		applyHostMinHeight(host, 200);
		iframe.style.height = "1px";

		commitMeasuredIframeHeight(host, iframe, 0);

		expect(iframe.style.height).toBe("1px");
		expect(host.style.minHeight).toBe("200px");
	});

	it("resolves the max layout height from available signals", () => {
		expect(
			resolveLayoutHeightPx({
				persistedPx: 100,
				iframeStyleHeight: "80px",
				iframeOffsetHeight: 90,
				hostMinHeight: "70px",
				fallbackPx: 1,
			}),
		).toBe(100);
		expect(
			resolveLayoutHeightPx({
				iframeStyleHeight: "0px",
				iframeOffsetHeight: 0,
				fallbackPx: 1,
			}),
		).toBe(1);
		expect(resolveLayoutHeightPx({})).toBe(0);
	});
});
