import { describe, expect, it } from "vitest";
import { normalizeMathJaxPreamblePath } from "../normalizeMathJaxPreamblePath";

describe("normalizeMathJaxPreamblePath", () => {
	it("trims and normalizes slashes", () => {
		expect(normalizeMathJaxPreamblePath("  math/preamble.sty  ")).toBe(
			"math/preamble.sty",
		);
	});

	it("returns empty for blank input", () => {
		expect(normalizeMathJaxPreamblePath("   ")).toBe("");
	});
});
