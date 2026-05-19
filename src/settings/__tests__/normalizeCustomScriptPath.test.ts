import { describe, expect, it } from "vitest";
import { normalizeCustomScriptPath } from "../normalizeCustomScriptPath";

describe("normalizeCustomScriptPath", () => {
	it("trims and removes trailing slash", () => {
		expect(normalizeCustomScriptPath(" scripts/ ")).toBe("scripts");
	});

	it("returns empty for blank input", () => {
		expect(normalizeCustomScriptPath("  ")).toBe("");
	});
});
